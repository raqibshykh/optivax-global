<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\DepartmentMapper;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\DepartmentScopeMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\AuditLogRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/audit-logs/* (auditLogService.ts). list/search (viewing the
 * trail) are a reporting concern, gated on the 'reports' domain's VIEW.
 *
 * create() is deliberately NOT gated on 'reports' CREATE: src/utils/rbac.ts's
 * RBAC_MATRIX grants 'reports' only VIEW/EXPORT to every role except
 * super_admin, but `AuditLogService.add()` is called from across the entire
 * frontend by every role as a side effect of actions those roles are already
 * independently authorized to perform (breaks starting, leave approvals,
 * task creation, user creation, ...) — see ActivityContext.tsx, HR pages,
 * SuperAdminPanel.tsx. Gating on 'reports' CREATE would silently make audit
 * logging fail for almost every real action in the app. Writing an audit
 * entry only requires being authenticated; the actual business action it
 * records was already RBAC-checked by its own endpoint.
 */
final class AuditLogController
{
    private AuditLogRepository $repo;

    public function __construct()
    {
        $this->repo = new AuditLogRepository();
    }

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('reports', 'VIEW');
        if ($guard) {
            return $guard;
        }

        $filters = [];
        if ($request->get_param('entityType')) {
            $filters['entityType'] = sanitize_text_field($request->get_param('entityType'));
        }
        if ($request->get_param('performedBy')) {
            $filters['performedBy'] = sanitize_text_field($request->get_param('performedBy'));
        }
        if ($request->get_param('limit')) {
            $filters['limit'] = (int) $request->get_param('limit');
        }

        // Department-scoped roles (everyone except super_admin/management/
        // hr_admin/hr_member, per DepartmentScopeMiddleware::hasAllDepartmentAccess())
        // only ever see their own department's audit trail, resolved
        // server-side — the whole company's action log is otherwise visible
        // to any role holding 'reports' VIEW, which is far broader than
        // "administers this one department."
        $role = AuthMiddleware::currentRole() ?? '';
        if (!DepartmentScopeMiddleware::hasAllDepartmentAccess($role)) {
            $filters['department'] = DepartmentMapper::deptLabelForRole($role);
        }

        return ApiResponse::ok($this->repo->list($filters));
    }

    public function create(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'action' => ['required'],
            'entityType' => ['required'],
            'performedBy' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return ApiResponse::ok($this->repo->create($data), [], 201);
    }

    public function search(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('reports', 'VIEW');
        if ($guard) {
            return $guard;
        }

        $params = [];
        foreach (['q', 'entityType', 'action', 'performedByRole', 'dateFrom', 'dateTo'] as $key) {
            $value = $request->get_param($key);
            if ($value !== null && $value !== '') {
                $params[$key] = sanitize_text_field($value);
            }
        }

        // Same department scoping as list() above.
        $role = AuthMiddleware::currentRole() ?? '';
        if (!DepartmentScopeMiddleware::hasAllDepartmentAccess($role)) {
            $params['department'] = DepartmentMapper::deptLabelForRole($role);
        }

        return ApiResponse::ok($this->repo->search($params));
    }
}
