<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\ProductionAssignmentController;

if (!defined('ABSPATH')) {
    exit;
}

final class ProductionAssignmentRoutes
{
    public static function register(): void
    {
        $controller = new ProductionAssignmentController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/production-assignments', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/production-assignments', [
            'methods' => 'PUT',
            'callback' => [$controller, 'save'],
            'permission_callback' => '__return_true',
        ]);
    }
}
