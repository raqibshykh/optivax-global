<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\AuthController;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Every route uses permission_callback => '__return_true' — see the doc
 * comment on AuthMiddleware for why authn/z happens inside the controller
 * instead (it's the only way to guarantee the {success,data,error} envelope
 * on 401/403 responses). There is no public signup route — accounts are
 * only created by an authorized ERP user via /profiles/create.
 */
final class AuthRoutes
{
    public static function register(): void
    {
        $controller = new AuthController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/auth/login', [
            'methods' => 'POST',
            'callback' => [$controller, 'login'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/session', [
            'methods' => 'GET',
            'callback' => [$controller, 'session'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/logout', [
            'methods' => 'POST',
            'callback' => [$controller, 'logout'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/logout-all', [
            'methods' => 'POST',
            'callback' => [$controller, 'logoutAll'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/refresh', [
            'methods' => 'POST',
            'callback' => [$controller, 'refresh'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/change-password', [
            'methods' => 'POST',
            'callback' => [$controller, 'changePassword'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/request-reset', [
            'methods' => 'POST',
            'callback' => [$controller, 'requestReset'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/confirm-reset', [
            'methods' => 'POST',
            'callback' => [$controller, 'confirmReset'],
            'permission_callback' => '__return_true',
        ]);
    }
}
