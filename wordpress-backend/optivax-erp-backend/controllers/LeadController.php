<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\LeadRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/leads/* (src/services/leadService.ts). Unlike the generic
 * BaseCrudController passthrough, list/create/update responses here are
 * wrapped ({leads:[...]}, {lead:{...}}) to match leadService.ts's
 * `api.get<{leads: Lead[]}>` / `api.post<{lead: Lead}>` expectations; find
 * and delete stay bare/null since that's what the service reads.
 */
final class LeadController
{
    private LeadRepository $repo;

    public function __construct()
    {
        $this->repo = new LeadRepository();
    }

    /** GET /leads/list[?assignedTo][&status] */
    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'VIEW');
        if ($guard) {
            return $guard;
        }

        // NOTE: the `leads` table has no assigned-to column in this Phase 2A
        // schema (the frontend Lead type carries no assignee field either);
        // `assignedTo` is accepted here for contract-compatibility with
        // leadService.ts's filter signature but only `status` is applied.
        $filters = [];
        $status = $request->get_param('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = sanitize_text_field($status);
        }

        return ApiResponse::ok(['leads' => $this->repo->list($filters)]);
    }

    /** GET /leads/{id} — bare object, not wrapped. */
    public function find(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'VIEW');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $lead = $this->repo->find($id);
        if (!$lead) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($lead);
    }

    /** POST /leads/create */
    public function create(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $created = $this->repo->create($data);
        return ApiResponse::ok(['lead' => $created], [], 201);
    }

    /** PUT /leads/{id} */
    public function update(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $data = $request->get_json_params() ?: [];
        $updated = $this->repo->update($id, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok(['lead' => $updated]);
    }

    /** DELETE /leads/{id} — null data. */
    public function delete(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'DELETE');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $this->repo->delete($id);
        return ApiResponse::ok(null);
    }

    /**
     * POST /leads/convert — Phase 2A scope is a plain field write (status ->
     * 'converted'), not the real lead-to-client conversion workflow (that's
     * Phase 2B, once the Client module's create path is wired up here).
     */
    public function convert(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('sales', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $leadId = $data['leadId'] ?? null;
        if (!$leadId) {
            return ApiResponse::validationError('Missing "leadId" in request body');
        }

        $updated = $this->repo->update((string) $leadId, ['status' => 'converted']);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok(['lead' => $updated]);
    }
}
