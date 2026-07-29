<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\RbacMatrix;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Repositories\DepartmentRepository;

if (!defined('ABSPATH')) {
    exit;
}

final class DepartmentRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new DepartmentRepository(), 'system');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/departments/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/departments/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'name' => ['required'],
                    'domain' => ['required', ['in', RbacMatrix::DOMAINS]],
                    'status' => [['in', ['active', 'inactive']]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/departments/update', [
            'methods' => 'PUT',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $data = $request->get_json_params() ?: [];
                $errors = Validator::check($data, [
                    'id' => ['required'],
                    'domain' => [['in', RbacMatrix::DOMAINS]],
                    'status' => [['in', ['active', 'inactive']]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->updateByBodyIdHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/departments/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
