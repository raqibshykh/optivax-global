<?php

namespace OptivaxERP\Helpers;

use Firebase\JWT\JWT as FirebaseJwt;
use Firebase\JWT\Key;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Thin wrapper over firebase/php-jwt, configured from plugin_settings
 * (jwt_secret / jwt_access_ttl / jwt_refresh_ttl — the only settings this
 * plugin requires manual admin configuration for, per the Phase 2A plan).
 */
final class Jwt
{
    private const ALG = 'HS256';
    private const OPTION_SECRET = 'optivax_erp_jwt_secret';
    private const OPTION_ACCESS_TTL = 'optivax_erp_jwt_access_ttl';
    private const OPTION_REFRESH_TTL = 'optivax_erp_jwt_refresh_ttl';

    public static function secret(): string
    {
        $secret = get_option(self::OPTION_SECRET);
        if (!$secret) {
            // Generated once on first use and persisted, so tokens remain valid across requests.
            // Admins should override this via the settings page (item 9 of the plan) with their own value.
            $secret = wp_generate_password(64, true, true);
            update_option(self::OPTION_SECRET, $secret, true);
        }
        return $secret;
    }

    public static function accessTokenTtlSeconds(): int
    {
        return (int) (get_option(self::OPTION_ACCESS_TTL) ?: 900); // 15 minutes default
    }

    public static function refreshTokenTtlSeconds(bool $rememberMe): int
    {
        $default = $rememberMe ? 30 * DAY_IN_SECONDS : 7 * DAY_IN_SECONDS;
        return (int) (get_option(self::OPTION_REFRESH_TTL) ?: $default);
    }

    public static function issueAccessToken(array $claims): string
    {
        $now = time();
        $payload = array_merge($claims, [
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + self::accessTokenTtlSeconds(),
        ]);
        return FirebaseJwt::encode($payload, self::secret(), self::ALG);
    }

    /**
     * @return array|null Decoded payload, or null if invalid/expired/malformed.
     */
    public static function decode(string $token): ?array
    {
        try {
            $decoded = FirebaseJwt::decode($token, new Key(self::secret(), self::ALG));
            return (array) $decoded;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
