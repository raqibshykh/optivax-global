<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\RbacMatrix;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
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

        // Deliberately NOT $controller->listHandler() — that gates on 'system'
        // VIEW, which almost no role holds (only super_admin/production_admin/
        // it_admin/management), yet every authenticated user needs this list
        // to resolve department NAMES for display (DepartmentContext fetches
        // it app-wide for exactly that reason — see its own doc comment).
        // Department rows carry no sensitive data (id/name/domain/status/
        // description — same shape ProfileController::list() already exposes
        // department-adjacent employee data through on an auth-only gate), so
        // this mirrors that existing precedent instead of introducing a new
        // permission model: authenticate, then return the list, full stop.
        // Was the actual root cause of "Unknown Department" appearing for
        // every employee regardless of role — the department_id data was
        // already correct, but this 403'd for the roles rendering it, and the
        // callers (DepartmentContext, Employees.tsx) silently swallow that
        // into an empty list. Mutations (create/update/delete) below remain
        // gated on 'system', unchanged — only the read is opened up.
        register_rest_route($ns, '/departments/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request): \WP_REST_Response {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                return ApiResponse::ok((new DepartmentRepository())->list());
            },
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
