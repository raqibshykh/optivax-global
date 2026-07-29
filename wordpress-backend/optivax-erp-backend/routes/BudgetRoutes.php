<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BudgetController;

if (!defined('ABSPATH')) {
    exit;
}

final class BudgetRoutes
{
    public static function register(): void
    {
        $controller = new BudgetController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/budget/company', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'getCompany'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'putCompany'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/budget/company/reset', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'resetCompany'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/budget/departments', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listDepartments'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'putDepartments'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/budget/members', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listMembers'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'putMembers'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/budget/requests', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listRequests'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'createRequest'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'putRequests'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/budget/returns', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listReturns'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'createReturn'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/budget/audit', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listAudit'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'createAudit'],
                'permission_callback' => '__return_true',
            ],
        ]);
    }
}
