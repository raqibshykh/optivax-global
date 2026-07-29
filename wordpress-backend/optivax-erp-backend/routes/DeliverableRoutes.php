<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Repositories\DeliverableRepository;

if (!defined('ABSPATH')) {
    exit;
}

/** No delete endpoint exists in the frontend contract (DeliverableService has no delete()) — none is registered here. */
final class DeliverableRoutes
{
    private const STATUSES = ['Pending', 'In Progress', 'Review', 'Approved', 'Delivered'];

    public static function register(): void
    {
        $controller = new BaseCrudController(new DeliverableRepository(), 'production');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/deliverables/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                // A `client`-role caller must never see another client's
                // deliverables via ?clientId= — force it to their own resolved id.
                $claims = AuthMiddleware::currentClaims();
                $forced = $claims
                    ? ClientScopeMiddleware::forcedFilter('client_id', (string) ($claims['role'] ?? ''), (int) ($claims['sub'] ?? 0), (string) ($claims['email'] ?? ''))
                    : [];

                return $controller->listHandler($request, [
                    'id' => 'id',
                    'clientId' => 'client_id',
                    'projectId' => 'project_id',
                ], null, $forced);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/deliverables/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'clientId' => ['required'],
                    'title' => ['required'],
                    'status' => [['in', self::STATUSES]],
                    'dueDate' => ['date'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/deliverables/update', [
            'methods' => 'PUT',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'id' => ['required'],
                    'status' => [['in', self::STATUSES]],
                    'dueDate' => ['date'],
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
