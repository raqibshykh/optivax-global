<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\SocialTrackingController;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/social-links/* and /saas/v1/social-analytics/* (src/services/socialTrackingService.ts). */
final class SocialTrackingRoutes
{
    public static function register(): void
    {
        $controller = new SocialTrackingController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/social-links/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listLinks'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/social-links/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'createLink'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/social-links/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateLink'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/social-links/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteLink'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/social-links/track', [
            'methods' => 'POST',
            'callback' => [$controller, 'trackClick'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/social-analytics', [
            'methods' => 'GET',
            'callback' => [$controller, 'getAnalytics'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/social-analytics/account-metrics', [
            'methods' => 'GET',
            'callback' => [$controller, 'getAccountMetrics'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/social-analytics/account-metrics', [
            'methods' => 'POST',
            'callback' => [$controller, 'syncAccountMetrics'],
            'permission_callback' => '__return_true',
        ]);
    }
}
