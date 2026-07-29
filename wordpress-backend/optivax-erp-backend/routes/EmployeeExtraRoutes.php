<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\EmployeeExtraController;

if (!defined('ABSPATH')) {
    exit;
}

final class EmployeeExtraRoutes
{
    public static function register(): void
    {
        $controller = new EmployeeExtraController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/hr/employee-extra', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'list'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'overwriteAll'],
                'permission_callback' => '__return_true',
            ],
        ]);

        // Registered as a distinct path pattern from the one above — WP route
        // matching picks whichever regex matches the request path, so the
        // parameterized and non-parameterized PUT routes coexist fine.
        register_rest_route($ns, '/hr/employee-extra/(?P<id>[\w-]+)', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateOne'],
            'permission_callback' => '__return_true',
        ]);
    }
}
