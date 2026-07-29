<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\AutomationController;

if (!defined('ABSPATH')) {
    exit;
}

final class AutomationRoutes
{
    public static function register(): void
    {
        $controller = new AutomationController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/automation/workflows', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/automation/workflows', [
            'methods' => 'POST',
            'callback' => [$controller, 'create'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/automation/workflows/(?P<id>[^/]+)', [
            'methods' => 'PATCH',
            'callback' => [$controller, 'toggle'],
            'permission_callback' => '__return_true',
        ]);
    }
}
