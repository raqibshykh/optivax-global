import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { UserService, UserProfile } from "../../services/userService";
import Avatar from "../../components/common/Avatar";
import { useToast } from "../../context/ToastContext";
import { TaskService } from "../../services/taskService";
import { ProjectService } from "../../services/projectService";
import { RevisionService } from "../../services/revisionService";
import type { Task } from "../../types";
import { notifyTaskCreated, notifyTaskUpdated, notifyTaskDeleted, notifyTaskReassigned, notifyTaskStatusChanged, notifyTaskCompleted } from "../../services/notificationHelpers";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

// ── Types ─────────────────────────────────────────────────────────────────
type TaskStatus = "todo" | "in-progress" | "done" | "blocked";
type Priority   = "low" | "medium" | "high";
type TaskCategory = "general" | "campaign" | "content" | "analytics";
export type MockTask = Task;

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

// ── Mock projects for task linking ─────────────────────────────────────────
interface SimpleProject { id: string; name: string; clientId?: string; }

export default function Tasks() {
  const [tasks, setTasks] = useState<MockTask[]>([]);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const viewerRole = user?.role || null;
  const isMember    = viewerRole?.endsWith("_member");
  const isHRAdmin   = viewerRole === "hr_admin";
  const isManager   = viewerRole === "management";
  const isSuper     = viewerRole === "super_admin";
  const isDeptAdmin = viewerRole?.endsWith("_admin") && !isHRAdmin && !isSuper && !isManager;
  const viewerDept = viewerRole ? viewerRole.replace("_admin", "").replace("_member", "") : null;
  const canAddTask        = !!(isSuper || isManager || isDeptAdmin || isHRAdmin);
  const canEditDeleteTask = !!(isSuper || isManager || isDeptAdmin || isHRAdmin);

  const isMarketingRoute = location.pathname.startsWith("/marketing");
  const isMarketingAdmin = viewerRole === "marketing_admin";
  const showBudgetFields = isMarketingRoute && (isMarketingAdmin || isDeptAdmin || isSuper);

  const [showForm, setShowForm]         = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTitle, setNewTitle]         = useState("");
  const [newPriority, setNewPriority]   = useState<Priority>("medium");
  const [newAssigneeId, setNewAssigneeId] = useState<string | undefined>(undefined);
  const [newCategory, setNewCategory]   = useState<TaskCategory>("general");
  const [newBudget, setNewBudget]       = useState<number>(0);
  const [newDueDate, setNewDueDate]     = useState<string>("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [roleFilter, setRoleFilter]   = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit state
  const [editingTask, setEditingTask] = useState<MockTask | null>(null);
  const [editForm, setEditForm] = useState<Partial<MockTask & { assigneeId?: string }>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try { setUsers(await UserService.getAll()); } catch { setUsers([]); }
    try {
      const data = await TaskService.getAll();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
      setLoadError("Failed to load tasks. Please try again.");
    }
    try {
      const data = await ProjectService.getAll();
      setProjects(data.map(p => ({ id: p.id, name: p.name, clientId: p.clientId })));
    } catch { /* non-critical */ }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const usersById: Record<string, UserProfile> = useMemo(
    () => users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, UserProfile>),
    [users]
  );
  const projectsById: Record<string, SimpleProject> = useMemo(
    () => projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, SimpleProject>),
    [projects]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingTask) return;
    if (!newTitle.trim()) return;
    if (!newProjectId) { showToast("Please select a project", "error"); return; }
    const isCampaignTask = isMarketingRoute && newCategory === "campaign";
    const proj = projectsById[newProjectId];
    const assigneeProfile = newAssigneeId ? usersById[newAssigneeId] : undefined;
    const assigneeDept = assigneeProfile?.departmentId ?? (user?.role ? `dept-${user.role.replace("_admin","").replace("_member","")}` : undefined);
    const assigneeRole = assigneeProfile?.role ?? user?.role;
    setIsCreatingTask(true);
    try {
      const saved = await TaskService.create({
        title: newTitle.trim(),
        description: newDescription,
        status: "todo",
        priority: newPriority,
        assignee: (newAssigneeId && usersById[newAssigneeId]?.full_name) || user?.name || "Me",
        assigneeId: newAssigneeId || user?.id,
        assigneeDept,
        assigneeRole,
        dueDate: newDueDate || "—",
        category: isMarketingRoute ? newCategory : undefined,
        budget: isCampaignTask && newBudget > 0 ? newBudget : undefined,
        budgetUsed: isCampaignTask && newBudget > 0 ? 0 : undefined,
        projectId: newProjectId,
        projectName: proj?.name,
        createdBy: user?.id,
      });
      setTasks((prev) => [saved, ...prev]);
      if (user) {
        notifyTaskCreated(user.id, user.name, user.role, saved.title, saved.id, saved.assigneeId);
      }
    } catch { showToast("Failed to create task", "error"); return; } finally { setIsCreatingTask(false); }
    setNewTitle(""); setNewDescription(""); setNewCategory("general");
    setNewBudget(0); setNewDueDate(""); setNewProjectId(""); setShowForm(false);
  };


  const updateBudgetUsed = useCallback(async (taskId: string, amount: number) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    const budgetUsed = Math.max(0, Math.min(amount, t.budget ?? amount));
    try {
      await TaskService.update(taskId, { budgetUsed });
      setTasks((prev) => prev.map((x) => x.id === taskId ? { ...x, budgetUsed } : x));
      showToast("Budget usage updated", "success");
    } catch { showToast("Failed to update budget", "error"); }
  }, [tasks, showToast]);

  const moveTask = useCallback(async (id: string, newStatus: TaskStatus) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const prevStatus = t.status;

    if (isMember || isHRAdmin) {
      if (t.assigneeId !== user?.id) return;
    } else if (isDeptAdmin) {
      const assignee = t.assigneeId ? usersById[t.assigneeId] : undefined;
      const assigneeDept = assignee ? assignee.departmentId : undefined;
      if (!viewerDept || !(assigneeDept === `dept-${viewerDept}` || (assignee?.role && assignee.role.startsWith(viewerDept)))) return;
    }

    try {
      await TaskService.update(id, { status: newStatus });
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x)));
      if (prevStatus !== newStatus && user) {
        notifyTaskStatusChanged(user.id, user.name, user.role, t.title, t.id, newStatus);
      }
      if (newStatus === "done" && prevStatus !== "done" && user) {
        notifyTaskCompleted(user.id, user.name, user.role, t.title, t.id);
        showToast((isMember || isHRAdmin) ? "Task complete — admins notified" : "Task marked complete", "success");
      } else {
        showToast("Task status updated", "success");
      }
    } catch { showToast("Failed to update task", "error"); }
  }, [tasks, isMember, isHRAdmin, isDeptAdmin, usersById, viewerDept, user, showToast]);

  const deleteTask = useCallback(async (id: string) => {
    if (!window.confirm("Delete this task permanently?")) return;
    try {
      const taskToDelete = tasks.find(t => t.id === id);
      await TaskService.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (taskToDelete && user) {
        notifyTaskDeleted(user.id, user.name, user.role, taskToDelete.title, taskToDelete.id, taskToDelete.assigneeId);
      }
      showToast("Task deleted", "success");
    } catch { showToast("Failed to delete task", "error"); }
  }, [tasks, user, showToast]);

  const openEdit = useCallback((task: MockTask) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
    });
  }, []);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const oldAssigneeId = editingTask.assigneeId;
    const newAssigneeId = editForm.assigneeId;
    const isReassignment = (oldAssigneeId || "") !== (newAssigneeId || "");

    const proj = editForm.projectId ? projectsById[editForm.projectId] : undefined;
    const newAssigneeProfile = newAssigneeId ? usersById[newAssigneeId] : undefined;

    const taskUpdates = {
      ...editForm,
      assignee: newAssigneeProfile?.full_name ?? editingTask.assignee,
      projectName: proj?.name ?? editingTask.projectName,
      ...(isReassignment && newAssigneeProfile ? {
        assigneeDept: newAssigneeProfile.departmentId,
        assigneeRole: newAssigneeProfile.role,
      } : {}),
    };

    try {
      await TaskService.update(editingTask.id, taskUpdates);
      setTasks((prev) => prev.map((t) => t.id === editingTask.id ? { ...t, ...taskUpdates } : t));
    } catch { showToast("Failed to update task", "error"); return; }

    if (isReassignment && user) {
      notifyTaskReassigned(
        user.id, user.name, user.role, editingTask.title, editingTask.id,
        oldAssigneeId || "", newAssigneeId || ""
      );
    } else if (user) {
      notifyTaskUpdated(user.id, user.name, user.role, editingTask.title, editingTask.id, newAssigneeId);
    }

    // Write revision / audit log
    try {
      await RevisionService.create({
        type: "task_reassign",
        projectId: editingTask.projectId || editForm.projectId || "",
        clientId: "",
        comment: `Task "${editingTask.title}" reassigned from ${
          oldAssigneeId ? usersById[oldAssigneeId]?.full_name || "unassigned" : "unassigned"
        } to ${newAssigneeId ? usersById[newAssigneeId]?.full_name || "unassigned" : "unassigned"} by ${user?.name || "admin"}.`,
        updatedBy: user?.id || "",
      });
    } catch { /* non-critical */ }

    if (isReassignment) {
      showToast(
        `Task reassigned to ${newAssigneeId ? usersById[newAssigneeId]?.full_name || "new assignee" : "new assignee"}. Both parties notified.`,
        "success"
      );
    } else {
      showToast("Task updated", "success");
    }

    setEditingTask(null);
  };

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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {totalDone} of {visibleTasks.length} tasks complete — <span className="font-semibold text-brand-500">{completion}%</span>
        </p>
        {canAddTask && (
          <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
            + Add Task
          </button>
        )}
      </div>

      {/* ── Quick-add form ───────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm space-y-3">
          <div className="flex gap-3 flex-wrap">
            <input autoFocus type="text" placeholder="Task title…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Project selection — required */}
            <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)} required
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white flex-1 min-w-40">
              <option value="">Select project *</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {(isSuper || isManager || isDeptAdmin) && (
              <select value={newAssigneeId || ""} onChange={(e) => setNewAssigneeId(e.target.value || undefined)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white flex-1 min-w-40">
                <option value="">Assign to (me)</option>
                {users.filter((u) => {
                  if (!u.role || u.role === "client") return false;
                  if (isSuper || isManager) return true;
                  // Dept admins can only assign within their own department
                  const allowed = [`${viewerDept}_admin`, `${viewerDept}_member`];
                  return allowed.includes(u.role);
                }).map(u => <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>)}
              </select>
            )}

            {showBudgetFields && (
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <option value="general">General</option>
                <option value="campaign">Campaign</option>
                <option value="content">Content</option>
                <option value="analytics">Analytics</option>
              </select>
            )}

            {showBudgetFields && newCategory === "campaign" && (
              <input type="number" min={0} placeholder="Budget (Rs.)…" value={newBudget || ""} onChange={(e) => setNewBudget(parseInt(e.target.value) || 0)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white w-40" />
            )}
          </div>

          <input type="text" placeholder="Description (optional)…" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />

          <div className="flex gap-2">
            <button type="submit" disabled={isCreatingTask} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed">
              {isCreatingTask ? "Adding…" : "Add Task"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </form>
      )}

      {/* ── Kanban Board ─────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState label="Loading tasks..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={loadBoard} />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {COLUMNS.map((col) => {
          const colTasks = visibleTasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 border-t-4 ${col.color} flex flex-col`}>
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{col.label}</h3>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full w-6 h-6 flex items-center justify-center font-bold">{colTasks.length}</span>
              </div>
              <div className="flex flex-col gap-3 px-3 pb-4 min-h-[200px]">
                {colTasks.length === 0 && <p className="text-xs text-gray-400 italic text-center mt-6">No tasks here</p>}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    col={col}
                    usersById={usersById}
                    isMember={!!isMember}
                    isOwnTask={!!(user?.id && task.assigneeId === user.id)}
                    canEditDelete={canEditDeleteTask}
                    onMove={moveTask}
                    onUpdateBudget={updateBudgetUsed}
                    onDelete={deleteTask}
                    onEdit={openEdit}
                    columns={COLUMNS}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Manager tracking panel */}
      {isManager && (
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Manager — Task Tracking</h4>
            <div className="flex items-center gap-2">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white">
                <option value="all">All roles</option>
                {Array.from(new Set(users.map(u => u.role))).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white">
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
                  {tasksForRole.filter(t => statusFilter === "all" || t.status === statusFilter).map((t) => (
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

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingTask(null)} />
          <div className="relative z-50 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Task</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input required type="text" value={editForm.title ?? ""} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input type="text" value={editForm.description ?? ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select value={editForm.priority ?? "medium"} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as Priority }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input type="date" value={editForm.dueDate ?? ""} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
                <select value={editForm.projectId ?? ""} onChange={e => setEditForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Assignee — only admins/managers may reassign */}
              {canEditDeleteTask && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assignee
                    {(editForm.assigneeId || "") !== (editingTask.assigneeId || "") && (
                      <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                        Reassignment — both parties will be notified
                      </span>
                    )}
                  </label>
                  <select
                    value={editForm.assigneeId ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, assigneeId: e.target.value || undefined }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {users
                      .filter(u => u.role && u.role !== "client")
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Extracted TaskCard component ──────────────────────────────────────────
// Callback props are the stable top-level dispatchers (each wrapped in
// useCallback by the parent) rather than per-render closures bound to this
// card's task id — combined with React.memo below, this means typing in the
// parent's "add task" form (or any other unrelated state change) no longer
// re-renders every card on the board, only ones whose own props actually changed.
interface TaskCardProps {
  task: MockTask;
  col: { id: TaskStatus; label: string; color: string };
  usersById: Record<string, UserProfile>;
  isMember: boolean;
  isOwnTask: boolean;
  canEditDelete: boolean;
  onMove: (id: string, status: TaskStatus) => void;
  onUpdateBudget: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
  onEdit: (task: MockTask) => void;
  columns: typeof COLUMNS;
}

const TaskCard = React.memo(function TaskCard({ task, usersById, isMember, isOwnTask, canEditDelete, onMove, onUpdateBudget, onDelete, onEdit, columns }: TaskCardProps) {
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);

  const hasBudget = task.budget !== undefined && task.budget > 0;
  const budgetUsed = task.budgetUsed ?? 0;
  const budgetRemaining = hasBudget ? (task.budget! - budgetUsed) : 0;
  const budgetPct = hasBudget ? Math.min(100, Math.round((budgetUsed / task.budget!) * 100)) : 0;

  const handleBudgetSave = () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) onUpdateBudget(task.id, val);
    setBudgetInput(""); setShowBudgetEdit(false);
  };

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Title + priority + admin actions */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug flex-1">{task.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(task.priority)}`}>{task.priority}</span>
          {canEditDelete && (
            <>
              <button onClick={() => onEdit(task)} title="Edit task" className="text-gray-400 hover:text-brand-600 p-0.5 rounded transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => onDelete(task.id)} title="Delete task" className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project badge */}
      {task.projectName && (
        <span className="inline-block mb-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 font-medium">
          {task.projectName}
        </span>
      )}

      {/* Category badge */}
      {task.category && task.category !== "general" && (
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mb-1 ${categoryBadge(task.category)}`}>{task.category}</span>
      )}

      {task.description && <p className="text-xs text-gray-500 mb-2">{task.description}</p>}

      {/* Assignee + due date */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar src={task.assigneeId ? usersById[task.assigneeId]?.avatar_url : null} name={task.assignee} size="xs" />
          <span className="text-xs text-gray-400 truncate">{task.assignee}</span>
          {task.assigneeId && usersById[task.assigneeId] && (
            <span className="ml-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 shrink-0">{usersById[task.assigneeId].role}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 shrink-0">{task.dueDate}</span>
      </div>

      {/* Budget section — assignee can update spending, others view */}
      {hasBudget && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Budget Allocated</span>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Rs. {task.budget!.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-gray-500">Used</span>
            <span className="text-red-600 dark:text-red-400 font-medium">Rs. {budgetUsed.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[11px] mb-2">
            <span className="text-gray-500">Remaining</span>
            <span className={`font-semibold ${budgetRemaining < 0 ? "text-red-600" : "text-blue-600 dark:text-blue-400"}`}>Rs. {budgetRemaining.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
            <div className={`h-1.5 rounded-full transition-all ${budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mb-1">{budgetPct}% used</p>
          {isMember && isOwnTask && (
            <div className="mt-1">
              {showBudgetEdit ? (
                <div className="flex gap-1">
                  <input type="number" min={0} max={task.budget} autoFocus placeholder="Total spent so far…" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)}
                    className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-white" />
                  <button type="button" onClick={handleBudgetSave} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded">Save</button>
                  <button type="button" onClick={() => { setShowBudgetEdit(false); setBudgetInput(""); }} className="text-xs text-gray-500 hover:text-gray-700 px-1">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowBudgetEdit(true)} className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 underline">Update spending</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status move buttons — members only move their own tasks */}
      <div className="mt-2 flex flex-wrap gap-1">
        {columns.filter((c) => c.id !== task.status).map((c) => (
          <button key={c.id} onClick={() => onMove(task.id, c.id)}
            className="rounded px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors">
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  );
});
