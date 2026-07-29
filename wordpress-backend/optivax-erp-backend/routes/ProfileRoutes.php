<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\ProfileController;

if (!defined('ABSPATH')) {
    exit;
}

final class ProfileRoutes
{
    public static function register(): void
    {
        $controller = new ProfileController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/profiles/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/profiles/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'create'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/profiles/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'update'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/profiles/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'delete'],
            'permission_callback' => '__return_true',
        ]);
    }
}
