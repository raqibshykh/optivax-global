<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\DepartmentMapper;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Extension point, not yet wired into any route's query filtering.
 *
 * The frontend contract has no existing `?departmentId=` query param on any
 * `/list` endpoint (confirmed by exploration: department-scoped reads are
 * currently done by fetching everything and filtering client-side). Auto-
 * scoping list queries by department here would therefore be a new behavior
 * with no frontend precedent to preserve — a Phase 2B product decision, not
 * a foundation one. This class exists so that decision has somewhere
 * self-contained to land: `isScopedRole()` / `accessibleDepartmentSlug()`
 * are correct and callable today, just not yet invoked by any controller.
 */
final class DepartmentScopeMiddleware
{
    public static function hasAllDepartmentAccess(string $role): bool
    {
        return DepartmentMapper::hasAllDepartmentAccess($role);
    }

    /** Null means "all departments" (super_admin/management/hr_admin/hr_member). */
    public static function accessibleDepartmentSlug(string $role): ?string
    {
        if (self::hasAllDepartmentAccess($role)) {
            return null;
        }
        return DepartmentMapper::deptSlugForRole($role);
    }
}
