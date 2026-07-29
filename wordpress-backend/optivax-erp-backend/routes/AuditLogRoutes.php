<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\AuditLogController;

if (!defined('ABSPATH')) {
    exit;
}

final class AuditLogRoutes
{
    public static function register(): void
    {
        $controller = new AuditLogController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/audit-logs/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/audit-logs/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'create'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/audit-logs/search', [
            'methods' => 'GET',
            'callback' => [$controller, 'search'],
            'permission_callback' => '__return_true',
        ]);
    }
}
