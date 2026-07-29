<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\Jwt;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Session establishment for every REST request. The frontend never sends a
 * bearer token — auth is a single HttpOnly cookie (`optivax_at`) carrying a
 * short-lived JWT (see src/lib/client.ts: "no client-side token storage").
 *
 * Design note: WP's native `permission_callback` rejection path renders its
 * own error shape ({code, message, data}), not this plugin's required
 * envelope ({success, data, error, details}). So every route is registered
 * with `permission_callback => '__return_true'` and authentication/authorization
 * instead happens as the first thing each controller method does, via
 * self::authenticate() + RbacMiddleware::authorize(), returning ApiResponse::
 * unauthorized()/forbidden() (still a real 401/403 status) when it fails.
 * This filter's only job is to opportunistically log the user into WP core
 * (wp_set_current_user) so current_user_can()/get_current_user_id() also work
 * for anything that relies on WP-native state (e.g. Media Library uploads).
 */
final class AuthMiddleware
{
    public const COOKIE_ACCESS = 'optivax_at';
    public const COOKIE_REFRESH = 'optivax_rt';
    /** Deliberately NOT HttpOnly — same-origin JS reads this and echoes it back as X-CSRF-Token (see CsrfMiddleware). A cross-site attacker's page can't read it (browser same-origin policy), so it can't forge a matching header even though the auth cookie itself rides along automatically. */
    public const COOKIE_CSRF = 'optivax_csrf';

    private static ?array $claims = null;
    private static ?array $mapping = null;
    private static bool $attempted = false;

    public static function restAuthenticationErrors($result)
    {
        if ($result !== null) {
            return $result;
        }
        self::authenticate();
        return null;
    }

    /**
     * Decodes the access-token cookie (once per request), rejects it if its
     * embedded token_version claim ('tv') doesn't match the live DB value
     * (bumped on logout/password-change to immediately invalidate every
     * previously issued access token — see AuthService::incrementTokenVersion()),
     * and logs the user into WP core if valid. Returns the decoded claims,
     * or null.
     */
    public static function authenticate(): ?array
    {
        if (self::$attempted) {
            return self::$claims;
        }
        self::$attempted = true;

        $token = $_COOKIE[self::COOKIE_ACCESS] ?? null;
        if (!$token) {
            return null;
        }

        $claims = Jwt::decode($token);
        if (!$claims || empty($claims['sub'])) {
            return null;
        }

        $mapping = \OptivaxERP\Services\AuthService::mappingFor((int) $claims['sub']);
        if ((int) ($claims['tv'] ?? 1) !== (int) ($mapping['token_version'] ?? 1)) {
            return null;
        }

        self::$claims = $claims;
        self::$mapping = $mapping;
        wp_set_current_user((int) $claims['sub']);
        return $claims;
    }

    public static function currentClaims(): ?array
    {
        return self::authenticate();
    }

    /** The users_mapping row for the currently authenticated user, fetched once per request. */
    public static function currentMapping(): ?array
    {
        self::authenticate();
        return self::$mapping;
    }

    public static function currentUserId(): ?int
    {
        $claims = self::currentClaims();
        return $claims ? (int) $claims['sub'] : null;
    }

    public static function currentRole(): ?string
    {
        $claims = self::currentClaims();
        return $claims['role'] ?? null;
    }

    public static function isAuthenticated(): bool
    {
        return self::currentClaims() !== null;
    }

    public static function setAuthCookies(int $userId, string $role, string $email, bool $rememberMe, int $tokenVersion): string
    {
        $accessToken = Jwt::issueAccessToken(['sub' => $userId, 'role' => $role, 'email' => $email, 'tv' => $tokenVersion]);

        self::setCookie(self::COOKIE_ACCESS, $accessToken, time() + Jwt::accessTokenTtlSeconds());
        self::setCsrfCookie(time() + Jwt::accessTokenTtlSeconds());

        return $accessToken;
    }

    /** Issues (or reissues, on refresh) the double-submit CSRF token alongside the access token — same lifetime, since both come from the same session. */
    public static function setCsrfCookie(int $expires): void
    {
        setcookie(self::COOKIE_CSRF, wp_generate_password(32, false), [
            'expires' => $expires,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => false,
            'samesite' => 'None',
        ]);
    }

    /**
     * SameSite=None is required for the cookie to be sent on cross-origin
     * `credentials:"include"` requests (the frontend and this WP backend are
     * different origins in every real deployment) — and browsers reject
     * SameSite=None cookies outright unless Secure is also set, regardless of
     * whether the current request happens to be HTTPS, so Secure is
     * unconditional here rather than gated on is_ssl().
     */
    public static function setCookie(string $name, string $value, int $expires): void
    {
        setcookie($name, $value, [
            'expires' => $expires,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'None',
        ]);
    }

    public static function clearCookie(string $name): void
    {
        setcookie($name, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'None',
        ]);
    }

    public static function clearAuthCookies(): void
    {
        self::clearCookie(self::COOKIE_ACCESS);
        self::clearCookie(self::COOKIE_REFRESH);
        self::clearCookie(self::COOKIE_CSRF);
    }
}
