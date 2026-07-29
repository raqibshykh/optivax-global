<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\StripeController;

if (!defined('ABSPATH')) {
    exit;
}

final class StripeRoutes
{
    public static function register(): void
    {
        $controller = new StripeController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/config/stripe', [
            'methods' => 'GET',
            'callback' => [$controller, 'getConfig'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/settings/stripe', [
            'methods' => 'POST',
            'callback' => [$controller, 'saveConfig'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/create-payment-intent', [
            'methods' => 'POST',
            'callback' => [$controller, 'createPaymentIntent'],
            'permission_callback' => '__return_true',
        ]);
    }
}
