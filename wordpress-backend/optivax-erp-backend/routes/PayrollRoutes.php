<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\PayrollController;

if (!defined('ABSPATH')) {
    exit;
}

final class PayrollRoutes
{
    public static function register(): void
    {
        $controller = new PayrollController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/payroll/salary-slips', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listSalarySlips'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'bulkSaveSalarySlips'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'createSalarySlip'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/payroll/advance-requests', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listAdvanceRequests'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'bulkSaveAdvanceRequests'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/payroll/advance-audit', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'listAdvanceAudit'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'POST',
                'callback' => [$controller, 'createAdvanceAudit'],
                'permission_callback' => '__return_true',
            ],
        ]);
    }
}
