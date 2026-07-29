<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Repositories\HolidayRepository;

if (!defined('ABSPATH')) {
    exit;
}

final class CompanyHolidayRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new HolidayRepository(), 'system');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/company-holidays/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/company-holidays/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'date' => ['required', 'date'],
                    'label' => ['required'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/company-holidays/update', [
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

        register_rest_route($ns, '/company-holidays/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
