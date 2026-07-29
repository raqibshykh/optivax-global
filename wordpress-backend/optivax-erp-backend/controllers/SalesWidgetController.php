<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\SalesWidgetRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/sales-widget/* (src/services/salesWidgetService.ts) — the
 * small SalesPanel "at a glance" widgets. All responses are bare arrays/objects
 * (no envelope wrapping), matching `api.get<SalesLead[]>` etc. Deals and
 * commissions are read-only in the frontend, so only VIEW is gated for them.
 */
final class SalesWidgetController
{
    private SalesWidgetRepository $repo;

    public function __construct()
    {
        $this->repo = new SalesWidgetRepository();
    }

    /** GET /sales-widget/leads */
    public function listLeads(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->repo->listLeads());
    }

    /** POST /sales-widget/leads */
    public function createLead(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        return ApiResponse::ok($this->repo->createLead($data), [], 201);
    }

    /** GET /sales-widget/deals — read-only, no create/update/delete in the frontend. */
    public function listDeals(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->repo->listDeals());
    }

    /** GET /sales-widget/commissions — read-only, no create/update/delete in the frontend. */
    public function listCommissions(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->repo->listCommissions());
    }
}
