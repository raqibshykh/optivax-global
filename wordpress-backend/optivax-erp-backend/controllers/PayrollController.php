<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\AdvanceSalaryAuditRepository;
use OptivaxERP\Repositories\AdvanceSalaryRepository;
use OptivaxERP\Repositories\SalarySlipRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/payroll/*. Every gross/deduction/net figure is computed on
 * the frontend (src/domain/payroll/calculations.ts) and stored mostly as
 * given — porting the full deduction engine (attendance/leave/advance-
 * recovery lookups) server-side is out of scope here — but incoming slips
 * are checked against the one cheap, always-true invariant of that formula
 * (netSalary <= basicSalary, never negative) so a buggy or forged request
 * can't corrupt payroll records. Salary-slip routes are gated on
 * 'salary_slips', advance request/audit routes on 'advance_salary', per the
 * RBAC matrix.
 */
final class PayrollController
{
    private SalarySlipRepository $slipRepo;
    private AdvanceSalaryRepository $advanceRepo;
    private AdvanceSalaryAuditRepository $auditRepo;

    public function __construct()
    {
        $this->slipRepo = new SalarySlipRepository();
        $this->advanceRepo = new AdvanceSalaryRepository();
        $this->auditRepo = new AdvanceSalaryAuditRepository();
    }

    // ── Salary Slips ─────────────────────────────────────────────────────────

    /**
     * GET /payroll/salary-slips. 'salary_slips' VIEW is deliberately granted
     * broadly (every role needs to see their own payslip) — so it cannot be
     * the signal for "sees the whole company's payroll." Holding 'hr' VIEW
     * (hr_admin, hr_member, management, super_admin) is what actually means
     * "administers payroll"; every other role, including roles with
     * 'salary_slips' VIEW, is restricted to their own slips.
     */
    public function listSalarySlips(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('salary_slips', 'VIEW');
        if ($guard) {
            return $guard;
        }

        if (RbacMiddleware::authorize('hr', 'VIEW') === null) {
            return ApiResponse::ok($this->slipRepo->list());
        }
        return ApiResponse::ok($this->slipRepo->list((string) AuthMiddleware::currentUserId()));
    }

    /**
     * The frontend's deduction formula (src/domain/payroll/calculations.ts)
     * never adds allowances/bonuses on top of basic salary and every
     * deduction is subtractive, so netSalary can never legitimately exceed
     * basicSalary — a slip that violates this is either a client bug or a
     * forged request, not a valid payroll figure. This is the one invariant
     * cheap enough to check here without porting the whole deduction engine
     * (attendance/leave/advance-recovery logic) to PHP.
     */
    private function violatesNetSalaryInvariant(array $slip): bool
    {
        $basic = (float) ($slip['basicSalary'] ?? 0);
        $net = (float) ($slip['netSalary'] ?? 0);
        return $net > $basic + 0.01 || $net < 0;
    }

    /** PUT /payroll/salary-slips — body is { slips: [...] }, replaces the whole list. */
    public function bulkSaveSalarySlips(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('salary_slips', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $slips = $data['slips'] ?? [];
        foreach ($slips as $slip) {
            if ($this->violatesNetSalaryInvariant($slip)) {
                return ApiResponse::validationError(
                    "Invalid salary slip for employee {$slip['employeeId']}: netSalary cannot exceed basicSalary or be negative."
                );
            }
        }
        $this->slipRepo->bulkSave($slips);
        return ApiResponse::ok(null);
    }

    /** POST /payroll/salary-slips — body is a single already-computed slip. */
    public function createSalarySlip(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('salary_slips', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'employeeId' => ['required'],
            'salaryMonth' => ['required'],
            'basicSalary' => ['required', 'numeric', ['min', 0]],
            'netSalary' => ['required', 'numeric'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        if ($this->violatesNetSalaryInvariant($data)) {
            return ApiResponse::validationError('netSalary cannot exceed basicSalary or be negative.');
        }
        return ApiResponse::ok($this->slipRepo->createOne($data), [], 201);
    }

    // ── Advance Salary Requests ──────────────────────────────────────────────

    /** GET /payroll/advance-requests — same "'hr' VIEW = sees everyone" rule as listSalarySlips(). */
    public function listAdvanceRequests(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('advance_salary', 'VIEW');
        if ($guard) {
            return $guard;
        }

        if (RbacMiddleware::authorize('hr', 'VIEW') === null) {
            return ApiResponse::ok($this->advanceRepo->list());
        }
        return ApiResponse::ok($this->advanceRepo->list((string) AuthMiddleware::currentUserId()));
    }

    /**
     * PUT /payroll/advance-requests — body is { requests: [...] }, replaces
     * the whole list. Deliberately unscoped beyond the `advance_salary` EDIT
     * permission check (confirmed intentional, not an oversight, during the
     * Phase 8 audit): per RbacMatrix, only hr_admin holds EDIT on this
     * domain among department roles — HR is company-wide by design
     * everywhere else in this plugin (see listSalarySlips()'s comment
     * above), so there is no "other department's advance requests" to leak
     * here the way there was for Commission's `billing` grant.
     */
    public function bulkSaveAdvanceRequests(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('advance_salary', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $this->advanceRepo->bulkSave($data['requests'] ?? []);
        return ApiResponse::ok(null);
    }

    // ── Advance Salary Audit Log ─────────────────────────────────────────────

    /** GET /payroll/advance-audit — same "'hr' VIEW = sees everyone" rule as listSalarySlips(). */
    public function listAdvanceAudit(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('advance_salary', 'VIEW');
        if ($guard) {
            return $guard;
        }

        if (RbacMiddleware::authorize('hr', 'VIEW') === null) {
            return ApiResponse::ok($this->auditRepo->list([], 'timestamp DESC'));
        }
        $ownId = (string) AuthMiddleware::currentUserId();
        return ApiResponse::ok($this->auditRepo->list(['employee_id' => $ownId], 'timestamp DESC'));
    }

    /** POST /payroll/advance-audit — body is Omit<AdvanceSalaryAuditEntry, "id" | "timestamp">. */
    public function createAdvanceAudit(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('advance_salary', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'action' => ['required'],
            'requestId' => ['required'],
            'employeeId' => ['required'],
            'amount' => ['required', 'numeric', ['min', 0]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return ApiResponse::ok($this->auditRepo->create($data), [], 201);
    }
}
