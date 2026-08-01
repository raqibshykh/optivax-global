<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Fixed-window attempt counter backed by WordPress transients — no new
 * infrastructure/dependency, consistent with this plugin's existing use of
 * `wp_cache_*`/transients elsewhere. Not a sliding-window/token-bucket
 * algorithm; a fixed window is a deliberate simplicity tradeoff appropriate
 * for "stop unlimited brute-force," not for precise traffic shaping.
 */
final class RateLimiter
{
    private const PREFIX = 'optivax_rl_';

    /**
     * @return int Seconds remaining until the window resets, or 0 if not currently limited.
     */
    public static function secondsUntilReset(string $key, int $maxAttempts, int $windowSeconds): int
    {
        $data = get_transient(self::PREFIX . $key);
        if (!$data || ($data['count'] ?? 0) < $maxAttempts) {
            return 0;
        }
        $resetAt = (int) ($data['resetAt'] ?? 0);
        return max(0, $resetAt - time());
    }

    /**
     * Records one attempt against $key. Call this for every attempt (success
     * or failure) you want counted toward the limit — callers typically only
     * record failures, so a legitimate user recovering after a typo isn't
     * penalized once they get the password right.
     */
    public static function recordAttempt(string $key, int $windowSeconds): void
    {
        $transientKey = self::PREFIX . $key;
        $data = get_transient($transientKey);
        if (!$data) {
            $data = ['count' => 0, 'resetAt' => time() + $windowSeconds];
        }
        $data['count'] = (int) ($data['count'] ?? 0) + 1;
        set_transient($transientKey, $data, $windowSeconds);
    }

    public static function clear(string $key): void
    {
        delete_transient(self::PREFIX . $key);
    }

    /** Best-effort client IP — trusts a proxy-set header only if the site is known to sit behind one; falls back to REMOTE_ADDR. Good enough as a rate-limit bucket key (not used for any security decision beyond throttling). */
    public static function clientIp(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return sanitize_text_field(wp_unslash($ip));
    }

    /**
     * Dev-convenience escape hatch for auth rate limiters. Two independent
     * mechanisms, either of which is enough to bypass:
     *
     *  1. A detected dev environment (APP_ENV=development or WP_DEBUG=true)
     *     — matches this plugin's existing convention of trusting WP_DEBUG
     *     as the dev/prod signal (see ApiResponse::isDebugMode()). Since real
     *     deployments should never run with WP_DEBUG on, this is safe by
     *     WordPress's own best-practice convention, not a new assumption.
     *     Can still be overridden back on via the
     *     optivax_erp_ratelimit_force_in_dev setting, for testing the
     *     limiter itself locally.
     *  2. An explicitly whitelisted IP — always honored, in every
     *     environment including production, because it's a deliberate
     *     admin action gated behind wp-admin access rather than an
     *     environment guess. Includes loopback (127.0.0.1/::1)
     *     unconditionally: clientIp() reads raw REMOTE_ADDR with no
     *     X-Forwarded-For trust, so 127.0.0.1 can only mean the request's
     *     actual TCP peer was the server itself (WP-CLI, same-box cron,
     *     an admin curling the API directly) — not spoofable by ordinary
     *     internet traffic through a reverse proxy.
     *
     * Never called from the login limiter — only wire this into limiters
     * where a dev-mode bypass has been explicitly requested.
     */
    public static function isBypassed(string $ip): bool
    {
        if (self::isWhitelistedIp($ip)) {
            return true;
        }
        if (!self::isDevEnvironment()) {
            return false;
        }
        return !(bool) get_option('optivax_erp_ratelimit_force_in_dev');
    }

    private static function isDevEnvironment(): bool
    {
        $appEnv = getenv('APP_ENV');
        if ($appEnv === false && defined('APP_ENV')) {
            $appEnv = APP_ENV;
        }
        if (is_string($appEnv) && strtolower($appEnv) === 'development') {
            return true;
        }
        return defined('WP_DEBUG') && WP_DEBUG === true;
    }

    private static function isWhitelistedIp(string $ip): bool
    {
        if (in_array($ip, ['127.0.0.1', '::1'], true)) {
            return true;
        }
        $configured = (string) get_option('optivax_erp_ratelimit_ip_whitelist');
        if ($configured === '') {
            return false;
        }
        $list = array_filter(array_map('trim', explode(',', $configured)));
        return in_array($ip, $list, true);
    }
}
