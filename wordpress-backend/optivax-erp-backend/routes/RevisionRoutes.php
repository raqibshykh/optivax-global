<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Repositories\RevisionRepository;

if (!defined('ABSPATH')) {
    exit;
}

/** No delete endpoint exists in the frontend contract (RevisionService has no delete()) — none is registered here. */
final class RevisionRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new RevisionRepository(), 'revisions');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/revisions/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                return $controller->listHandler($request, [
                    'clientId' => 'client_id',
                    'projectId' => 'project_id',
                ]);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/revisions/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'projectId' => ['required'],
                    'clientId' => ['required'],
                    'comment' => ['required'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/revisions/update', [
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
    }
}
