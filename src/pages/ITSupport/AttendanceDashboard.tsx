import { useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { getDevices, getAttendanceExceptions, getDeviceSyncLogs } from "../../mock/itSupportData";
import { mockUsers } from "../../mock/users";

const STAFF = mockUsers.filter(u => u.role !== "client");

export default function AttendanceDashboard() {
  const devices    = useMemo(() => getDevices(), []);
  const exceptions = useMemo(() => getAttendanceExceptions(), []);
  const syncLogs   = useMemo(() => getDeviceSyncLogs(), []);

  const [activeTab, setActiveTab] = useState<"summary" | "devices" | "exceptions" | "logs">("summary");

  const onlineDevices     = devices.filter(d => d.status === "online").length;
  const offlineDevices    = devices.filter(d => d.status !== "online").length;
  const totalSyncedToday  = syncLogs
    .filter(l => l.result === "success" && l.startedAt.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((s, l) => s + l.recordsSynced, 0);
  const pendingExceptions = exceptions.filter(e => e.status === "pending").length;
  const missingPunches    = exceptions.filter(e => e.exceptionType === "missing-punch" || e.exceptionType === "no-record").length;
  const lateArrivals      = exceptions.filter(e => e.exceptionType === "late-arrival").length;

  return (
    <>
      <PageMeta title="Attendance Dashboard | Optivax CRM" description="Biometric attendance overview" />
      <PageBreadcrumb pageTitle="Attendance Dashboard" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Devices Online",
            value: `${onlineDevices}/${devices.length}`,
            sub: offlineDevices > 0 ? `${offlineDevices} offline/error` : "All healthy",
            color: offlineDevices > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400",
          },
          {
            label: "Records Synced Today",
            value: String(totalSyncedToday),
            sub: "from all devices",
            color: "text-brand-600 dark:text-brand-400",
          },
          {
            label: "Missing Punches",
            value: String(missingPunches),
            sub: "require manual review",
            color: missingPunches > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
          },
          {
            label: "Late Arrivals",
            value: String(lateArrivals),
            sub: `${pendingExceptions} pending review`,
            color: lateArrivals > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400",
          },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Department attendance summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {["Sales", "Production", "Marketing", "HR", "IT Support"].map(dept => {
          const count = STAFF.filter(u =>
            u.departmentId === `dept-${dept.toLowerCase().replace(/\s+/g, "-")}`
          ).length;
          return (
            <div key={dept} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{dept}</p>
              <p className="mt-2 text-xl font-bold text-gray-800 dark:text-white">{count} staff</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                <div className="h-1.5 rounded-full bg-brand-500" style={{ width: "85%" }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">85% attendance rate</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-4 overflow-x-auto pb-px">
          {(["summary", "devices", "exceptions", "logs"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}>
              {tab === "logs" ? "Sync Logs" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "summary" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Today's Attendance Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {["Employee", "Department", "Role", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {STAFF.map((u, i) => {
                  const statuses = ["Present", "Present", "Present", "Late", "Present", "Absent", "Present", "Remote"];
                  const s = statuses[i % statuses.length];
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{u.departmentId?.replace("dept-", "").replace("-", " ") ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{u.role.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          s === "Present" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          s === "Late"    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          s === "Absent"  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>{s}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "devices" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Device Status</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {devices.map(d => (
              <div key={d.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{d.name}</p>
                  <p className="text-sm text-gray-500">{d.branch} · {d.ipAddress}:{d.port} · FW {d.firmwareVersion}</p>
                  <p className="text-xs text-gray-400 mt-1">Last sync: {new Date(d.lastSync).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    d.status === "online"  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                    d.status === "offline" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                    d.status === "error"   ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>{d.status}</span>
                  <span className="text-xs text-gray-400">{d.totalUsers} users enrolled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "exceptions" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Attendance Exceptions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {["Employee", "Dept", "Date", "Type", "Check In", "Expected", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {exceptions.map(ex => (
                  <tr key={ex.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{ex.employeeName}</td>
                    <td className="px-4 py-3 text-gray-500">{ex.department}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{ex.date}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{ex.exceptionType.replace(/-/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-500">{ex.checkIn ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{ex.expectedCheckIn}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        ex.status === "pending"  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        ex.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        ex.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>{ex.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Recent Sync Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {["Device", "Started", "Result", "Records", "Triggered By", "Errors"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {syncLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{log.deviceName}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{new Date(log.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        log.result === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        log.result === "failed"  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        log.result === "partial" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}>{log.result}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.recordsSynced}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">
                      {log.triggeredBy === "manual" && log.triggeredByName ? log.triggeredByName : "Auto"}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">{log.errors ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
