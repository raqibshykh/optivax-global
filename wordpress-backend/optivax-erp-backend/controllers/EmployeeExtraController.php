<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\EmployeeExtraRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/hr/employee-extra. GET returns the raw
 * Record<userId, EmployeeExtraData> map (not an array of rows) because that's
 * exactly what src/services/employeeExtraService.ts expects as its unwrapped
 * `data` payload. Gated on the 'hr' RBAC domain throughout.
 */
final class EmployeeExtraController
{
    private EmployeeExtraRepository $repo;
    private string $domain = 'hr';

    public function __construct()
    {
        $this->repo = new EmployeeExtraRepository();
    }

    /** GET /hr/employee-extra */
    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        return ApiResponse::ok($this->repo->getAllAsMap());
    }

    /** PUT /hr/employee-extra/{id} — upserts one user's row. */
    public function updateOne(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $userId = (string) $request->get_param('id');
        $patch = $request->get_json_params() ?: [];
        $this->repo->updateOne($userId, $patch);
        return ApiResponse::ok(null);
    }

    /** PUT /hr/employee-extra (no id) — overwrites the whole map. */
    public function overwriteAll(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $map = $request->get_json_params() ?: [];
        $this->repo->overwriteAll($map);
        return ApiResponse::ok(null);
    }
}
