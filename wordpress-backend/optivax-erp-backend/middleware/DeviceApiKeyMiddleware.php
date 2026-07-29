<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\DeviceKeyHasher;
use OptivaxERP\Helpers\RateLimiter;
use OptivaxERP\Helpers\SecurityAuditLog;
use OptivaxERP\Repositories\ItDeviceRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Auth for the one headless, non-browser endpoint in this plugin — a
 * biometric device's Local Bridge Application POSTing punches has no cookie
 * session and no CSRF token to present. This is deliberately separate from
 * AuthMiddleware/RbacMiddleware (both cookie/JWT + human-role oriented) —
 * webhook-style shared-secret auth instead, scoped to exactly one device row
 * per key. CsrfMiddleware already exempts any request with no access-token
 * cookie present (see its own doc comment), so a device call carrying only
 * an X-Device-Key header sails through that middleware untouched — nothing
 * there needed to change.
 *
 * The key itself is never compared or stored in plaintext — the request's
 * key is hashed and compared against ItDeviceRepository::findAuthRecord()'s
 * api_key_hash column with a timing-safe hash_equals(), matching how the
 * key was generated (DeviceKeyHasher). Expired and revoked keys are
 * rejected explicitly; every failure (unknown device, missing/wrong key,
 * revoked, expired) is written to the security audit log and counted
 * against a per-device+per-IP rate limit, same dual-bucket pattern
 * AuthController's login uses.
 */
final class DeviceApiKeyMiddleware
{
    private const MAX_FAILURES_PER_WINDOW = 20;
    private const WINDOW_SECONDS = 300;

    /**
     * @return \WP_REST_Response|null a 401/403/404/429 response to short-circuit
     * with, or null if the request's X-Device-Key header matches the given
     * device's stored key hash and that key is neither expired nor revoked.
     */
    public static function authorize(\WP_REST_Request $request, string $deviceId): ?\WP_REST_Response
    {
        $ip = RateLimiter::clientIp();
        $ipRlKey = 'device_key_ip_' . md5($ip);
        if (RateLimiter::secondsUntilReset($ipRlKey, self::MAX_FAILURES_PER_WINDOW, self::WINDOW_SECONDS) > 0) {
            return ApiResponse::error('Too many failed device-key attempts from this address. Try again shortly.', 429);
        }

        $device = (new ItDeviceRepository())->findAuthRecord($deviceId);
        if (!$device) {
            RateLimiter::recordAttempt($ipRlKey, self::WINDOW_SECONDS);
            self::recordFailure($deviceId, 'unknown_device', $ip);
            return ApiResponse::notFound('Unknown device id');
        }

        $providedKey = (string) $request->get_header('X-Device-Key');
        $storedHash = (string) ($device['api_key_hash'] ?? '');

        if ($storedHash === '' || $providedKey === '' || !hash_equals($storedHash, DeviceKeyHasher::hash($providedKey))) {
            RateLimiter::recordAttempt($ipRlKey, self::WINDOW_SECONDS);
            self::recordFailure($deviceId, 'invalid_key', $ip);
            return ApiResponse::forbidden('Invalid or missing device key');
        }

        if (!empty($device['api_key_revoked_at'])) {
            RateLimiter::recordAttempt($ipRlKey, self::WINDOW_SECONDS);
            self::recordFailure($deviceId, 'key_revoked', $ip);
            return ApiResponse::forbidden('This device key has been revoked. Rotate the key (IT Support → Devices) and update the Bridge configuration.');
        }

        if (!empty($device['api_key_expires_at']) && strtotime($device['api_key_expires_at'] . ' UTC') < time()) {
            RateLimiter::recordAttempt($ipRlKey, self::WINDOW_SECONDS);
            self::recordFailure($deviceId, 'key_expired', $ip);
            return ApiResponse::forbidden('This device key has expired. Rotate the key (IT Support → Devices) and update the Bridge configuration.');
        }

        return null;
    }

    private static function recordFailure(string $deviceId, string $reason, string $ip): void
    {
        SecurityAuditLog::record(
            'device_key_auth_failed',
            null,
            'device',
            null,
            'failure',
            null,
            null,
            ['deviceId' => $deviceId, 'reason' => $reason, 'ip' => $ip]
        );
    }
}
