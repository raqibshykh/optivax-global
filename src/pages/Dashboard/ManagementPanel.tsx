import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { UserService, UserProfile } from "../../services/userService";
import EmployeeHierarchy from "../../components/dashboard/EmployeeHierarchy";
import ActivityFeed from "../../components/dashboard/ActivityFeed";
import { safeParse } from "../../lib/storage";
import { StoredClient, Deliverable } from "../../types";

const CLIENTS_KEY   = "optivax_clients";
const DELIVS_KEY    = "optivax_deliverables";
const TASKS_KEY     = "mock_tasks";
const EXTRA_KEY     = "optivax_employee_extra";
const LEAVES_KEY    = "optivax_leave_requests";
const ATTEND_KEY    = "mock_attendance";
const CAMPAIGNS_KEY = "marketing_campaigns";
const PROJECTS_KEY  = "mock_projects";
const PAYMENTS_KEY  = "mock_payments";
const SALES_TASKS_KEY = "sales_tasks";

interface ExtraData   { userId: string; leavesTaken: number; salary: number; salaryStatus: string; workMode: string; }
interface MockTask    { id: string; status: string; assigneeId?: string; budget?: number; budgetUsed?: number; }
interface LeaveReq   { status: string; }
interface Campaign   { id: string; name: string; budget: number; spent: number; status: string; }
interface MockProject { id: string; name: string; clientId: string; status: string; priority: string; progress: number; budget: number; spent: number; deadline: string; description?: string; }

function KPI({ title, value, sub, color = "blue" }: { title: string; value: string | number; sub?: string; color?: string }) {
  const ring: Record<string, string> = {
    blue: "border-blue-500", green: "border-green-500", purple: "border-purple-500",
    orange: "border-orange-500", red: "border-red-500", indigo: "border-indigo-500",
  };
  return (
    <div className={`rounded-2xl border-l-4 ${ring[color] ?? ring.blue} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm`}>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <h4 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</h4>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const DEPT_COLORS: Record<string, string> = {
  sales: "bg-green-500", marketing: "bg-pink-500",
  production: "bg-orange-500", hr: "bg-indigo-500",
};

export default function ManagementPanel() {
  const [tab, setTab] = useState("overview");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<StoredClient[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<MockTask[]>([]);
  const [extras, setExtras] = useState<Record<string, ExtraData>>({});
  const [leaves, setLeaves] = useState<LeaveReq[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<MockProject[]>([]);
  const [payments, setPayments] = useState<{ amount: number }[]>([]);

  useEffect(() => {
    UserService.getAll().then(setAllUsers).catch(() => {});
    setClients(safeParse<StoredClient[]>(localStorage.getItem(CLIENTS_KEY), []));
    setDeliverables(safeParse<Deliverable[]>(localStorage.getItem(DELIVS_KEY), []));
    const generalTasks = safeParse<MockTask[]>(localStorage.getItem(TASKS_KEY), []);
    const salesRaw = safeParse<{ id: string; status: string; assignedTo?: string; }[]>(localStorage.getItem(SALES_TASKS_KEY), []);
    const salesAsMockTasks: MockTask[] = salesRaw.map(t => ({ id: t.id, status: t.status, assigneeId: t.assignedTo }));
    setTasks([...generalTasks, ...salesAsMockTasks]);
    setExtras(safeParse<Record<string, ExtraData>>(localStorage.getItem(EXTRA_KEY), {}));
    setLeaves(safeParse<LeaveReq[]>(localStorage.getItem(LEAVES_KEY), []));
    setCampaigns(safeParse<Campaign[]>(localStorage.getItem(CAMPAIGNS_KEY), []));
    setProjects(safeParse<MockProject[]>(localStorage.getItem(PROJECTS_KEY), []));
    setPayments(safeParse<{ amount: number }[]>(localStorage.getItem(PAYMENTS_KEY), []));
  }, []);

  const employees = allUsers.filter((u) => u.role !== "client");
  const totalEmployees = employees.length;

  // Dept breakdown
  const depts = ["sales", "marketing", "production", "hr"];
  const deptCounts = depts.map((d) => ({
    dept: d,
    count: employees.filter((u) => u.role.startsWith(d)).length,
  }));

  // Task metrics
  const doneTasks     = tasks.filter((t) => t.status === "done").length;
  const pendingTasks  = tasks.filter((t) => t.status === "todo").length;
  const inProgTasks   = tasks.filter((t) => t.status === "in-progress").length;
  const totalBudget   = tasks.reduce((s, t) => s + (t.budget ?? 0), 0);
  const usedBudget    = tasks.reduce((s, t) => s + (t.budgetUsed ?? 0), 0);

  // Deliverable metrics
  const delivByStatus = (s: string) => deliverables.filter((d) => d.status === s).length;

  // Attendance (today)
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttend = safeParse<{ userId: string; date: string; status: string }[]>(localStorage.getItem(ATTEND_KEY), []).filter((r) => r.date === todayStr);
  const presentToday = todayAttend.filter((r) => r.status === "present" || r.status === "remote").length;
  const absentToday  = todayAttend.filter((r) => r.status === "absent").length;

  // Payroll
  const totalPayroll = Object.values(extras).reduce((s, e) => s + (e.salary ?? 0), 0);

  // Leave summary
  const pendingLeaves  = leaves.filter((l) => l.status === "Pending").length;
  const approvedLeaves = leaves.filter((l) => l.status === "Approved").length;
  const rejectedLeaves = leaves.filter((l) => l.status === "Rejected").length;

  // Campaign performance
  const activeCampaigns = campaigns.filter((c) => c.status === "Active").length;
  const totalCampBudget = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalCampSpent  = campaigns.reduce((s, c) => s + (c.spent ?? 0), 0);

  const TABS = [
    { key: "overview",   label: "Overview" },
    { key: "analytics",  label: "Analytics" },
    { key: "hierarchy",  label: "Hierarchy" },
    { key: "activity",   label: "Activity Feed" },
  ];

  return (
    <>
      <PageMeta title="Management Dashboard | Optivax Global" description="Executive management dashboard" />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Company-wide performance and metrics</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700 pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPI title="Total Employees" value={totalEmployees} sub={`${deptCounts.map((d) => `${d.dept}: ${d.count}`).join(" · ")}`} color="blue" />
            <KPI title="Active Clients" value={clients.filter((c) => c.status === "active").length} sub={`${clients.length} total`} color="green" />
            <KPI title="Tasks Completed" value={doneTasks} sub={`${inProgTasks} in progress · ${pendingTasks} pending`} color="purple" />
            <KPI title="Deliverables" value={deliverables.length} sub={`${delivByStatus("Approved")} approved · ${delivByStatus("Delivered")} delivered`} color="orange" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Department Headcount */}
            <SectionCard title="Employee Count by Department">
              <div className="space-y-3">
                {deptCounts.map(({ dept, count }) => (
                  <div key={dept}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-700 dark:text-gray-300">{dept}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className={`${DEPT_COLORS[dept] ?? "bg-gray-400"} h-2 rounded-full`}
                        style={{ width: totalEmployees > 0 ? `${(count / totalEmployees) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Leave & Attendance */}
            <SectionCard title="HR Summary">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{presentToday}</div>
                  <div className="text-xs text-gray-500 mt-1">Present Today</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">{absentToday}</div>
                  <div className="text-xs text-gray-500 mt-1">Absent Today</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{pendingLeaves}</div>
                  <div className="text-xs text-gray-500 mt-1">Pending Leaves</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{approvedLeaves}</div>
                  <div className="text-xs text-gray-500 mt-1">Approved Leaves</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{rejectedLeaves}</div>
                  <div className="text-xs text-gray-500 mt-1">Rejected Leaves</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Monthly Payroll</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Rs. {totalPayroll.toLocaleString()}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Deliverables Status */}
            <SectionCard title="Deliverables Status">
              {deliverables.length === 0 ? (
                <p className="text-sm text-gray-500">No deliverables yet.</p>
              ) : (
                <div className="space-y-2">
                  {(["Pending", "In Progress", "Review", "Approved", "Delivered"] as const).map((s) => {
                    const cnt = delivByStatus(s);
                    return (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{s}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: deliverables.length > 0 ? `${(cnt / deliverables.length) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="w-6 text-right font-medium text-gray-900 dark:text-white">{cnt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Task Completion Metrics */}
            <SectionCard title="Task Completion Metrics">
              <div className="space-y-3">
                {[
                  { label: "Completed", count: doneTasks, color: "bg-green-500" },
                  { label: "In Progress", count: inProgTasks, color: "bg-blue-500" },
                  { label: "Pending", count: pendingTasks, color: "bg-gray-400" },
                  { label: "Blocked", count: tasks.filter((t) => t.status === "blocked").length, color: "bg-red-500" },
                ].map(({ label, count, color }) => {
                  const total = tasks.length || 1;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{label}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count} / {tasks.length}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full`} style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                {totalBudget > 0 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-sm flex justify-between">
                    <span className="text-gray-500">Budget Utilization</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Rs. {usedBudget.toLocaleString()} / {totalBudget.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Projects */}
          <SectionCard title="All Projects">
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      {["Project", "Client", "Status", "Priority", "Progress", "Budget"].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {projects.map((proj) => {
                      const client = clients.find((c) => c.id === proj.clientId);
                      return (
                        <tr key={proj.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{proj.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {client?.companyName || proj.clientId}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              proj.status === "completed"    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : proj.status === "in-progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : proj.status === "on-hold"    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            }`}>
                              {proj.status?.replace(/-/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              proj.priority === "high"    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : proj.priority === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            }`}>
                              {proj.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${proj.progress >= 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${proj.progress ?? 0}%` }} />
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">{proj.progress ?? 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            ${(proj.spent ?? 0).toLocaleString()} / ${(proj.budget ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Campaign & Sales */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Campaign Performance">
              {campaigns.length === 0 ? (
                <p className="text-sm text-gray-500">No campaigns yet.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{campaigns.length}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{activeCampaigns}</div>
                      <div className="text-xs text-gray-500">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {totalCampBudget > 0 ? Math.round((totalCampSpent / totalCampBudget) * 100) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">Budget Used</div>
                    </div>
                  </div>
                  {campaigns.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{c.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : c.status === "Completed" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                      }`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Client Overview">
              {clients.length === 0 ? (
                <p className="text-sm text-gray-500">No clients yet. Sales Admin must create clients.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="text-xl font-bold text-green-700 dark:text-green-300">{clients.filter((c) => c.status === "active").length}</div>
                      <div className="text-xs text-gray-500">Active Clients</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="text-xl font-bold text-gray-700 dark:text-gray-300">{clients.filter((c) => c.status === "inactive").length}</div>
                      <div className="text-xs text-gray-500">Inactive</div>
                    </div>
                  </div>
                  {clients.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1.5">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{c.contactName}</div>
                        <div className="text-xs text-gray-500">{c.companyName}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-600"
                      }`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Analytics ────────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Sales Analytics */}
          <SectionCard title="Sales Analytics">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Total Clients</span>
                <span className="font-semibold text-gray-900 dark:text-white">{clients.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Active Clients</span>
                <span className="font-semibold text-gray-900 dark:text-white">{clients.filter((c) => c.status === "active").length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Sales Team Size</span>
                <span className="font-semibold text-gray-900 dark:text-white">{employees.filter((u) => u.role.startsWith("sales")).length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Total Revenue</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${payments.reduce((s, p) => s + (p.amount ?? 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Marketing Analytics */}
          <SectionCard title="Marketing Analytics">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Total Campaigns</span>
                <span className="font-semibold text-gray-900 dark:text-white">{campaigns.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Active Campaigns</span>
                <span className="font-semibold text-gray-900 dark:text-white">{activeCampaigns}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Total Budget</span>
                <span className="font-semibold text-gray-900 dark:text-white">Rs. {totalCampBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Budget Utilization</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {totalCampBudget > 0 ? Math.round((totalCampSpent / totalCampBudget) * 100) : 0}%
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Production Analytics */}
          <SectionCard title="Production Analytics">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Active Projects</span>
                <span className="font-semibold text-gray-900 dark:text-white">{projects.filter((p) => p.status === "in-progress").length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Total Deliverables</span>
                <span className="font-semibold text-gray-900 dark:text-white">{deliverables.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {deliverables.length > 0 ? Math.round((delivByStatus("Delivered") / deliverables.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Production Team</span>
                <span className="font-semibold text-gray-900 dark:text-white">{employees.filter((u) => u.role.startsWith("production")).length}</span>
              </div>
            </div>
          </SectionCard>

          {/* HR Analytics */}
          <SectionCard title="HR Analytics">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Present Today</span>
                <span className="font-semibold text-green-600">{presentToday}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Absent Today</span>
                <span className="font-semibold text-red-600">{absentToday}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Pending Leave Requests</span>
                <span className="font-semibold text-yellow-600">{pendingLeaves}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Approved Leaves</span>
                <span className="font-semibold text-blue-600">{approvedLeaves}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Rejected Leaves</span>
                <span className="font-semibold text-gray-500">{rejectedLeaves}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Monthly Payroll</span>
                <span className="font-semibold text-gray-900 dark:text-white">Rs. {totalPayroll.toLocaleString()}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Hierarchy ────────────────────────────────────────────────────── */}
      {tab === "hierarchy" && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5">
            Organizational Hierarchy
          </h3>
          <EmployeeHierarchy />
        </div>
      )}

      {/* ── Activity Feed ─────────────────────────────────────────────────── */}
      {tab === "activity" && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Activity Feed</h3>
            <p className="text-xs text-gray-500 mt-0.5">Newest events first · auto-refreshes every 30s</p>
          </div>
          <div className="p-5">
            <ActivityFeed limit={50} />
          </div>
        </div>
      )}
    </>
  );
}
