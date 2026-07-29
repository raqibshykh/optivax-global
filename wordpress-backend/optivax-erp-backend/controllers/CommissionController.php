<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\CommissionRepository;
use OptivaxERP\Services\AuthService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/commissions. Response shapes are wrapped objects
 * ({commissions:[...]}, {commission:{...}}), not bare arrays, because
 * src/services/commissionService.ts destructures res.commissions / res.commission.
 */
final class CommissionController
{
    private CommissionRepository $repo;

    public function __construct()
    {
        $this->repo = new CommissionRepository();
    }

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'VIEW');
        if ($guard) {
            return $guard;
        }

        // 'billing' VIEW is shared with the invoice-viewing use case and is
        // held by the `client` role for that reason — but internal staff
        // commission data (who earned what on which deal) has no legitimate
        // client-facing use, so explicitly deny it here rather than relying
        // on the domain grant being narrowed for everyone else too.
        if ((AuthMiddleware::currentRole() ?? '') === 'client') {
            return ApiResponse::forbidden();
        }

        // CommissionService.getAll() forwards an arbitrary params object; only
        // the columns that actually exist on `commissions` are recognized here.
        $filterParamMap = [
            'userId' => 'user_id',
            'projectId' => 'project_id',
            'invoiceId' => 'invoice_id',
            'status' => 'status',
        ];
        $filters = [];
        foreach ($filterParamMap as $param => $column) {
            $value = $request->get_param($param);
            if ($value !== null && $value !== '') {
                $filters[$column] = sanitize_text_field($value);
            }
        }

        return ApiResponse::ok(['commissions' => $this->repo->list($filters)]);
    }

    public function create(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'userId' => ['required'],
            'type' => ['required', ['in', ['percentage', 'fixed']]],
            'value' => ['required', 'numeric', ['min', 0]],
            'amount' => ['required', 'numeric', ['min', 0]],
            'status' => [['in', ['pending', 'approved', 'paid']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $scopeGuard = $this->ensureSameDepartment((string) $data['userId']);
        if ($scopeGuard) {
            return $scopeGuard;
        }

        $created = $this->repo->create($data);
        return ApiResponse::ok(['commission' => $created], [], 201);
    }

    public function update(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $scopeGuard = $this->ensureSameDepartmentForRecord((string) $id);
        if ($scopeGuard) {
            return $scopeGuard;
        }

        $updated = $this->repo->update((string) $id, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok(['commission' => $updated]);
    }

    public function delete(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'DELETE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $scopeGuard = $this->ensureSameDepartmentForRecord((string) $id);
        if ($scopeGuard) {
            return $scopeGuard;
        }

        $this->repo->delete((string) $id);
        return ApiResponse::ok(null);
    }

    /**
     * Company-wide roles (super_admin/management) are intentionally
     * unrestricted here, matching the RBAC matrix's own grant — this is not
     * `RbacMiddleware::authorizeScoped()` (that mechanism denies ANY
     * non-VIEW action outside a role's primary domain, which would also
     * block sales_admin from managing their own team's commissions — a real
     * regression, since `billing` is sales_admin's granted-but-non-primary
     * domain). Instead this narrows the *target* of an already-permitted
     * write to the caller's own department, the same shape of fix Phase 1
     * applied elsewhere (ownership check, not a domain block).
     */
    private function ensureSameDepartment(string $targetUserId): ?\WP_REST_Response
    {
        $callerRole = AuthMiddleware::currentRole() ?? '';
        if (in_array($callerRole, ['super_admin', 'management'], true) || $targetUserId === '') {
            return null;
        }

        $callerDomain = explode('_', $callerRole)[0] ?? null;
        $targetMapping = AuthService::mappingFor((int) $targetUserId);
        $targetRole = (string) ($targetMapping['role'] ?? '');
        $targetDomain = $targetRole !== '' ? explode('_', $targetRole)[0] : null;

        if (!$callerDomain || !$targetDomain || $callerDomain !== $targetDomain) {
            return ApiResponse::forbidden('You can only manage commissions for your own department');
        }
        return null;
    }

    /** Looks up the existing commission's owner before delegating to ensureSameDepartment() — used by update()/delete(), which only have the commission id, not the target user id, until the record is loaded. */
    private function ensureSameDepartmentForRecord(string $commissionId): ?\WP_REST_Response
    {
        $existing = $this->repo->find($commissionId);
        if (!$existing) {
            return null; // Let the caller's own not-found handling report this.
        }
        return $this->ensureSameDepartment((string) ($existing['userId'] ?? ''));
    }
}
