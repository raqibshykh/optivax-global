import PageMeta from "../../components/common/PageMeta";
import { UserService, UserProfile } from "../../services/userService";
import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { safeParse } from "../../lib/storage";

interface EmployeeExtraData {
  userId: string;
  leavesTaken: number;
  salary: number;
  salaryStatus: "Paid" | "Unpaid";
  workMode: "Onsite" | "Remote";
}

export default function Payroll() {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [extraData, setExtraData] = useState<Record<string, EmployeeExtraData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // Editing state for individual row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Omit<EmployeeExtraData, "userId">>({
    leavesTaken: 0,
    salary: 0,
    salaryStatus: "Unpaid",
    workMode: "Onsite",
  });

  const fetchEmployeesAndExtra = async () => {
    setIsLoading(true);
    try {
      const allUsers = await UserService.getAll();
      const filtered = allUsers.filter((u) => u.role !== "client");
      setEmployees(filtered);

      // Load from localStorage
      const stored = localStorage.getItem("optivax_employee_extra");
      if (stored) {
        setExtraData(safeParse<Record<string, EmployeeExtraData>>(stored, {}));
      } else {
        // Initialize defaults
        const defaults: Record<string, EmployeeExtraData> = {};
        filtered.forEach((emp) => {
          defaults[emp.id] = {
            userId: emp.id,
            leavesTaken: 2,
            salary: 45000,
            salaryStatus: "Unpaid",
            workMode: "Onsite",
          };
        });
        localStorage.setItem("optivax_employee_extra", JSON.stringify(defaults));
        setExtraData(defaults);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || "Failed to fetch data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndExtra();
  }, []);

  const handleEditClick = (empId: string) => {
    const current = extraData[empId] || {
      userId: empId,
      leavesTaken: 0,
      salary: 30000,
      salaryStatus: "Unpaid",
      workMode: "Onsite",
    };
    setEditingId(empId);
    setEditFields({
      leavesTaken: current.leavesTaken,
      salary: current.salary,
      salaryStatus: current.salaryStatus,
      workMode: current.workMode,
    });
  };

  const handleSaveRow = (empId: string) => {
    const updated = {
      ...extraData,
      [empId]: {
        userId: empId,
        ...editFields,
      },
    };
    setExtraData(updated);
    localStorage.setItem("optivax_employee_extra", JSON.stringify(updated));
    setEditingId(null);
    showToast("Employee details updated successfully", "success");
  };

  return (
    <>
      <PageMeta
        title="Manage Payroll & Leaves | Optivax Global"
        description="Edit employee leaves, salary, work mode, and payment status."
      />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Manage Payroll & Leaves
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Edit salaries, log taken leaves, toggle work modes, and update payment status for all employees.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payroll & Leave Editor
          </h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
            </div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No employees found to edit.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leaves Taken (Max 24)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Salary (Rs.)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Work Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {employees.map((emp) => {
                    const data = extraData[emp.id] || {
                      leavesTaken: 0,
                      salary: 30000,
                      salaryStatus: "Unpaid",
                      workMode: "Onsite",
                    };
                    const isEditing = editingId === emp.id;

                    return (
                      <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.full_name || "N/A"}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                          <div className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5">{emp.role}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="24"
                              value={editFields.leavesTaken}
                              onChange={(e) => setEditFields({ ...editFields, leavesTaken: parseInt(e.target.value) || 0 })}
                              className="w-20 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                          ) : (
                            <span className="text-sm text-gray-900 dark:text-white">{data.leavesTaken} / 24</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editFields.salary}
                              onChange={(e) => setEditFields({ ...editFields, salary: parseInt(e.target.value) || 0 })}
                              className="w-28 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">Rs. {data.salary.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={editFields.workMode}
                              onChange={(e) => setEditFields({ ...editFields, workMode: e.target.value as "Onsite" | "Remote" })}
                              className="px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            >
                              <option value="Onsite">Onsite</option>
                              <option value="Remote">Remote</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                              data.workMode === "Onsite" 
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            }`}>
                              {data.workMode}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={editFields.salaryStatus}
                              onChange={(e) => setEditFields({ ...editFields, salaryStatus: e.target.value as "Paid" | "Unpaid" })}
                              className="px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            >
                              <option value="Paid">Paid</option>
                              <option value="Unpaid">Unpaid</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                              data.salaryStatus === "Paid"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              {data.salaryStatus}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isEditing ? (
                            <div className="space-x-2">
                              <button
                                onClick={() => handleSaveRow(emp.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditClick(emp.id)}
                              className="text-brand-600 hover:text-brand-900 dark:text-brand-400"
                            >
                              Edit Details
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
