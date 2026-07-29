<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Ports two distinct role->department mapping conventions found in the frontend:
 * - ROLE_TO_DEPT (src/domain/attendance/calculations.ts) — slug form ("dept-sales"), used for attendance access scoping.
 * - deptFromRole (src/domain/budget/calculations.ts) — label form ("Sales"), used for budget department summaries.
 * Not yet wired into automatic query filtering anywhere (see DepartmentScopeMiddleware) —
 * this is a foundation lookup only, per the Phase 2A plan's documented extension point.
 */
final class DepartmentMapper
{
    private const ROLE_TO_DEPT_SLUG = [
        'sales_admin' => 'dept-sales',
        'sales_member' => 'dept-sales',
        'production_admin' => 'dept-production',
        'production_member' => 'dept-production',
        'marketing_admin' => 'dept-marketing',
        'marketing_member' => 'dept-marketing',
        'hr_admin' => 'dept-hr',
        'hr_member' => 'dept-hr',
        'it_admin' => 'dept-it-support',
        'it_member' => 'dept-it-support',
    ];

    private const ROLE_TO_DEPT_LABEL_PREFIXES = [
        'sales' => 'Sales',
        'production' => 'Production',
        'marketing' => 'Marketing',
        'hr' => 'HR',
        'it' => 'IT Support',
    ];

    /**
     * Roles with NO RBAC domain of their own — domainForRole() returns null for these by
     * design (RbacMatrix::DOMAINS has no "management" entry; management is cross-cutting, not
     * domain-scoped) — but that must still resolve to a real, specific department
     * automatically. This was the actual root cause of "management users never get linked to
     * the Management department": every OTHER role's department resolution (create/update
     * auto-assign, the Migrator backfill, ShiftResolver's legacy-slug fallback) is keyed off
     * domainForRole(), so a role with no domain silently fell through all of it. Resolved by
     * NAME instead, via DepartmentAutoAssignService — extend this map, not domainForRole(),
     * for any future domain-less role that needs the same treatment.
     */
    private const ROLE_TO_DEPARTMENT_NAME = [
        'management' => 'Management',
    ];

    public static function deptSlugForRole(string $role): ?string
    {
        return self::ROLE_TO_DEPT_SLUG[$role] ?? null;
    }

    /**
     * The raw RBAC domain (RbacMatrix::DOMAINS shape, e.g. "sales", "it_support") a role
     * belongs to — deptSlugForRole() minus its "dept-" prefix. Used to validate that an
     * employee's chosen real `departments` row (its `domain` column) actually matches their
     * role, which is the Department Master's "department admin must belong to that
     * department" rule: a production_admin can never be assigned a Sales department, and vice
     * versa. Returns null for roles with no department domain (super_admin, management,
     * client) — nothing to validate for those.
     */
    public static function domainForRole(string $role): ?string
    {
        $slug = self::deptSlugForRole($role);
        if (!$slug) {
            return null;
        }
        return str_replace('-', '_', preg_replace('/^dept-/', '', $slug));
    }

    /** The canonical department NAME a domain-less role (see ROLE_TO_DEPARTMENT_NAME) should resolve/auto-create against. Null for every role resolved by domain instead (and for super_admin/client, which aren't department-scoped at all). */
    public static function departmentNameForRole(string $role): ?string
    {
        return self::ROLE_TO_DEPARTMENT_NAME[$role] ?? null;
    }

    /** Mirrors deptFromRole() — role-prefix match, "management" -> "Management", else "General". */
    public static function deptLabelForRole(string $role): string
    {
        if ($role === 'management') {
            return 'Management';
        }
        foreach (self::ROLE_TO_DEPT_LABEL_PREFIXES as $prefix => $label) {
            if (strpos($role, $prefix) === 0) {
                return $label;
            }
        }
        return 'General';
    }

    /** Mirrors getAccessibleDepts() — roles that can see every department's data. */
    public static function hasAllDepartmentAccess(string $role): bool
    {
        return in_array($role, ['super_admin', 'management', 'hr_admin', 'hr_member'], true);
    }
}
