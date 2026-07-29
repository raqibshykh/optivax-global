<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\PasswordPolicy;
use OptivaxERP\Helpers\RateLimiter;
use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\SecurityAuditLog;
use OptivaxERP\Mail\MailService;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Services\AuthService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Fully implemented (not a routing stub) per the Phase 2A plan: login,
 * session, logout, password-reset request/confirm, change-password. Every
 * other controller in this plugin is generic CRUD; this one is bespoke
 * because auth is explicitly required to work end-to-end in the foundation
 * phase. There is no public self-registration endpoint — every account is
 * created by an authorized ERP user via ProfileController::create(), gated
 * by helpers/UserHierarchy.php.
 */
final class AuthController
{
    // Per (IP + email): a targeted credential-guessing attempt against one
    // account. Per IP alone (much looser): a credential-stuffing sweep
    // across many accounts from one source — caught even though no single
    // email gets guessed enough times to trip the tighter per-account limit.
    private const LOGIN_MAX_PER_ACCOUNT = 5;
    private const LOGIN_MAX_PER_IP = 20;
    private const LOGIN_WINDOW_SECONDS = 15 * 60;

    public function login(\WP_REST_Request $request): \WP_REST_Response
    {
        $body = $request->get_json_params() ?: [];
        $email = Sanitize::email($body['email'] ?? '');
        $password = (string) ($body['password'] ?? '');
        $rememberMe = Sanitize::bool($body['rememberMe'] ?? false);

        if (!$email || !$password) {
            return ApiResponse::validationError('Email and password are required');
        }

        $ip = RateLimiter::clientIp();
        $accountKey = 'login_acct_' . md5($ip . '|' . $email);
        $ipKey = 'login_ip_' . md5($ip);

        $retryAfter = max(
            RateLimiter::secondsUntilReset($accountKey, self::LOGIN_MAX_PER_ACCOUNT, self::LOGIN_WINDOW_SECONDS),
            RateLimiter::secondsUntilReset($ipKey, self::LOGIN_MAX_PER_IP, self::LOGIN_WINDOW_SECONDS)
        );
        if ($retryAfter > 0) {
            SecurityAuditLog::record('login_rate_limited', null, null, null, 'failure', null, null, ['email' => $email]);
            return ApiResponse::error('Too many login attempts. Please try again later.', 429, ['retryAfterSeconds' => $retryAfter]);
        }

        $user = wp_authenticate($email, $password);
        if (is_wp_error($user)) {
            RateLimiter::recordAttempt($accountKey, self::LOGIN_WINDOW_SECONDS);
            RateLimiter::recordAttempt($ipKey, self::LOGIN_WINDOW_SECONDS);
            SecurityAuditLog::record('login_failed', null, null, null, 'failure', null, null, ['email' => $email]);
            return ApiResponse::error('Invalid email or password', 401);
        }

        RateLimiter::clear($accountKey);

        $mapping = AuthService::mappingFor($user->ID);
        if (($mapping['status'] ?? 'active') === 'inactive') {
            SecurityAuditLog::record('login_blocked_inactive_account', null, null, $user->ID, 'failure');
            return ApiResponse::error('This account has been deactivated', 403);
        }

        $sessionUser = AuthService::issueSession($user, $rememberMe);
        SecurityAuditLog::record('login', $user->ID, $mapping['role'] ?? null, $user->ID, 'success');
        return ApiResponse::ok(['user' => $sessionUser]);
    }

    public function session(\WP_REST_Request $request): \WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $user = get_user_by('id', (int) $claims['sub']);
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        return ApiResponse::ok(['user' => AuthService::sessionUserDto($user)]);
    }

    public function logout(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = AuthMiddleware::currentUserId();
        $role = AuthMiddleware::currentRole();
        AuthService::revokeRefreshTokenFromCookie();
        if ($userId) {
            AuthService::incrementTokenVersion($userId);
            SecurityAuditLog::record('logout', $userId, $role, $userId, 'success');
        }
        AuthMiddleware::clearAuthCookies();
        return ApiResponse::ok(null);
    }

    /**
     * Revokes every refresh-token row for the current user (not just the
     * current cookie's) and bumps token_version, so every session on every
     * device is invalidated at once.
     */
    public function logoutAll(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = AuthMiddleware::currentUserId();
        if (!$userId) {
            return ApiResponse::unauthorized();
        }
        $role = AuthMiddleware::currentRole();

        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'refresh_tokens';
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET revoked_at = %s WHERE user_id = %d AND revoked_at IS NULL",
            current_time('mysql', true),
            $userId
        ));

        AuthService::incrementTokenVersion($userId);
        SecurityAuditLog::record('logout_all_devices', $userId, $role, $userId, 'success');
        AuthMiddleware::clearAuthCookies();
        return ApiResponse::ok(null);
    }

    public function refresh(\WP_REST_Request $request): \WP_REST_Response
    {
        $sessionUser = AuthService::refreshFromCookie();
        if (!$sessionUser) {
            SecurityAuditLog::record('refresh_token_invalid', null, null, null, 'failure');
            return ApiResponse::unauthorized('Refresh token missing, invalid, or expired');
        }
        SecurityAuditLog::record('refresh_token_rotated', (int) $sessionUser['id'], $sessionUser['role'] ?? null, (int) $sessionUser['id'], 'success');
        return ApiResponse::ok(['user' => $sessionUser]);
    }

    /**
     * Authenticated users change their own password. Bumps token_version
     * (invalidating any other session's access token immediately) and
     * reissues a fresh session so the current request/tab isn't logged out
     * by its own action.
     */
    public function changePassword(\WP_REST_Request $request): \WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $body = $request->get_json_params() ?: [];
        $current = (string) ($body['currentPassword'] ?? '');
        $new = (string) ($body['newPassword'] ?? '');
        $confirm = (string) ($body['confirmPassword'] ?? '');

        if (!$current) {
            return ApiResponse::validationError('Current password is required');
        }
        $policyError = PasswordPolicy::validate($new);
        if ($policyError) {
            return ApiResponse::validationError($policyError);
        }
        if ($new !== $confirm) {
            return ApiResponse::validationError('New password and confirmation do not match');
        }

        $user = get_user_by('id', (int) $claims['sub']);
        if (!$user || !wp_check_password($current, $user->user_pass, $user->ID)) {
            SecurityAuditLog::record('password_change_failed', (int) $claims['sub'], $claims['role'] ?? null, (int) $claims['sub'], 'failure');
            return ApiResponse::error('Current password is incorrect', 401);
        }

        wp_set_password($new, $user->ID);
        AuthService::incrementTokenVersion($user->ID);

        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping',
            ['must_change_password' => 0],
            ['user_id' => $user->ID]
        );

        $sessionUser = AuthService::issueSession($user, false);
        SecurityAuditLog::record('password_change', $user->ID, $claims['role'] ?? null, $user->ID, 'success');
        return ApiResponse::ok(['user' => $sessionUser]);
    }

    // Looser than login's limits — a legitimate user might retry once or
    // twice if an email doesn't arrive promptly, but this still stops both
    // email-bombing one address and enumerating many addresses from one IP.
    private const RESET_MAX_PER_ACCOUNT = 3;
    private const RESET_MAX_PER_IP = 10;
    private const RESET_WINDOW_SECONDS = 60 * 60;

    public function requestReset(\WP_REST_Request $request): \WP_REST_Response
    {
        $body = $request->get_json_params() ?: [];
        $email = Sanitize::email($body['email'] ?? '');
        if (!$email) {
            return ApiResponse::validationError('Email is required');
        }

        $ip = RateLimiter::clientIp();
        $accountKey = 'reset_acct_' . md5($ip . '|' . $email);
        $ipKey = 'reset_ip_' . md5($ip);
        $retryAfter = max(
            RateLimiter::secondsUntilReset($accountKey, self::RESET_MAX_PER_ACCOUNT, self::RESET_WINDOW_SECONDS),
            RateLimiter::secondsUntilReset($ipKey, self::RESET_MAX_PER_IP, self::RESET_WINDOW_SECONDS)
        );
        if ($retryAfter > 0) {
            return ApiResponse::error('Too many reset requests. Please try again later.', 429, ['retryAfterSeconds' => $retryAfter]);
        }
        RateLimiter::recordAttempt($accountKey, self::RESET_WINDOW_SECONDS);
        RateLimiter::recordAttempt($ipKey, self::RESET_WINDOW_SECONDS);

        $user = get_user_by('email', $email);
        // Always return success even if the account doesn't exist, so the
        // response body can't be used to enumerate registered email
        // addresses. Equally important: the "exists" branch below must not
        // take meaningfully longer than this one, or the *timing* leaks the
        // same information the response body deliberately hides — that's
        // why the email is queued (a single fast DB insert) rather than
        // sent synchronously over SMTP here.
        if (!$user) {
            return ApiResponse::ok(null);
        }

        $key = get_password_reset_key($user);
        if (is_wp_error($key)) {
            return ApiResponse::ok(null);
        }

        // Token format embeds the user id so confirm-reset can look the user
        // up from the token alone (the frontend's reset form only collects a
        // token + new password, not an email) — see check_password_reset_key()'s
        // $login requirement in confirmReset() below.
        $token = $user->ID . '.' . $key;

        MailService::queue($email, 'Reset your OptiVax Global password', 'password-reset', [
            'fullName' => $user->display_name,
            'resetUrl' => home_url('/reset-password?token=' . rawurlencode($token)),
            'token' => $token,
        ]);

        SecurityAuditLog::record('password_reset_requested', null, null, $user->ID, 'success');
        return ApiResponse::ok(null);
    }

    public function confirmReset(\WP_REST_Request $request): \WP_REST_Response
    {
        $body = $request->get_json_params() ?: [];
        $token = (string) ($body['token'] ?? '');
        $newPassword = (string) ($body['newPassword'] ?? '');

        if (!$token) {
            return ApiResponse::validationError('A valid reset token is required');
        }
        $policyError = PasswordPolicy::validate($newPassword);
        if ($policyError) {
            return ApiResponse::validationError($policyError);
        }

        [$userId, $key] = array_pad(explode('.', $token, 2), 2, null);
        $user = $userId ? get_user_by('id', (int) $userId) : null;
        if (!$user || !$key) {
            return ApiResponse::error('Invalid or expired reset token', 400);
        }

        $checked = check_password_reset_key($key, $user->user_login);
        if (is_wp_error($checked)) {
            return ApiResponse::error('Invalid or expired reset token', 400);
        }

        reset_password($user, $newPassword);
        AuthService::incrementTokenVersion($user->ID);
        SecurityAuditLog::record('password_reset_completed', $user->ID, null, $user->ID, 'success');
        return ApiResponse::ok(null);
    }
}
