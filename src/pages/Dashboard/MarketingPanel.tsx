import React, { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { safeParse } from "../../lib/storage";
import type { MockTask } from "../Common/Tasks";

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
  const { user } = useAuth();
  const viewerRole = user?.role || null;
  const isAdmin   = viewerRole === "marketing_admin";
  const isMember  = viewerRole === "marketing_member";

  const [activeTab, setActiveTab] = useState(isMember ? "tasks" : "campaigns");

  // ── Campaigns state (persisted) ─────────────────────────────────────
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [newCampaign, setNewCampaign] = useState({ name: "", platform: "Facebook", budget: 0 });

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

  // For permission gating: member can create campaigns only if they have a
  // campaign-category task assigned to them
  const hasCampaignTask = myTasks.some(
    (t) =>
      t.category === "campaign" ||
      t.title.toLowerCase().includes("campaign")
  );
  const canCreateCampaign = isAdmin || hasCampaignTask;

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
  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name) return;

    // find a linked campaign task (optional)
    const linked = myTasks.find(
      (t) =>
        t.category === "campaign" ||
        t.title.toLowerCase().includes("campaign")
    );

    setCampaigns((prev) => [
      ...prev,
      {
        id: `cm${Date.now()}`,
        name: newCampaign.name,
        platform: newCampaign.platform,
        status: "Draft",
        budget: linked?.budget ?? newCampaign.budget,
        spent: 0,
        createdBy: user?.id,
        linkedTaskId: linked?.id,
      },
    ]);
    setNewCampaign({ name: "", platform: "Facebook", budget: 0 });
  };

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

      {/* Campaign permission notice for members */}
      {isMember && !canCreateCampaign && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg">&#9888;</span>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Campaign creation is locked. Your marketing admin must assign you a <strong>campaign task</strong> to unlock this feature.
          </p>
        </div>
      )}

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign list */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">
                {isAdmin ? "All Campaigns" : "My Campaigns"}
              </h3>
              {visibleCampaigns.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {isMember && canCreateCampaign
                    ? "You haven't created any campaigns yet."
                    : isMember
                    ? "Campaign creation locked. Ask your admin to assign a campaign task."
                    : "No campaigns yet."}
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

            {/* Create campaign — gated */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Create Campaign</h3>
              {canCreateCampaign ? (
                <form onSubmit={handleAddCampaign} className="space-y-4">
                  {isMember && hasCampaignTask && (
                    <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 mb-3">
                      <p className="text-xs text-green-700 dark:text-green-400">
                        Campaign creation unlocked via your assigned campaign task.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name</label>
                    <input
                      type="text"
                      required
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      placeholder="e.g. Q3 Launch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      value={newCampaign.platform}
                      onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value })}
                    >
                      <option>Facebook</option>
                      <option>Google Ads</option>
                      <option>LinkedIn</option>
                      <option>Twitter</option>
                      <option>Instagram</option>
                    </select>
                  </div>
                  {/* Budget: auto-filled from task if member; editable for admin */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Budget ($)
                      {isMember && hasCampaignTask && (
                        <span className="ml-2 text-[10px] text-gray-400">(from your campaign task)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      value={
                        isMember && hasCampaignTask
                          ? (myTasks.find((t) => t.category === "campaign" || t.title.toLowerCase().includes("campaign"))?.budget ?? newCampaign.budget)
                          : newCampaign.budget
                      }
                      onChange={(e) =>
                        !isMember && setNewCampaign({ ...newCampaign, budget: parseInt(e.target.value) || 0 })
                      }
                      readOnly={isMember && hasCampaignTask}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Create Campaign
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">&#128274;</div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Campaign creation locked</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You need a <strong>campaign task</strong> assigned by your marketing admin to unlock this.
                  </p>
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
