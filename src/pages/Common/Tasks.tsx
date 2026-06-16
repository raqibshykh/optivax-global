import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { UserService, UserProfile } from "../../services/userService";
import { useToast } from "../../context/ToastContext";
import { NotificationService } from "../../services/notificationService";
import { safeParse } from "../../lib/storage";
import { useNavigate } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────
type TaskStatus = "todo" | "in-progress" | "done" | "blocked";
type Priority   = "low" | "medium" | "high";

interface MockTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  assigneeId?: string;
  dueDate: string;
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

export default function Tasks() {
  const { canCreate } = useAuth();
  const [tasks, setTasks] = useState<MockTask[]>(INITIAL_TASKS);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const viewerRole = user?.role || null;
  const isMember = viewerRole?.endsWith("_member");
  const isDeptAdmin = viewerRole?.endsWith("_admin");
  const isHRAdmin = viewerRole === "hr_admin" || viewerRole?.startsWith("hr");
  const isManager = viewerRole === "management";
  const isSuper = viewerRole === "super_admin";
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newAssigneeId, setNewAssigneeId] = useState<string | undefined>(undefined);

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
      // load persisted tasks from localStorage
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
        dueDate: "—",
      },
    ]);
    setNewTitle("");
    setShowForm(false);
  };

  // persist tasks whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("mock_tasks", JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const moveTask = (id: string, newStatus: TaskStatus) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const prevStatus = t.status;
    // Determine permissions: super/hr/manager can move any; members only their tasks; dept admins can move tasks for their department
    if (isSuper || isHRAdmin || isManager) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
      // notify on completion
      if (newStatus === "done" && prevStatus !== "done") {
        notifyAdminsOfCompletion(t);
        showToast("Task marked complete — admins notified", "success");
      }
      return;
    }

    if (isMember) {
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
      const viewerDomain = viewerRole ? viewerRole.split("_")[0] : null;
      if (viewerDomain && assigneeDept === `dept-${viewerDomain}`) {
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
    // find admins to notify: dept admins of same department, plus management, super_admin, hr_admin
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

  // Visible tasks: members see only tasks assigned to them; admins/management see domain/all
  const visibleTasks = tasks.filter((t) => {
    if (!user) return false;
    if (isMember) return t.assigneeId === user.id;
    if (isSuper || isHRAdmin || isManager) return true;
    if (isDeptAdmin) {
      const assignee = t.assigneeId ? usersById[t.assigneeId] : undefined;
      const assigneeDept = assignee ? assignee.departmentId : undefined;
      const viewerDomain = viewerRole ? viewerRole.split("_")[0] : null;
      return assigneeDept === `dept-${viewerDomain}` || (assignee && assignee.role && assignee.role.startsWith(viewerDomain || ""));
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
            {totalDone} of {tasks.length} tasks complete — <span className="font-semibold text-brand-500">{completion}%</span>
          </p>
        </div>
        {canCreate("production") && (
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
        <form onSubmit={handleAdd} className="mb-6 flex gap-3 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <input
            autoFocus
            type="text"
            placeholder="Task title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          {(isSuper || isHRAdmin || isManager || isDeptAdmin) && (
            <select
              value={newAssigneeId || ""}
              onChange={(e) => setNewAssigneeId(e.target.value || undefined)}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Assign to (me)</option>
              {users
                .filter(u => u.role !== 'client')
                .map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          )}
          <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Add
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
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
                  <div
                    key={task.id}
                    className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{task.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <span className="text-xs text-gray-400">{task.assignee}</span>
                        {task.assigneeId && usersById[task.assigneeId] && (
                          <span className="ml-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{usersById[task.assigneeId].role}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{task.dueDate}</span>
                    </div>
                    {/* Quick move buttons */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {COLUMNS.filter((c) => c.id !== col.id).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => moveTask(task.id, c.id)}
                          className="rounded px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
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
            ).filter(([role, tasksForRole]) => (roleFilter === "all" || role === roleFilter)).map(([role, tasksForRole]) => (
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
                          // navigate to assignee's employees page and highlight
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
