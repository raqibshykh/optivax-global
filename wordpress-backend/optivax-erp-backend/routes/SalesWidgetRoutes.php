<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\SalesWidgetController;

if (!defined('ABSPATH')) {
    exit;
}

final class SalesWidgetRoutes
{
    public static function register(): void
    {
        $controller = new SalesWidgetController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/sales-widget/leads', [
            'methods' => 'GET',
            'callback' => [$controller, 'listLeads'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales-widget/leads', [
            'methods' => 'POST',
            'callback' => [$controller, 'createLead'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales-widget/deals', [
            'methods' => 'GET',
            'callback' => [$controller, 'listDeals'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales-widget/commissions', [
            'methods' => 'GET',
            'callback' => [$controller, 'listCommissions'],
            'permission_callback' => '__return_true',
        ]);
    }
}
