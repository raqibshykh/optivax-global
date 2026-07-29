<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\InvoiceController;

if (!defined('ABSPATH')) {
    exit;
}

final class InvoiceRoutes
{
    public static function register(): void
    {
        $controller = new InvoiceController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/invoices/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/invoices/generate', [
            'methods' => 'POST',
            'callback' => [$controller, 'generate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/invoices/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'update'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/invoices/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'delete'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/invoices/stripe-confirm', [
            'methods' => 'POST',
            'callback' => [$controller, 'stripeConfirm'],
            'permission_callback' => '__return_true',
        ]);
    }
}
