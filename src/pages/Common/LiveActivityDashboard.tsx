import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/client";
import { ActivitySession } from "../../mock/activityData";
import { mockUsers } from "../../mock/users";

const POLL_MS = 5000;

type LiveStatus = "working" | "dinner" | "casual" | "offline";

const STATUS_META: Record<LiveStatus, { label: string; dot: string; badge: string }> = {
  working: { label: "Working",       dot: "bg-green-500",  badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  dinner:  { label: "Dinner Break",  dot: "bg-orange-500", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  casual:  { label: "Casual Break",  dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  offline: { label: "Offline",       dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

function deriveStatus(session: ActivitySession | undefined): LiveStatus {
  if (!session || session.logoutTime) return "offline";
  const openBreak = session.breaks.find((b) => !b.endTime);
  if (!openBreak) return "working";
  if (openBreak.type === "meal_dinner") return "dinner";
  return "casual";
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getViewableDeptPrefix(role: string): string | null {
  if (["super_admin", "management", "hr_admin"].includes(role)) return null;
  if (role.endsWith("_admin")) return role.replace("_admin", "");
  return null;
}

export default function LiveActivityDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [, forceTick] = useState(0);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get<{ sessions: ActivitySession[] }>("/saas/v1/activity/sessions", {
          params: { dateFrom: today, dateTo: today },
        });
        if (!cancelled) setSessions(res.sessions ?? []);
      } catch {
        // ignore transient errors — next poll will retry
      }
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [today]);

  // Forces a re-render every second so live durations tick — the underlying
  // timestamps always come from the server via `sessions`, never from local state.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  // Roster of who to display (mirrors the server's own dept/self scoping, used
  // here only to render "Offline" rows for people with no session yet today —
  // actual session data access is already enforced server-side).
  const deptPrefix = getViewableDeptPrefix(user.role);
  const roster = user.role.endsWith("_member")
    ? mockUsers.filter((u) => u.id === user.id)
    : deptPrefix
      ? mockUsers.filter((u) => u.role.startsWith(deptPrefix))
      : mockUsers.filter((u) => u.role !== "client");

  const latestByUser = new Map<string, ActivitySession>();
  for (const s of sessions) {
    const prev = latestByUser.get(s.userId);
    if (!prev || s.loginTime > prev.loginTime) latestByUser.set(s.userId, s);
  }

  const rows = roster.map((u) => {
    const session = latestByUser.get(u.id);
    const status  = deriveStatus(session);
    const openBreak = session?.breaks.find((b) => !b.endTime);
    return { user: u, session, status, openBreak };
  });

  const counts = rows.reduce(
    (acc, r) => { acc[r.status] += 1; return acc; },
    { working: 0, dinner: 0, casual: 0, offline: 0 } as Record<LiveStatus, number>
  );

  return (
    <>
      <PageMeta title="Live Activity Dashboard | Optivax CRM" description="Real-time employee status" />
      <PageBreadcrumb pageTitle="Live Activity Dashboard" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {(Object.keys(STATUS_META) as LiveStatus[]).map((key) => (
          <div key={key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_META[key].dot}`} />
              {STATUS_META[key].label}
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{counts[key]}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Employee Status</h3>
          <span className="text-xs text-gray-400">Auto-refreshes every {POLL_MS / 1000}s</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Name", "Department", "Designation", "Status", "Login Time", "Session Duration", "Break Duration"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.map(({ user: u, session, status, openBreak }) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize whitespace-nowrap">{u.departmentId?.replace("dept-", "").replace(/-/g, " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.designation ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_META[status].badge}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`} />
                      {STATUS_META[status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {session ? new Date(session.loginTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {session && !session.logoutTime
                      ? formatDuration(Date.now() - new Date(session.loginTime).getTime())
                      : session?.sessionMinutes != null ? `${session.sessionMinutes}m` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {openBreak ? formatDuration(Date.now() - new Date(openBreak.startTime).getTime()) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
