<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\CommissionController;

if (!defined('ABSPATH')) {
    exit;
}

final class CommissionRoutes
{
    public static function register(): void
    {
        $controller = new CommissionController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/commissions', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/commissions', [
            'methods' => 'POST',
            'callback' => [$controller, 'create'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/commissions', [
            'methods' => 'PUT',
            'callback' => [$controller, 'update'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/commissions', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'delete'],
            'permission_callback' => '__return_true',
        ]);
    }
}
