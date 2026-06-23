import { useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { getITTickets, getDevices, getAttendanceExceptions } from "../../mock/itSupportData";
import type { TicketStatus, TicketPriority, DeviceStatus } from "../../mock/itSupportData";

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high:     "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low:      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open:        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "in-progress": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed:      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  escalated:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const DEVICE_STATUS_COLORS: Record<DeviceStatus, string> = {
  online:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  offline: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  error:   "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  syncing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function ITSupportPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "it_admin" || user?.role === "super_admin" || user?.role === "management";

  const tickets    = useMemo(() => getITTickets(), []);
  const devices    = useMemo(() => getDevices(), []);
  const exceptions = useMemo(() => getAttendanceExceptions(), []);

  const [activeTab, setActiveTab] = useState<"overview" | "tickets" | "devices" | "exceptions">("overview");

  // KPI calculations
  const openTickets      = tickets.filter(t => t.status === "open").length;
  const inProgressTickets = tickets.filter(t => t.status === "in-progress").length;
  const escalatedTickets  = tickets.filter(t => t.status === "escalated").length;
  const resolvedToday    = tickets.filter(t => t.resolvedAt && t.resolvedAt.startsWith(new Date().toISOString().split("T")[0])).length;

  const onlineDevices  = devices.filter(d => d.status === "online").length;
  const offlineDevices = devices.filter(d => d.status === "offline" || d.status === "error").length;

  const pendingExceptions = exceptions.filter(e => e.status === "pending").length;

  const myTickets = isAdmin ? tickets : tickets.filter(t => t.assignedTo === user?.id);

  return (
    <>
      <PageMeta title="IT Support Dashboard | Optivax CRM" description="IT Support dashboard" />
      <PageBreadcrumb pageTitle="IT Support Dashboard" />

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Open Tickets",
            value: String(openTickets),
            sub: `${inProgressTickets} in progress`,
            color: openTickets > 5 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Escalated",
            value: String(escalatedTickets),
            sub: escalatedTickets > 0 ? "Requires immediate attention" : "All clear",
            color: escalatedTickets > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
          },
          {
            label: "Devices Online",
            value: `${onlineDevices}/${devices.length}`,
            sub: offlineDevices > 0 ? `${offlineDevices} offline/error` : "All devices healthy",
            color: offlineDevices > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400",
          },
          {
            label: "Attendance Exceptions",
            value: String(pendingExceptions),
            sub: "Pending review",
            color: pendingExceptions > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400",
          },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Resolved Today row (admin only) ──────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Resolved Today",    value: String(resolvedToday),       color: "text-green-600 dark:text-green-400" },
            { label: "Critical Priority", value: String(tickets.filter(t => t.priority === "critical").length), color: "text-red-600 dark:text-red-400" },
            { label: "Hardware Requests", value: String(tickets.filter(t => t.category === "hardware").length), color: "text-brand-600 dark:text-brand-400" },
            { label: "Software Requests", value: String(tickets.filter(t => t.category === "software").length), color: "text-purple-600 dark:text-purple-400" },
          ].map(c => (
            <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-4 overflow-x-auto pb-px">
          {(["overview", "tickets", "devices", "exceptions"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}>
              {tab === "exceptions" ? "Attendance Exceptions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent tickets */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Recent Tickets</h3>
            <div className="space-y-3">
              {myTickets.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.requestedByName} · {t.requestedByDept}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                  </div>
                </div>
              ))}
              {myTickets.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">No tickets assigned.</p>
              )}
            </div>
          </div>

          {/* Device status */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Biometric Devices</h3>
            <div className="space-y-3">
              {devices.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{d.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{d.branch} · {d.serialNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Last sync: {new Date(d.lastSync).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${DEVICE_STATUS_COLORS[d.status]}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tickets Tab ──────────────────────────────────────────────── */}
      {activeTab === "tickets" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">IT Tickets</h3>
            <p className="text-sm text-gray-500 mt-0.5">{myTickets.length} ticket{myTickets.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {["Title", "Category", "Requested By", "Priority", "Status", "SLA"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {myTickets.map(t => {
                  const slaDate = new Date(t.slaDeadline);
                  const overdue = slaDate < new Date() && t.status !== "resolved" && t.status !== "closed";
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{t.title}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{t.category}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        <span>{t.requestedByName}</span>
                        <br />
                        <span className="text-xs text-gray-400">{t.requestedByDept}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                      </td>
                      <td className={`px-4 py-3 text-xs whitespace-nowrap ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500"}`}>
                        {overdue ? "OVERDUE · " : ""}{slaDate.toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Devices Tab ──────────────────────────────────────────────── */}
      {activeTab === "devices" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Biometric Device Status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {["Device Name", "Serial", "IP Address", "Branch", "Status", "Last Sync", "Users"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {devices.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{d.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{d.serialNumber}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{d.ipAddress}:{d.port}</td>
                    <td className="px-4 py-3 text-gray-500">{d.branch}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${DEVICE_STATUS_COLORS[d.status]}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{new Date(d.lastSync).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{d.totalUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Exceptions Tab ───────────────────────────────────────────── */}
      {activeTab === "exceptions" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Attendance Exceptions</h3>
            <p className="text-sm text-gray-500 mt-0.5">{pendingExceptions} pending review</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {["Employee", "Department", "Date", "Exception Type", "Check In", "Check Out", "Status"].map(h => (
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
                    <td className="px-4 py-3 text-gray-500 capitalize">{ex.exceptionType.replace("-", " ")}</td>
                    <td className="px-4 py-3 text-gray-500">{ex.checkIn ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{ex.checkOut ?? "—"}</td>
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
    </>
  );
}
