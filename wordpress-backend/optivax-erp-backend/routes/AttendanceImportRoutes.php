<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\AttendanceImportController;

if (!defined('ABSPATH')) {
    exit;
}

final class AttendanceImportRoutes
{
    public static function register(): void
    {
        $controller = new AttendanceImportController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/attendance/import/preview', [
            'methods' => 'POST',
            'callback' => [$controller, 'preview'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/attendance/import/confirm', [
            'methods' => 'POST',
            'callback' => [$controller, 'confirm'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/attendance/import/history', [
            'methods' => 'GET',
            'callback' => [$controller, 'history'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/attendance/mapping', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'mappingList'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'mappingCreate'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/attendance/mapping/(?P<id>[\w-]+)', [
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'mappingUpdate'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$controller, 'mappingDelete'],
                'permission_callback' => '__return_true',
            ],
        ]);
    }
}
