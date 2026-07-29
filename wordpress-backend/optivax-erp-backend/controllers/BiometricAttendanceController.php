<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Helpers\RateLimiter;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\DeviceApiKeyMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\ItDeviceImportRequestRepository;
use OptivaxERP\Services\BiometricAttendanceService;
use OptivaxERP\Services\DeviceSyncService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/it/devices/{deviceId}/punches/import — device-key auth, no
 * human role — the primary and, on a shared-hosting deployment, ONLY way
 * punches ever reach this ERP: a Local Bridge Application running inside
 * the office LAN talks to the physical device and POSTs here. This ERP
 * never dials out to the device itself (see DeviceSyncService's doc
 * comment for the legacy, opt-in-only exception). Also backs
 * /it/devices/{deviceId}/punches/reprocess (normal RbacMiddleware auth —
 * what "Retry Sync" calls, re-aggregating already-stored punches without
 * touching hardware). /it/devices/{deviceId}/test-connection and
 * .../live-sync are the legacy, live-TCP counterparts (DeviceSyncService),
 * disabled by default (see that class's `optivax_erp_enable_lan_device_sync`
 * gate) — kept only for a deployment where this ERP itself runs inside the
 * device's own LAN. List/CRUD for the raw punch viewer and the biometric-
 * employee mapping table are plain BaseCrudController passthroughs on the
 * `it_support` domain, wired directly in BiometricAttendanceRoutes — no
 * business logic there, so no dedicated controller methods for them.
 *
 * Every handler below is wrapped end-to-end in try/catch(\Throwable) and
 * every failure path returns ApiResponse::exceptionError() — the full
 * {success:false, message, error, file, line[, stack]} envelope — rather
 * than a bare/blank response or a generic message with the real exception
 * discarded. This is deliberate belt-and-braces: OptivaxERP\Middleware\
 * ErrorBoundaryMiddleware already exists as a last-resort net one layer up
 * (rest_dispatch_request), but it intentionally replaces the real message
 * with a generic "Internal server error" for logging/security reasons —
 * exactly the behavior these connector endpoints must NOT exhibit, so they
 * catch everything themselves and never fall through to that net.
 */
final class BiometricAttendanceController
{
    /** A single request larger than this is rejected outright (413) rather than attempted — bounds worst-case memory/time for one PHP-FPM worker on shared hosting. Comfortably above the "5000 punches" ceiling this endpoint is specified to handle. */
    private const MAX_PUNCHES_PER_REQUEST = 5000;

    /** Raw request-body byte cap — independent of punch count, since a malformed/oversized body should be rejected before it's even JSON-decoded. */
    private const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8MB

    /** Per-device + per-IP import-request throttling — generous enough for a Bridge legitimately re-POSTing every few seconds, tight enough to blunt a runaway retry loop or flood. */
    private const MAX_IMPORTS_PER_WINDOW = 60;
    private const RATE_WINDOW_SECONDS = 60;

    private BiometricAttendanceService $service;
    private DeviceSyncService $deviceSync;
    private ItDeviceImportRequestRepository $idempotency;

    public function __construct()
    {
        $this->service = new BiometricAttendanceService();
        $this->deviceSync = new DeviceSyncService();
        $this->idempotency = new ItDeviceImportRequestRepository();
    }

    /**
     * POST /it/devices/{deviceId}/punches/import — device-key auth, called
     * exclusively by a Local Bridge Application, never by a browser session
     * or directly by the physical device.
     *
     * Optional request-body fields beyond `punches`:
     *   - `bridge`: {id, version, hostname, os, latencyMs} — Bridge
     *     identity/diagnostics, stored on the device row for the Devices UI;
     *     never trusted for auth or business logic.
     *   - `deviceTime`: ISO 8601 string, the Bridge/device's own clock
     *     reading at send time — echoed back in the response for the Bridge
     *     to detect its own clock drift against `serverTime`.
     *
     * Optional headers:
     *   - `Idempotency-Key`: if the same key was already used successfully
     *     for this device, the original response is replayed verbatim
     *     instead of reprocessing — safe for a Bridge to resend after a
     *     timeout without risking double-counting (on top of, not instead
     *     of, the punch-level UNIQUE KEY dedup BiometricAttendanceService
     *     already guarantees even with no key sent at all).
     */
    public function importPunches(\WP_REST_Request $request): \WP_REST_Response
    {
        $deviceId = (string) $request->get_param('deviceId');

        $guard = DeviceApiKeyMiddleware::authorize($request, $deviceId);
        if ($guard) {
            return $guard;
        }

        $sourceIp = self::clientIp($request);
        $rlDeviceKey = 'device_import_' . $deviceId;
        $rlIpKey = 'device_import_ip_' . md5($sourceIp);
        if (RateLimiter::secondsUntilReset($rlDeviceKey, self::MAX_IMPORTS_PER_WINDOW, self::RATE_WINDOW_SECONDS) > 0
            || RateLimiter::secondsUntilReset($rlIpKey, self::MAX_IMPORTS_PER_WINDOW, self::RATE_WINDOW_SECONDS) > 0) {
            return ApiResponse::error('Too many import requests. Slow down and retry shortly.', 429);
        }
        RateLimiter::recordAttempt($rlDeviceKey, self::RATE_WINDOW_SECONDS);
        RateLimiter::recordAttempt($rlIpKey, self::RATE_WINDOW_SECONDS);

        $rawBody = $request->get_body();
        if (strlen($rawBody) > self::MAX_BODY_BYTES) {
            return ApiResponse::error('Request payload exceeds the maximum allowed size (' . self::MAX_BODY_BYTES . ' bytes).', 413);
        }

        $idempotencyKey = trim((string) $request->get_header('Idempotency-Key'));
        if ($idempotencyKey !== '') {
            $cached = $this->idempotency->find($deviceId, $idempotencyKey);
            if ($cached !== null) {
                Logger::info('device-sync-http', 'Replayed cached response for repeated Idempotency-Key', ['deviceId' => $deviceId, 'idempotencyKey' => $idempotencyKey]);
                return new \WP_REST_Response($cached['response'], $cached['statusCode']);
            }
        }

        $data = $request->get_json_params() ?: [];
        $punches = $data['punches'] ?? null;
        if (!is_array($punches)) {
            return ApiResponse::validationError('Request body must be { "punches": [...] }');
        }
        if (count($punches) > self::MAX_PUNCHES_PER_REQUEST) {
            return ApiResponse::error('Too many punches in a single request (max ' . self::MAX_PUNCHES_PER_REQUEST . '). Split into multiple batches.', 413);
        }

        foreach ($punches as $i => $punch) {
            if (!is_array($punch)) {
                return ApiResponse::validationError("punches[{$i}] must be an object");
            }
            $errors = Validator::check($punch, [
                'biometricUserId' => ['required'],
                'timestamp' => ['required'],
                'punchType' => ['required', ['in', ['in', 'out', 'break-in', 'break-out']]],
            ]);
            if ($errors) {
                return ApiResponse::validationError("punches[{$i}] failed validation", $errors);
            }
        }

        $bridge = is_array($data['bridge'] ?? null) ? $data['bridge'] : [];
        $bridgeMeta = [
            'bridgeId' => isset($bridge['id']) ? (string) $bridge['id'] : null,
            'bridgeVersion' => isset($bridge['version']) ? (string) $bridge['version'] : null,
            'bridgeHostname' => isset($bridge['hostname']) ? (string) $bridge['hostname'] : null,
            'bridgeOs' => isset($bridge['os']) ? (string) $bridge['os'] : null,
            'bridgeLatencyMs' => isset($bridge['latencyMs']) ? (int) $bridge['latencyMs'] : null,
            'bridgeIp' => $sourceIp,
            'deviceTime' => isset($data['deviceTime']) ? (string) $data['deviceTime'] : null,
            'idempotencyKey' => $idempotencyKey !== '' ? $idempotencyKey : null,
        ];

        self::logHttpRequest('punches/import', $request, ['deviceId' => $deviceId, 'punchCount' => count($punches), 'idempotencyKey' => $idempotencyKey ?: null]);

        // Batches up to the 5000-punch ceiling above can take longer than a
        // typical PHP-FPM default — raised here (not globally) so only this
        // one bulk endpoint gets the extra budget. Best-effort: some shared
        // hosts disable set_time_limit() entirely, which is fine — ingestion
        // is already chunked (see BiometricAttendanceService::CHUNK_SIZE)
        // specifically so it degrades gracefully rather than needing this.
        if (function_exists('set_time_limit')) {
            @set_time_limit(120);
        }

        try {
            $summary = $this->service->ingestBatch($deviceId, $punches, $sourceIp, $bridgeMeta);
        } catch (\InvalidArgumentException $e) {
            return self::logHttpResponse('punches/import', 404, ApiResponse::notFound($e->getMessage()));
        } catch (\Throwable $e) {
            Logger::error('device-sync-http', 'importPunches failed', ['deviceId' => $deviceId, 'exception' => get_class($e), 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
            return self::logHttpResponse('punches/import', 500, ApiResponse::exceptionError('Could not import punches for device.', $e, 500));
        }

        $response = self::logHttpResponse('punches/import', 201, ApiResponse::ok($summary, [], 201));

        if ($idempotencyKey !== '') {
            $this->idempotency->store($deviceId, $idempotencyKey, 201, $response->get_data());
        }

        return $response;
    }

    /** POST /it/devices/{deviceId}/punches/reprocess — RBAC it_support EDIT, the real "Sync Now"/"Retry Sync" action. */
    public function reprocessDevice(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('it_support', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $deviceId = (string) $request->get_param('deviceId');
        $triggeredByName = (string) (AuthMiddleware::currentRole() ?? 'unknown') . ':' . (string) AuthMiddleware::currentUserId();
        self::logHttpRequest('punches/reprocess', $request, ['deviceId' => $deviceId]);

        try {
            $summary = $this->service->reprocessDevice($deviceId, $triggeredByName);
        } catch (\InvalidArgumentException $e) {
            return self::logHttpResponse('punches/reprocess', 404, ApiResponse::notFound($e->getMessage()));
        } catch (\Throwable $e) {
            Logger::error('device-sync-http', 'reprocessDevice failed', ['deviceId' => $deviceId, 'exception' => get_class($e), 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
            return self::logHttpResponse('punches/reprocess', 500, ApiResponse::exceptionError('Could not reprocess device.', $e, 500));
        }

        return self::logHttpResponse('punches/reprocess', 200, ApiResponse::ok($summary));
    }

    /**
     * POST /it/devices/{deviceId}/test-connection — RBAC it_support VIEW (both
     * it_admin and it_member, matching the button's current visibility). A
     * real live TCP probe of the physical device, not a cached-status check
     * — see DeviceSyncService::testConnection() for what it actually reads.
     * Note: an unreachable device is NOT an exception here — DeviceSyncService
     * ::testConnection() returns {reachable:false, error, responseTimeMs} as
     * a normal 200 result (that's a real, expected outcome of a connection
     * test). The try/catch below is for genuinely unexpected failures
     * (misconfiguration, a bug, a DB error) — those still get the full
     * exceptionError() envelope, never a blank/generic response.
     */
    public function testConnection(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('it_support', 'VIEW');
        if ($guard) {
            return $guard;
        }

        $deviceId = (string) $request->get_param('deviceId');
        self::logHttpRequest('test-connection', $request, ['deviceId' => $deviceId]);

        try {
            $result = $this->deviceSync->testConnection($deviceId);
        } catch (\InvalidArgumentException $e) {
            return self::logHttpResponse('test-connection', 404, ApiResponse::exceptionError('Device not found.', $e, 404));
        } catch (\Throwable $e) {
            Logger::error('device-sync-http', 'testConnection failed', ['deviceId' => $deviceId, 'exception' => get_class($e), 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
            return self::logHttpResponse('test-connection', 422, ApiResponse::exceptionError('Could not test connection to device.', $e, 422));
        }

        return self::logHttpResponse('test-connection', 200, ApiResponse::ok($result));
    }

    /**
     * POST /it/devices/{deviceId}/live-sync — RBAC it_support EDIT, the real
     * "Sync Now": connects to the physical device over TCP right now,
     * downloads its attendance log, and ingests whatever's new via the
     * unmodified BiometricAttendanceService::ingestBatch(). Distinct from
     * reprocessDevice() above, which never touches hardware. Every failure
     * (unreachable device, timeout, protocol error, unexpected exception)
     * returns the full exceptionError() envelope — HTTP 502 (this server
     * acting as a gateway to the device failed to reach it), never a bare
     * 500 with the real cause hidden.
     */
    public function liveSyncDevice(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('it_support', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $deviceId = (string) $request->get_param('deviceId');
        self::logHttpRequest('live-sync', $request, ['deviceId' => $deviceId]);

        try {
            $summary = $this->deviceSync->syncDevice($deviceId);
        } catch (\InvalidArgumentException $e) {
            return self::logHttpResponse('live-sync', 404, ApiResponse::exceptionError('Device not found.', $e, 404));
        } catch (\Throwable $e) {
            Logger::error('device-sync-http', 'liveSyncDevice failed', ['deviceId' => $deviceId, 'exception' => get_class($e), 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
            return self::logHttpResponse('live-sync', 502, ApiResponse::exceptionError('Could not sync device.', $e, 502));
        }

        return self::logHttpResponse('live-sync', 200, ApiResponse::ok($summary));
    }

    private static function clientIp(\WP_REST_Request $request): string
    {
        $forwarded = $request->get_header('X-Forwarded-For');
        if ($forwarded) {
            $parts = explode(',', $forwarded);
            return trim($parts[0]);
        }
        return isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : '';
    }

    /** HTTP DEBUG (request side) — URL, method, headers (Authorization/Cookie redacted), body, for every connector call, success or failure. */
    private static function logHttpRequest(string $action, \WP_REST_Request $request, array $extra = []): void
    {
        $headers = [];
        foreach ($request->get_headers() as $name => $values) {
            $lower = strtolower($name);
            $headers[$name] = in_array($lower, ['authorization', 'cookie', 'x-device-key'], true) ? '(redacted)' : implode(', ', (array) $values);
        }

        Logger::info('device-sync-http', "Request: {$action}", array_merge([
            'url' => $request->get_route(),
            'method' => $request->get_method(),
            'headers' => $headers,
            'body' => $request->get_json_params(),
        ], $extra));
    }

    /** HTTP DEBUG (response side) — status + body for every connector call, success or failure. Returns $response unchanged so call sites can wrap their return statement with this. */
    private static function logHttpResponse(string $action, int $status, \WP_REST_Response $response): \WP_REST_Response
    {
        Logger::info('device-sync-http', "Response: {$action}", [
            'status' => $status,
            'body' => $response->get_data(),
        ]);
        return $response;
    }
}
