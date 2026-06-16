import PageMeta from "../../components/common/PageMeta";
import { UserService, UserProfile } from "../../services/userService";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { safeParse } from "../../lib/storage";

interface EmployeeExtraData {
  userId: string;
  leavesTaken: number;
  salary: number;
  salaryStatus: "Paid" | "Unpaid";
  workMode: "Onsite" | "Remote";
}

export default function Employees() {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [extraData, setExtraData] = useState<Record<string, EmployeeExtraData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  
  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("management");

  // New Fields for Employee Addition
  const [formSalary, setFormSalary] = useState(35000);
  const [formLeavesTaken, setFormLeavesTaken] = useState(0);
  const [formWorkMode, setFormWorkMode] = useState<"Onsite" | "Remote">("Onsite");
  const [formSalaryStatus, setFormSalaryStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [formDepartment, setFormDepartment] = useState<string>("");
  
  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const auth = useAuth();
  const routerLocation = useLocation();

  const viewer = auth.user;
  const viewerRole = viewer?.role || null;
  const isSuper = viewerRole === "super_admin";
  const isManager = viewerRole === "management";
  const isHRAdmin = viewerRole === "hr_admin";
  const isDeptAdmin = viewerRole?.endsWith("_admin") && !isHRAdmin && !isSuper && !isManager;
  const viewerDomain = viewerRole ? viewerRole.split("_")[0] : null;

  const isGlobalViewer = isSuper || isManager || isHRAdmin;

  const canAdd = isSuper || isHRAdmin;

  const canEditEmployee = (_emp: UserProfile) => isSuper || isHRAdmin;

  const canDeleteEmployee = (_emp: UserProfile) => isSuper || isHRAdmin;

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const allUsers = await UserService.getAll();
      console.log("Current role:", viewerRole);
      console.log("Loaded users:", allUsers);

      // Exclude clients from employee listings
      const nonClient = allUsers.filter((u) => u.role !== "client");

      // Derive the route domain from React Router's location (works with HashRouter)
      const parts = routerLocation.pathname.split("/").filter(Boolean);
      const routeDomain = parts[0] || null; // e.g. 'sales', 'marketing', 'hr'

      let visible: UserProfile[];

      if (routeDomain && ["sales", "marketing", "production"].includes(routeDomain)) {
        // Department-scoped: show only that department's users
        visible = nonClient.filter((u) => Boolean(u.role && u.role.startsWith(routeDomain)));
      } else {
        // hr / management / admin / super-admin routes: show all employees
        visible = nonClient;
      }

      console.log("Filtered users:", visible);
      setEmployees(visible);

      const stored = localStorage.getItem("optivax_employee_extra");
      if (stored) {
        setExtraData(safeParse<Record<string, EmployeeExtraData>>(stored, {}));
      } else {
        const defaults: Record<string, EmployeeExtraData> = {};
        for (const emp of visible) {
          defaults[emp.id] = {
            userId: emp.id,
            leavesTaken: 2,
            salary: 45000,
            salaryStatus: "Unpaid",
            workMode: "Onsite",
          };
        }
        localStorage.setItem("optivax_employee_extra", JSON.stringify(defaults));
        setExtraData(defaults);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to fetch employees", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [routerLocation.pathname]);

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormName("");
    setFormEmail("");
    setFormRole("management");
    setFormDepartment(viewerDomain ? `dept-${viewerDomain}` : "");
    setFormSalary(35000);
    setFormLeavesTaken(0);
    setFormWorkMode("Onsite");
    setFormSalaryStatus("Unpaid");
    setIsModalOpen(true);
  };

  const handleEdit = (emp: UserProfile) => {
    setEditingEmployee(emp);
    setFormName(emp.full_name || "");
    setFormEmail(emp.email);
    setFormRole(emp.role || "management");
    setFormDepartment(emp.departmentId || (viewerDomain ? `dept-${viewerDomain}` : ""));
    // Extra details edited on Payroll page, so we don't set modal state for them
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await UserService.delete(id);
        showToast("Employee deleted successfully", "success");
        fetchEmployees();
      } catch (err: any) {
        showToast(err.message || "Failed to delete employee", "error");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await UserService.update(editingEmployee.id, {
          full_name: formName,
          email: formEmail,
          role: formRole,
          departmentId: formDepartment || undefined,
        });
        showToast("Employee updated successfully", "success");
      } else {
        const newEmp = await UserService.create({
          full_name: formName,
          email: formEmail,
          role: formRole,
          avatar_url: "",
          company: "",
          departmentId: formDepartment || (viewerDomain ? `dept-${viewerDomain}` : undefined),
          created_at: new Date().toISOString(),
        });
        
        // Save initial extra details to localStorage
        const stored = localStorage.getItem("optivax_employee_extra");
        const currentExtras = safeParse<Record<string, EmployeeExtraData>>(stored, {});
        currentExtras[newEmp.id] = {
          userId: newEmp.id,
          leavesTaken: formLeavesTaken,
          salary: formSalary,
          salaryStatus: formSalaryStatus,
          workMode: formWorkMode,
        };
        localStorage.setItem("optivax_employee_extra", JSON.stringify(currentExtras));
        showToast("Employee created successfully", "success");
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      showToast(err.message || "Failed to save employee", "error");
    }
  };

  // Filter & Pagination logic
  const filteredEmployees = employees.filter((e) =>
    (e.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.role || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const currentEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderTable = (emps: UserProfile[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leaves (Taken / Left)</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Salary</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deduction</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mode</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {emps.map((emp) => {
            const extra = extraData[emp.id] || {
              leavesTaken: 0,
              salary: 30000,
              salaryStatus: "Unpaid",
              workMode: "Onsite",
            };
            const leavesLeft = Math.max(0, 24 - extra.leavesTaken);
            const deduction = extra.leavesTaken > 10 ? Math.round((extra.leavesTaken - 10) * (extra.salary / 30)) : 0;

            return (
              <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-850/50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.full_name || "N/A"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                  <div className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5">{emp.role || "management"}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">{extra.leavesTaken}</span> taken / <span className="font-semibold text-green-600">{leavesLeft}</span> remaining
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">Rs. {extra.salary.toLocaleString()}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-red-500">Rs. {deduction.toLocaleString()}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                    extra.salaryStatus === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}>{extra.salaryStatus}</span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                    extra.workMode === "Onsite" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                  }`}>{extra.workMode}</span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canEditEmployee(emp) ? (
                    <button onClick={() => handleEdit(emp)} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300 mr-4">Edit Role</button>
                  ) : null}
                  {canDeleteEmployee(emp) ? (
                    <button onClick={() => handleDelete(emp.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                  ) : null}
                  {!canEditEmployee(emp) && !canDeleteEmployee(emp) && (
                    <span className="text-xs text-gray-400 italic">No permission</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <>
      <PageMeta
        title="Employees | Optivax Global"
        description="Manage your employees and roles."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Employees
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Manage employee accounts, permissions, and department roles.
          </p>
          <div className="mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              Scope: {isGlobalViewer ? "All employees" : viewerDomain ? `${viewerDomain.charAt(0).toUpperCase() + viewerDomain.slice(1)} department` : "Restricted"}
            </span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          title={!canAdd ? "You don't have permission to add employees" : "Add new employee"}
          className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${canAdd ? 'text-white bg-brand-500 border border-transparent hover:bg-brand-600' : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700'}`}
        >
          Add New Employee
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Employee List
          </h3>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No employees found.</p>
            ) : (
              <>
                {isGlobalViewer ? (
                  // Group by department
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
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{label.charAt(0).toUpperCase() + label.slice(1)} Department</h4>
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
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
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md mx-auto my-6 z-50">
            <div className="relative flex flex-col w-full bg-white border border-gray-300 rounded-lg shadow-lg outline-none focus:outline-none dark:bg-gray-900 dark:border-gray-800">
              <div className="flex items-start justify-between p-5 border-b border-solid border-gray-200 rounded-t dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingEmployee ? "Edit Employee Account" : "Add New Employee"}
                </h3>
                <button
                  className="p-1 ml-auto bg-transparent border-0 text-black float-right text-3xl leading-none font-semibold outline-none focus:outline-none dark:text-white"
                  onClick={() => setIsModalOpen(false)}
                >
                  <span className="bg-transparent text-gray-500 h-6 w-6 text-2xl block outline-none focus:outline-none">×</span>
                </button>
              </div>
              <form onSubmit={handleSave}>
                <div className="relative p-6 flex-auto space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                    <select
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                      <option value="">Unassigned</option>
                      <option value="dept-marketing">Marketing</option>
                      <option value="dept-sales">Sales</option>
                      <option value="dept-production">Production</option>
                      <option value="dept-hr">HR</option>
                      <option value="dept-management">Management</option>
                    </select>
                  </div>

                  {/* Show payroll & leave configurations ONLY when adding new employee */}
                  {!editingEmployee && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Payroll & Leave Settings</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Salary (Rs.)</label>
                          <input
                            type="number"
                            value={formSalary}
                            onChange={(e) => setFormSalary(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Leaves Taken</label>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            value={formLeavesTaken}
                            onChange={(e) => setFormLeavesTaken(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Work Mode</label>
                          <select
                            value={formWorkMode}
                            onChange={(e) => setFormWorkMode(e.target.value as "Onsite" | "Remote")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          >
                            <option value="Onsite">Onsite</option>
                            <option value="Remote">Remote</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Status</label>
                          <select
                            value={formSalaryStatus}
                            onChange={(e) => setFormSalaryStatus(e.target.value as "Paid" | "Unpaid")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          >
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
                <div className="flex items-center justify-end p-6 border-t border-solid border-gray-200 rounded-b dark:border-gray-800 space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-850 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-500 border border-transparent rounded-md hover:bg-brand-600"
                  >
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
