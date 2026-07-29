import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/client";
import { ActivitySession, BreakRecord, getActivityStats } from "../../types/activity";
import { exportCSV } from "../../lib/csvExport";

type Tab = "login" | "logout" | "hours" | "meal" | "casual" | "warnings";

const TABS: { key: Tab; label: string }[] = [
  { key: "login",    label: "Login History" },
  { key: "logout",   label: "Logout History" },
  { key: "hours",    label: "Working Hours" },
  { key: "meal",     label: "Meal Breaks" },
  { key: "casual",   label: "Casual Breaks" },
  { key: "warnings", label: "Late Returns / Warnings" },
];

// it_admin mirrors ActivityController::sessions()'s server-side org-wide
// exception for IT Support — kept in sync with that, display-only here
// (the actual data scoping is enforced server-side regardless of this list).
const CROSS_DEPT_ROLES = ["super_admin", "management", "hr_admin", "it_admin"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso?: string): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export default function ActivityReports() {
  const { user } = useAuth();
  const [tab, setTab]           = useState<Tab>("login");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo]     = useState(todayStr());
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api.get<{ sessions: ActivitySession[] }>("/saas/v1/activity/sessions", { params: { dateFrom, dateTo } })
      .then((res) => { if (!cancelled) setSessions(res.sessions ?? []); })
      .catch(() => { if (!cancelled) setSessions([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  if (!user) return null;
  const canCrossDept = CROSS_DEPT_ROLES.includes(user.role);
  const stats = getActivityStats(sessions);

  const mealBreaks: { session: ActivitySession; brk: BreakRecord }[] = sessions.flatMap(
    (s) => s.breaks.filter((b) => b.category === "meal").map((brk) => ({ session: s, brk }))
  );
  const casualBreaks: { session: ActivitySession; brk: BreakRecord }[] = sessions.flatMap(
    (s) => s.breaks.filter((b) => b.category === "casual").map((brk) => ({ session: s, brk }))
  );
  const warningBreaks: { session: ActivitySession; brk: BreakRecord }[] = sessions.flatMap(
    (s) => s.breaks.filter((b) => b.status === "warning").map((brk) => ({ session: s, brk }))
  );

  const handleExport = () => {
    if (tab === "login") {
      exportCSV(["Name", "Role", "Date", "Login Time", "Browser", "Device", "IP Address"],
        sessions.map((s) => [s.userName, s.userRole, s.date, fmtTime(s.loginTime), s.browser ?? "", s.device ?? "", s.ipAddress ?? ""]),
        "login_history.csv");
    } else if (tab === "logout") {
      exportCSV(["Name", "Role", "Date", "Logout Time", "Auto Logout"],
        sessions.map((s) => [s.userName, s.userRole, s.date, s.logoutTime ? fmtTime(s.logoutTime) : "Active", s.autoLogout ? "Yes" : "No"]),
        "logout_history.csv");
    } else if (tab === "hours") {
      exportCSV(["Name", "Role", "Date", "Session Minutes", "Break Minutes", "Active Minutes"],
        sessions.map((s) => [s.userName, s.userRole, s.date, s.sessionMinutes ?? "", s.totalBreakMinutes ?? "", s.activeMinutes ?? ""]),
        "working_hours.csv");
    } else if (tab === "meal") {
      exportCSV(["Name", "Date", "Type", "Start", "End", "Allowed (m)", "Actual (m)", "Exceeded (m)", "Status"],
        mealBreaks.map(({ session, brk }) => [session.userName, session.date, brk.label, fmtTime(brk.startTime), fmtTime(brk.endTime), brk.allowedMinutes, brk.actualMinutes ?? "", brk.exceededMinutes ?? "", brk.status ?? "in-progress"]),
        "meal_breaks.csv");
    } else if (tab === "casual") {
      exportCSV(["Name", "Date", "Type", "Start", "End", "Allowed (m)", "Actual (m)", "Exceeded (m)", "Status"],
        casualBreaks.map(({ session, brk }) => [session.userName, session.date, brk.label, fmtTime(brk.startTime), fmtTime(brk.endTime), brk.allowedMinutes, brk.actualMinutes ?? "", brk.exceededMinutes ?? "", brk.status ?? "in-progress"]),
        "casual_breaks.csv");
    } else {
      exportCSV(["Name", "Date", "Type", "Allowed (m)", "Actual (m)", "Exceeded (m)"],
        warningBreaks.map(({ session, brk }) => [session.userName, session.date, brk.label, brk.allowedMinutes, brk.actualMinutes ?? "", brk.exceededMinutes ?? ""]),
        "warnings.csv");
    }
  };

  return (
    <>
      <PageMeta title="Activity Reports | Optivax CRM" description="Employee activity and break history reports" />
      <PageBreadcrumb pageTitle="Activity Reports" />

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        </div>
        <button onClick={handleExport}
          className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
          Export CSV
        </button>
        {!canCrossDept && (
          <span className="text-xs text-gray-400 ml-auto">Showing data for your department only</span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Sessions", value: stats.total },
          { label: "Completed",      value: stats.completed },
          { label: "Avg Session (m)", value: stats.avgSession },
          { label: "Total Breaks",   value: stats.totalBreaks },
          { label: "Warnings",       value: stats.totalWarnings },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
              tab === t.key
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
          ) : tab === "login" ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Name", "Role", "Date", "Login Time", "Browser", "Device", "IP Address"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {sessions.map((s) => (
                  <tr key={s.id}><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.userName}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{s.userRole.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-500">{s.date}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtTime(s.loginTime)}</td>
                    <td className="px-4 py-3 text-gray-500">{s.browser ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.device ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.ipAddress ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          ) : tab === "logout" ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Name", "Role", "Date", "Logout Time", "Auto Logout"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {sessions.map((s) => (
                  <tr key={s.id}><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.userName}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{s.userRole.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-500">{s.date}</td>
                    <td className="px-4 py-3 text-gray-500">{s.logoutTime ? fmtTime(s.logoutTime) : <span className="text-green-600 dark:text-green-400">Active</span>}</td>
                    <td className="px-4 py-3">
                      {s.autoLogout && (
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Auto (8h)</span>
                      )}
                    </td></tr>
                ))}
              </tbody>
            </table>
          ) : tab === "hours" ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Name", "Date", "Session (m)", "Break (m)", "Active (m)"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {sessions.map((s) => (
                  <tr key={s.id}><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.userName}</td>
                    <td className="px-4 py-3 text-gray-500">{s.date}</td>
                    <td className="px-4 py-3 text-gray-500">{s.sessionMinutes ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.totalBreakMinutes ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.activeMinutes ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          ) : tab === "meal" ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Name", "Date", "Type", "Start", "End", "Allowed (m)", "Actual (m)", "Exceeded (m)", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {mealBreaks.map(({ session, brk }) => (
                  <tr key={brk.id}><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{session.userName}</td>
                    <td className="px-4 py-3 text-gray-500">{session.date}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.label}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtTime(brk.startTime)}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.endTime ? fmtTime(brk.endTime) : "In progress"}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.allowedMinutes}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.actualMinutes ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.exceededMinutes ?? "—"}</td>
                    <td className="px-4 py-3">
                      {brk.status && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${brk.status === "warning" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"}`}>{brk.status}</span>
                      )}
                    </td></tr>
                ))}
              </tbody>
            </table>
          ) : tab === "casual" ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Name", "Date", "Type", "Start", "End", "Allowed (m)", "Actual (m)", "Exceeded (m)", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {casualBreaks.map(({ session, brk }) => (
                  <tr key={brk.id}><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{session.userName}</td>
                    <td className="px-4 py-3 text-gray-500">{session.date}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.label}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtTime(brk.startTime)}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.endTime ? fmtTime(brk.endTime) : "In progress"}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.allowedMinutes}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.actualMinutes ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.exceededMinutes ?? "—"}</td>
                    <td className="px-4 py-3">
                      {brk.status && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${brk.status === "warning" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"}`}>{brk.status}</span>
                      )}
                    </td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Name", "Date", "Type", "Allowed (m)", "Actual (m)", "Exceeded (m)"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {warningBreaks.map(({ session, brk }) => (
                  <tr key={brk.id}><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{session.userName}</td>
                    <td className="px-4 py-3 text-gray-500">{session.date}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.label}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.allowedMinutes}</td>
                    <td className="px-4 py-3 text-gray-500">{brk.actualMinutes ?? "—"}</td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400 font-medium">{brk.exceededMinutes ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
