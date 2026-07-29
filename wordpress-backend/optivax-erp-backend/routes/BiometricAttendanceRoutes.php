<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Controllers\BiometricAttendanceController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Repositories\ItBiometricEmployeeMapRepository;
use OptivaxERP\Repositories\ItBiometricPunchRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/it/devices/{deviceId}/punches/*, /it/punches/*,
 * /it/biometric-mapping/* — the biometric device integration. The two
 * `/punches/*` device-scoped actions have real logic
 * (BiometricAttendanceController); the raw-punch viewer and the biometric-
 * mapping CRUD are plain BaseCrudController passthroughs on the existing
 * 'it_support' RBAC domain, same as every other IT Support resource in
 * ItSupportRoutes.php.
 */
final class BiometricAttendanceRoutes
{
    public static function register(): void
    {
        $ns = OPTIVAX_ERP_NAMESPACE;
        $controller = new BiometricAttendanceController();
        $deviceIdPattern = '/it/devices/(?P<deviceId>[a-zA-Z0-9-]+)';

        // ── Device punch ingestion + reprocess ────────────────────────────
        register_rest_route($ns, $deviceIdPattern . '/punches/import', [
            'methods' => 'POST',
            'callback' => [$controller, 'importPunches'],
            // Device-key auth happens inside the controller (DeviceApiKeyMiddleware)
            // — same '__return_true' + in-handler auth pattern every other
            // route in this plugin uses, so 401/403 responses keep our exact
            // envelope shape (see AuthRoutes's doc comment for the precedent).
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, $deviceIdPattern . '/punches/reprocess', [
            'methods' => 'POST',
            'callback' => [$controller, 'reprocessDevice'],
            'permission_callback' => '__return_true',
        ]);

        // ── Real ZKTeco TCP connector actions (DeviceSyncService) ──────────
        register_rest_route($ns, $deviceIdPattern . '/test-connection', [
            'methods' => 'POST',
            'callback' => [$controller, 'testConnection'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, $deviceIdPattern . '/live-sync', [
            'methods' => 'POST',
            'callback' => [$controller, 'liveSyncDevice'],
            'permission_callback' => '__return_true',
        ]);

        // ── Raw punch viewer (read-only) ──────────────────────────────────
        $punches = new BaseCrudController(new ItBiometricPunchRepository(), 'it_support');

        register_rest_route($ns, '/it/punches/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($punches) {
                return $punches->listHandler($request, [
                    'id' => 'id',
                    'deviceId' => 'device_id',
                    'mappedUserId' => 'mapped_user_id',
                    'attendanceDate' => 'attendance_date',
                    'punchType' => 'punch_type',
                    'processedStatus' => 'processed_status',
                ], 'punch_time_utc DESC');
            },
            'permission_callback' => '__return_true',
        ]);

        // ── Biometric employee mapping ────────────────────────────────────
        $mapping = new BaseCrudController(new ItBiometricEmployeeMapRepository(), 'it_support');

        register_rest_route($ns, '/it/biometric-mapping/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($mapping) {
                return $mapping->listHandler($request, [
                    'id' => 'id',
                    'deviceId' => 'device_id',
                    'biometricUserId' => 'biometric_user_id',
                    'internalUserId' => 'internal_user_id',
                    'status' => 'status',
                ], 'created_at DESC');
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/biometric-mapping/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($mapping) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'biometricUserId' => ['required'],
                    'internalUserId' => ['required'],
                    'status' => [['in', ['active', 'inactive']]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $mapping->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/biometric-mapping/update', [
            'methods' => 'PUT',
            'callback' => [$mapping, 'updateByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/it/biometric-mapping/delete', [
            'methods' => 'DELETE',
            'callback' => [$mapping, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
