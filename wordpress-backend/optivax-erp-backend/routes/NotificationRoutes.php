<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\NotificationStreamController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Notifications\NotificationService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Thin wiring over the already-built NotificationService (notifications/NotificationService.php)
 * — no controller class needed since there's no repository/DTO translation
 * for this route file to own, just a guard in front of each existing static
 * method before handing off.
 *
 * mark-read/mark-all-read/delete/delete-all are gated on "authenticated +
 * owns the target row/userId", not the 'notifications' domain's EDIT/DELETE
 * actions — src/utils/rbac.ts's RBAC_MATRIX grants VIEW/CREATE on
 * 'notifications' broadly but EDIT/DELETE to no role except super_admin, so
 * gating on RbacMiddleware::authorize(...,'EDIT'/'DELETE') would make it
 * impossible for any regular user to ever mark their own notification read
 * or delete it — notifications are inherently self-managed.
 */
final class NotificationRoutes
{
    public static function register(): void
    {
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/notifications/stream', [
            'methods' => 'GET',
            'callback' => [new NotificationStreamController(), 'stream'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/list', [
            'methods' => 'GET',
            'callback' => function (\WP_REST_Request $request) {
                $guard = RbacMiddleware::authorize('notifications', 'VIEW');
                if ($guard) {
                    return $guard;
                }

                // Notifications are inherently self-managed (see this file's
                // class doc comment — EDIT/DELETE on 'notifications' is
                // granted to nobody but super_admin). The read path must
                // follow the same rule: a caller may only list their own
                // notifications, or every user's inbox could be dumped by
                // supplying an arbitrary ?userId= (or none at all).
                $requestedUserId = $request->get_param('userId');
                $ownUserId = (string) AuthMiddleware::currentUserId();
                if ($requestedUserId !== null && (string) $requestedUserId !== $ownUserId) {
                    $guard = RbacMiddleware::authorize('notifications', 'EDIT');
                    if ($guard) {
                        return $guard;
                    }
                    return ApiResponse::ok(NotificationService::list((string) $requestedUserId));
                }

                return ApiResponse::ok(NotificationService::list($ownUserId));
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/update', [
            'methods' => 'PUT',
            'callback' => function (\WP_REST_Request $request) {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                $data = $request->get_json_params() ?: [];
                $id = $data['id'] ?? null;
                if (!$id) {
                    return ApiResponse::validationError('Missing "id" in request body');
                }
                $row = NotificationService::find((string) $id);
                if (!$row) {
                    return ApiResponse::notFound();
                }
                if ($row['userId'] !== (string) AuthMiddleware::currentUserId()) {
                    $guard = RbacMiddleware::authorize('notifications', 'EDIT');
                    if ($guard) {
                        return $guard;
                    }
                }
                NotificationService::markRead((string) $id);
                return ApiResponse::ok(null);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/mark-all-read', [
            'methods' => 'PUT',
            'callback' => function (\WP_REST_Request $request) {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                $data = $request->get_json_params() ?: [];
                $userId = $data['userId'] ?? null;
                if (!$userId) {
                    return ApiResponse::validationError('Missing "userId" in request body');
                }
                if ((string) $userId !== (string) AuthMiddleware::currentUserId()) {
                    $guard = RbacMiddleware::authorize('notifications', 'EDIT');
                    if ($guard) {
                        return $guard;
                    }
                }
                NotificationService::markAllRead((string) $userId);
                return ApiResponse::ok(null);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/create', [
            'methods' => 'POST',
            'callback' => function (\WP_REST_Request $request) {
                $guard = RbacMiddleware::authorize('notifications', 'CREATE');
                if ($guard) {
                    return $guard;
                }
                $data = $request->get_json_params() ?: [];
                $errors = Validator::check($data, [
                    'userId' => ['required'],
                    'type' => ['required', ['in', ['invoice', 'project', 'payment', 'system', 'profile']]],
                    'title' => ['required'],
                    'message' => ['required'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return ApiResponse::ok(NotificationService::create($data), [], 201);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/delete', [
            'methods' => 'DELETE',
            'callback' => function (\WP_REST_Request $request) {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                $data = $request->get_json_params() ?: [];
                $id = $data['id'] ?? null;
                if (!$id) {
                    return ApiResponse::validationError('Missing "id" in request body');
                }
                $row = NotificationService::find((string) $id);
                if (!$row) {
                    return ApiResponse::notFound();
                }
                if ($row['userId'] !== (string) AuthMiddleware::currentUserId()) {
                    $guard = RbacMiddleware::authorize('notifications', 'DELETE');
                    if ($guard) {
                        return $guard;
                    }
                }
                NotificationService::delete((string) $id);
                return ApiResponse::ok(null);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/delete-all', [
            'methods' => 'DELETE',
            'callback' => function (\WP_REST_Request $request) {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                $data = $request->get_json_params() ?: [];
                $userId = $data['userId'] ?? null;
                if (!$userId) {
                    return ApiResponse::validationError('Missing "userId" in request body');
                }
                if ((string) $userId !== (string) AuthMiddleware::currentUserId()) {
                    $guard = RbacMiddleware::authorize('notifications', 'DELETE');
                    if ($guard) {
                        return $guard;
                    }
                }
                NotificationService::deleteAll((string) $userId);
                return ApiResponse::ok(null);
            },
            'permission_callback' => '__return_true',
        ]);
    }
}
