<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\AttendanceAuditRepository;
use OptivaxERP\Repositories\AttendanceRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/attendance/*. Wraps two independent sub-resources that both
 * live on the attendance_records table (year-report reads and the self
 * check-in log) plus the attendance_audit trail. Gated on the 'hr' RBAC
 * domain throughout, per this phase's plan.
 */
final class AttendanceController
{
    private AttendanceRepository $repo;
    private AttendanceAuditRepository $auditRepo;
    private string $domain = 'hr';

    public function __construct()
    {
        $this->repo = new AttendanceRepository();
        $this->auditRepo = new AttendanceAuditRepository();
    }

    /** GET /attendance/year/{year} */
    public function year(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $year = (int) $request->get_param('year');
        return ApiResponse::ok($this->repo->getYear($year));
    }

    /** GET /attendance/audit */
    public function auditList(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        return ApiResponse::ok($this->auditRepo->list([], 'edited_at DESC'));
    }

    /** POST /attendance/audit */
    public function auditCreate(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'reason' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return ApiResponse::ok($this->auditRepo->create($data), [], 201);
    }

    /**
     * GET/POST /attendance/self and PUT/DELETE /attendance/self/{id} are
     * inherently self-scoped — every employee (not just hr_admin/hr_member)
     * must be able to check themselves in/out, so these gate on
     * "authenticated at all" rather than the 'hr' domain (which would lock
     * out every non-HR role). Edit/delete additionally require the caller to
     * either own the row or hold 'hr' EDIT/DELETE (super_admin's correction
     * path), checked against the actual row via findSelf() rather than
     * trusting a client-supplied userId.
     */
    public function selfList(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        // getSelf() (see its own doc comment) intentionally serves two
        // audiences from one endpoint: the HR/management "manage everyone's
        // attendance" view, and every other employee's own self-check-in
        // widget. Holding 'hr' VIEW is what distinguishes the former
        // (hr_admin, hr_member, management, super_admin) from every
        // non-HR role, which must only ever see their own rows here —
        // otherwise any employee could read every colleague's attendance.
        if (RbacMiddleware::authorize($this->domain, 'VIEW') === null) {
            return ApiResponse::ok($this->repo->getSelf());
        }
        return ApiResponse::ok($this->repo->getSelfForUser((string) AuthMiddleware::currentUserId()));
    }

    /** POST /attendance/self */
    public function selfCreate(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'date' => ['required', 'date'],
            'status' => ['required', ['in', ['present', 'absent', 'late', 'half-day', 'leave', 'weekly-off', 'holiday']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        // Force the row's identity to the authenticated caller — never trust a
        // client-supplied userId, or any employee could check in "as" someone else.
        $data['userId'] = (string) AuthMiddleware::currentUserId();
        return ApiResponse::ok($this->repo->createSelf($data), [], 201);
    }

    /** PUT /attendance/self/{id} */
    public function selfUpdate(\WP_REST_Request $request): \WP_REST_Response
    {
        $id = (string) $request->get_param('id');
        $guard = $this->authorizeOwnOrHr($id, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $patch = $request->get_json_params() ?: [];
        $errors = Validator::check($patch, [
            'date' => ['date'],
            'status' => [['in', ['present', 'absent', 'late', 'half-day', 'leave', 'weekly-off', 'holiday']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        unset($patch['userId']); // identity is never editable via this endpoint

        $this->repo->updateSelf($id, $patch);
        return ApiResponse::ok(null);
    }

    /** DELETE /attendance/self/{id} */
    public function selfDelete(\WP_REST_Request $request): \WP_REST_Response
    {
        $id = (string) $request->get_param('id');
        $guard = $this->authorizeOwnOrHr($id, 'DELETE');
        if ($guard) {
            return $guard;
        }

        $this->repo->deleteSelf($id);
        return ApiResponse::ok(null);
    }

    /** @return \WP_REST_Response|null null if the caller owns the row, or holds 'hr' $action rights. */
    private function authorizeOwnOrHr(string $id, string $action): ?\WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $row = $this->repo->findSelf($id);
        if (!$row) {
            return ApiResponse::notFound();
        }

        if ($row['userId'] === (string) AuthMiddleware::currentUserId()) {
            return null;
        }

        return RbacMiddleware::authorize($this->domain, $action);
    }
}
