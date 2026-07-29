<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\AutomationWorkflowRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/automation/workflows (automationService.ts). Response
 * shapes are wrapped ({workflows: [...]}, {workflow: {...}}) rather than
 * bare arrays/objects, matching AutomationService.getAll()/create()'s
 * unwrapping — the only reason this isn't BaseCrudController directly.
 * Gated on the 'system' RBAC domain per the finalized domain mapping.
 */
final class AutomationController
{
    private AutomationWorkflowRepository $repo;

    public function __construct()
    {
        $this->repo = new AutomationWorkflowRepository();
    }

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('system', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok(['workflows' => $this->repo->list()]);
    }

    /** PATCH /automation/workflows/{id} — toggles just the `enabled` boolean. */
    public function toggle(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('system', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $data = $request->get_json_params() ?: [];
        $updated = $this->repo->update($id, ['enabled' => $data['enabled'] ?? false]);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($updated);
    }

    public function create(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('system', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $created = $this->repo->create($data);
        return ApiResponse::ok(['workflow' => $created], [], 201);
    }
}
