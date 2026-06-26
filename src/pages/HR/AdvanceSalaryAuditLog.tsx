import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  getAdvanceAuditLog,
  type AdvanceSalaryAuditEntry,
  type AdvanceAuditAction,
} from "../../mock/payrollData";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<AdvanceAuditAction, string> = {
  REQUEST_CREATED:       "Request Created",
  APPROVED:              "Approved",
  REJECTED:              "Rejected",
  MARKED_PAID:           "Marked Paid",
  CANCELLED:             "Cancelled",
  SELF_APPROVAL_ATTEMPT: "Self-Approval Attempt",
};

const ACTION_COLOR: Record<AdvanceAuditAction, string> = {
  REQUEST_CREATED:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED:              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED:              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  MARKED_PAID:           "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  CANCELLED:             "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  SELF_APPROVAL_ATTEMPT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const ALL_ACTIONS: AdvanceAuditAction[] = [
  "REQUEST_CREATED",
  "APPROVED",
  "REJECTED",
  "MARKED_PAID",
  "CANCELLED",
  "SELF_APPROVAL_ATTEMPT",
];

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

function exportCSV(entries: AdvanceSalaryAuditEntry[]) {
  const headers = [
    "Timestamp", "Action", "Employee", "Employee Role", "Department",
    "Amount (Rs)", "Performed By", "Performed By Role", "Request ID", "Notes",
  ];
  const rows = entries.map((e) => [
    new Date(e.timestamp).toLocaleString(),
    ACTION_LABELS[e.action],
    e.employeeName,
    e.employeeRole,
    e.department,
    String(Math.round(e.amount)),
    e.performedByName,
    e.performedByRole,
    e.requestId,
    (e.notes ?? "").replace(/,/g, ";"),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `advance-salary-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdvanceSalaryAuditLog() {
  const { user } = useAuth();

  const [entries, setEntries] = useState<AdvanceSalaryAuditEntry[]>([]);
  const [filterAction, setFilterAction] = useState<AdvanceAuditAction | "all">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setEntries(getAdvanceAuditLog());
  }, []);

  const allowed = user?.role === "super_admin" || user?.role === "hr_admin";

  const filtered = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((e) => {
        if (filterAction !== "all" && e.action !== filterAction) return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !e.employeeName.toLowerCase().includes(q) &&
            !e.performedByName.toLowerCase().includes(q) &&
            !e.department.toLowerCase().includes(q) &&
            !e.requestId.toLowerCase().includes(q)
          )
            return false;
        }
        if (dateFrom && new Date(e.timestamp) < new Date(dateFrom)) return false;
        if (dateTo && new Date(e.timestamp) > new Date(dateTo + "T23:59:59")) return false;
        return true;
      });
  }, [entries, filterAction, search, dateFrom, dateTo]);

  const inputCls =
    "rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent";

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Access restricted to Super Admin and HR Admin only.
          </p>
        </div>
      </div>
    );
  }

  const selfAttempts = entries.filter((e) => e.action === "SELF_APPROVAL_ATTEMPT").length;

  return (
    <>
      <PageMeta
        title="Advance Salary Audit Log | Optivax Global"
        description="Audit trail for all advance salary request actions"
      />
      <PageBreadcrumb pageTitle="Advance Salary Audit Log" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Events",          value: entries.length,                                            color: "text-gray-900 dark:text-white" },
          { label: "Approved",              value: entries.filter((e) => e.action === "APPROVED").length,     color: "text-green-600" },
          { label: "Rejected",              value: entries.filter((e) => e.action === "REJECTED").length,     color: "text-red-600" },
          { label: "Self-Approval Attempts", value: selfAttempts,                                             color: selfAttempts > 0 ? "text-orange-600" : "text-gray-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {selfAttempts > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-sm text-orange-800 dark:text-orange-300">
          ⚠ {selfAttempts} self-approval attempt{selfAttempts > 1 ? "s" : ""} detected in the audit log. Review the entries below.
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 shadow-sm mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Action Type</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as AdvanceAuditAction | "all")}
              className={inputCls}
            >
              <option value="all">All Actions</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
          </div>

          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <input
              type="text"
              placeholder="Employee, performer, department, request ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>

          <button
            onClick={() => exportCSV(filtered)}
            className="px-4 py-1.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            ↓ Export CSV
          </button>

          {(filterAction !== "all" || search || dateFrom || dateTo) && (
            <button
              onClick={() => { setFilterAction("all"); setSearch(""); setDateFrom(""); setDateTo(""); }}
              className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {filtered.length !== entries.length && (
          <p className="mt-2 text-xs text-gray-400">Showing {filtered.length} of {entries.length} entries</p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {["Timestamp", "Action", "Employee", "Dept", "Amount", "Performed By", "Notes"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-sm text-gray-400">
                    {entries.length === 0
                      ? "No audit entries yet. Actions on advance salary requests will appear here."
                      : "No entries match the selected filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${
                      e.action === "SELF_APPROVAL_ATTEMPT"
                        ? "bg-orange-50/50 dark:bg-orange-900/10"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ACTION_COLOR[e.action]}`}>
                        {ACTION_LABELS[e.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{e.employeeName}</p>
                      <p className="text-xs text-gray-400">{e.employeeRole}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{e.department}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {fmtRs(e.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{e.performedByName}</p>
                      <p className="text-xs text-gray-400">{e.performedByRole}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={e.notes}>
                      {e.notes ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
