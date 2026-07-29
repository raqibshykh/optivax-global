<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\SecurityAuditLogController;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Read-only, super_admin-only. No create/update/delete route exists — see
 * SecurityAuditLogController's doc comment.
 */
final class SecurityAuditLogRoutes
{
    public static function register(): void
    {
        $controller = new SecurityAuditLogController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/security-audit-logs/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);
    }
}
