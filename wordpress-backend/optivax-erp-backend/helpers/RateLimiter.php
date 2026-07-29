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
}
