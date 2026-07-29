import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { SecurityAuditLogService, SecurityAuditLogEntry } from "../../services/securityAuditLogService";

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  failure: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function fmt(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SecurityAuditLogs() {
  const [logs, setLogs] = useState<SecurityAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await SecurityAuditLogService.list({
        action: actionFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 200,
      });
      setLogs(data);
    } catch {
      setError("Failed to load security audit logs.");
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <>
      <PageMeta title="Security Audit Logs | Optivax Global" description="Authentication and user-management security trail" />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Security Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Immutable, Super Admin-only trail of login, logout, password, and role/account-management events.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Filter by action (e.g. login_failed)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No security events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Actor</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Target</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(log.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[log.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {log.actorUserId ? `#${log.actorUserId}${log.actorRole ? ` (${log.actorRole})` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {log.targetUserId ? `#${log.targetUserId}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
