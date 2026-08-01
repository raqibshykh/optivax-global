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
        // Split out of 'hr' — see src/types/index.ts's PermissionDomain doc
        // comment and the 'management' matrix entry below for why.
        'employees', 'employee_salary', 'employee_leave', 'employee_status',
    ];

    private static function matrix(): array
    {
        $all = self::ALL_ACTIONS;
        return [
            'super_admin' => array_fill_keys(self::DOMAINS, $all),
            'management' => [
                // NOTE: 'management' does not fall through array_fill_keys — every
                // domain it holds is listed explicitly below.
                'sales' => ['VIEW', 'EXPORT'],
                // CREATE+EDIT added so Management can create/update projects
                // (ProjectRoutes.php gates /projects/create and
                // /projects/update on 'production' CREATE/EDIT via
                // BaseCrudController — there is no separate 'projects'
                // domain). No DELETE — project deletion stays
                // super_admin-only unless explicitly granted (same route
                // file gates DELETE on 'production' too). Known coupling:
                // TaskRoutes.php and DeliverableRoutes.php also construct
                // their BaseCrudController on this same 'production' domain,
                // so this grant necessarily also lets Management create/edit
                // tasks and deliverables, not just projects — mirrors
                // src/utils/rbac.ts.
                'production' => ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
                'marketing' => ['VIEW', 'EXPORT'],
                // Split off 'hr' — mirrors src/utils/rbac.ts. Management can
                // onboard/update employee PROFILES (ProfileController::create()
                // via UserHierarchy, ProfileController::update() non-self
                // branch) via 'employees', but deliberately holds no 'hr'
                // grant at all anymore: EmployeeExtraController (salary/
                // deductions/salary status/work mode), the leave-approval
                // endpoints in LeaveRequestController, and the account-status
                // field in ProfileController now gate on the domains below
                // instead, so this role can no longer edit payroll data via
                // any path — UI or direct API call — just by holding
                // employee-profile access. No DELETE — removing an employee
                // account stays super_admin-only (ProfileController::delete()'s
                // 'system' DELETE gate, unchanged).
                'employees' => ['VIEW', 'CREATE', 'EDIT'],
                // VIEW only — read access preserved for payroll oversight (the
                // salary columns in Employees.tsx, ManagementPanel's payroll
                // widgets, AttendancePayroll.tsx), but EDIT is deliberately
                // withheld: this is the fix for the reported issue where
                // 'hr':EDIT let Management write salary, deductions, and
                // salary status through EmployeeExtraController.
                'employee_salary' => ['VIEW'],
                // VIEW only — company-wide leave stats stay visible
                // (ManagementPanel dashboard), but APPROVE is withheld:
                // Management has no leave-approval UI today
                // (LeaveRequests.tsx/HRPanel.tsx are hr_admin/hr_member-only
                // routes), so this only closes a latent direct-API gap, not a
                // used feature.
                'employee_leave' => ['VIEW'],
                // Not granted — activating/deactivating an employee account is
                // deliberately narrower than general profile EDIT; only
                // hr_admin and super_admin (via its 'system' EDIT bypass) may
                // flip that flag.

                // No 'system' grant: GET /departments/list (DepartmentRoutes.php)
                // is auth-only, not RBAC-domain-gated — mirrors src/utils/rbac.ts.

                // CREATE+EDIT added so Management can create/update client
                // records (ClientRoutes.php gates CREATE directly; EDIT via
                // BaseCrudController::updateByBodyIdHandler()). No DELETE —
                // client deletion stays super_admin-only unless explicitly
                // granted — mirrors src/utils/rbac.ts.
                'clients' => ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
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
                // Not checked by any controller today (PayrollController
                // gates its routes on salary_slips/advance_salary instead —
                // see PayrollController's own doc comment) — VIEW+EXPORT kept
                // here only so the matrix doesn't overstate access if a
                // future endpoint starts checking it — mirrors src/utils/rbac.ts.
                'payroll' => ['VIEW', 'EXPORT'],
                // Reduced from $all: CREATE/EDIT gate
                // bulkSaveSalarySlips()/createSalarySlip() in
                // PayrollController — direct payroll-slip generation/editing,
                // exactly the "payroll settings" Management must not touch
                // unless explicitly granted. VIEW+EXPORT preserves
                // read/export access for oversight/reporting — mirrors
                // src/utils/rbac.ts.
                'salary_slips' => ['VIEW', 'EXPORT'],
                // Deliberately NOT reduced: AdvanceSalary.tsx hardcodes
                // ["super_admin","management","hr_admin"] as its approver
                // list (isApprover) independent of this matrix — Management
                // approving advance-salary requests is an existing,
                // intentional workflow, not a "payroll settings" change —
                // mirrors src/utils/rbac.ts.
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
                // No 'system' grant needed: GET /departments/list
                // (DepartmentRoutes.php) is auth-only, not RBAC-domain-gated
                // — every authenticated user reads department names that way
                // (DepartmentContext fetches it app-wide for exactly that
                // reason). 'system' stays reserved for actual admin actions
                // (department/company-settings/automation CRUD), which
                // production_admin still can't touch. Mirrors src/utils/rbac.ts.
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
                // Full access to every employee-related domain split off
                // 'hr' — HR keeps complete profile, payroll, leave-approval,
                // and account-status control.
                'employees' => $all,
                'employee_salary' => $all,
                'employee_leave' => $all,
                'employee_status' => $all,
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
                // Mirrors the old 'hr' => ['VIEW'] grant — read access only.
                'employees' => ['VIEW'],
                'employee_salary' => ['VIEW'],
                'employee_leave' => ['VIEW'],
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
            // hr_admin/hr_member's primary domain is 'hr', not these — without
            // this exemption the scope rule would block their own
            // CREATE/EDIT/APPROVE grants on the split-off employee domains.
            'employees' => true, 'employee_salary' => true, 'employee_leave' => true, 'employee_status' => true,
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
