<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\AttendanceController;

if (!defined('ABSPATH')) {
    exit;
}

final class AttendanceRoutes
{
    public static function register(): void
    {
        $controller = new AttendanceController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/attendance/year/(?P<year>\d{4})', [
            'methods' => 'GET',
            'callback' => [$controller, 'year'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/attendance/audit', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'auditList'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'auditCreate'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/attendance/self', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'selfList'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'selfCreate'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/attendance/self/(?P<id>[\w-]+)', [
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'selfUpdate'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$controller, 'selfDelete'],
                'permission_callback' => '__return_true',
            ],
        ]);
    }
}
