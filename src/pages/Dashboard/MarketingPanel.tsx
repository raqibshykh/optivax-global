import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { safeParse } from "../../lib/storage";
import type { MockTask } from "../Common/Tasks";
import {
  getContentEntries, todayStr, weekRange, upcomingRange, monthRange,
  STATUS_DOT, STATUS_BADGE, PLATFORM_ABBR,
  type ContentEntry,
} from "../../mock/contentCalendarData";

// ── Types ────────────────────────────────────────────────────────────────
interface MarketingCampaign {
  id: string;
  name: string;
  platform: string;
  status: "Active" | "Draft" | "Completed";
  budget: number;
  spent: number;
  createdBy?: string;
  linkedTaskId?: string;
}

type TaskStatus = "To Do" | "In Progress" | "Done" | "Blocked";

const CAMPAIGNS_KEY = "marketing_campaigns";

const INITIAL_CAMPAIGNS: MarketingCampaign[] = [
  { id: "cm1", name: "Summer Sale 2026",  platform: "Facebook",   status: "Active",    budget: 5000,  spent: 2340 },
  { id: "cm2", name: "B2B Lead Gen",      platform: "LinkedIn",   status: "Active",    budget: 10000, spent: 4500 },
  { id: "cm3", name: "Retargeting Fall",  platform: "Google Ads", status: "Draft",     budget: 2000,  spent: 0   },
];

const STATUS_TO_TASK: Record<string, TaskStatus> = {
  "todo":        "To Do",
  "in-progress": "In Progress",
  "done":        "Done",
  "blocked":     "Blocked",
};

// ── Component ────────────────────────────────────────────────────────────
export default function MarketingPanel() {
  const { user, checkPermission } = useAuth();
  const viewerRole = user?.role || null;
  const isAdmin    = checkPermission("marketing", "CREATE");
  const isMember   = viewerRole === "marketing_member";

  const [activeTab, setActiveTab] = useState(isMember ? "tasks" : "campaigns");

  // ── Campaigns state (persisted) ─────────────────────────────────────
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    const parsed = safeParse<MarketingCampaign[]>(raw, []);
    setCampaigns(parsed.length > 0 ? parsed : INITIAL_CAMPAIGNS);
  }, []);

  useEffect(() => {
    if (campaigns.length > 0) {
      localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
    }
  }, [campaigns]);

  // ── Tasks from common task store ─────────────────────────────────────
  const [allTasks, setAllTasks] = useState<MockTask[]>([]);

  const loadTasks = useCallback(() => {
    const raw = localStorage.getItem("mock_tasks");
    const parsed = safeParse<MockTask[]>(raw, []);
    setAllTasks(parsed);
  }, []);

  useEffect(() => {
    loadTasks();
    // re-read on storage change (e.g. Tasks page saved)
    const handler = () => loadTasks();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [loadTasks]);

  // Tasks visible to this user
  const myTasks: MockTask[] = isMember
    ? allTasks.filter((t) => t.assigneeId === user?.id)
    : isAdmin
    ? allTasks.filter((t) => {
        // admin sees tasks assigned to marketing_member or marketing_admin
        return true; // show all; admin manages them via Tasks page
      })
    : [];

  const hasCampaignTask = myTasks.some(
    (t) => t.category === "campaign" || t.title.toLowerCase().includes("campaign")
  );

  // Campaigns visible: admin sees all; member sees only ones they created
  const visibleCampaigns = isAdmin
    ? campaigns
    : campaigns.filter((c) => c.createdBy === user?.id);

  // ── KPI derivations ──────────────────────────────────────────────────
  const totalBudget     = visibleCampaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent      = visibleCampaigns.reduce((s, c) => s + c.spent, 0);
  const activeCampaigns = visibleCampaigns.filter((c) => c.status === "Active").length;

  // Budget from tasks (member sees allocated task budgets)
  const taskBudgetTotal    = myTasks.reduce((s, t) => s + (t.budget ?? 0), 0);
  const taskBudgetUsed     = myTasks.reduce((s, t) => s + (t.budgetUsed ?? 0), 0);
  const taskBudgetRem      = taskBudgetTotal - taskBudgetUsed;

  // ── Handlers ─────────────────────────────────────────────────────────

  // Update task status from within the panel
  const updateTaskStatus = (taskId: string, newStatus: string) => {
    const stored = localStorage.getItem("mock_tasks");
    const tasks = safeParse<MockTask[]>(stored, []);
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus as MockTask["status"] } : t
    );
    localStorage.setItem("mock_tasks", JSON.stringify(updated));
    setAllTasks(updated);
  };

  // Update budget used from within the panel
  const updateBudgetUsed = (taskId: string, amount: number) => {
    const stored = localStorage.getItem("mock_tasks");
    const tasks = safeParse<MockTask[]>(stored, []);
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, budgetUsed: Math.max(0, Math.min(amount, t.budget ?? amount)) } : t
    );
    localStorage.setItem("mock_tasks", JSON.stringify(updated));
    setAllTasks(updated);
  };

  // ── Content Calendar widgets ─────────────────────────────────────────
  const [calEntries, setCalEntries] = useState<ContentEntry[]>([]);
  useEffect(() => { setCalEntries(getContentEntries()); }, []);

  const today      = todayStr();
  const wk         = weekRange();
  const upcoming   = upcomingRange();
  const mth        = monthRange();

  const todayContent    = calEntries.filter(e => e.scheduledDate === today)
    .sort((a,b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const weekContent     = calEntries.filter(e => e.scheduledDate >= wk.start && e.scheduledDate <= wk.end)
    .sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime));
  const upcomingContent = calEntries.filter(e => e.scheduledDate >= upcoming.start && e.scheduledDate <= upcoming.end)
    .sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const monthContent    = calEntries.filter(e => e.scheduledDate >= mth.start && e.scheduledDate <= mth.end);
  const monthSummary    = {
    total:     monthContent.length,
    planned:   monthContent.filter(e => e.status === "Planned").length,
    ready:     monthContent.filter(e => e.status === "Ready").length,
    published: monthContent.filter(e => e.status === "Published").length,
    cancelled: monthContent.filter(e => e.status === "Cancelled").length,
  };

  function fmtTime(t: string): string {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h < 12 ? "AM" : "PM"}`;
  }
  function fmtDateShort(d: string): string {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" });
  }

  // ── Render ────────────────────────────────────────────────────────────
  const tabs = isMember
    ? ["tasks", "campaigns", "content", "analytics"]
    : ["campaigns", "tasks", "content", "analytics"];

  const tabLabels: Record<string, string> = {
    tasks:     "My Tasks",
    campaigns: isAdmin ? "Campaigns" : "My Campaigns",
    content:   "Content",
    analytics: "Analytics",
  };

  return (
    <>
      <PageMeta title="Marketing Dashboard | Optivax CRM" description="Marketing admin dashboard" />
      <PageBreadcrumb pageTitle="Marketing Dashboard" />

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {isMember ? (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">My Assigned Tasks</p>
              <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{myTasks.length}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Task Budget Allocated</p>
              <h4 className="mt-2 text-2xl font-bold text-emerald-600">Rs. {taskBudgetTotal.toLocaleString()}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget Used</p>
              <h4 className="mt-2 text-2xl font-bold text-orange-500">Rs. {taskBudgetUsed.toLocaleString()}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget Remaining</p>
              <h4 className={`mt-2 text-2xl font-bold ${taskBudgetRem < 0 ? "text-red-500" : "text-blue-600"}`}>
                Rs. {taskBudgetRem.toLocaleString()}
              </h4>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Ad Budget</p>
              <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">${totalBudget.toLocaleString()}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spent</p>
              <h4 className="mt-2 text-2xl font-bold text-orange-500">${totalSpent.toLocaleString()}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Campaigns</p>
              <h4 className="mt-2 text-2xl font-bold text-blue-500">{activeCampaigns}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Tasks</p>
              <h4 className="mt-2 text-2xl font-bold text-purple-500">{allTasks.length}</h4>
            </div>
          </>
        )}
      </div>


      {/* ── Content Calendar Widgets ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

        {/* Today's Content */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Today's Content</h4>
            <span className="text-xs text-gray-400">{todayContent.length} item{todayContent.length !== 1 ? "s" : ""}</span>
          </div>
          {todayContent.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">Nothing scheduled today</p>
          ) : (
            <div className="space-y-2">
              {todayContent.slice(0, 3).map(e => (
                <div key={e.id} className={`flex items-start gap-2 p-2 rounded-lg border-l-2 ${STATUS_DOT[e.status].replace("bg-","border-l-")} bg-gray-50 dark:bg-gray-800/50`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT[e.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{e.title}</p>
                    <p className="text-[10px] text-gray-400">{fmtTime(e.scheduledTime)} · {PLATFORM_ABBR[e.platform]}</p>
                  </div>
                </div>
              ))}
              {todayContent.length > 3 && <p className="text-[10px] text-gray-400 pl-1">+{todayContent.length - 3} more</p>}
            </div>
          )}
          <Link to="/marketing/content-calendar" className="mt-3 block text-center text-[10px] text-brand-600 dark:text-brand-400 hover:underline">
            Open Calendar →
          </Link>
        </div>

        {/* This Week's Content */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">This Week</h4>
            <span className="text-xs text-gray-400">{weekContent.length} item{weekContent.length !== 1 ? "s" : ""}</span>
          </div>
          {weekContent.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">Nothing this week</p>
          ) : (
            <div className="space-y-2">
              {weekContent.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[e.status]}`} />
                  <span className="text-[10px] text-gray-400 w-10 flex-shrink-0">{fmtDateShort(e.scheduledDate)}</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{e.title}</span>
                </div>
              ))}
              {weekContent.length > 4 && <p className="text-[10px] text-gray-400">+{weekContent.length - 4} more</p>}
            </div>
          )}
          <Link to="/marketing/content-calendar" className="mt-3 block text-center text-[10px] text-brand-600 dark:text-brand-400 hover:underline">
            View Week →
          </Link>
        </div>

        {/* Upcoming Content */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Upcoming (7 days)</h4>
            <span className="text-xs text-gray-400">{upcomingContent.length}</span>
          </div>
          {upcomingContent.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">Nothing in the next 7 days</p>
          ) : (
            <div className="space-y-2">
              {upcomingContent.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${STATUS_DOT[e.status]}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{e.title}</p>
                    <p className="text-[10px] text-gray-400">{fmtDateShort(e.scheduledDate)} · {e.platform}</p>
                  </div>
                </div>
              ))}
              {upcomingContent.length > 4 && <p className="text-[10px] text-gray-400">+{upcomingContent.length - 4} more</p>}
            </div>
          )}
          <Link to="/marketing/content-calendar" className="mt-3 block text-center text-[10px] text-brand-600 dark:text-brand-400 hover:underline">
            Plan Content →
          </Link>
        </div>

        {/* Monthly Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Monthly Summary</h4>
            <span className="text-xs font-bold text-gray-700 dark:text-white">{monthSummary.total}</span>
          </div>
          <div className="space-y-2">
            {(["published","ready","planned","cancelled"] as const).map(s => {
              const count = monthSummary[s];
              const pct   = monthSummary.total > 0 ? Math.round((count / monthSummary.total) * 100) : 0;
              const label = s.charAt(0).toUpperCase() + s.slice(1);
              const dotCls: Record<string, string> = {
                published: "bg-green-500", ready: "bg-yellow-400", planned: "bg-blue-500", cancelled: "bg-red-500",
              };
              return (
                <div key={s}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotCls[s]}`} />
                      <span className="text-gray-600 dark:text-gray-400">{label}</span>
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{count}</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className={`h-1 rounded-full ${dotCls[s]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/marketing/content-calendar" className="mt-3 block text-center text-[10px] text-brand-600 dark:text-brand-400 hover:underline">
            Full Calendar →
          </Link>
        </div>

      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">

        {/* ── Tasks Tab ─────────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {myTasks.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 dark:border-gray-800 dark:bg-gray-900 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {isMember ? "No tasks assigned to you yet." : "No tasks found."}
                </p>
                {isAdmin && (
                  <p className="text-xs text-gray-400 mt-2">
                    Go to <strong>Tasks</strong> in the sidebar to assign tasks to your team.
                  </p>
                )}
              </div>
            ) : (
              myTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isMember={isMember}
                  isOwnTask={task.assigneeId === user?.id}
                  onStatusChange={(status) => updateTaskStatus(task.id, status)}
                  onBudgetUpdate={(amt) => updateBudgetUsed(task.id, amt)}
                />
              ))
            )}
          </div>
        )}

        {/* ── Campaigns Tab ─────────────────────────────────────── */}
        {activeTab === "campaigns" && (
          <div className="space-y-6">
            {/* Campaign list */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">
                {isAdmin ? "All Campaigns" : "My Campaigns"}
              </h3>
              {visibleCampaigns.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {isMember ? "No campaigns assigned to you." : "No campaigns yet."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget / Spent</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {visibleCampaigns.map((camp) => (
                        <tr key={camp.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {camp.name}
                            {camp.createdBy === user?.id && (
                              <span className="ml-2 text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">Mine</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{camp.platform}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <span className="text-red-500">${camp.spent.toLocaleString()}</span>
                            <span className="text-gray-400"> / </span>
                            <span className="font-medium text-gray-700 dark:text-gray-200">${camp.budget.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              camp.status === "Active"    ? "bg-green-100 text-green-800" :
                              camp.status === "Draft"     ? "bg-gray-100 text-gray-800" :
                              "bg-blue-100 text-blue-800"
                            }`}>
                              {camp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Content Tab ───────────────────────────────────────── */}
        {activeTab === "content" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Content Planning</h3>
            {myTasks.filter((t) => t.category === "content" || t.title.toLowerCase().includes("content") || t.title.toLowerCase().includes("blog") || t.title.toLowerCase().includes("social")).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No content tasks found. {isAdmin ? "Assign content tasks to your team members." : "Wait for your admin to assign content tasks."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      {isMember && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Update</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {myTasks
                      .filter((t) => t.category === "content" || t.title.toLowerCase().includes("content") || t.title.toLowerCase().includes("blog") || t.title.toLowerCase().includes("social"))
                      .map((task) => (
                        <tr key={task.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{task.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{task.assignee}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{task.dueDate}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              task.status === "done"        ? "bg-green-100 text-green-800" :
                              task.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                              task.status === "blocked"     ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {STATUS_TO_TASK[task.status] ?? task.status}
                            </span>
                          </td>
                          {isMember && task.assigneeId === user?.id && (
                            <td className="px-4 py-3 text-sm text-right">
                              <select
                                value={task.status}
                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              >
                                <option value="todo">To Do</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                                <option value="blocked">Blocked</option>
                              </select>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Analytics Tab ─────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Campaign Analytics</h3>
            {visibleCampaigns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No campaign data to display.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleCampaigns.map((camp) => {
                  const pct = camp.budget > 0 ? Math.min(100, Math.round((camp.spent / camp.budget) * 100)) : 0;
                  return (
                    <div key={camp.id} className="p-5 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{camp.name}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${camp.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                          {camp.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Budget</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-white">${camp.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Spent</p>
                          <p className="text-lg font-bold text-orange-500">${camp.spent.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1 flex justify-between">
                        <span>Spend rate</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-brand-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}

// ── TaskRow sub-component ─────────────────────────────────────────────────
interface TaskRowProps {
  task: MockTask;
  isMember: boolean;
  isOwnTask: boolean;
  onStatusChange: (status: string) => void;
  onBudgetUpdate: (amount: number) => void;
}

function TaskRow({ task, isMember, isOwnTask, onStatusChange, onBudgetUpdate }: TaskRowProps) {
  const [budgetInput, setBudgetInput] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  const hasBudget   = task.budget !== undefined && task.budget > 0;
  const budgetUsed  = task.budgetUsed ?? 0;
  const budgetRem   = hasBudget ? task.budget! - budgetUsed : 0;
  const pct         = hasBudget ? Math.min(100, Math.round((budgetUsed / task.budget!) * 100)) : 0;

  const statusColor: Record<string, string> = {
    "todo":        "bg-gray-100 text-gray-700",
    "in-progress": "bg-blue-100 text-blue-700",
    "done":        "bg-green-100 text-green-700",
    "blocked":     "bg-red-100 text-red-700",
  };

  const categoryColor: Record<string, string> = {
    "campaign":  "bg-purple-100 text-purple-700",
    "content":   "bg-blue-100 text-blue-700",
    "analytics": "bg-cyan-100 text-cyan-700",
    "general":   "bg-gray-100 text-gray-600",
  };

  const saveBudget = () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) onBudgetUpdate(val);
    setBudgetInput("");
    setShowEdit(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Left: task info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{task.title}</h4>
            {task.category && task.category !== "general" && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColor[task.category] ?? "bg-gray-100 text-gray-600"}`}>
                {task.category}
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              task.priority === "high" ? "bg-red-100 text-red-700" : task.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
            }`}>
              {task.priority} priority
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{task.description}</p>
          )}
          <p className="text-xs text-gray-400">
            Assigned to: <span className="font-medium text-gray-600 dark:text-gray-300">{task.assignee}</span>
            {task.dueDate && task.dueDate !== "—" && (
              <span className="ml-3">Due: <span className="font-medium text-gray-600 dark:text-gray-300">{task.dueDate}</span></span>
            )}
          </p>
        </div>

        {/* Right: status + update */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[task.status] ?? "bg-gray-100 text-gray-700"}`}>
            {STATUS_TO_TASK[task.status] ?? task.status}
          </span>
          {(isMember && isOwnTask) && (
            <select
              value={task.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          )}
        </div>
      </div>

      {/* Budget section */}
      {hasBudget && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex flex-wrap justify-between gap-4 mb-2">
            <div className="text-center">
              <p className="text-[11px] text-gray-500">Allocated</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Rs. {task.budget!.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-gray-500">Used</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Rs. {budgetUsed.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-gray-500">Remaining</p>
              <p className={`text-sm font-bold ${budgetRem < 0 ? "text-red-600" : "text-blue-600 dark:text-blue-400"}`}>
                Rs. {budgetRem.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-gray-500">% Used</p>
              <p className={`text-sm font-bold ${pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-gray-700 dark:text-gray-200"}`}>{pct}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          {isMember && isOwnTask && (
            showEdit ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={0}
                  max={task.budget}
                  autoFocus
                  placeholder="Total amount spent so far (Rs.)…"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <button onClick={saveBudget} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium">
                  Save
                </button>
                <button onClick={() => { setShowEdit(false); setBudgetInput(""); }} className="text-xs text-gray-500 hover:text-gray-700 px-2">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowEdit(true)}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline"
              >
                Update my spending
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
