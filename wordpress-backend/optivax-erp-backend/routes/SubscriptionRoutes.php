<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Repositories\SubscriptionRepository;

if (!defined('ABSPATH')) {
    exit;
}

/** List-only per subscriptionService.ts — no create/update/delete in the frontend contract. */
final class SubscriptionRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new SubscriptionRepository(), 'system');

        register_rest_route(OPTIVAX_ERP_NAMESPACE, '/subscriptions/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
