import { useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AuditLogService } from "../../services/auditLogService";
import { AuditLog } from "../../types";

const ENTITY_TYPES = ["", "user", "client", "task", "campaign", "leave_request", "payroll", "attendance", "deliverable"];
const ACTIONS = [
  "", "USER_CREATED", "CLIENT_CREATED", "CLIENT_ASSIGNED",
  "TASK_ASSIGNED", "TASK_UPDATED", "TASK_COMPLETED",
  "LEAVE_SUBMITTED", "LEAVE_APPROVED", "LEAVE_REJECTED",
  "PAYROLL_UPDATED", "ATTENDANCE_MODIFIED",
  "CAMPAIGN_CREATED", "BUDGET_CHANGED",
  "DELIVERABLE_UPLOADED", "DELIVERABLE_APPROVED",
  "PASSWORD_RESET",
];

const ACTION_COLORS: Record<string, string> = {
  USER_CREATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  CLIENT_CREATED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CLIENT_ASSIGNED: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  TASK_ASSIGNED: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  TASK_COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  LEAVE_APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  LEAVE_REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  PAYROLL_UPDATED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  DELIVERABLE_APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  PASSWORD_RESET: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

function fmt(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ExportCSV({ logs }: { logs: AuditLog[] }) {
  const download = () => {
    const headers = ["Timestamp", "Action", "Entity Type", "Entity", "Performed By", "Role", "Description"];
    const rows = logs.map((l) => [
      l.timestamp, l.action, l.entityType, l.entityName,
      l.performedByName, l.performedByRole, `"${l.description.replace(/"/g, "'")}"`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      onClick={download}
      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      Export CSV
    </button>
  );
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const allLogs = useMemo(() => AuditLogService.getAll(), []);

  const filtered = useMemo(() =>
    AuditLogService.search(search, {
      action: filterAction || undefined,
      entityType: filterEntityType || undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
    }),
    [search, filterAction, filterEntityType, filterDateFrom, filterDateTo]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch("");
    setFilterAction("");
    setFilterEntityType("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setPage(1);
  };

  return (
    <>
      <PageMeta title="Audit Logs | Optivax Global" description="Enterprise audit trail" />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Complete audit trail — {allLogs.length} total entries
          </p>
        </div>
        <ExportCSV logs={filtered} />
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Actions</option>
            {ACTIONS.filter(Boolean).map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
          </select>
          <select
            value={filterEntityType}
            onChange={(e) => { setFilterEntityType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Entity Types</option>
            {ENTITY_TYPES.filter(Boolean).map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {(search || filterAction || filterEntityType || filterDateFrom || filterDateTo) && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filtered.length} of {allLogs.length} entries
            </span>
            <button onClick={resetFilters} className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline transition-colors">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {pageLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {allLogs.length === 0
                ? "No audit events recorded yet. Events are logged as actions are performed."
                : "No entries match the current filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Performed By</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pageLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmt(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{log.entityName}</div>
                      <div className="text-xs text-gray-400">{log.entityType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{log.performedByName}</div>
                      <div className="text-xs text-gray-400">{log.performedByRole.replace(/_/g, " ")}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages} ({filtered.length} entries)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
