import PageMeta from "../../components/common/PageMeta";
import { UserService, UserProfile } from "../../services/userService";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { safeParse } from "../../lib/storage";
import { storeMockPassword } from "../../lib/client";
import { DESIGNATIONS_BY_ROLE, UserRole } from "../../types";

interface EmployeeExtraData {
  userId: string;
  leavesTaken: number;
  salary: number;
  salaryStatus: "Paid" | "Unpaid";
  workMode: "Onsite" | "Remote";
}

const DEPARTMENTS = [
  { value: "dept-marketing",   label: "Marketing" },
  { value: "dept-sales",       label: "Sales" },
  { value: "dept-production",  label: "Production" },
  { value: "dept-hr",          label: "HR" },
  { value: "dept-management",  label: "Management" },
  { value: "dept-it-support",  label: "IT Support" },
];

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

  // When dept admin creates employee, lock department to their own
  const forcedDept = isDeptAdmin && viewerDomain ? `dept-${viewerDomain}` : null;

  const designationOptions = DESIGNATIONS_BY_ROLE[formRole as UserRole] ?? [];

  const fetchEmployees = async () => {
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

      const stored = localStorage.getItem("optivax_employee_extra");
      if (stored) {
        setExtraData(safeParse<Record<string, EmployeeExtraData>>(stored, {}));
      } else {
        const defaults: Record<string, EmployeeExtraData> = {};
        for (const emp of visible) {
          defaults[emp.id] = { userId: emp.id, leavesTaken: 2, salary: 45000, salaryStatus: "Unpaid", workMode: "Onsite" };
        }
        localStorage.setItem("optivax_employee_extra", JSON.stringify(defaults));
        setExtraData(defaults);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to fetch employees", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, [routerLocation.pathname]);

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormName(""); setFormEmail(""); setFormRole("production_member");
    setFormDesignation(""); setFormPassword("");
    setFormDepartment(forcedDept || (viewerDomain ? `dept-${viewerDomain}` : ""));
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
    setFormDepartment(emp.departmentId || (forcedDept ?? (viewerDomain ? `dept-${viewerDomain}` : "")));
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // When a dept admin creates, always force their department
      const dept = forcedDept ?? formDepartment ?? (viewerDomain ? `dept-${viewerDomain}` : undefined);
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
        const newEmp = await UserService.create({
          full_name: formName,
          email: formEmail,
          role: formRole,
          designation: formDesignation || undefined,
          avatar_url: "",
          company: "",
          departmentId: dept,
          created_at: new Date().toISOString(),
        } as any);
        storeMockPassword(formEmail, formPassword);
        const stored = localStorage.getItem("optivax_employee_extra");
        const currentExtras = safeParse<Record<string, EmployeeExtraData>>(stored, {});
        currentExtras[newEmp.id] = { userId: newEmp.id, leavesTaken: formLeavesTaken, salary: formSalary, salaryStatus: formSalaryStatus, workMode: formWorkMode };
        localStorage.setItem("optivax_employee_extra", JSON.stringify(currentExtras));
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
            return (
              <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.full_name || "N/A"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                  <div className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5">{emp.role || "—"}</div>
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
              Scope: {isGlobalViewer ? "All employees" : viewerDomain ? `${viewerDomain.charAt(0).toUpperCase() + viewerDomain.slice(1)} department` : "Restricted"}
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
                        const label = key.startsWith("dept-") ? key.replace("dept-", "") : key;
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
                      <option value="management">Management</option>
                      <option value="sales_admin">Sales Admin</option>
                      <option value="sales_member">Sales Member</option>
                      <option value="production_admin">Production Admin</option>
                      <option value="production_member">Production Member</option>
                      <option value="marketing_admin">Marketing Admin</option>
                      <option value="marketing_member">Marketing Member</option>
                      <option value="hr_admin">HR Admin</option>
                      <option value="hr_member">HR Member</option>
                      {isSuper && <option value="super_admin">Super Admin</option>}
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
                        {DEPARTMENTS.find(d => d.value === forcedDept)?.label ?? forcedDept} <span className="text-xs text-gray-400">(auto-assigned)</span>
                      </div>
                    ) : (
                      <select value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="">Unassigned</option>
                        {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
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
    </>
  );
}
