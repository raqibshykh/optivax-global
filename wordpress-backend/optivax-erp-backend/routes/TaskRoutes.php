<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Notifications\NotificationService;
use OptivaxERP\Repositories\TaskRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/tasks — note this is the base path itself (TaskService.getAll()
 * calls api.get(BASE, {params})), not /tasks/list, and update/delete are
 * REST-verb-style (/tasks/{id}) rather than RPC-suffix-style.
 */
final class TaskRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new TaskRepository(), 'production');
        $ns = OPTIVAX_ERP_NAMESPACE;
        $idPattern = '/tasks/(?P<id>[a-zA-Z0-9-]+)';

        register_rest_route($ns, '/tasks', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                // TaskService.getAll(params) forwards an arbitrary query-param bag;
                // only the columns that actually exist on `tasks` are recognized.
                // Opt-in extras (backward compatible — see BaseCrudController::
                // listHandler's doc comment): ?q=<term> searches title/description;
                // ?page=&perPage= paginates; ?sortBy=<any column above> re-orders.
                return $controller->listHandler($request, [
                    'id' => 'id',
                    'status' => 'status',
                    'priority' => 'priority',
                    'category' => 'category',
                    'projectId' => 'project_id',
                    'assigneeId' => 'assignee_id',
                    'assignedTo' => 'assigned_to',
                    'createdBy' => 'created_by',
                ], null, [], ['title', 'description']);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/tasks', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'title' => ['required'],
                    'status' => [['in', ['todo', 'in-progress', 'done', 'blocked']]],
                    'priority' => [['in', ['low', 'medium', 'high']]],
                    'category' => [['in', ['general', 'campaign', 'content', 'analytics']]],
                    'dueDate' => ['date'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request, static function (array $created): void {
                    self::notifyAssigneeIfChanged(null, $created);
                });
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, $idPattern, [
            'methods' => 'PUT',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'status' => [['in', ['todo', 'in-progress', 'done', 'blocked']]],
                    'priority' => [['in', ['low', 'medium', 'high']]],
                    'category' => [['in', ['general', 'campaign', 'content', 'analytics']]],
                    'dueDate' => ['date'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }

                // 'production' EDIT is held by both production_admin (who
                // administers every task) and production_member (who should
                // only ever touch their own assigned tasks). Holding
                // 'production' DELETE is what distinguishes the admin tier
                // (only production_admin/super_admin have it) — everyone
                // else is restricted to editing a task they're assigned to.
                $ownershipCheck = RbacMiddleware::authorize('production', 'DELETE') === null
                    ? null
                    : ['assigneeId' => (string) AuthMiddleware::currentUserId()];

                return $controller->updateByRouteIdHandler($request, $ownershipCheck, static function (?array $before, array $updated): void {
                    self::notifyAssigneeIfChanged($before, $updated);
                });
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, $idPattern, [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteByRouteIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }

    /**
     * Phase 8 M3: "notifications are never triggered server-side by real
     * business events ... task assignment" — notifies the assignee once,
     * only when assigneeId is newly set or changed to someone new (never on
     * an unrelated edit of an already-assigned task, and never for a
     * self-assignment).
     */
    private static function notifyAssigneeIfChanged(?array $before, array $task): void
    {
        $assigneeId = (string) ($task['assigneeId'] ?? '');
        if ($assigneeId === '') {
            return;
        }
        $previousAssigneeId = $before ? (string) ($before['assigneeId'] ?? '') : '';
        if ($assigneeId === $previousAssigneeId) {
            return;
        }
        if ($assigneeId === (string) AuthMiddleware::currentUserId()) {
            return;
        }

        NotificationService::create([
            'userId' => $assigneeId,
            'type' => 'system',
            'module' => 'tasks',
            'title' => 'New task assigned',
            'message' => 'You were assigned to: ' . ($task['title'] ?? 'a task'),
            'actionUrl' => null,
            'actionLabel' => null,
        ]);
    }
}
