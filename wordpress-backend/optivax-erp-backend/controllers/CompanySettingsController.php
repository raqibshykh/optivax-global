<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\CompanySettingsRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/company-settings (GET/PUT only — no list/create/delete,
 * since this is a singleton row). Too small and shaped too differently from
 * BaseCrudController's list/find/create/update/delete surface to reuse it,
 * hence its own thin wrapper around CompanySettingsRepository.
 */
final class CompanySettingsController
{
    private CompanySettingsRepository $repo;

    public function __construct()
    {
        $this->repo = new CompanySettingsRepository();
    }

    public function get(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('system', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->repo->get());
    }

    public function put(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('system', 'EDIT');
        if ($guard) {
            return $guard;
        }
        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'name' => ['required'],
            'email' => ['email'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        $this->repo->put($data);
        return ApiResponse::ok($this->repo->get());
    }
}
