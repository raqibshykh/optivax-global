<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Repositories\ContentCalendarRepository;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/content-calendar/* (src/services/contentCalendarService.ts). */
final class ContentCalendarRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new ContentCalendarRepository(), 'marketing');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/content-calendar/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/content-calendar/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'title' => ['required'],
                    'platform' => ['required'],
                    'scheduledDate' => ['date'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/content-calendar/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/content-calendar/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
