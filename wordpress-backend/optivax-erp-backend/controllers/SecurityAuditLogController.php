<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Repositories\SecurityAuditLogRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/security-audit-logs/list — read-only, hardcoded to
 * super_admin (not the general RbacMatrix 'reports' domain, which several
 * other roles hold VIEW on). No other role may see this trail at all. There
 * is no create/update/delete route for this resource anywhere; rows are
 * written only by helpers/SecurityAuditLog.php from PHP call sites.
 */
final class SecurityAuditLogController
{
    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        if (AuthMiddleware::currentRole() !== 'super_admin') {
            return ApiResponse::forbidden('Security audit logs are restricted to Super Admin');
        }

        $filters = [];
        foreach (['action', 'actorUserId', 'targetUserId', 'dateFrom', 'dateTo', 'limit'] as $key) {
            $value = $request->get_param($key);
            if ($value !== null && $value !== '') {
                $filters[$key] = $value;
            }
        }

        return ApiResponse::ok((new SecurityAuditLogRepository())->list($filters));
    }
}
