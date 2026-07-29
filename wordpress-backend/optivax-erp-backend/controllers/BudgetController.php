<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\DepartmentMapper;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\DepartmentScopeMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Notifications\NotificationService;
use OptivaxERP\Repositories\BudgetAuditRepository;
use OptivaxERP\Repositories\BudgetCompanyRepository;
use OptivaxERP\Repositories\BudgetDepartmentRepository;
use OptivaxERP\Repositories\BudgetMemberRepository;
use OptivaxERP\Repositories\BudgetRequestRepository;
use OptivaxERP\Repositories\BudgetReturnRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/budget/* — the hierarchical company/department/member budget
 * model. Pure storage passthrough (no allocation/utilization math; the
 * frontend computes all stats in src/domain/budget/calculations.ts). Every
 * route is gated on the 'budget' RBAC domain.
 */
final class BudgetController
{
    private BudgetCompanyRepository $companyRepo;
    private BudgetDepartmentRepository $deptRepo;
    private BudgetMemberRepository $memberRepo;
    private BudgetRequestRepository $requestRepo;
    private BudgetReturnRepository $returnRepo;
    private BudgetAuditRepository $auditRepo;
    private string $domain = 'budget';

    public function __construct()
    {
        $this->companyRepo = new BudgetCompanyRepository();
        $this->deptRepo = new BudgetDepartmentRepository();
        $this->memberRepo = new BudgetMemberRepository();
        $this->requestRepo = new BudgetRequestRepository();
        $this->returnRepo = new BudgetReturnRepository();
        $this->auditRepo = new BudgetAuditRepository();
    }

    /**
     * Null for roles with company-wide budget visibility
     * (super_admin/management/hr_admin/hr_member, per
     * DepartmentScopeMiddleware::hasAllDepartmentAccess()) — every other
     * department admin/member is restricted to their own department's label
     * (e.g. "Sales"), resolved server-side from their role, never trusted
     * from the request.
     */
    private function ownDepartmentOrNull(): ?string
    {
        $role = AuthMiddleware::currentRole() ?? '';
        if (DepartmentScopeMiddleware::hasAllDepartmentAccess($role)) {
            return null;
        }
        return DepartmentMapper::deptLabelForRole($role);
    }

    // ── Company Budget ───────────────────────────────────────────────────────

    /** GET /budget/company */
    public function getCompany(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        return ApiResponse::ok($this->companyRepo->get());
    }

    /** PUT /budget/company */
    public function putCompany(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'totalAmount' => ['required', 'numeric', ['min', 0]],
            'fiscalYear' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        $this->companyRepo->put($data);
        return ApiResponse::ok(null);
    }

    /** DELETE /budget/company/reset — resets the company budget AND all department/member allocations. */
    public function resetCompany(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'DELETE');
        if ($guard) {
            return $guard;
        }

        // All three must clear together — a failure partway through would leave
        // a wiped company budget with stale department/member allocations still
        // pointing at a total that no longer exists, or vice versa.
        Transaction::run(function () {
            $this->companyRepo->reset();
            $this->deptRepo->replaceAll([]);
            $this->memberRepo->replaceAll([]);
        });
        return ApiResponse::ok(null);
    }

    // ── Dept Allocations ──────────────────────────────────────────────────────

    /** GET /budget/departments — department-scoped roles only ever see their own department's allocation. */
    public function listDepartments(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $scope = $this->ownDepartmentOrNull();
        $filters = $scope !== null ? ['department' => $scope] : [];
        return ApiResponse::ok($this->deptRepo->list($filters, 'department ASC'));
    }

    /**
     * PUT /budget/departments — body is { allocations: [...] }, replaces the
     * whole list (department-scoped roles only ever replace their own
     * department's rows — see BudgetDepartmentRepository::replaceAll()).
     */
    public function putDepartments(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $this->deptRepo->replaceAll($data['allocations'] ?? [], $this->ownDepartmentOrNull());
        return ApiResponse::ok(null);
    }

    // ── Member Allocations ─────────────────────────────────────────────────────

    /** GET /budget/members — department-scoped roles only ever see their own department's members. */
    public function listMembers(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $scope = $this->ownDepartmentOrNull();
        $filters = $scope !== null ? ['department' => $scope] : [];
        return ApiResponse::ok($this->memberRepo->list($filters, 'employee_name ASC'));
    }

    /**
     * PUT /budget/members — body is { allocations: [...] }, replaces the
     * whole list (department-scoped roles only ever replace their own
     * department's rows — see BudgetMemberRepository::replaceAll()).
     */
    public function putMembers(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $this->memberRepo->replaceAll($data['allocations'] ?? [], $this->ownDepartmentOrNull());
        return ApiResponse::ok(null);
    }

    // ── Budget Requests ────────────────────────────────────────────────────────

    /** GET /budget/requests — department-scoped roles only ever see their own department's requests. */
    public function listRequests(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $scope = $this->ownDepartmentOrNull();
        $filters = $scope !== null ? ['department' => $scope] : [];
        return ApiResponse::ok($this->requestRepo->list($filters, 'submitted_at DESC'));
    }

    /** POST /budget/requests — department-scoped roles can only ever submit a request under their own department. */
    public function createRequest(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'department' => ['required'],
            'requestedAmount' => ['required', 'numeric', ['min', 0]],
            'priority' => [['in', ['Low', 'Medium', 'High', 'Critical']]],
            'justification' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        $scope = $this->ownDepartmentOrNull();
        if ($scope !== null) {
            $data['department'] = $scope;
        }
        return ApiResponse::ok($this->requestRepo->create($data), [], 201);
    }

    /**
     * PUT /budget/requests — dual-mode dispatch, per
     * src/services/budgetService.ts: saveBudgetRequests() sends
     * { requests: [...] } to bulk-replace the whole list, while
     * updateBudgetRequest() sends { id, ...patch } to patch one record.
     * The two shapes are mutually exclusive on the wire, so inspecting which
     * key is present is enough to route correctly. Department-scoped roles
     * are restricted to their own department on both branches.
     */
    public function putRequests(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $scope = $this->ownDepartmentOrNull();

        if (array_key_exists('requests', $data) && is_array($data['requests'])) {
            $this->requestRepo->bulkSave($data['requests'], $scope);
            return ApiResponse::ok(null);
        }

        if (array_key_exists('id', $data)) {
            $errors = Validator::check($data, [
                'status' => [['in', ['Pending', 'Approved', 'Rejected', 'Partially Approved']]],
                'approvedAmount' => ['numeric', ['min', 0]],
            ]);
            if ($errors) {
                return ApiResponse::validationError('Validation failed', $errors);
            }
            // A department-scoped caller may only patch a request that
            // actually belongs to their own department — never trust the
            // body, verify against the existing row. Also fetched (regardless
            // of scope) whenever a status patch is present, so the
            // notification below can tell "newly decided" from "already was".
            $existing = (isset($data['status']) || $scope !== null) ? $this->requestRepo->find((string) $data['id']) : null;
            if ($scope !== null) {
                if (!$existing) {
                    return ApiResponse::notFound();
                }
                if ($existing['department'] !== $scope) {
                    return ApiResponse::forbidden();
                }
            }
            $updated = $this->requestRepo->update((string) $data['id'], $data);
            if (!$updated) {
                return ApiResponse::notFound();
            }
            $this->notifyRequesterOfDecision($existing, $updated);
            return ApiResponse::ok($updated);
        }

        return ApiResponse::validationError('Request body must contain either "requests" or "id"');
    }

    /**
     * Phase 8 M3: "notifications are never triggered server-side by real
     * business events ... budget approval" — notifies the requesting
     * department admin (`adminId`) once a request's status newly resolves to
     * Approved/Rejected/Partially Approved, never on an unrelated field edit
     * or a re-save of an already-decided request.
     */
    private function notifyRequesterOfDecision(?array $existing, array $updated): void
    {
        try {
            $newStatus = (string) ($updated['status'] ?? '');
            $decided = in_array($newStatus, ['Approved', 'Rejected', 'Partially Approved'], true);
            $previousStatus = (string) ($existing['status'] ?? '');
            if (!$decided || $newStatus === $previousStatus) {
                return;
            }
            $adminId = (string) ($updated['adminId'] ?? '');
            if ($adminId === '') {
                return;
            }
            NotificationService::create([
                'userId' => $adminId,
                'type' => 'system',
                'module' => 'budget',
                'title' => 'Budget request ' . strtolower($newStatus),
                'message' => 'Your budget request for ' . ($updated['department'] ?? 'your department') . ' was ' . strtolower($newStatus) . '.',
                'actionUrl' => null,
                'actionLabel' => null,
            ]);
        } catch (\Throwable $e) {
            Logger::error('automation', 'Budget-approval notification failed: ' . $e->getMessage());
        }
    }

    // ── Budget Returns ─────────────────────────────────────────────────────────

    /** GET /budget/returns — department-scoped roles only ever see their own department's returns. */
    public function listReturns(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $scope = $this->ownDepartmentOrNull();
        $filters = $scope !== null ? ['department' => $scope] : [];
        return ApiResponse::ok($this->returnRepo->list($filters, 'timestamp DESC'));
    }

    /** POST /budget/returns — department-scoped roles can only ever file a return under their own department. */
    public function createReturn(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'amount' => ['required', 'numeric', ['min', 0]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        $scope = $this->ownDepartmentOrNull();
        if ($scope !== null) {
            $data['department'] = $scope;
        }
        return ApiResponse::ok($this->returnRepo->create($data), [], 201);
    }

    // ── Audit Log ────────────────────────────────────────────────────────────

    /**
     * GET /budget/audit — department-scoped roles only ever see audit
     * entries whose `department` matches their own. Entries for a
     * department-to-department transfer (fromDepartment/toDepartment) that
     * don't also set `department` to the caller's own aren't matched by this
     * simple equality filter — an accepted imprecision for this pass, since
     * AbstractRepository::list() only supports AND-equality, not an OR
     * across three columns.
     */
    public function listAudit(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $scope = $this->ownDepartmentOrNull();
        $filters = $scope !== null ? ['department' => $scope] : [];
        return ApiResponse::ok($this->auditRepo->list($filters, 'timestamp DESC'));
    }

    /** POST /budget/audit */
    public function createAudit(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        return ApiResponse::ok($this->auditRepo->create($data), [], 201);
    }
}
