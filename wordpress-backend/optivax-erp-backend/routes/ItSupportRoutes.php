<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\ItAttendanceExceptionRepository;
use OptivaxERP\Repositories\ItDeviceLogRepository;
use OptivaxERP\Repositories\ItDeviceRepository;
use OptivaxERP\Repositories\ItTicketRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/it/* (src/services/itSupportService.ts) — tickets, devices,
 * device sync logs, attendance exceptions. Each sub-resource is wired
 * straight to its own BaseCrudController instance, all on the 'it_support'
 * RBAC domain; only the endpoints that exist on the frontend service are
 * registered (no delete for tickets/device-logs, no create/delete for
 * attendance-exceptions — see class doc comments on the repositories).
 */
final class ItSupportRoutes
{
    public static function register(): void
    {
        $ns = OPTIVAX_ERP_NAMESPACE;
        $deviceIdPattern = '/it/devices/(?P<deviceId>[a-zA-Z0-9-]+)';

        // ── Tickets ───────────────────────────────────────────────────────
        $tickets = new BaseCrudController(new ItTicketRepository(), 'it_support');

        register_rest_route($ns, '/it/tickets/list', [
            'methods' => 'GET',
            'callback' => [$tickets, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/tickets/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($tickets) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'title' => ['required'],
                    'priority' => [['in', ['low', 'medium', 'high', 'critical']]],
                    'status' => [['in', ['open', 'in-progress', 'resolved', 'closed', 'escalated']]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $tickets->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        $ticketLookupRepo = new ItTicketRepository();
        register_rest_route($ns, '/it/tickets/update', [
            'methods' => 'PUT',
            'callback' => static function (\WP_REST_Request $request) use ($tickets, $ticketLookupRepo) {
                $data = $request->get_json_params() ?: [];
                if (array_key_exists('status', $data)) {
                    $errors = Validator::check($data, [
                        'status' => [['in', ['open', 'in-progress', 'resolved', 'closed', 'escalated']]],
                    ]);
                    if ($errors) {
                        return ApiResponse::validationError('Validation failed', $errors);
                    }
                    $id = $data['id'] ?? null;
                    $existing = $id ? $ticketLookupRepo->find((string) $id) : null;
                    if ($existing && $existing['status'] === 'closed' && $data['status'] !== 'closed') {
                        return ApiResponse::error('This ticket is closed and cannot be reopened or re-resolved. Create a new ticket instead.', 409);
                    }
                }
                return $tickets->updateByBodyIdHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        // ── Devices ───────────────────────────────────────────────────────
        $devices = new BaseCrudController(new ItDeviceRepository(), 'it_support');

        register_rest_route($ns, '/it/devices/list', [
            'methods' => 'GET',
            'callback' => [$devices, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/devices/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($devices) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'name' => ['required'],
                    'status' => [['in', ['online', 'offline', 'error', 'syncing']]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $devices->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/devices/update', [
            'methods' => 'PUT',
            'callback' => [$devices, 'updateByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/devices/delete', [
            'methods' => 'DELETE',
            'callback' => [$devices, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);

        // ── Device key rotation/revocation (Bridge credential management) ──
        // Both are RBAC it_support EDIT, not device-key auth — these are
        // admin actions performed by an authenticated human, not the Bridge
        // itself. The response's `apiKey` is the plaintext credential,
        // revealed exactly once (see ItDeviceRepository's doc comment) —
        // the admin must copy it into the Bridge's config immediately.
        $deviceRepo = new ItDeviceRepository();
        register_rest_route($ns, $deviceIdPattern . '/rotate-key', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($deviceRepo) {
                $guard = RbacMiddleware::authorize('it_support', 'EDIT');
                if ($guard) {
                    return $guard;
                }
                $result = $deviceRepo->rotateApiKey((string) $request->get_param('deviceId'));
                if (!$result) {
                    return ApiResponse::notFound('Unknown device id');
                }
                return ApiResponse::ok($result);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, $deviceIdPattern . '/revoke-key', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($deviceRepo) {
                $guard = RbacMiddleware::authorize('it_support', 'EDIT');
                if ($guard) {
                    return $guard;
                }
                $result = $deviceRepo->revokeApiKey((string) $request->get_param('deviceId'));
                if (!$result) {
                    return ApiResponse::notFound('Unknown device id');
                }
                return ApiResponse::ok($result);
            },
            'permission_callback' => '__return_true',
        ]);

        // ── Generate/Rotate API Key (IT Devices UI — "Generate API Key" /
        // "Rotate API Key" buttons) ─────────────────────────────────────────
        // Deliberately a narrower gate than the generic 'it_support' EDIT
        // domain above (which also grants it_member) — issuing/replacing a
        // Bridge credential is restricted to super_admin and it_admin only,
        // so this hand-checks the role directly rather than going through
        // RbacMiddleware::authorize()'s domain/action matrix, which has no
        // way to express "this one action needs a narrower role set than
        // the rest of its domain." Reuses ItDeviceRepository::rotateApiKey()
        // unchanged (same one-time-reveal, hash-only-at-rest mechanism the
        // existing /rotate-key route above already uses) — the only new
        // thing here is the endpoint name, the stricter RBAC, and a minimal
        // {apiKey, lastFour} response shape (rather than the full device
        // row) so as little of the plaintext's blast radius as possible
        // exists in memory/response payload once the reveal is over. Works
        // identically whether the device has never had a key (first-time
        // "Generate") or already has one (a "Rotate") — rotateApiKey()
        // always issues a fresh key regardless, matching the UI's own
        // "Generate if none, Rotate if one exists" framing without needing
        // two different backend code paths.
        register_rest_route($ns, $deviceIdPattern . '/generate-api-key', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($deviceRepo) {
                $role = AuthMiddleware::currentRole();
                if (!$role) {
                    return ApiResponse::unauthorized();
                }
                if (!in_array($role, ['super_admin', 'it_admin'], true)) {
                    return ApiResponse::forbidden('Only Super Admin or IT Admin may generate or rotate a device API key.');
                }

                $deviceId = (string) $request->get_param('deviceId');
                $result = $deviceRepo->rotateApiKey($deviceId);
                if (!$result) {
                    return ApiResponse::notFound('Unknown device id');
                }

                // Deliberately minimal — not the full device row, and never
                // logged (this route, unlike BiometricAttendanceController,
                // has no request/response HTTP-debug logger wired to it).
                return ApiResponse::ok([
                    'apiKey' => $result['apiKey'] ?? null,
                    'lastFour' => $result['apiKeyLastFour'] ?? null,
                ]);
            },
            'permission_callback' => '__return_true',
        ]);

        // ── Device sync logs ──────────────────────────────────────────────
        $deviceLogs = new BaseCrudController(new ItDeviceLogRepository(), 'it_support');

        register_rest_route($ns, '/it/device-logs/list', [
            'methods' => 'GET',
            'callback' => [$deviceLogs, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/device-logs/create', [
            'methods' => 'POST',
            'callback' => [$deviceLogs, 'createHandler'],
            'permission_callback' => '__return_true',
        ]);

        // ── Attendance exceptions ─────────────────────────────────────────
        $exceptions = new BaseCrudController(new ItAttendanceExceptionRepository(), 'it_support');

        register_rest_route($ns, '/it/attendance-exceptions/list', [
            'methods' => 'GET',
            'callback' => [$exceptions, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/attendance-exceptions/update', [
            'methods' => 'PUT',
            'callback' => [$exceptions, 'updateByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
