<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\ActivityController;

if (!defined('ABSPATH')) {
    exit;
}

final class ActivityRoutes
{
    public static function register(): void
    {
        $controller = new ActivityController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/activity/current', [
            'methods' => 'GET',
            'callback' => [$controller, 'current'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/sessions', [
            'methods' => 'GET',
            'callback' => [$controller, 'sessions'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/heartbeat', [
            'methods' => 'POST',
            'callback' => [$controller, 'heartbeat'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/login', [
            'methods' => 'POST',
            'callback' => [$controller, 'login'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/logout', [
            'methods' => 'POST',
            'callback' => [$controller, 'logout'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/break/start', [
            'methods' => 'POST',
            'callback' => [$controller, 'breakStart'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/break/end', [
            'methods' => 'POST',
            'callback' => [$controller, 'breakEnd'],
            'permission_callback' => '__return_true',
        ]);
    }
}
