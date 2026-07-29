import PageMeta from "../../components/common/PageMeta";
import { UserService, UserProfile } from "../../services/userService";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { DESIGNATIONS_BY_ROLE, UserRole } from "../../types";
import { EmployeeExtraService } from "../../services/employeeExtraService";
import { DepartmentService, Department } from "../../services/departmentService";
import Avatar from "../../components/common/Avatar";
import { resolveDepartmentName, UNKNOWN_DEPARTMENT } from "../../domain/department/calculations";

interface EmployeeExtraData {
  userId: string;
  leavesTaken: number;
  salary: number;
  salaryStatus: "Paid" | "Unpaid";
  workMode: "Onsite" | "Remote";
}

// Fallback shown only if the real departments table (Admin/Departments.tsx)
// has nothing configured yet, or its fetch fails — keeps the form usable
// even on a fresh install. Values MUST stay in lockstep with the backend's
// helpers/DepartmentMapper.php::ROLE_TO_DEPT_SLUG — every employee-department
// scoping check (RBAC, attendance, activity, budget) reads this exact slug
// shape, so the dropdown's VALUEs can never change format, only their LABEL
// source (see departmentOptions below, which prefers real department names).
const DEPARTMENTS = [
  { value: "dept-marketing",   label: "Marketing" },
  { value: "dept-sales",       label: "Sales" },
  { value: "dept-production",  label: "Production" },
  { value: "dept-hr",          label: "HR" },
  { value: "dept-management",  label: "Management" },
  { value: "dept-it-support",  label: "IT Support" },
];

// Mirrors the backend's DepartmentMapper::ROLE_TO_DEPT_SLUG exactly. The
// naive `dept-${role.split("_")[0]}` this used to be replaced with produced
// "dept-it" for it_admin/it_member — silently different from the backend's
// authoritative "dept-it-support" (the value actually stamped onto the
// employee record server-side; see ProfileController::create()'s forced-
// department branch). That mismatch only affected this page's own display
// (the "(auto-assigned)" label and the "Scope:" badge below both looked up
// the wrong department slug) — but it's exactly the kind of "employee's
// shown department disagrees with reality" confusion this fix closes.
const ROLE_TO_DEPT_SLUG: Partial<Record<UserRole, string>> = {
  sales_admin: "dept-sales", sales_member: "dept-sales",
  production_admin: "dept-production", production_member: "dept-production",
  marketing_admin: "dept-marketing", marketing_member: "dept-marketing",
  hr_admin: "dept-hr", hr_member: "dept-hr",
  it_admin: "dept-it-support", it_member: "dept-it-support",
};

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  management: "Management",
  sales_admin: "Sales Admin",
  sales_member: "Sales Member",
  production_admin: "Production Admin",
  production_member: "Production Member",
  marketing_admin: "Marketing Admin",
  marketing_member: "Marketing Member",
  hr_admin: "HR Admin",
  hr_member: "HR Member",
  it_admin: "IT Admin",
  it_member: "IT Member",
  client: "Client",
  super_admin: "Super Admin",
};

// Mirrors the backend's UserHierarchy::creatableRoles() — who may create/
// assign which role. Client-side only for a better error message; the
// server enforces this independently and is the real authority.
const CREATABLE_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  super_admin: [
    "management", "sales_admin", "sales_member", "production_admin", "production_member",
    "marketing_admin", "marketing_member", "hr_admin", "hr_member", "it_admin", "it_member", "client",
  ],
  sales_admin: ["sales_member", "client"],
  production_admin: ["production_member"],
  marketing_admin: ["marketing_member"],
  hr_admin: ["hr_member"],
  it_admin: ["it_member"],
  management: ["client"],
};

export default function Employees() {
  const [employees, setEmployees]     = useState<UserProfile[]>([]);
  const [extraData, setExtraData]     = useState<Record<string, EmployeeExtraData>>({});
  const [isLoading, setIsLoading]     = useState(true);
  const { showToast }                 = useToast();

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [editingEmployee, setEditingEmployee]   = useState<UserProfile | null>(null);
  const [formName, setFormName]                 = useState("");
  const [formEmail, setFormEmail]               = useState("");
  const [formRole, setFormRole]                 = useState("production_member");
  const [formDesignation, setFormDesignation]   = useState("");
  const [formPassword, setFormPassword]         = useState("");
  const [formSalary, setFormSalary]             = useState(35000);
  const [formLeavesTaken, setFormLeavesTaken]   = useState(0);
  const [formWorkMode, setFormWorkMode]         = useState<"Onsite" | "Remote">("Onsite");
  const [formSalaryStatus, setFormSalaryStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [formDepartment, setFormDepartment]     = useState<string>("");
  const [realDepartments, setRealDepartments]   = useState<Department[]>([]);
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName]           = useState("");
  const [newDeptDomain, setNewDeptDomain]       = useState<string>("sales");

  // Search, Filter & Pagination
  const [searchQuery, setSearchQuery]           = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [currentPage, setCurrentPage]           = useState(1);
  const itemsPerPage = 5;

  const auth = useAuth();
  const { canView, canCreate, canEdit, canDelete } = auth;
  const routerLocation = useLocation();

  const viewer        = auth.user;
  const viewerRole    = viewer?.role || null;
  const isSuper       = viewerRole === "super_admin";
  const isManager     = viewerRole === "management";
  const isHRAdmin     = viewerRole === "hr_admin";
  const isDeptAdmin   = viewerRole?.endsWith("_admin") && !isSuper && !isManager && !isHRAdmin;
  const viewerDomain  = viewerRole ? viewerRole.split("_")[0] : null;

  const isGlobalViewer    = canView("hr");
  const canSeeSalary      = canView("hr");
  const canAdd            = canCreate("hr");
  const canEditEmployee   = () => canEdit("hr");
  const canDeleteEmployee = () => canDelete("hr");

  // When dept admin creates employee, lock department to their own —
  // resolved via ROLE_TO_DEPT_SLUG (matches the backend's authoritative
  // DepartmentMapper mapping exactly), not a naive `dept-${domain}` guess.
  const forcedDept = isDeptAdmin && viewerRole ? ROLE_TO_DEPT_SLUG[viewerRole as UserRole] ?? null : null;

  // Roles the viewer is permitted to assign — mirrors the backend hierarchy
  // check; the server is the real authority, this only drives the dropdown
  // and gives a clear client-side error instead of a raw 403.
  const creatableRoles: UserRole[] = (viewerRole ? CREATABLE_ROLES[viewerRole as UserRole] : undefined) ?? [];

  const designationOptions = DESIGNATIONS_BY_ROLE[formRole as UserRole] ?? [];

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await UserService.getAll();
      const nonClient = allUsers.filter((u) => u.role !== "client");
      const parts = routerLocation.pathname.split("/").filter(Boolean);
      const routeDomain = parts[0] || null;
      let visible: UserProfile[];
      if (routeDomain && ["sales", "marketing", "production"].includes(routeDomain)) {
        visible = nonClient.filter((u) => Boolean(u.role && u.role.startsWith(routeDomain)));
      } else {
        visible = nonClient;
      }
      setEmployees(visible);

      const extras = await EmployeeExtraService.getAll();
      setExtraData(extras);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to fetch employees", "error");
    } finally {
      setIsLoading(false);
    }
  }, [routerLocation.pathname, showToast]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Real departments (Admin/Departments.tsx) — previously invisible to this
  // form entirely, which was the root cause of employees not landing in the
  // department an admin actually created/manages (see departmentOptions
  // below). Fetched once; failure is non-fatal, falls back to DEPARTMENTS.
  useEffect(() => {
    DepartmentService.getAll().then(setRealDepartments).catch(() => setRealDepartments([]));
  }, []);

  // Builds one dropdown option per domain that the RBAC/attendance/activity
  // scoping system actually understands (dept-sales, dept-marketing, ...) —
  // the stored value never changes shape — but prefers the REAL department
  // name(s) an admin configured for that domain over the generic fallback
  // label, so departments created via Admin/Departments.tsx are finally
  // visible here instead of only existing in a page nobody creating an
  // employee ever sees.
  const departmentOptions = useMemo(() => {
    const byDomain = new Map<string, string[]>();
    for (const dept of realDepartments) {
      if (dept.status === "inactive") continue; // deactivated departments never appear here — see Admin/Departments.tsx
      const slug = `dept-${dept.domain}`;
      const names = byDomain.get(slug) ?? [];
      names.push(dept.name);
      byDomain.set(slug, names);
    }
    return DEPARTMENTS.map((fallback) => {
      const realNames = byDomain.get(fallback.value);
      return realNames && realNames.length > 0
        ? { value: fallback.value, label: realNames.join(", ") }
        : fallback;
    });
  }, [realDepartments]);

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormName(""); setFormEmail(""); setFormRole("production_member");
    setFormDesignation(""); setFormPassword("");
    setFormDepartment(forcedDept || (viewerRole ? ROLE_TO_DEPT_SLUG[viewerRole as UserRole] ?? "" : ""));
    setFormSalary(35000); setFormLeavesTaken(0);
    setFormWorkMode("Onsite"); setFormSalaryStatus("Unpaid");
    setIsModalOpen(true);
  };

  const handleEdit = (emp: UserProfile) => {
    setEditingEmployee(emp);
    setFormName(emp.full_name || "");
    setFormEmail(emp.email);
    setFormRole(emp.role || "production_member");
    setFormDesignation((emp as any).designation || "");
    setFormDepartment(emp.departmentId || (forcedDept ?? (viewerRole ? ROLE_TO_DEPT_SLUG[viewerRole as UserRole] ?? "" : "")));
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await UserService.delete(id);
        showToast("Employee deleted successfully", "success");
        fetchEmployees();
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Failed to delete employee", "error");
      }
    }
  };

  // Mirrors the backend's ProfileController::departmentDomainMismatch() — the "department
  // admin must belong to that department" rule. Client-side only for a clear inline error
  // instead of a raw 403; the server enforces this independently and is the real authority.
  const departmentMismatchError = (role: UserRole, departmentSlug: string | undefined): string | null => {
    const requiredSlug = ROLE_TO_DEPT_SLUG[role];
    if (!requiredSlug || !departmentSlug) return null;
    if (departmentSlug !== requiredSlug) {
      const requiredLabel = departmentOptions.find((d) => d.value === requiredSlug)?.label ?? requiredSlug;
      return `${ROLE_LABELS[role] ?? role} must belong to the ${requiredLabel} department`;
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // When a dept admin creates, always force their department
      const dept = forcedDept ?? formDepartment ?? (viewerRole ? ROLE_TO_DEPT_SLUG[viewerRole as UserRole] : undefined);
      const mismatch = departmentMismatchError(formRole as UserRole, dept);
      if (mismatch) { showToast(mismatch, "error"); return; }
      if (editingEmployee) {
        await UserService.update(editingEmployee.id, {
          full_name: formName,
          email: formEmail,
          role: formRole,
          designation: formDesignation || undefined,
          departmentId: forcedDept ?? formDepartment ?? undefined,
        } as any);
        showToast("Employee updated successfully", "success");
      } else {
        if (!formPassword) { showToast("Password is required", "error"); return; }
        if (!creatableRoles.includes(formRole as UserRole)) {
          showToast("You are not permitted to create a user with this role", "error");
          return;
        }
        const newEmp = await UserService.create({
          full_name: formName,
          email: formEmail,
          role: formRole,
          designation: formDesignation || undefined,
          avatar_url: "",
          company: "",
          departmentId: dept,
          created_at: new Date().toISOString(),
          password: formPassword,
        } as any);
        await EmployeeExtraService.update(newEmp.id, {
          leavesTaken: formLeavesTaken, salary: formSalary, salaryStatus: formSalaryStatus, workMode: formWorkMode,
        });
        showToast("Employee created successfully", "success");
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save employee", "error");
    }
  };

  // All designation options across all roles for filter
  const allDesignations = Array.from(new Set(
    Object.values(DESIGNATIONS_BY_ROLE).flat()
  )).sort();

  const filteredEmployees = employees.filter((e) => {
    const matchSearch =
      (e.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.role || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((e as any).designation || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchDesig = !designationFilter || (e as any).designation === designationFilter;
    return matchSearch && matchDesig;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const currentEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, designationFilter]);

  const renderTable = (emps: UserProfile[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Designation</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leaves Taken</th>
            {canSeeSalary && (
              <>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Salary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deduction</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              </>
            )}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mode</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {emps.map((emp) => {
            const extra = extraData[emp.id] || { leavesTaken: 0, salary: 30000, salaryStatus: "Unpaid", workMode: "Onsite" };
            const deduction = extra.leavesTaken > 0 ? Math.round(extra.leavesTaken * (extra.salary / 30)) : 0;
            const designation = (emp as any).designation as string | undefined;
            const empDeptName = emp.departmentId ? resolveDepartmentName(emp.departmentId, realDepartments) : null;
            return (
              <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <Avatar src={(emp as any).avatar_url} name={emp.full_name || emp.email} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.full_name || "N/A"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                      <div className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5">
                        {emp.role || "—"}{empDeptName ? ` · ${empDeptName}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {designation ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                      {designation}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Not set</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">{extra.leavesTaken}</span> taken
                </td>
                {canSeeSalary && (
                  <>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">Rs. {extra.salary.toLocaleString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-red-500">Rs. {deduction.toLocaleString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${extra.salaryStatus === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {extra.salaryStatus}
                      </span>
                    </td>
                  </>
                )}
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${extra.workMode === "Onsite" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"}`}>
                    {extra.workMode}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canEditEmployee() ? (
                    <button onClick={() => handleEdit(emp)} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 mr-4">Edit</button>
                  ) : null}
                  {canDeleteEmployee() ? (
                    <button onClick={() => handleDelete(emp.id)} className="text-red-600 hover:text-red-900 dark:text-red-400">Delete</button>
                  ) : null}
                  {!canEditEmployee() && !canDeleteEmployee() && <span className="text-xs text-gray-400 italic">View only</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageMeta title="Employees | Optivax Global" description="Manage your employees and roles." />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Employees</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage employee accounts, designations, and department roles.</p>
          <div className="mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              Scope: {isGlobalViewer
                ? "All employees"
                : viewerRole && ROLE_TO_DEPT_SLUG[viewerRole as UserRole]
                  ? `${DEPARTMENTS.find(d => d.value === ROLE_TO_DEPT_SLUG[viewerRole as UserRole])?.label ?? viewerDomain} department`
                  : "Restricted"}
            </span>
          </div>
        </div>
        <button onClick={handleAdd} disabled={!canAdd} title={!canAdd ? "No permission" : "Add new employee"}
          className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${canAdd ? "text-white bg-brand-500 hover:bg-brand-600" : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700"}`}>
          Add New Employee
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employee List</h3>
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full sm:w-56">
              <input type="text" placeholder="Search by name, email, role, designation…" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="">All designations</option>
              {allDesignations.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" /></div>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No employees found.</p>
          ) : (
            <>
              {isGlobalViewer ? (
                (() => {
                  const groups: Record<string, UserProfile[]> = {};
                  for (const e of filteredEmployees) {
                    const key = e.departmentId || (e.role ? e.role.split("_")[0] : "unassigned");
                    groups[key] = groups[key] || [];
                    groups[key].push(e);
                  }
                  return (
                    <div className="space-y-6">
                      {Object.keys(groups).map((key) => {
                        // `key` is either a real departmentId, a legacy "dept-<domain>" slug, or
                        // (when an employee has neither) a short role-prefix fallback word like
                        // "sales" — resolveDepartmentName() handles the first two; a long,
                        // unresolvable key is treated as an orphaned id and never shown raw.
                        const resolvedName = resolveDepartmentName(key, realDepartments);
                        const label = resolvedName !== UNKNOWN_DEPARTMENT
                          ? resolvedName
                          : key.length > 20 ? UNKNOWN_DEPARTMENT : key.replace("dept-", "");
                        return (
                          <div key={key}>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 capitalize">{label} Department</h4>
                            {renderTable(groups[key])}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <>
                  {renderTable(currentEmployees)}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length}
                      </p>
                      <div className="flex space-x-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                          Previous
                        </button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md mx-auto z-50 my-4">
            <div className="relative flex flex-col w-full bg-white border border-gray-300 rounded-lg shadow-lg dark:bg-gray-900 dark:border-gray-800">
              <div className="flex items-start justify-between p-5 border-b border-solid border-gray-200 rounded-t dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingEmployee ? "Edit Employee" : "Add New Employee"}
                </h3>
                <button className="ml-auto text-gray-500 text-2xl leading-none" onClick={() => setIsModalOpen(false)}>×</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="p-6 flex-auto space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                    <input type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="john@example.com" />
                  </div>
                  {!editingEmployee && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password <span className="text-red-500">*</span></label>
                      <input type="password" required value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="Login password" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <select value={formRole} onChange={(e) => { setFormRole(e.target.value); setFormDesignation(""); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                      {creatableRoles.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
                    {designationOptions.length > 0 ? (
                      <select value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="">Select designation…</option>
                        {designationOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. Director" />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                    {forcedDept ? (
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                        {departmentOptions.find(d => d.value === forcedDept)?.label ?? forcedDept} <span className="text-xs text-gray-400">(auto-assigned)</span>
                      </div>
                    ) : (
                      <select value={formDepartment}
                        onChange={(e) => {
                          if (e.target.value === "__create_new__") { setIsCreateDeptOpen(true); return; }
                          setFormDepartment(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="">Unassigned</option>
                        {departmentOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        {isSuper && <option value="__create_new__">+ Add New Department…</option>}
                      </select>
                    )}
                  </div>
                  {!editingEmployee && canSeeSalary && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Payroll & Leave Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Salary (Rs.)</label>
                          <input type="number" value={formSalary} onChange={(e) => setFormSalary(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Leaves Taken</label>
                          <input type="number" min="0" value={formLeavesTaken} onChange={(e) => setFormLeavesTaken(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Work Mode</label>
                          <select value={formWorkMode} onChange={(e) => setFormWorkMode(e.target.value as "Onsite" | "Remote")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <option value="Onsite">Onsite</option>
                            <option value="Remote">Remote</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Status</label>
                          <select value={formSalaryStatus} onChange={(e) => setFormSalaryStatus(e.target.value as "Paid" | "Unpaid")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end p-6 border-t border-solid border-gray-200 dark:border-gray-800 space-x-2">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 border border-transparent rounded-md hover:bg-brand-600">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isCreateDeptOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">New Department</h3>
              <button onClick={() => setIsCreateDeptOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newDeptName.trim()) { showToast("Department name is required", "error"); return; }
                try {
                  const created = await DepartmentService.create({
                    name: newDeptName.trim(),
                    domain: newDeptDomain as any,
                  });
                  setRealDepartments((prev) => [...prev, created]);
                  setFormDepartment(`dept-${created.domain}`);
                  setNewDeptName("");
                  setIsCreateDeptOpen(false);
                  showToast("Department created", "success");
                } catch (err: unknown) {
                  showToast(err instanceof Error ? err.message : "Failed to create department", "error");
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input type="text" required value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Permission Domain *</label>
                <select value={newDeptDomain} onChange={(e) => setNewDeptDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  {DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value.replace(/^dept-/, "")}>{d.label}</option>
                  ))}
                  <option value="system">Other / General</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">Controls which staff role this department's employees/admins use.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateDeptOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
