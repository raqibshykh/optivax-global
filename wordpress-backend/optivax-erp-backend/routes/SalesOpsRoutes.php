<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\SalesOpsController;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Every route uses permission_callback => '__return_true' — see the doc
 * comment on AuthMiddleware for why authn/z happens inside the controller
 * instead (it's the only way to guarantee the {success,data,error} envelope
 * on 401/403 responses). Covers the three salesOpsService.ts sub-resources:
 * campaigns, targets, tasks.
 */
final class SalesOpsRoutes
{
    public static function register(): void
    {
        $controller = new SalesOpsController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        // ── Campaigns ──────────────────────────────────────────────────
        register_rest_route($ns, '/sales/campaigns/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'campaignsList'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/campaigns/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'campaignsCreate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/campaigns/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'campaignsUpdate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/campaigns/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'campaignsDelete'],
            'permission_callback' => '__return_true',
        ]);

        // ── Targets ────────────────────────────────────────────────────
        register_rest_route($ns, '/sales/targets/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'targetsList'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/targets/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'targetsCreate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/targets/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'targetsUpdate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/targets/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'targetsDelete'],
            'permission_callback' => '__return_true',
        ]);

        // ── Tasks ──────────────────────────────────────────────────────
        register_rest_route($ns, '/sales/tasks/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'tasksList'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/tasks/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'tasksCreate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/tasks/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'tasksUpdate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/sales/tasks/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'tasksDelete'],
            'permission_callback' => '__return_true',
        ]);
    }
}
