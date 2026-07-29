<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\AutomationEngine;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Repositories\ProjectRepository;

if (!defined('ABSPATH')) {
    exit;
}

final class ProjectRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new ProjectRepository(), 'production');
        $ns = OPTIVAX_ERP_NAMESPACE;

        $createRules = [
            'clientId' => ['required', 'uuid'],
            'name' => ['required'],
            'status' => [['in', ['not-started', 'in-progress', 'completed', 'on-hold']]],
            'priority' => [['in', ['low', 'medium', 'high']]],
            'startDate' => ['date'],
            'deadline' => ['date'],
            'progress' => [['min', 0], ['max', 100]],
        ];

        register_rest_route($ns, '/projects/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                // A `client`-role caller must never see another client's
                // projects via ?clientId= — force it to their own resolved id.
                $claims = AuthMiddleware::currentClaims();
                $forced = $claims
                    ? ClientScopeMiddleware::forcedFilter('client_id', (string) ($claims['role'] ?? ''), (int) ($claims['sub'] ?? 0), (string) ($claims['email'] ?? ''))
                    : [];

                // 'assignedTo' -> 'assigned_to' is recognized by ProjectRepository::list()'s
                // JSON_CONTAINS override, not treated as a plain equality column.
                return $controller->listHandler($request, [
                    'id' => 'id',
                    'clientId' => 'client_id',
                    'assignedTo' => 'assigned_to',
                ], null, $forced);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/projects/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller, $createRules) {
                $errors = Validator::check($request->get_json_params() ?: [], $createRules);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/projects/update', [
            'methods' => 'PUT',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $data = $request->get_json_params() ?: [];
                $errors = Validator::check($data, [
                    'id' => ['required'],
                    'status' => [['in', ['not-started', 'in-progress', 'completed', 'on-hold']]],
                    'priority' => [['in', ['low', 'medium', 'high']]],
                    'startDate' => ['date'],
                    'deadline' => ['date'],
                    'progress' => [['min', 0], ['max', 100]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->updateByBodyIdHandler($request, null, static function (?array $before, array $updated): void {
                    // Only fire when status is *newly* completed this call —
                    // without the $before comparison, every subsequent
                    // no-op save of an already-completed project would
                    // re-fire the event.
                    $wasComplete = $before && ($before['status'] ?? null) === 'completed';
                    if (($updated['status'] ?? null) === 'completed' && !$wasComplete) {
                        AutomationEngine::fire('project_complete', $updated);
                    }
                });
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/projects/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
