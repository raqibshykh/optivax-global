<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\LeaveRequestController;

if (!defined('ABSPATH')) {
    exit;
}

final class LeaveRequestRoutes
{
    public static function register(): void
    {
        $controller = new LeaveRequestController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        // HR full-lifecycle leave requests.
        register_rest_route($ns, '/leave-requests', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listHr'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'createHr'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/leave-requests/(?P<id>[\w-]+)', [
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'updateHr'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$controller, 'deleteHr'],
                'permission_callback' => '__return_true',
            ],
        ]);

        // Employee self-submitted leave requests.
        register_rest_route($ns, '/hr/employee-leave-requests', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listEmployee'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'createEmployee'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/hr/employee-leave-requests/(?P<id>[\w-]+)', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateEmployee'],
            'permission_callback' => '__return_true',
        ]);
    }
}
