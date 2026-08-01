<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\LeaveRequestEmployeeRepository;
use OptivaxERP\Repositories\LeaveRequestHrRepository;
use OptivaxERP\Services\LeaveAttendanceSync;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/leave-requests/* (HR full lifecycle) and
 * /saas/v1/hr/employee-leave-requests/* (employee self-submitted) — two
 * independent sub-resources per src/services/leaveRequestService.ts's own
 * doc comment ("this codebase independently grew *two* unrelated
 * leave-request features"). Viewing and approving/rejecting are gated on the
 * 'employee_leave' RBAC domain (split off 'hr' so a role that manages
 * employee profiles doesn't automatically get to decide leave outcomes — see
 * RBAC_MATRIX's "management" entry in src/utils/rbac.ts); creating/deleting
 * an HR-side record stay gated on the general 'hr' domain, unchanged.
 */
final class LeaveRequestController
{
    private LeaveRequestHrRepository $hrRepo;
    private LeaveRequestEmployeeRepository $employeeRepo;
    private string $domain = 'hr';
    private string $leaveDomain = 'employee_leave';

    public function __construct()
    {
        $this->hrRepo = new LeaveRequestHrRepository();
        $this->employeeRepo = new LeaveRequestEmployeeRepository();
    }

    // ── HR full lifecycle (/leave-requests) ────────────────────────────────

    /** GET /leave-requests */
    public function listHr(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->leaveDomain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        return ApiResponse::ok($this->hrRepo->list([], 'created_at DESC'));
    }

    /** POST /leave-requests */
    public function createHr(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'userId' => ['required'],
            'type' => ['required', ['in', ['annual', 'sick', 'casual', 'maternity', 'unpaid']]],
            'startDate' => ['required', 'date'],
            'endDate' => ['required', 'date'],
            'days' => ['required', 'numeric', ['min', 0]],
            'reason' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return ApiResponse::ok($this->hrRepo->create($data), [], 201);
    }

    /** PUT /leave-requests/{id} — body is { status, reviewedBy, reviewNote? }. */
    public function updateHr(\WP_REST_Request $request): \WP_REST_Response
    {
        // APPROVE (not EDIT) — this endpoint's only real effect is a leave
        // approve/reject decision, which is exactly what 'employee_leave'
        // APPROVE gates. A role holding 'employees' EDIT (e.g. management)
        // does NOT automatically get this.
        $guard = RbacMiddleware::authorize($this->leaveDomain, 'APPROVE');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $patch = $request->get_json_params() ?: [];
        $errors = Validator::check($patch, [
            'status' => [['in', ['pending', 'approved', 'rejected']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        $updated = $this->hrRepo->update($id, $patch);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        if (($patch['status'] ?? null) === 'approved') {
            LeaveAttendanceSync::applyApprovedLeave(
                $updated['userId'],
                $updated['userName'],
                $updated['userRole'],
                $updated['startDate'],
                $updated['endDate']
            );
        }
        return ApiResponse::ok($updated);
    }

    /** DELETE /leave-requests/{id} */
    public function deleteHr(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'DELETE');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $this->hrRepo->delete($id);
        return ApiResponse::ok(null);
    }

    // ── Employee self-submitted (/hr/employee-leave-requests) ──────────────
    //
    // Consumed by src/pages/Client/Profile.tsx — the shared "my profile" page
    // mounted for every role (/sales/profile, /production/profile, ...
    // /hr/profile), not just hr staff. Submitting/viewing must therefore be
    // "any authenticated user, own records" rather than gated on a domain
    // CREATE/VIEW check, which would lock out every non-HR employee from
    // ever submitting their own leave request. Only the approve/reject step
    // (updateEmployee) is a real admin action and stays gated — on
    // 'employee_leave' APPROVE.

    /** GET /hr/employee-leave-requests */
    public function listEmployee(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        // This endpoint serves two audiences (see the class doc comment):
        // HR/management reviewing everyone's submissions, and each employee
        // viewing their own. Holding 'employee_leave' VIEW is what
        // distinguishes the former — everyone else must only ever see their
        // own requests, or any employee could read every colleague's leave
        // reason/dates.
        if (RbacMiddleware::authorize($this->leaveDomain, 'VIEW') === null) {
            return ApiResponse::ok($this->employeeRepo->list([], 'submitted_at DESC'));
        }
        $ownId = (string) AuthMiddleware::currentUserId();
        return ApiResponse::ok($this->employeeRepo->list(['employee_id' => $ownId], 'submitted_at DESC'));
    }

    /** POST /hr/employee-leave-requests */
    public function createEmployee(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'type' => ['required', ['in', ['Annual', 'Sick', 'Personal', 'Emergency']]],
            'startDate' => ['required', 'date'],
            'endDate' => ['required', 'date'],
            'days' => ['required', 'numeric', ['min', 0]],
            'reason' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        // Never trust a client-supplied employeeId — force it to the caller,
        // or any employee could submit a leave request "as" someone else.
        $data['employeeId'] = (string) AuthMiddleware::currentUserId();
        return ApiResponse::ok($this->employeeRepo->create($data), [], 201);
    }

    /** PUT /hr/employee-leave-requests/{id} — body is { status }. */
    public function updateEmployee(\WP_REST_Request $request): \WP_REST_Response
    {
        // APPROVE — same rationale as updateHr() above.
        $guard = RbacMiddleware::authorize($this->leaveDomain, 'APPROVE');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $patch = $request->get_json_params() ?: [];
        $errors = Validator::check($patch, [
            'status' => [['in', ['Pending', 'Approved', 'Rejected']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        $updated = $this->employeeRepo->update($id, $patch);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        if (($patch['status'] ?? null) === 'Approved') {
            LeaveAttendanceSync::applyApprovedLeave(
                $updated['employeeId'],
                $updated['employeeName'],
                $updated['role'],
                $updated['startDate'],
                $updated['endDate']
            );
        }
        return ApiResponse::ok($updated);
    }
}
