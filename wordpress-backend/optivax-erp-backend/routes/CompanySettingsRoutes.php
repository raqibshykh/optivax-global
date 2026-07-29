<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\CompanySettingsController;

if (!defined('ABSPATH')) {
    exit;
}

final class CompanySettingsRoutes
{
    public static function register(): void
    {
        $controller = new CompanySettingsController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/company-settings', [
            'methods' => 'GET',
            'callback' => [$controller, 'get'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/company-settings', [
            'methods' => 'PUT',
            'callback' => [$controller, 'put'],
            'permission_callback' => '__return_true',
        ]);
    }
}
