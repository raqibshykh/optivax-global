import { useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { getDeviceSyncLogs, getDevices, type SyncResult } from "../../mock/itSupportData";

const RESULT_COLORS: Record<SyncResult, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  timeout: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function DeviceLogs() {
  const logs    = useMemo(() => getDeviceSyncLogs(), []);
  const devices = useMemo(() => getDevices(), []);

  const [filterDevice, setFilterDevice]   = useState("all");
  const [filterResult, setFilterResult]   = useState<"all" | SyncResult>("all");

  const filtered = logs.filter(l => {
    if (filterDevice !== "all" && l.deviceId !== filterDevice) return false;
    if (filterResult !== "all" && l.result !== filterResult) return false;
    return true;
  });

  const successCount = logs.filter(l => l.result === "success").length;
  const failedCount  = logs.filter(l => l.result === "failed" || l.result === "timeout").length;
  const totalRecords = logs.reduce((s, l) => s + l.recordsSynced, 0);

  return (
    <>
      <PageMeta title="Device Sync Logs | Optivax CRM" description="ZKTeco device sync logs" />
      <PageBreadcrumb pageTitle="Device Sync Logs" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Sync Events", value: String(logs.length), color: "text-gray-800 dark:text-white" },
          { label: "Successful",        value: String(successCount), color: "text-green-600 dark:text-green-400" },
          { label: "Failed / Timeout",  value: String(failedCount), color: failedCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500" },
          { label: "Records Imported",  value: String(totalRecords), color: "text-brand-600 dark:text-brand-400" },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterDevice} onChange={e => setFilterDevice(e.target.value)}>
          <option value="all">All Devices</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterResult} onChange={e => setFilterResult(e.target.value as "all" | SyncResult)}>
          <option value="all">All Results</option>
          <option value="success">Success</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
          <option value="timeout">Timeout</option>
        </select>

        <span className="self-center text-sm text-gray-500">{filtered.length} log{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Device", "Started At", "Completed At", "Result", "Records", "Triggered By", "Errors"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No sync logs found.</td>
                </tr>
              )}
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{log.deviceName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(log.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {log.completedAt ? new Date(log.completedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${RESULT_COLORS[log.result]}`}>{log.result}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-medium">{log.recordsSynced}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize whitespace-nowrap">
                    {log.triggeredBy === "manual" && log.triggeredByName ? log.triggeredByName : "Auto"}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">{log.errors ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
