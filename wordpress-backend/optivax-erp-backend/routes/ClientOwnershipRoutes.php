<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\ClientOwnershipController;

if (!defined('ABSPATH')) {
    exit;
}

final class ClientOwnershipRoutes
{
    public static function register(): void
    {
        $controller = new ClientOwnershipController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/client-ownership/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/client-ownership/history', [
            'methods' => 'GET',
            'callback' => [$controller, 'history'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/client-ownership/assign', [
            'methods' => 'POST',
            'callback' => [$controller, 'assign'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/client-ownership/remove', [
            'methods' => 'POST',
            'callback' => [$controller, 'remove'],
            'permission_callback' => '__return_true',
        ]);
    }
}
