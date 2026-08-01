<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\ApiResponse;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Registered on WP-native `rest_pre_dispatch` (fires after routing, so
 * $request->get_route() is available — unlike `rest_authentication_errors`,
 * which fires earlier with no route info and is why it can't implement an
 * allow-list). Centrally blocks every route in this plugin's own namespace
 * except an explicit allow-list whenever the authenticated user's
 * users_mapping.must_change_password flag is set — a single enforcement
 * point instead of touching every controller, so it can't be bypassed by
 * hitting some other endpoint directly.
 */
final class PasswordGateMiddleware
{
    private const ALLOWED_ROUTES = [
        'auth/login',
        'auth/logout',
        'auth/logout-all',
        'auth/refresh',
        'auth/session',
        'auth/change-password',
        // change-password requires the user's *current* password, which is
        // exactly what a must-change-password user who has also forgotten
        // their password doesn't have — without these two, that user has no
        // way out of the gate at all.
        'auth/request-reset',
        'auth/confirm-reset',
    ];

    public static function enforce($result, $server, \WP_REST_Request $request)
    {
        if ($result !== null) {
            return $result;
        }

        $route = ltrim($request->get_route(), '/');
        $prefix = OPTIVAX_ERP_NAMESPACE . '/';
        if (strpos($route, $prefix) !== 0) {
            return null; // not this plugin's route — never touch WP core / other plugins
        }
        if (in_array(substr($route, strlen($prefix)), self::ALLOWED_ROUTES, true)) {
            return null;
        }

        $mapping = AuthMiddleware::currentMapping();
        if (!$mapping) {
            return null; // unauthenticated — let the controller's own check produce its 401
        }
        if (!empty($mapping['must_change_password'])) {
            return ApiResponse::error('Password change required before continuing', 403, ['code' => 'must_change_password']);
        }

        return null;
    }
}
