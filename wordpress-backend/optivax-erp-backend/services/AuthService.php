<?php

namespace OptivaxERP\Services;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\SecurityAuditLog;
use OptivaxERP\Middleware\AuthMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Session issuance/rotation/revocation. Access tokens are stateless JWTs;
 * refresh tokens are random strings whose SHA-256 hash is stored in
 * `refresh_tokens` so a single row can be revoked (logout) without needing
 * to track every JWT ever issued.
 */
final class AuthService
{
    private static function refreshTokensTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'refresh_tokens';
    }

    private static function usersMappingTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping';
    }

    /** Row shape for users_mapping, or sensible defaults if the user predates the mapping table. */
    public static function mappingFor(int $userId): array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . self::usersMappingTable() . ' WHERE user_id = %d', $userId), ARRAY_A);
        return $row ?: [
            'user_id' => $userId,
            'role' => 'client',
            'status' => 'active',
            'must_change_password' => 0,
            'token_version' => 1,
            'department_id' => null,
            'designation' => null,
            'avatar_url' => null,
            'company' => null,
        ];
    }

    /**
     * Issues an access-token cookie + a refresh-token cookie (persisted, hashed) for $user.
     * Returns the SessionUserDto-shaped array the frontend expects as `{ user: ... }`.
     */
    public static function issueSession(\WP_User $user, bool $rememberMe): array
    {
        $mapping = self::mappingFor($user->ID);
        $role = $mapping['role'] ?: 'client';
        $tokenVersion = (int) ($mapping['token_version'] ?? 1);

        AuthMiddleware::setAuthCookies($user->ID, $role, $user->user_email, $rememberMe, $tokenVersion);
        self::issueRefreshToken($user->ID, $rememberMe);

        global $wpdb;
        $wpdb->update(self::usersMappingTable(), ['last_login' => current_time('mysql', true)], ['user_id' => $user->ID]);

        return self::sessionUserDto($user, $mapping);
    }

    public static function sessionUserDto(\WP_User $user, ?array $mapping = null): array
    {
        $mapping = $mapping ?? self::mappingFor($user->ID);
        return [
            'id' => (string) $user->ID,
            'email' => $user->user_email,
            'role' => $mapping['role'] ?: 'client',
            'full_name' => $user->display_name,
            'avatar_url' => $mapping['avatar_url'] ?: null,
            'company' => $mapping['company'] ?: null,
            'must_change_password' => (bool) ($mapping['must_change_password'] ?? false),
        ];
    }

    /**
     * Bumps the user's token_version, immediately invalidating every
     * access-token JWT issued before this call (AuthMiddleware::authenticate()
     * rejects any token whose embedded 'tv' claim no longer matches). Called
     * on logout, logout-all-devices, and password change.
     */
    public static function incrementTokenVersion(int $userId): void
    {
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            'UPDATE ' . self::usersMappingTable() . ' SET token_version = token_version + 1 WHERE user_id = %d',
            $userId
        ));
    }

    private static function issueRefreshToken(int $userId, bool $rememberMe): string
    {
        global $wpdb;
        $token = wp_generate_password(64, false);
        $hash = hash('sha256', $token);
        $ttl = \OptivaxERP\Helpers\Jwt::refreshTokenTtlSeconds($rememberMe);
        $expiresAt = gmdate('Y-m-d H:i:s', time() + $ttl);

        $wpdb->insert(self::refreshTokensTable(), [
            'user_id' => $userId,
            'token_hash' => $hash,
            'expires_at' => $expiresAt,
            'remember_me' => $rememberMe ? 1 : 0,
            'created_at' => current_time('mysql', true),
        ]);

        AuthMiddleware::setCookie(AuthMiddleware::COOKIE_REFRESH, $token, time() + $ttl);
        return $token;
    }

    public static function revokeRefreshTokenFromCookie(): void
    {
        $token = $_COOKIE[AuthMiddleware::COOKIE_REFRESH] ?? null;
        if (!$token) {
            return;
        }
        global $wpdb;
        $hash = hash('sha256', $token);
        $wpdb->update(self::refreshTokensTable(), ['revoked_at' => current_time('mysql', true)], ['token_hash' => $hash]);
    }

    /**
     * Validates the refresh-token cookie and, if valid, rotates it and
     * issues a fresh access token. Returns the new SessionUserDto or null.
     */
    public static function refreshFromCookie(): ?array
    {
        $token = $_COOKIE[AuthMiddleware::COOKIE_REFRESH] ?? null;
        if (!$token) {
            return null;
        }

        global $wpdb;
        $hash = hash('sha256', $token);

        // Looked up WITHOUT the revoked_at filter first (unlike before) so a
        // reused token can be told apart from one that simply never existed.
        $row = $wpdb->get_row($wpdb->prepare(
            'SELECT * FROM ' . self::refreshTokensTable() . ' WHERE token_hash = %s',
            $hash
        ), ARRAY_A);

        if (!$row) {
            return null;
        }

        if ($row['revoked_at'] !== null) {
            // This exact token was already rotated away once — a legitimate
            // client would only ever hold the *latest* token in the chain,
            // so presenting an already-revoked one means either a replay of
            // a sniffed/stolen token, or two tabs racing a refresh. Can't
            // tell those apart, so treat it as theft: kill every session
            // (all refresh tokens + the access-token version) for this user
            // rather than silently rotating just this one request forward.
            self::revokeAllSessions((int) $row['user_id']);
            SecurityAuditLog::record('refresh_token_reuse_detected', null, null, (int) $row['user_id'], 'failure');
            return null;
        }

        if (strtotime($row['expires_at']) <= time()) {
            return null; // Ordinary expiry — no reuse, nothing to revoke.
        }

        $user = get_user_by('id', (int) $row['user_id']);
        if (!$user) {
            return null;
        }

        // Rotate: revoke the old row, issue a new refresh + access token pair.
        $wpdb->update(self::refreshTokensTable(), ['revoked_at' => current_time('mysql', true)], ['id' => $row['id']]);

        return self::issueSession($user, (bool) $row['remember_me']);
    }

    /** Revokes every refresh token and bumps token_version for $userId — used when refresh-token reuse (theft) is detected. */
    private static function revokeAllSessions(int $userId): void
    {
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            'UPDATE ' . self::refreshTokensTable() . ' SET revoked_at = %s WHERE user_id = %d AND revoked_at IS NULL',
            current_time('mysql', true),
            $userId
        ));
        self::incrementTokenVersion($userId);
    }
}
