import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { UserService, UserProfile } from "../../services/userService";
import { useToast } from "../../context/ToastContext";
import { NotificationService } from "../../services/notificationService";
import { safeParse } from "../../lib/storage";
import { useNavigate, useLocation } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────
type TaskStatus = "todo" | "in-progress" | "done" | "blocked";
type Priority   = "low" | "medium" | "high";
type TaskCategory = "general" | "campaign" | "content" | "analytics";

export interface MockTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  assigneeId?: string;
  dueDate: string;
  budget?: number;
  budgetUsed?: number;
  category?: TaskCategory;
}

// ── Mock data ─────────────────────────────────────────────────────────────
const INITIAL_TASKS: MockTask[] = [
  { id: "t1",  title: "Design login screen",        description: "Create new UI for auth flow",   status: "done",        priority: "high",   assignee: "Emma Wilson",   assigneeId: "u12", dueDate: "2026-06-10" },
  { id: "t2",  title: "API integration — leads",    description: "Connect leads CRUD to backend", status: "in-progress", priority: "high",   assignee: "James Carter",  assigneeId: "u8",  dueDate: "2026-06-18" },
  { id: "t3",  title: "Write unit tests",           description: "Cover auth context hooks",      status: "todo",        priority: "medium", assignee: "Liam Park",    assigneeId: "u13", dueDate: "2026-06-22" },
  { id: "t4",  title: "Update client portal",       description: "Refresh billing UI",            status: "in-progress", priority: "medium", assignee: "Olivia Brown",  assigneeId: "u10", dueDate: "2026-06-20" },
  { id: "t5",  title: "Database schema migration",  description: "Add employee tables",           status: "todo",        priority: "high",   assignee: "David Chen",   assigneeId: "u9",  dueDate: "2026-06-25" },
  { id: "t6",  title: "Fix sidebar routing",        description: "Remove dead navigation links",  status: "done",        priority: "high",   assignee: "Noah Davis",   assigneeId: "u14", dueDate: "2026-06-15" },
  { id: "t7",  title: "Email campaign scheduler",   description: "Implement send scheduling",     status: "blocked",     priority: "medium", assignee: "Ava Johnson",  assigneeId: "u11", dueDate: "2026-06-30" },
  { id: "t8",  title: "HR payroll report",          description: "Generate monthly payroll PDF",  status: "todo",        priority: "low",    assignee: "Ethan Lee",    assigneeId: "u15", dueDate: "2026-07-01" },
  { id: "t9",  title: "Deploy to staging",          description: "Push latest build to staging",  status: "in-progress", priority: "high",   assignee: "James Carter",  assigneeId: "u8",  dueDate: "2026-06-17" },
  { id: "t10", title: "Onboard client — Globex",    description: "Initial setup and handover",    status: "todo",        priority: "medium", assignee: "Sarah Mitchell",assigneeId: "u2",  dueDate: "2026-06-28" },
];

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo",        label: "To Do",      color: "border-t-gray-400" },
  { id: "in-progress", label: "In Progress", color: "border-t-brand-500" },
  { id: "done",        label: "Done",       color: "border-t-emerald-500" },
  { id: "blocked",     label: "Blocked",    color: "border-t-red-500" },
];

const priorityBadge = (p: Priority) => {
  if (p === "high")   return "bg-red-100 text-red-700";
  if (p === "medium") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
};

const categoryBadge = (c?: TaskCategory) => {
  if (c === "campaign")  return "bg-purple-100 text-purple-700";
  if (c === "content")   return "bg-blue-100 text-blue-700";
  if (c === "analytics") return "bg-cyan-100 text-cyan-700";
  return "bg-gray-100 text-gray-600";
};

export default function Tasks() {
  const [tasks, setTasks] = useState<MockTask[]>(INITIAL_TASKS);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const viewerRole = user?.role || null;
  const isMember = viewerRole?.endsWith("_member");
  const isHRAdmin = viewerRole === "hr_admin" || viewerRole?.startsWith("hr");
  const isManager = viewerRole === "management";
  const isSuper = viewerRole === "super_admin";
  const isDeptAdmin = viewerRole?.endsWith("_admin") && !isHRAdmin && !isSuper && !isManager;
  const viewerDept = viewerRole ? viewerRole.replace("_admin", "").replace("_member", "") : null;
  // HR admin cannot assign tasks — only super, manager, and dept admins (non-HR) can
  const canAddTask = isSuper || isManager || isDeptAdmin;

  // Marketing-specific context
  const isMarketingRoute = location.pathname.startsWith("/marketing");
  const isMarketingAdmin = viewerRole === "marketing_admin";
  const isMarketingMember = viewerRole === "marketing_member";
  const showBudgetFields = isMarketingRoute && (isMarketingAdmin || isDeptAdmin);

  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newAssigneeId, setNewAssigneeId] = useState<string | undefined>(undefined);
  const [newCategory, setNewCategory] = useState<TaskCategory>("general");
  const [newBudget, setNewBudget] = useState<number>(0);
  const [newDueDate, setNewDueDate] = useState<string>("");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const all = await UserService.getAll();
        setUsers(all);
      } catch {
        setUsers([]);
      }
      try {
        const raw = localStorage.getItem("mock_tasks");
        if (raw) {
          const parsed = safeParse<MockTask[]>(raw, INITIAL_TASKS);
          setTasks(parsed);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const usersById: Record<string, UserProfile> = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, UserProfile>);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const isCampaignTask = isMarketingRoute && newCategory === "campaign";
    setTasks((prev) => [
      ...prev,
      {
        id: `t${Date.now()}`,
        title: newTitle.trim(),
        description: "",
        status: "todo",
        priority: newPriority,
        assignee: (newAssigneeId && usersById[newAssigneeId]?.full_name) || user?.name || "Me",
        assigneeId: newAssigneeId || user?.id,
        dueDate: newDueDate || "—",
        category: isMarketingRoute ? newCategory : undefined,
        budget: isCampaignTask && newBudget > 0 ? newBudget : undefined,
        budgetUsed: isCampaignTask && newBudget > 0 ? 0 : undefined,
      },
    ]);
    setNewTitle("");
    setNewCategory("general");
    setNewBudget(0);
    setNewDueDate("");
    setShowForm(false);
  };

  // persist tasks whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("mock_tasks", JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const updateBudgetUsed = (taskId: string, amount: number) => {
    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, budgetUsed: Math.max(0, Math.min(amount, t.budget ?? amount)) } : t)
    );
    showToast("Budget usage updated", "success");
  };

  const moveTask = (id: string, newStatus: TaskStatus) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const prevStatus = t.status;
    if (isSuper || isManager) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
      if (newStatus === "done" && prevStatus !== "done") {
        notifyAdminsOfCompletion(t);
        showToast("Task marked complete — admins notified", "success");
      }
      return;
    }

    // HR admin and members can only update their own assigned tasks
    if (isMember || isHRAdmin) {
      if (t.assigneeId !== user?.id) return;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
      if (newStatus === "done" && prevStatus !== "done") {
        notifyAdminsOfCompletion(t);
        showToast("Task marked complete — admins notified", "success");
      }
      return;
    }

    if (isDeptAdmin) {
      const assignee = t.assigneeId ? usersById[t.assigneeId] : undefined;
      const assigneeDept = assignee ? assignee.departmentId : undefined;
      if (viewerDept && (assigneeDept === `dept-${viewerDept}` || (assignee?.role && assignee.role.startsWith(viewerDept)))) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
        if (newStatus === "done" && prevStatus !== "done") {
          notifyAdminsOfCompletion(t);
          showToast("Task marked complete — admins notified", "success");
        }
      }
    }
  };

  const notifyAdminsOfCompletion = (task: MockTask) => {
    if (!task.assigneeId) return;
    const assignee = usersById[task.assigneeId];
    const assigneeDept = assignee ? assignee.departmentId : undefined;
    const admins = users.filter((u) => {
      if (u.role === "super_admin" || u.role === "management" || u.role === "hr_admin") return true;
      if (u.role.endsWith("_admin") && u.departmentId && assigneeDept && u.departmentId === assigneeDept) return true;
      return false;
    });

    const createdAt = new Date().toISOString();
    admins.forEach(async (a) => {
      const n = {
        userId: a.id,
        type: "task",
        title: "Task completed",
        message: `${assignee?.full_name || assignee?.email || "A user"} completed task '${task.title}'`,
        read: false,
        createdAt,
        actionUrl: `/admin/notifications`,
      };
      try {
        const created = await NotificationService.create(n as Omit<import("../../types").Notification, "id">);
        const payload = { id: created.id, type: created.type || "task", payload: created };
        const custom = new CustomEvent("saas:notification", { detail: payload });
        window.dispatchEvent(custom);
      } catch {
        // ignore
      }
    });
  };

  // Visible tasks: super/manager see all; dept admins see their dept; HR admin/members see own tasks
  const visibleTasks = tasks.filter((t) => {
    if (!user) return false;
    if (isMember || isHRAdmin) return t.assigneeId === user.id;
    if (isSuper || isManager) return true;
    if (isDeptAdmin) {
      const assignee = t.assigneeId ? usersById[t.assigneeId] : undefined;
      const assigneeDept = assignee ? assignee.departmentId : undefined;
      return assigneeDept === `dept-${viewerDept}` || (assignee && assignee.role && assignee.role.startsWith(viewerDept || ""));
    }
    return false;
  });

  const totalDone = visibleTasks.filter((t) => t.status === "done").length;
  const completion = visibleTasks.length ? Math.round((totalDone / visibleTasks.length) * 100) : 0;

  return (
    <>
      <PageMeta title="Tasks | Optivax CRM" description="Task board and work management" />
      <PageBreadcrumb pageTitle="Tasks" />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalDone} of {visibleTasks.length} tasks complete — <span className="font-semibold text-brand-500">{completion}%</span>
          </p>
        </div>
        {canAddTask && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            + Add Task
          </button>
        )}
      </div>

      {/* ── Quick-add form ───────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-6 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm space-y-3"
        >
          <div className="flex gap-3 flex-wrap">
            <input
              autoFocus
              type="text"
              placeholder="Task title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            {(isSuper || isManager || isDeptAdmin) && (
              <select
                value={newAssigneeId || ""}
                onChange={(e) => setNewAssigneeId(e.target.value || undefined)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white flex-1 min-w-40"
              >
                <option value="">Assign to (me)</option>
                {users
                  .filter((u) => {
                    if (u.role === "client") return false;
                    // super admin and manager can assign to ANY department admin or employee
                    if (isSuper || isManager) return true;
                    // dept admin can only assign to their own department's employees
                    return u.role?.startsWith(viewerDept || "") || u.departmentId === `dept-${viewerDept}`;
                  })
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                  ))}
              </select>
            )}

            {/* Marketing-specific: category + budget */}
            {showBudgetFields && (
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="general">General</option>
                <option value="campaign">Campaign</option>
                <option value="content">Content</option>
                <option value="analytics">Analytics</option>
              </select>
            )}

            {showBudgetFields && newCategory === "campaign" && (
              <input
                type="number"
                min={0}
                placeholder="Budget (Rs.)…"
                value={newBudget || ""}
                onChange={(e) => setNewBudget(parseInt(e.target.value) || 0)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white w-40"
              />
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Add Task
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Kanban Board ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {COLUMNS.map((col) => {
          const colTasks = visibleTasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 border-t-4 ${col.color} flex flex-col`}>
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{col.label}</h3>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full w-6 h-6 flex items-center justify-center font-bold">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-3 px-3 pb-4 min-h-[200px]">
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center mt-6">No tasks here</p>
                )}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    col={col}
                    usersById={usersById}
                    isMember={!!isMember}
                    isOwnTask={task.assigneeId === user?.id}
                    onMove={(newStatus) => moveTask(task.id, newStatus)}
                    onUpdateBudget={(amount) => updateBudgetUsed(task.id, amount)}
                    columns={COLUMNS}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manager tracking panel */}
      {isManager && (
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Manager — Task Tracking</h4>
            <div className="flex items-center gap-2">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded px-2 py-1 text-sm">
                <option value="all">All roles</option>
                {Array.from(new Set(users.map(u => u.role))).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded px-2 py-1 text-sm">
                <option value="all">All status</option>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(
              visibleTasks.reduce((acc: Record<string, MockTask[]>, t) => {
                const r = t.assigneeId && usersById[t.assigneeId] ? usersById[t.assigneeId].role : "unassigned";
                acc[r] = acc[r] || [];
                acc[r].push(t);
                return acc;
              }, {})
            ).filter(([role]) => roleFilter === "all" || role === roleFilter).map(([role, tasksForRole]) => (
              <div key={role} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">{role}</div>
                  <div className="text-xs text-gray-500">{tasksForRole.length}</div>
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  {tasksForRole
                    .filter(t => statusFilter === "all" || t.status === statusFilter)
                    .map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2">
                        <button onClick={() => {
                          const domain = usersById[t.assigneeId || ""]?.departmentId?.replace("dept-", "") || "hr";
                          navigate(`/${domain}/users?selected=${t.assigneeId}`);
                        }} className="text-left text-sm hover:underline">
                          {t.title} — <span className="font-medium">{usersById[t.assigneeId || ""]?.full_name || t.assignee}</span>
                        </button>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{t.status}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Extracted TaskCard component ──────────────────────────────────────────
interface TaskCardProps {
  task: MockTask;
  col: { id: TaskStatus; label: string; color: string };
  usersById: Record<string, UserProfile>;
  isMember: boolean;
  isOwnTask: boolean;
  onMove: (status: TaskStatus) => void;
  onUpdateBudget: (amount: number) => void;
  columns: typeof COLUMNS;
}

function TaskCard({ task, usersById, isMember, isOwnTask, onMove, onUpdateBudget, columns }: TaskCardProps) {
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);

  const hasBudget = task.budget !== undefined && task.budget > 0;
  const budgetUsed = task.budgetUsed ?? 0;
  const budgetRemaining = hasBudget ? (task.budget! - budgetUsed) : 0;
  const budgetPct = hasBudget ? Math.min(100, Math.round((budgetUsed / task.budget!) * 100)) : 0;

  const handleBudgetSave = () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateBudget(val);
    }
    setBudgetInput("");
    setShowBudgetEdit(false);
  };

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Title + priority */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{task.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      {/* Category badge */}
      {task.category && task.category !== "general" && (
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mb-1 ${categoryBadge(task.category)}`}>
          {task.category}
        </span>
      )}

      {task.description && (
        <p className="text-xs text-gray-500 mb-2">{task.description}</p>
      )}

      {/* Assignee + due date */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="text-xs text-gray-400">{task.assignee}</span>
          {task.assigneeId && usersById[task.assigneeId] && (
            <span className="ml-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {usersById[task.assigneeId].role}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{task.dueDate}</span>
      </div>

      {/* Budget section — visible to assignee and admins */}
      {hasBudget && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Budget Allocated</span>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Rs. {task.budget!.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-gray-500 dark:text-gray-400">Used</span>
            <span className="text-red-600 dark:text-red-400 font-medium">Rs. {budgetUsed.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[11px] mb-2">
            <span className="text-gray-500 dark:text-gray-400">Remaining</span>
            <span className={`font-semibold ${budgetRemaining < 0 ? "text-red-600" : "text-blue-600 dark:text-blue-400"}`}>
              Rs. {budgetRemaining.toLocaleString()}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
            <div
              className={`h-1.5 rounded-full transition-all ${budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mb-1">{budgetPct}% used</p>

          {/* Member can update their spending */}
          {isMember && isOwnTask && (
            <div className="mt-1">
              {showBudgetEdit ? (
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    max={task.budget}
                    autoFocus
                    placeholder="Total spent so far…"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleBudgetSave}
                    className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowBudgetEdit(false); setBudgetInput(""); }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBudgetEdit(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 underline"
                >
                  Update spending
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status move buttons */}
      <div className="mt-2 flex flex-wrap gap-1">
        {columns.filter((c) => c.id !== task.status).map((c) => (
          <button
            key={c.id}
            onClick={() => onMove(c.id)}
            className="rounded px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
          >
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
