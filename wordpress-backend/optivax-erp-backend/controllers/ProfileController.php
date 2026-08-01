<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\DepartmentMapper;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Helpers\RbacMatrix;
use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\SecurityAuditLog;
use OptivaxERP\Helpers\UserHierarchy;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Notifications\NotificationService;
use OptivaxERP\Repositories\DepartmentRepository;
use OptivaxERP\Repositories\UserProfileRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/profiles/* — the fuller admin user-management CRUD (list,
 * create, update, delete), separate from the slim /auth/session DTO. This is
 * the only account-creation path in the plugin (there is no public signup).
 * create()/update() are gated by helpers/UserHierarchy.php — a creator/target
 * role hierarchy that is deliberately separate from RbacMatrix's business-data
 * permissions. Viewing the list and editing one's own profile (excluding
 * role/department/status, which are hierarchy-gated) are always allowed to
 * any authenticated user, since name/avatar resolution across the app
 * depends on it.
 */
final class ProfileController
{
    private UserProfileRepository $repo;

    public function __construct()
    {
        $this->repo = new UserProfileRepository();
    }

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $filters = [];
        if ($request->get_param('id')) {
            $filters['id'] = (int) $request->get_param('id');
        }
        if ($request->get_param('email')) {
            $filters['email'] = sanitize_email($request->get_param('email'));
        }

        $rows = $this->repo->list($filters);

        // Staff roles need the full internal directory shape (email, role,
        // department, designation, status) for admin UIs and hierarchy
        // checks. A `client` account has no legitimate need to see any of
        // that about the company's own staff — only enough to resolve a
        // name/avatar/company in shared UI (e.g. "uploaded by", assigned
        // contact) — so its response is reduced to that minimal subset
        // rather than blocking the endpoint outright (which every role,
        // including client, currently depends on for name resolution).
        if ((AuthMiddleware::currentRole() ?? '') === 'client') {
            $rows = array_map(static function (array $row): array {
                return [
                    'id' => $row['id'],
                    'full_name' => $row['full_name'],
                    'avatar_url' => $row['avatar_url'],
                    'company' => $row['company'],
                ];
            }, $rows);
        }

        return ApiResponse::ok($rows);
    }

    public function create(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }
        $creatorId = AuthMiddleware::currentUserId();
        $creatorRole = AuthMiddleware::currentRole();

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'email' => ['required', 'email'],
            'full_name' => ['required'],
            'role' => ['required', ['in', RbacMatrix::ROLES]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $targetRole = Sanitize::key($data['role']);
        if (!UserHierarchy::canCreate($creatorRole, $targetRole)) {
            SecurityAuditLog::record('user_creation_denied', $creatorId, $creatorRole, null, 'failure', null, null, ['attempted_role' => $targetRole]);
            return ApiResponse::forbidden('You are not permitted to create a user with this role');
        }

        // Department admins can never choose the new user's department from
        // the client — it's always forced to their own domain. Not forced
        // when the creator is super_admin/management, or when creating a
        // client (clients aren't department-scoped the same way).
        if (!in_array($creatorRole, ['super_admin', 'management'], true) && $targetRole !== 'client') {
            $data['departmentId'] = DepartmentMapper::deptSlugForRole($creatorRole);
        }

        if (!empty($data['departmentId'])) {
            $requiredDomain = self::departmentDomainMismatch($targetRole, (string) $data['departmentId']);
            if ($requiredDomain !== null) {
                return ApiResponse::validationError("Selected department does not belong to this role's department ({$requiredDomain})");
            }
        }

        try {
            $created = $this->repo->create($data);
        } catch (\RuntimeException $e) {
            return ApiResponse::validationError($e->getMessage());
        }

        SecurityAuditLog::record(
            'user_created',
            $creatorId,
            $creatorRole,
            (int) $created['id'],
            'success',
            null,
            ['role' => $targetRole, 'department_id' => $data['departmentId'] ?? null]
        );
        return ApiResponse::ok($created, [], 201);
    }

    public function update(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = $request->get_json_params() ?: [];
        $targetId = isset($data['id']) ? (int) $data['id'] : null;
        if (!$targetId) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $isSelf = $targetId === AuthMiddleware::currentUserId();

        if ($isSelf) {
            if (!AuthMiddleware::isAuthenticated()) {
                return ApiResponse::unauthorized();
            }
            // Role/department/status are hierarchy-gated, admin-only fields
            // — never settable via a self-edit, regardless of what's sent.
            unset($data['role'], $data['departmentId'], $data['status']);
        } else {
            // Was 'system' EDIT only — which only super_admin and it_admin
            // hold, so editing another user's profile 403'd for hr_admin and
            // management despite Employees.tsx's Edit button checking
            // canEdit(...) and showing as available. Now passes if the
            // caller holds EITHER 'system' EDIT (super_admin/it_admin — the
            // account-administration angle) OR 'employees' EDIT (hr_admin/
            // management — the HR-profile-data angle: name, designation,
            // department). Role reassignment specifically stays additionally
            // gated by UserHierarchy::canCreate() just below, regardless of
            // which of the two unlocks the base edit.
            $systemGuard = RbacMiddleware::authorize('system', 'EDIT');
            $employeesGuard = RbacMiddleware::authorize('employees', 'EDIT');
            if ($systemGuard !== null && $employeesGuard !== null) {
                return $systemGuard;
            }

            // Active/inactive account status is a separate, narrower grant:
            // holding 'employees' EDIT alone (e.g. management) is NOT enough
            // to flip it — must additionally hold 'system' EDIT or
            // 'employee_status' EDIT. This keeps account activation out of
            // the general "edit an employee's profile" permission, mirroring
            // how salary/leave data was split off in EmployeeExtraController
            // and LeaveRequestController — see RBAC_MATRIX's "management"
            // entry in src/utils/rbac.ts.
            if (array_key_exists('status', $data)) {
                $statusGuard = RbacMiddleware::authorize('employee_status', 'EDIT');
                if ($systemGuard !== null && $statusGuard !== null) {
                    return $statusGuard;
                }
            }

            if (array_key_exists('role', $data)) {
                $newRole = Sanitize::key($data['role']);
                if (!UserHierarchy::canCreate(AuthMiddleware::currentRole(), $newRole)) {
                    return ApiResponse::forbidden('You are not permitted to assign this role');
                }
            }
        }

        $errors = Validator::check($data, [
            'role' => [['in', RbacMatrix::ROLES]],
            'status' => [['in', ['active', 'inactive']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $before = $this->repo->findById($targetId);

        if (!$isSelf && $before && (array_key_exists('role', $data) || array_key_exists('departmentId', $data))) {
            $effectiveRole = array_key_exists('role', $data) ? Sanitize::key($data['role']) : $before['role'];
            $effectiveDeptId = array_key_exists('departmentId', $data) ? (string) $data['departmentId'] : (string) ($before['departmentId'] ?? '');
            if ($effectiveDeptId !== '') {
                $requiredDomain = self::departmentDomainMismatch($effectiveRole, $effectiveDeptId);
                if ($requiredDomain !== null) {
                    return ApiResponse::validationError("Selected department does not belong to this role's department ({$requiredDomain})");
                }
            }
        }

        $updated = $this->repo->update($targetId, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }

        if (!$isSelf && $before) {
            $actorId = AuthMiddleware::currentUserId();
            $actorRole = AuthMiddleware::currentRole();
            if (array_key_exists('role', $data) && $before['role'] !== $updated['role']) {
                SecurityAuditLog::record('role_changed', $actorId, $actorRole, $targetId, 'success', ['role' => $before['role']], ['role' => $updated['role']]);
            }
            if (array_key_exists('departmentId', $data) && $before['departmentId'] !== $updated['departmentId']) {
                SecurityAuditLog::record('department_changed', $actorId, $actorRole, $targetId, 'success', ['department_id' => $before['departmentId']], ['department_id' => $updated['departmentId']]);
                self::notifyDepartmentChanged($targetId, $updated);
            }
            if (array_key_exists('status', $data) && ($before['status'] ?? 'active') !== ($updated['status'] ?? 'active')) {
                SecurityAuditLog::record($updated['status'] === 'active' ? 'user_activated' : 'user_deactivated', $actorId, $actorRole, $targetId, 'success');
            }
        }

        return ApiResponse::ok($updated);
    }

    public function delete(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('system', 'DELETE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = isset($data['id']) ? (int) $data['id'] : null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $this->repo->delete($id);
        SecurityAuditLog::record('user_deleted', AuthMiddleware::currentUserId(), AuthMiddleware::currentRole(), $id, 'success');
        return ApiResponse::ok(null);
    }

    /**
     * The "department admin must belong to that department" rule, enforced at the one place
     * role and department are ever set together: a production_admin can never be pointed at a
     * Sales department, and vice versa. Returns the role's required domain string when
     * $departmentId resolves to a REAL department row whose domain mismatches it (the caller
     * turns that into a validation error); returns null when consistent, when the role isn't
     * department-scoped (super_admin/management/client — nothing to check), or when
     * $departmentId doesn't resolve to a real row yet (a legacy pre-Department-Master slug,
     * which this validation doesn't retroactively block).
     */
    private static function departmentDomainMismatch(string $role, string $departmentId): ?string
    {
        $requiredDomain = DepartmentMapper::domainForRole($role);
        if (!$requiredDomain) {
            return null;
        }
        $dept = (new DepartmentRepository())->find($departmentId);
        if (!$dept) {
            return null;
        }
        return $dept['domain'] !== $requiredDomain ? $requiredDomain : null;
    }

    /** Best-effort — a notification failure must never block the department change itself. */
    private static function notifyDepartmentChanged(int $targetId, array $updated): void
    {
        try {
            $deptName = 'a new department';
            if (!empty($updated['departmentId'])) {
                $dept = (new DepartmentRepository())->find((string) $updated['departmentId']);
                if ($dept) {
                    $deptName = $dept['name'];
                }
            }
            NotificationService::create([
                'userId' => (string) $targetId,
                'type' => 'system',
                'module' => 'hr',
                'title' => 'Department updated',
                'message' => "You have been moved to {$deptName}.",
                'actionUrl' => null,
                'actionLabel' => null,
            ]);
        } catch (\Throwable $e) {
            Logger::error('profile', 'Department-change notification failed: ' . $e->getMessage());
        }
    }
}
