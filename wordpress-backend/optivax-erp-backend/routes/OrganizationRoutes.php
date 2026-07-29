<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Repositories\OrganizationRepository;

if (!defined('ABSPATH')) {
    exit;
}

/** List-only per organizationService.ts — no create/update/delete in the frontend contract. */
final class OrganizationRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new OrganizationRepository(), 'system');

        register_rest_route(OPTIVAX_ERP_NAMESPACE, '/organizations/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
