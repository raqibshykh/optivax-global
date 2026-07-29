<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Repositories\ShiftRepository;

if (!defined('ABSPATH')) {
    exit;
}

final class ShiftRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new ShiftRepository(), 'system');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/shifts/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/shifts/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'departmentId' => ['required'],
                    'shiftName' => ['required'],
                    'startTime' => ['required'],
                    'endTime' => ['required'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/shifts/update', [
            'methods' => 'PUT',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'id' => ['required'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->updateByBodyIdHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/shifts/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
