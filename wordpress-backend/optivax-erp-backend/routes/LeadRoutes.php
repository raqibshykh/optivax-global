<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\LeadController;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Every route uses permission_callback => '__return_true' — see the doc
 * comment on AuthMiddleware for why authn/z happens inside the controller
 * instead (it's the only way to guarantee the {success,data,error} envelope
 * on 401/403 responses).
 */
final class LeadRoutes
{
    public static function register(): void
    {
        $controller = new LeadController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/leads/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/leads/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'create'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/leads/convert', [
            'methods' => 'POST',
            'callback' => [$controller, 'convert'],
            'permission_callback' => '__return_true',
        ]);

        // Registered after the more specific literal routes above so
        // /leads/list, /leads/create, /leads/convert don't get swallowed by
        // this {id} wildcard.
        register_rest_route($ns, '/leads/(?P<id>[\w-]+)', [
            'methods' => 'GET',
            'callback' => [$controller, 'find'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/leads/(?P<id>[\w-]+)', [
            'methods' => 'PUT',
            'callback' => [$controller, 'update'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/leads/(?P<id>[\w-]+)', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'delete'],
            'permission_callback' => '__return_true',
        ]);
    }
}
