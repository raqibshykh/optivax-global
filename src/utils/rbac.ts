import { UserRole, PermissionDomain, PermissionAction, User } from "../types";

type RolePermissions = Partial<Record<PermissionDomain, PermissionAction[]>>;

const ALL_ACTIONS: PermissionAction[] = ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "APPROVE", "ASSIGN"];

export const RBAC_MATRIX: Record<UserRole, RolePermissions> = {
  super_admin: {
    sales: ALL_ACTIONS,
    production: ALL_ACTIONS,
    marketing: ALL_ACTIONS,
    hr: ALL_ACTIONS,
    clients: ALL_ACTIONS,
    system: ALL_ACTIONS,
    billing: ALL_ACTIONS,
    reports: ALL_ACTIONS,
    files: ALL_ACTIONS,
    notifications: ALL_ACTIONS,
    revisions: ALL_ACTIONS,
    it_support: ALL_ACTIONS,
    conversations: ALL_ACTIONS,
    budget: ALL_ACTIONS,
    payroll: ALL_ACTIONS,
    salary_slips: ALL_ACTIONS,
    advance_salary: ALL_ACTIONS,
    employees: ALL_ACTIONS,
    employee_salary: ALL_ACTIONS,
    employee_leave: ALL_ACTIONS,
    employee_status: ALL_ACTIONS,
  },
  management: {
    sales: ["VIEW", "EXPORT"],
    // CREATE+EDIT added so Management can create/update projects
    // (Admin/Projects.tsx's canCreate/canEdit both check "production" — there
    // is no separate "projects" domain; ProjectRoutes.php gates
    // /projects/create and /projects/update on 'production' CREATE/EDIT via
    // BaseCrudController). No DELETE — project deletion stays
    // super_admin-only unless explicitly granted (ProjectRoutes.php gates
    // DELETE on 'production' too). Known coupling: TaskRoutes.php and
    // DeliverableRoutes.php also construct their BaseCrudController on this
    // same 'production' domain, so this grant necessarily also lets
    // Management create/edit tasks and deliverables, not just projects —
    // splitting those onto distinct domains would need backend route changes
    // (and backfilling production_admin/production_member/client/super_admin
    // grants for a new 'projects' domain) beyond what this task asked for;
    // flagging so it's a deliberate, visible trade-off.
    production: ["VIEW", "CREATE", "EDIT", "EXPORT"],
    marketing: ["VIEW", "EXPORT"],
    // Split off "hr" (see PermissionDomain in src/types/index.ts) so
    // Management can onboard/update employee PROFILES without inheriting
    // payroll access: Employees.tsx's canAdd/canEditEmployee now check
    // "employees", not "hr". No DELETE — removing an employee account stays
    // super_admin-only, same as clients below. Deliberately NO "hr" grant at
    // all here anymore — EmployeeExtraController (salary/deductions/salary
    // status/work mode), the leave-approval endpoints in
    // LeaveRequestController, and the account-status field in
    // ProfileController all now gate on the domains below instead, so this
    // role can no longer edit payroll data via any path (UI or direct API
    // call) just by holding employee-profile access.
    employees: ["VIEW", "CREATE", "EDIT"],
    // VIEW only — read access preserved for payroll oversight (the salary
    // columns in Employees.tsx, ManagementPanel's payroll widgets,
    // AttendancePayroll.tsx), but EDIT is deliberately withheld: this is the
    // fix for the reported issue where "hr:EDIT" let Management write salary,
    // deductions, and salary status through EmployeeExtraController.
    employee_salary: ["VIEW"],
    // VIEW only — company-wide leave stats stay visible (ManagementPanel
    // dashboard), but APPROVE is withheld: Management has no leave-approval
    // UI today (LeaveRequests.tsx/HRPanel.tsx are hr_admin/hr_member-only
    // routes), so this only closes a latent direct-API gap, not a used
    // feature.
    employee_leave: ["VIEW"],
    // Not granted — activating/deactivating an employee account is
    // deliberately narrower than general profile EDIT; only hr_admin and
    // super_admin (via its "system" EDIT bypass) may flip that flag.

    // No "system" grant: GET /departments/list (DepartmentRoutes.php) is
    // auth-only, not RBAC-domain-gated, so Management (like every other
    // role) reads department names without needing this domain at all — see
    // that route's own doc comment. "system" stays reserved for actual admin
    // actions (department/company-settings/automation CRUD), which
    // Management still can't touch.

    // CREATE+EDIT added so Management can create/update client records
    // (Admin/Clients.tsx's canCreate/canEdit both check "clients"). No
    // DELETE — client deletion stays super_admin-only unless explicitly
    // granted (ClientRoutes.php gates DELETE on 'clients' via BaseCrudController).
    clients: ["VIEW", "CREATE", "EDIT", "EXPORT"],
    billing: ["VIEW", "CREATE", "EDIT", "EXPORT", "APPROVE", "ASSIGN"],
    reports: ["VIEW", "EXPORT"],
    files: ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"],
    notifications: ["VIEW", "EXPORT"],
    revisions: ["VIEW", "EDIT"],
    // VIEW+CREATE only — every internal role can submit/view IT tickets
    // (Tickets.tsx's own design: "any internal non-client employee can
    // create tickets"), but only it_admin/it_member/super_admin can
    // assign/resolve/escalate/close (that's a separate EDIT grant those
    // roles alone carry). Fixes a 2026-07-17 bug where this domain had no
    // grant at all for non-IT roles, so /it/tickets 403'd for everyone else.
    it_support: ["VIEW", "CREATE"],
    conversations: ALL_ACTIONS,
    // Not checked by any controller today (PayrollController gates its
    // routes on salary_slips/advance_salary instead — see its own doc
    // comment) — VIEW+EXPORT kept here only so the matrix doesn't overstate
    // access if a future endpoint starts checking it.
    payroll: ["VIEW", "EXPORT"],
    // Reduced from ALL_ACTIONS: CREATE/EDIT gated bulkSaveSalarySlips/
    // createSalarySlip in PayrollController — direct payroll-slip generation/
    // editing, which is exactly the "payroll settings" the Management role
    // spec says must stay off-limits unless explicitly granted. VIEW+EXPORT
    // preserves read/export access for oversight and reporting.
    salary_slips: ["VIEW", "EXPORT"],
    // Deliberately NOT reduced: AdvanceSalary.tsx hardcodes
    // `["super_admin", "management", "hr_admin"]` as its approver list
    // (isApprover) independent of this matrix — Management approving
    // advance-salary requests is an existing, intentional workflow, not a
    // "payroll settings" change. Restricting advance_salary here would leave
    // that approve/mark-paid UI visible but failing (403), which is worse
    // than the status quo.
    advance_salary: ALL_ACTIONS,
  },
  sales_admin: {
    sales: ALL_ACTIONS,
    clients: ALL_ACTIONS,
    billing: ["VIEW", "CREATE", "EDIT", "APPROVE", "ASSIGN"],
    reports: ["VIEW", "EXPORT"],
    files: ["VIEW", "CREATE", "EDIT", "DELETE"],
    notifications: ["VIEW", "CREATE"],
    // No "conversations" grant — Sales Admin is explicitly denied access to
    // client messages/message history (see conversationsData.ts, App.tsx).
    it_support: ["VIEW", "CREATE"],
    budget: ["VIEW", "CREATE", "EDIT", "APPROVE", "ASSIGN"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  sales_member: {
    sales: ["VIEW", "EDIT"],
    clients: ["VIEW", "EDIT"],
    files: ["VIEW", "CREATE"],
    notifications: ["VIEW"],
    // No "conversations" grant — Sales Member is explicitly denied access to
    // client messages/message history (see conversationsData.ts, App.tsx).
    it_support: ["VIEW", "CREATE"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  production_admin: {
    production: ALL_ACTIONS,
    clients: ["VIEW", "ASSIGN"],
    // Production Requests are content_calendar entries with
    // productionSupportRequired=true, served under the 'marketing' RBAC
    // domain (ContentCalendarRoutes.php) — VIEW to see them, EDIT to update
    // their production status (ContentCalendar.tsx's canUpdateProdStatus).
    // Not ALL_ACTIONS: creating/deleting calendar entries stays marketing-only.
    marketing: ["VIEW", "EDIT"],
    // No "system" grant needed: GET /departments/list (DepartmentRoutes.php)
    // is auth-only, not RBAC-domain-gated — every authenticated user reads
    // department names that way (DepartmentContext fetches it app-wide for
    // exactly that reason). "system" stays reserved for actually
    // administrative actions (create/edit/delete departments, company
    // settings, automation rules), which production_admin still can't touch.
    files: ALL_ACTIONS,
    reports: ["VIEW", "EXPORT"],
    notifications: ["VIEW", "CREATE"],
    revisions: ["VIEW", "CREATE", "EDIT", "DELETE"],
    conversations: ["VIEW", "CREATE", "EDIT"],
    it_support: ["VIEW", "CREATE"],
    budget: ["VIEW", "EXPORT"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  production_member: {
    production: ["VIEW", "EDIT"],
    files: ["VIEW", "CREATE"],
    notifications: ["VIEW"],
    revisions: ["VIEW"],
    conversations: ["VIEW", "CREATE"],
    it_support: ["VIEW", "CREATE"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  marketing_admin: {
    marketing: ALL_ACTIONS,
    sales: ["VIEW"],        // read-only access to leads for campaign attribution
    files: ALL_ACTIONS,
    reports: ["VIEW", "EXPORT"],
    notifications: ["VIEW", "CREATE"],
    conversations: ["VIEW", "CREATE", "EDIT"],
    it_support: ["VIEW", "CREATE"],
    budget: ["VIEW", "EXPORT"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  marketing_member: {
    marketing: ["VIEW", "EDIT"],
    sales: ["VIEW"],        // view lead sources generated by marketing campaigns
    files: ["VIEW", "CREATE"],
    notifications: ["VIEW"],
    conversations: ["VIEW", "CREATE"],
    it_support: ["VIEW", "CREATE"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  hr_admin: {
    hr: ALL_ACTIONS,
    // Full access to every employee-related domain split off "hr" — HR keeps
    // complete profile, payroll, leave-approval, and account-status control.
    employees: ALL_ACTIONS,
    employee_salary: ALL_ACTIONS,
    employee_leave: ALL_ACTIONS,
    employee_status: ALL_ACTIONS,
    files: ALL_ACTIONS,
    reports: ["VIEW", "EXPORT"],
    notifications: ["VIEW", "CREATE"],
    it_support: ["VIEW", "CREATE"],
    budget: ["VIEW", "EXPORT"],
    payroll: ALL_ACTIONS,
    salary_slips: ALL_ACTIONS,
    advance_salary: ["VIEW", "APPROVE", "EDIT"],
  },
  hr_member: {
    hr: ["VIEW"],
    // Mirrors the old "hr":["VIEW"] grant — read access only, same as before.
    employees: ["VIEW"],
    employee_salary: ["VIEW"],
    employee_leave: ["VIEW"],
    files: ["VIEW", "CREATE"],
    notifications: ["VIEW"],
    it_support: ["VIEW", "CREATE"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  it_admin: {
    // IT Support manages tickets, devices, and attendance data only.
    // No access to hr (payroll/salary), billing, or client financial data.
    it_support: ALL_ACTIONS,
    reports:       ["VIEW", "EXPORT"],
    notifications: ["VIEW", "CREATE"],
    system:        ["VIEW", "EDIT"],
  },
  it_member: {
    it_support: ["VIEW", "EDIT"],
    notifications: ["VIEW"],
  },
  client: {
    production: ["VIEW"],
    clients: ["VIEW", "EDIT"],
    billing: ["VIEW"],
    files: ["VIEW"],
    notifications: ["VIEW"],
  }
};

export const hasPermission = (user: User | null, domain: PermissionDomain, action: PermissionAction): boolean => {
  if (!user) return false;
  
  const rolePerms = RBAC_MATRIX[user.role];
  if (!rolePerms) return false;

  const domainPerms = rolePerms[domain];
  if (!domainPerms) return false;

  return domainPerms.includes(action);
};

// Map a role to its primary domain. Roles not listed are considered "global" (e.g., super_admin, management).
const ROLE_PRIMARY_DOMAIN: Partial<Record<UserRole, PermissionDomain>> = {
  sales_admin: "sales",
  sales_member: "sales",
  production_admin: "production",
  production_member: "production",
  marketing_admin: "marketing",
  marketing_member: "marketing",
  hr_admin: "hr",
  hr_member: "hr",
  it_admin: "it_support",
  it_member: "it_support",
  client: "clients",
};

// Domains that are cross-cutting infrastructure — all employee roles have explicit RBAC grants
// for these, so they must not be restricted by the primary-domain scope rule.
const CROSS_CUTTING_DOMAINS = new Set<PermissionDomain>([
  "files", "notifications", "reports", "revisions", "conversations", "budget",
  "salary_slips", "advance_salary",
  // hr_admin/hr_member's primary domain is "hr", not these — without this
  // exemption the scope rule would block their own CREATE/EDIT/APPROVE
  // grants on the split-off employee domains below.
  "employees", "employee_salary", "employee_leave", "employee_status",
]);

export const hasPermissionScoped = (user: User | null, domain: PermissionDomain, action: PermissionAction): boolean => {
  // super_admin has unrestricted access
  if (!user) return false;
  if (user.role === "super_admin") return true;

  // management role is cross-domain — always check the full matrix (no scope restriction)
  if (user.role === "management") {
    return hasPermission(user, domain, action);
  }

  const rolePrimary = ROLE_PRIMARY_DOMAIN[user.role as UserRole] ?? null;

  // Enforce scope: dept roles cannot perform non-VIEW actions outside their primary domain.
  // Cross-cutting infrastructure domains (files, notifications, reports, revisions) are exempt
  // because all roles have explicit matrix grants for them.
  if (rolePrimary && !CROSS_CUTTING_DOMAINS.has(domain)) {
    if (action !== "VIEW" && rolePrimary !== domain) {
      return false;
    }
  }

  // Fallback to the regular matrix check
  return hasPermission(user, domain, action);
};

export const canManageBudget = (user: User | null): boolean => {
  if (!user) return false;
  return ["super_admin", "management", "sales_admin", "production_admin", "marketing_admin", "hr_admin", "it_admin"].includes(user.role);
};

export const canView = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "VIEW");
export const canCreate = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "CREATE");
export const canEdit = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "EDIT");
export const canDelete = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "DELETE");
export const canExport = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "EXPORT");
export const canApprove = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "APPROVE");
export const canAssign = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "ASSIGN");

export const isMember = (user: User | null): boolean => {
  if (!user) return false;
  return user.role.endsWith("_member");
};
