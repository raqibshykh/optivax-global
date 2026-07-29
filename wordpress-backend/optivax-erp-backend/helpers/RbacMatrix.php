<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Line-for-line PHP port of src/utils/rbac.ts's RBAC_MATRIX, ROLE_PRIMARY_DOMAIN,
 * and CROSS_CUTTING_DOMAINS. This is a manually-synced mirror of the frontend's
 * source of truth — if rbac.ts changes, this file must be updated by hand.
 * See PHASE2A_IMPLEMENTATION_REPORT.md "RBAC matrix duplication risk".
 */
final class RbacMatrix
{
    public const ALL_ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE', 'ASSIGN'];

    public const ROLES = [
        'super_admin', 'management',
        'sales_admin', 'sales_member',
        'production_admin', 'production_member',
        'marketing_admin', 'marketing_member',
        'hr_admin', 'hr_member',
        'it_admin', 'it_member',
        'client',
    ];

    public const DOMAINS = [
        'sales', 'production', 'marketing', 'hr', 'it_support',
        'clients', 'system', 'billing', 'reports',
        'files', 'notifications', 'revisions', 'conversations', 'budget',
        'payroll', 'salary_slips', 'advance_salary',
    ];

    private static function matrix(): array
    {
        $all = self::ALL_ACTIONS;
        return [
            'super_admin' => array_fill_keys(self::DOMAINS, $all),
            'management' => [
                'sales' => ['VIEW', 'EXPORT'],
                'production' => ['VIEW', 'EXPORT'],
                'marketing' => ['VIEW', 'EXPORT'],
                'hr' => ['VIEW', 'EXPORT'],
                'clients' => ['VIEW', 'EXPORT'],
                'billing' => ['VIEW', 'CREATE', 'EDIT', 'EXPORT', 'APPROVE', 'ASSIGN'],
                'reports' => ['VIEW', 'EXPORT'],
                'files' => ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
                'notifications' => ['VIEW', 'EXPORT'],
                'revisions' => ['VIEW', 'EDIT'],
                // VIEW+CREATE only — every internal role can submit/view IT
                // tickets (Tickets.tsx's own design: "any internal non-client
                // employee can create tickets"), but only it_admin/it_member/
                // super_admin can assign/resolve/escalate/close (a separate
                // EDIT grant those roles alone carry). Fixes a 2026-07-17 bug
                // where this domain had no grant at all for non-IT roles, so
                // /it/tickets 403'd for everyone else — mirrors src/utils/rbac.ts.
                'it_support' => ['VIEW', 'CREATE'],
                'conversations' => $all,
                'budget' => $all,
                'payroll' => $all,
                'salary_slips' => $all,
                'advance_salary' => $all,
            ],
            'sales_admin' => [
                'sales' => $all,
                'clients' => $all,
                'billing' => ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'ASSIGN'],
                'reports' => ['VIEW', 'EXPORT'],
                'files' => ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
                'notifications' => ['VIEW', 'CREATE'],
                'it_support' => ['VIEW', 'CREATE'],
                'budget' => ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'ASSIGN'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'sales_member' => [
                'sales' => ['VIEW', 'EDIT'],
                'clients' => ['VIEW', 'EDIT'],
                'files' => ['VIEW', 'CREATE'],
                'notifications' => ['VIEW'],
                'it_support' => ['VIEW', 'CREATE'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'production_admin' => [
                'production' => $all,
                'clients' => ['VIEW', 'ASSIGN'],
                // Production Requests are content_calendar entries with
                // productionSupportRequired=true, served under the 'marketing'
                // RBAC domain (ContentCalendarRoutes.php) — VIEW to see them,
                // EDIT to update their production status
                // (ContentCalendar.tsx's canUpdateProdStatus). Not $all:
                // creating/deleting calendar entries stays marketing-only.
                // Mirrors src/utils/rbac.ts.
                'marketing' => ['VIEW', 'EDIT'],
                // Department dropdowns/filters are app-wide (DepartmentContext
                // fetches GET /departments/list for every authenticated user),
                // gated on the 'system' domain (DepartmentRoutes.php) — VIEW
                // only, so production_admin can read the list but still can't
                // create/edit/delete departments (super_admin/it_admin only).
                // Mirrors src/utils/rbac.ts.
                'system' => ['VIEW'],
                'files' => $all,
                'reports' => ['VIEW', 'EXPORT'],
                'notifications' => ['VIEW', 'CREATE'],
                'revisions' => ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
                'conversations' => ['VIEW', 'CREATE', 'EDIT'],
                'it_support' => ['VIEW', 'CREATE'],
                'budget' => ['VIEW', 'EXPORT'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'production_member' => [
                'production' => ['VIEW', 'EDIT'],
                'files' => ['VIEW', 'CREATE'],
                'notifications' => ['VIEW'],
                'revisions' => ['VIEW'],
                'conversations' => ['VIEW', 'CREATE'],
                'it_support' => ['VIEW', 'CREATE'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'marketing_admin' => [
                'marketing' => $all,
                'sales' => ['VIEW'],
                'files' => $all,
                'reports' => ['VIEW', 'EXPORT'],
                'notifications' => ['VIEW', 'CREATE'],
                'conversations' => ['VIEW', 'CREATE', 'EDIT'],
                'it_support' => ['VIEW', 'CREATE'],
                'budget' => ['VIEW', 'EXPORT'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'marketing_member' => [
                'marketing' => ['VIEW', 'EDIT'],
                'sales' => ['VIEW'],
                'files' => ['VIEW', 'CREATE'],
                'notifications' => ['VIEW'],
                'conversations' => ['VIEW', 'CREATE'],
                'it_support' => ['VIEW', 'CREATE'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'hr_admin' => [
                'hr' => $all,
                'files' => $all,
                'reports' => ['VIEW', 'EXPORT'],
                'notifications' => ['VIEW', 'CREATE'],
                'it_support' => ['VIEW', 'CREATE'],
                'budget' => ['VIEW', 'EXPORT'],
                'payroll' => $all,
                'salary_slips' => $all,
                'advance_salary' => ['VIEW', 'APPROVE', 'EDIT'],
            ],
            'hr_member' => [
                'hr' => ['VIEW'],
                'files' => ['VIEW', 'CREATE'],
                'notifications' => ['VIEW'],
                'it_support' => ['VIEW', 'CREATE'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'it_admin' => [
                'it_support' => $all,
                'reports' => ['VIEW', 'EXPORT'],
                'notifications' => ['VIEW', 'CREATE'],
                'system' => ['VIEW', 'EDIT'],
            ],
            'it_member' => [
                'it_support' => ['VIEW', 'EDIT'],
                'notifications' => ['VIEW'],
            ],
            'client' => [
                'production' => ['VIEW'],
                'clients' => ['VIEW', 'EDIT'],
                'billing' => ['VIEW'],
                'files' => ['VIEW'],
                'notifications' => ['VIEW'],
            ],
        ];
    }

    private static function rolePrimaryDomain(): array
    {
        return [
            'sales_admin' => 'sales',
            'sales_member' => 'sales',
            'production_admin' => 'production',
            'production_member' => 'production',
            'marketing_admin' => 'marketing',
            'marketing_member' => 'marketing',
            'hr_admin' => 'hr',
            'hr_member' => 'hr',
            'it_admin' => 'it_support',
            'it_member' => 'it_support',
            'client' => 'clients',
        ];
    }

    private static function crossCuttingDomains(): array
    {
        return [
            'files' => true, 'notifications' => true, 'reports' => true, 'revisions' => true,
            'conversations' => true, 'budget' => true, 'salary_slips' => true, 'advance_salary' => true,
        ];
    }

    /** Unscoped raw-matrix check — mirrors hasPermission() in rbac.ts. */
    public static function hasPermission(?string $role, string $domain, string $action): bool
    {
        if (!$role) {
            return false;
        }
        $matrix = self::matrix();
        $domainPerms = $matrix[$role][$domain] ?? null;
        if (!$domainPerms) {
            return false;
        }
        return in_array($action, $domainPerms, true);
    }

    /** Scoped check — mirrors hasPermissionScoped() in rbac.ts. */
    public static function hasPermissionScoped(?string $role, string $domain, string $action): bool
    {
        if (!$role) {
            return false;
        }
        if ($role === 'super_admin') {
            return true;
        }
        if ($role === 'management') {
            return self::hasPermission($role, $domain, $action);
        }

        $rolePrimary = self::rolePrimaryDomain()[$role] ?? null;
        $crossCutting = self::crossCuttingDomains();

        if ($rolePrimary !== null && !isset($crossCutting[$domain])) {
            if ($action !== 'VIEW' && $rolePrimary !== $domain) {
                return false;
            }
        }

        return self::hasPermission($role, $domain, $action);
    }

    public static function isValidRole(string $role): bool
    {
        return in_array($role, self::ROLES, true);
    }
}
