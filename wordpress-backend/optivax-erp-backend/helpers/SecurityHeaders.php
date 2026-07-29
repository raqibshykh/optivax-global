<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CORS + baseline security headers for every /wp-json/saas/v1/* response.
 *
 * The frontend (src/lib/client.ts) sends `credentials: "include"` on every
 * request — cookie-based auth, no bearer token — so CORS must echo back a
 * specific allow-listed origin (never "*") together with
 * Access-Control-Allow-Credentials: true. WP core's default CORS filter
 * (`rest_send_cors_headers`) mirrors *any* Origin unconditionally with no
 * credentials header, which is both too permissive (any site can read
 * non-credentialed responses) and non-functional for this app (credentialed
 * requests need the explicit header) — so we remove it and take over.
 *
 * Allowed origins are configured via the `optivax_erp_allowed_origins`
 * option (comma-separated), editable on the plugin's settings screen —
 * never hardcoded, since the frontend's real origin isn't known yet.
 */
final class SecurityHeaders
{
    private const OPTION_ALLOWED_ORIGINS = 'optivax_erp_allowed_origins';

    public static function register(): void
    {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', [self::class, 'applyCorsHeaders'], 10, 1);
        add_action('rest_api_init', [self::class, 'applyBaselineHeaders'], 1);
    }

    /** @return string[] trimmed, non-empty allowed origins from settings */
    public static function allowedOrigins(): array
    {
        $raw = (string) get_option(self::OPTION_ALLOWED_ORIGINS, '');
        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }

    /**
     * Hooked on `rest_pre_serve_request` (fires right before every REST
     * response is sent, including OPTIONS preflight responses).
     */
    public static function applyCorsHeaders($served)
    {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? esc_url_raw(wp_unslash($_SERVER['HTTP_ORIGIN'])) : '';

        if ($origin !== '' && in_array($origin, self::allowedOrigins(), true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
        }

        return $served;
    }

    /** Hooked on `rest_api_init` — fires on every REST request, before dispatch. */
    public static function applyBaselineHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header("Content-Security-Policy: default-src 'none'");
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: geolocation=(), camera=(), microphone=()');
        if (is_ssl()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }
}
