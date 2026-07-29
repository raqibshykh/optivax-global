<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Repositories\SalesCampaignRepository;
use OptivaxERP\Repositories\SalesTargetRepository;
use OptivaxERP\Repositories\SalesTaskRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Bundles three sub-resources (campaigns, targets, tasks) behind one
 * controller, mirroring how src/services/salesOpsService.ts bundles
 * CampaignService/SalesTargetService/SalesTaskService in a single file.
 * Each sub-resource delegates to its own BaseCrudController instance (bare,
 * non-wrapped responses — no {campaigns:[...]} envelope, matching
 * salesOpsService.ts's `api.get<CampaignBudget[]>` etc.), all gated on the
 * 'sales' RBAC domain.
 */
final class SalesOpsController
{
    private BaseCrudController $campaigns;
    private BaseCrudController $targets;
    private BaseCrudController $tasks;

    public function __construct()
    {
        $this->campaigns = new BaseCrudController(new SalesCampaignRepository(), 'sales');
        $this->targets = new BaseCrudController(new SalesTargetRepository(), 'sales');
        $this->tasks = new BaseCrudController(new SalesTaskRepository(), 'sales');
    }

    // ── Campaigns ── GET /sales/campaigns/list[?id][&assignedTo] ──────────

    public function campaignsList(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->campaigns->listHandler($request, ['id' => 'id', 'assignedTo' => 'assignedTo'], 'created_at DESC');
    }

    public function campaignsCreate(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->campaigns->createHandler($request);
    }

    public function campaignsUpdate(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->campaigns->updateByBodyIdHandler($request);
    }

    public function campaignsDelete(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->campaigns->deleteByBodyIdHandler($request);
    }

    // ── Targets ── GET /sales/targets/list[?id][&memberId] ────────────────

    public function targetsList(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->targets->listHandler($request, ['id' => 'id', 'memberId' => 'member_id'], 'created_at DESC');
    }

    public function targetsCreate(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->targets->createHandler($request);
    }

    public function targetsUpdate(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->targets->updateByBodyIdHandler($request);
    }

    public function targetsDelete(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->targets->deleteByBodyIdHandler($request);
    }

    // ── Tasks ── GET /sales/tasks/list[?id][&assignedTo] ───────────────────

    public function tasksList(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->tasks->listHandler($request, ['id' => 'id', 'assignedTo' => 'assigned_to'], 'created_at DESC');
    }

    public function tasksCreate(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->tasks->createHandler($request);
    }

    public function tasksUpdate(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->tasks->updateByBodyIdHandler($request);
    }

    public function tasksDelete(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->tasks->deleteByBodyIdHandler($request);
    }
}
