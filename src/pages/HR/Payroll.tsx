import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { UserService, UserProfile } from "../../services/userService";
import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { safeParse } from "../../lib/storage";
import { useAuth } from "../../context/AuthContext";

const EXTRA_KEY        = "optivax_employee_extra";
const LEAVE_FREE_DAYS  = 10; // first 10 leaves/year are fully paid

interface EmployeeExtraData {
  userId: string;
  leavesTaken: number;
  salary: number;
  bonus: number;
  extraDeduction: number;
  salaryStatus: "Paid" | "Unpaid";
  workMode: "Onsite" | "Remote";
}

function calcLeaveDeduction(leavesTaken: number, salary: number): number {
  const excess = Math.max(0, leavesTaken - LEAVE_FREE_DAYS);
  return excess > 0 ? Math.round((salary / 30) * excess) : 0;
}

function calcNetSalary(d: EmployeeExtraData): number {
  return Math.max(0, d.salary + (d.bonus ?? 0) - calcLeaveDeduction(d.leavesTaken, d.salary) - (d.extraDeduction ?? 0));
}

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

const EMPTY_EDIT: Omit<EmployeeExtraData, "userId"> = {
  leavesTaken: 0, salary: 0, bonus: 0, extraDeduction: 0,
  salaryStatus: "Unpaid", workMode: "Onsite",
};

export default function Payroll() {
  const [employees, setEmployees]   = useState<UserProfile[]>([]);
  const [extraData, setExtraData]   = useState<Record<string, EmployeeExtraData>>({});
  const [isLoading, setIsLoading]   = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState<"all" | "Paid" | "Unpaid">("all");
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Omit<EmployeeExtraData, "userId">>({ ...EMPTY_EDIT });
  const { showToast }               = useToast();
  const { canEdit, canExport }      = useAuth();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const allUsers = await UserService.getAll();
        const staff    = allUsers.filter((u) => u.role !== "client");
        setEmployees(staff);

        const stored = localStorage.getItem(EXTRA_KEY);
        if (stored) {
          setExtraData(safeParse<Record<string, EmployeeExtraData>>(stored, {}));
        } else {
          const defaults: Record<string, EmployeeExtraData> = {};
          staff.forEach((emp) => {
            defaults[emp.id] = { userId: emp.id, leavesTaken: 2, salary: 45000, bonus: 0, extraDeduction: 0, salaryStatus: "Unpaid", workMode: "Onsite" };
          });
          localStorage.setItem(EXTRA_KEY, JSON.stringify(defaults));
          setExtraData(defaults);
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Failed to load payroll", "error");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const getExtra = (id: string): EmployeeExtraData =>
    extraData[id] ?? { userId: id, leavesTaken: 0, salary: 30000, bonus: 0, extraDeduction: 0, salaryStatus: "Unpaid", workMode: "Onsite" };

  const handleEdit = (empId: string) => {
    const d = getExtra(empId);
    setEditingId(empId);
    setEditFields({ leavesTaken: d.leavesTaken, salary: d.salary, bonus: d.bonus ?? 0, extraDeduction: d.extraDeduction ?? 0, salaryStatus: d.salaryStatus, workMode: d.workMode });
  };

  const handleSave = (empId: string) => {
    const updated = { ...extraData, [empId]: { userId: empId, ...editFields } };
    setExtraData(updated);
    localStorage.setItem(EXTRA_KEY, JSON.stringify(updated));
    setEditingId(null);
    showToast("Payroll updated", "success");
  };

  const handleMarkAllPaid = () => {
    const updated: Record<string, EmployeeExtraData> = {};
    for (const [id, d] of Object.entries(extraData)) {
      updated[id] = { ...d, salaryStatus: "Paid" };
    }
    setExtraData(updated);
    localStorage.setItem(EXTRA_KEY, JSON.stringify(updated));
    showToast("All payroll marked as Paid for this period", "success");
  };

  const filtered = employees.filter((emp) => {
    const d = getExtra(emp.id);
    const q = search.toLowerCase();
    const matchSearch = !q || (emp.full_name || "").toLowerCase().includes(q) || emp.email.toLowerCase().includes(q);
    return matchSearch && (filterStatus === "all" || d.salaryStatus === filterStatus);
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  const allData       = employees.map((e) => getExtra(e.id));
  const totalPayroll  = allData.reduce((s, d) => s + calcNetSalary(d), 0);
  const totalBonuses  = allData.reduce((s, d) => s + (d.bonus ?? 0), 0);
  const totalDeductions = allData.reduce((s, d) => s + calcLeaveDeduction(d.leavesTaken, d.salary) + (d.extraDeduction ?? 0), 0);
  const paidCount     = allData.filter((d) => d.salaryStatus === "Paid").length;
  const unpaidCount   = allData.filter((d) => d.salaryStatus === "Unpaid").length;

  return (
    <>
      <PageMeta title="Payroll Management | Optivax Global" description="Manage payroll, bonuses, and deductions." />
      <PageBreadcrumb pageTitle="Payroll Management" />

      {/* ── KPI Summary ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Net Payroll",  value: fmtRs(totalPayroll),   sub: `${employees.length} employees`,      accent: "border-brand-500" },
          { label: "Total Bonuses",      value: fmtRs(totalBonuses),   sub: "Performance + bonus",                accent: "border-green-500" },
          { label: "Total Deductions",   value: fmtRs(totalDeductions), sub: "Leave excess + manual",             accent: "border-red-500"   },
          { label: "Payment Status",     value: `${paidCount} Paid`,   sub: `${unpaidCount} still unpaid`,        accent: "border-purple-500" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm border-l-4 ${c.accent}`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Policy Note ──────────────────────────────────────────────────── */}
      <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
        <strong>Leave deduction policy:</strong> First {LEAVE_FREE_DAYS} leaves/year are fully paid.
        Each excess leave day deducts (Base Salary ÷ 30) from net pay.
        Bonuses are added on top of base salary.
      </div>

      {/* ── Payroll Register Table ───────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payroll Register</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search employee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <select value={filterStatus} onChange={(e) => setFilter(e.target.value as "all" | "Paid" | "Unpaid")}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
            {canEdit("hr") && (
              <button onClick={handleMarkAllPaid}
                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 whitespace-nowrap">
                Mark All Paid
              </button>
            )}
            {canExport("hr") && (
              <button onClick={() => showToast("CSV export coming soon", "info")}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 whitespace-nowrap">
                Export CSV
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-sm text-center text-gray-400">No employees found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {[
                    "Employee", "Leaves (max 24)", "Base Salary", "Bonus",
                    "Leave Deduction", "Other Deduction", "Net Salary",
                    "Mode", "Status",
                    ...(canEdit("hr") ? ["Action"] : []),
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((emp) => {
                  const isEditing     = editingId === emp.id;
                  const d             = isEditing ? { userId: emp.id, ...editFields } : getExtra(emp.id);
                  const leaveDeduction = calcLeaveDeduction(d.leavesTaken, d.salary);
                  const net           = calcNetSalary(d);
                  const excessDays    = Math.max(0, d.leavesTaken - LEAVE_FREE_DAYS);

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      {/* Employee */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-900 dark:text-white">{emp.full_name || "—"}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                        <p className="text-[10px] text-brand-600 dark:text-brand-400">{emp.role}</p>
                      </td>

                      {/* Leaves Taken */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input type="number" min="0" max="24" value={editFields.leavesTaken}
                            onChange={(e) => setEditFields((f) => ({ ...f, leavesTaken: Math.min(24, parseInt(e.target.value) || 0) }))}
                            className="w-16 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        ) : (
                          <span className={`font-medium ${d.leavesTaken > LEAVE_FREE_DAYS ? "text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-white"}`}>
                            {d.leavesTaken} / 24
                          </span>
                        )}
                      </td>

                      {/* Base Salary */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input type="number" min="0" value={editFields.salary}
                            onChange={(e) => setEditFields((f) => ({ ...f, salary: parseInt(e.target.value) || 0 }))}
                            className="w-28 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        ) : (
                          <span className="font-semibold text-gray-900 dark:text-white">{fmtRs(d.salary)}</span>
                        )}
                      </td>

                      {/* Bonus */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input type="number" min="0" value={editFields.bonus}
                            onChange={(e) => setEditFields((f) => ({ ...f, bonus: parseInt(e.target.value) || 0 }))}
                            className="w-24 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        ) : (
                          <span className={`font-medium ${(d.bonus ?? 0) > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                            {(d.bonus ?? 0) > 0 ? `+${fmtRs(d.bonus ?? 0)}` : "—"}
                          </span>
                        )}
                      </td>

                      {/* Leave Deduction (auto-calculated) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {leaveDeduction > 0 ? (
                          <>
                            <span className="text-red-500 font-medium">-{fmtRs(leaveDeduction)}</span>
                            <p className="text-[10px] text-gray-400">{excessDays} excess day{excessDays !== 1 ? "s" : ""}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Extra Deduction (manual) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input type="number" min="0" value={editFields.extraDeduction}
                            onChange={(e) => setEditFields((f) => ({ ...f, extraDeduction: parseInt(e.target.value) || 0 }))}
                            className="w-24 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        ) : (
                          <span className={`font-medium ${(d.extraDeduction ?? 0) > 0 ? "text-red-500" : "text-gray-400"}`}>
                            {(d.extraDeduction ?? 0) > 0 ? `-${fmtRs(d.extraDeduction ?? 0)}` : "—"}
                          </span>
                        )}
                      </td>

                      {/* Net Salary */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-brand-700 dark:text-brand-400 text-base">{fmtRs(net)}</span>
                      </td>

                      {/* Work Mode */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <select value={editFields.workMode}
                            onChange={(e) => setEditFields((f) => ({ ...f, workMode: e.target.value as "Onsite" | "Remote" }))}
                            className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <option value="Onsite">Onsite</option>
                            <option value="Remote">Remote</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                            d.workMode === "Onsite"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          }`}>{d.workMode}</span>
                        )}
                      </td>

                      {/* Salary Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <select value={editFields.salaryStatus}
                            onChange={(e) => setEditFields((f) => ({ ...f, salaryStatus: e.target.value as "Paid" | "Unpaid" }))}
                            className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                            d.salaryStatus === "Paid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}>{d.salaryStatus}</span>
                        )}
                      </td>

                      {/* Action (canEdit only) */}
                      {canEdit("hr") && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleSave(emp.id)}
                                className="text-green-600 hover:text-green-800 dark:text-green-400 text-xs font-medium">Save</button>
                              <button onClick={() => setEditingId(null)}
                                className="text-gray-400 hover:text-gray-600 text-xs font-medium">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => handleEdit(emp.id)}
                              className="text-brand-600 hover:text-brand-800 dark:text-brand-400 text-xs font-medium">Edit</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
