import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getSalesTasks, saveSalesTasks, SALES_MEMBERS, SALES_ADMIN_ID } from "../../mock/salesData";
import { SalesTask } from "../../types";
import { NotificationService } from "../../services/notificationService";

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_COLORS: Record<string, string> = {
  "todo":        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "done":        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "blocked":     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  "todo": "To Do", "in-progress": "In Progress", "done": "Done", "blocked": "Blocked",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  assignedTo: SALES_MEMBERS[0]?.id || "",
  assignedName: SALES_MEMBERS[0]?.name || "",
  priority: "medium" as SalesTask["priority"],
  dueDate: "",
  status: "todo" as SalesTask["status"],
  estimatedValue: 0,
  notes: "",
};

export default function SalesTasks() {
  const { user, canCreate, canEdit, canDelete, checkPermission } = useAuth();
  const { showToast } = useToast();

  const isAdmin = checkPermission("sales", "APPROVE") || user?.role === "management";

  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesTask | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = () => {
    const all = getSalesTasks();
    if (!isAdmin && user) {
      setTasks(all.filter(t => t.assignedTo === user.id));
    } else {
      setTasks(all);
    }
  };

  useEffect(() => { loadData(); }, [isAdmin, user?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setIsModalOpen(true);
  };

  const openEdit = (t: SalesTask) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description,
      assignedTo: t.assignedTo,
      assignedName: t.assignedName,
      priority: t.priority,
      dueDate: t.dueDate,
      status: t.status,
      estimatedValue: t.estimatedValue,
      notes: t.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleAssigneeChange = (id: string) => {
    const member = SALES_MEMBERS.find(m => m.id === id);
    setForm(f => ({ ...f, assignedTo: id, assignedName: member?.name || id }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("You must be logged in to perform this action", "error");
      return;
    }

    const sendNotification = (toUserId: string, title: string, message: string) => {
      NotificationService.create({ userId: toUserId, title, message, type: "info", read: false, createdAt: new Date().toISOString() } as any).catch(() => {});
    };

    const writeRevision = (taskId: string, taskTitle: string, oldAssigneeName: string, newAssigneeName: string) => {
      try {
        const raw = localStorage.getItem("mock_revisions");
        const existing = raw ? (JSON.parse(raw) as object[]) : [];
        existing.push({
          id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          entityType: "sales_task",
          entityId: taskId,
          action: "reassigned",
          field: "assignedTo",
          oldValue: oldAssigneeName,
          newValue: newAssigneeName,
          changedBy: user.id,
          changedByName: user.name || user.email,
          note: `Sales task "${taskTitle}" reassigned from ${oldAssigneeName} to ${newAssigneeName}`,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("mock_revisions", JSON.stringify(existing));
      } catch {}
    };

    const all = getSalesTasks();
    if (editing) {
      const isReassignment = editing.assignedTo !== form.assignedTo;
      saveSalesTasks(all.map(t => t.id === editing.id ? { ...t, ...form } : t));

      if (isReassignment) {
        sendNotification(editing.assignedTo, "Task Reassigned", `You have been unassigned from: "${form.title}". It has been reassigned to ${form.assignedName}.`);
        sendNotification(form.assignedTo, "New Task Assigned", `You have been assigned to sales task: "${form.title}".`);
        writeRevision(editing.id, form.title, editing.assignedName, form.assignedName);
        showToast(`Task reassigned to ${form.assignedName}. Both parties notified.`, "success");
      } else {
        showToast("Task updated", "success");
      }
    } else {
      // Duplicate prevention — same title + assignee among non-done tasks
      const titleLower = form.title.trim().toLowerCase();
      const dup = all.find(t =>
        t.status !== "done" &&
        t.assignedTo === form.assignedTo &&
        t.title.trim().toLowerCase() === titleLower
      );
      if (dup) {
        showToast(`A task "${form.title}" is already assigned to ${form.assignedName}`, "error");
        return;
      }

      const taskId = `stk${Date.now()}`;
      const next: SalesTask = {
        id: taskId,
        ...form,
        createdAt: new Date().toISOString(),
        createdBy: user.id,
      };
      saveSalesTasks([next, ...all]);
      sendNotification(form.assignedTo, "New Task Assigned", `You have been assigned to sales task: "${form.title}".`);
      showToast("Task created and assigned", "success");
    }
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    saveSalesTasks(getSalesTasks().filter(t => t.id !== id));
    showToast("Task deleted", "success");
    loadData();
  };

  const handleStatusUpdate = (id: string, status: SalesTask["status"]) => {
    const all = getSalesTasks();
    const task = all.find(t => t.id === id);
    saveSalesTasks(all.map(t => t.id === id ? { ...t, status } : t));
    // Notify sales admin when a task is completed
    if (status === "done" && task && user) {
      NotificationService.create({
        userId: SALES_ADMIN_ID,
        type: "system",
        title: "Sales Task Completed",
        message: `${user.name || user.email} completed task: "${task.title}"`,
        read: false,
        createdAt: new Date().toISOString(),
      } as any).catch(() => {});
    }
    showToast(`Task marked as ${STATUS_LABELS[status]}`, "success");
    loadData();
  };

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedName.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus   = filterStatus   === "all" || t.status   === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const todoCount     = tasks.filter(t => t.status === "todo").length;
  const inProgCount   = tasks.filter(t => t.status === "in-progress").length;
  const doneCount     = tasks.filter(t => t.status === "done").length;
  const blockedCount  = tasks.filter(t => t.status === "blocked").length;
  const totalValue    = tasks.filter(t => t.status !== "done").reduce((s, t) => s + t.estimatedValue, 0);

  return (
    <>
      <PageMeta title="Sales Tasks | Optivax Sales" description="Manage and track sales tasks" />
      <PageBreadcrumb pageTitle="Sales Tasks" />

      {/* Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "To Do",       value: todoCount,    color: "text-gray-600 dark:text-gray-300", bg: "bg-gray-50 dark:bg-gray-800/50" },
          { label: "In Progress", value: inProgCount,  color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/10" },
          { label: "Done",        value: doneCount,    color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/10" },
          { label: "Blocked",     value: blockedCount, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/10" },
          { label: "Pipeline Value", value: `$${totalValue.toLocaleString()}`, color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-50 dark:bg-brand-900/10" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-gray-200 dark:border-gray-800 ${s.bg} p-4 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isAdmin ? "All Sales Tasks" : "My Tasks"}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text" placeholder="Search tasks..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-44 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {isAdmin && canCreate("sales") && (
              <button onClick={openCreate} className="px-4 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap">
                + Assign Task
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {[
                  "Task", ...(isAdmin ? ["Assigned To"] : []),
                  "Priority", "Due Date", "Est. Value", "Status", "Actions",
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No tasks found.
                  </td>
                </tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-4 max-w-64">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</div>
                    {t.notes && (
                      <div className="text-xs text-brand-600 dark:text-brand-400 mt-0.5 italic truncate">Note: {t.notes}</div>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400">
                          {t.assignedName.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t.assignedName}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_COLORS[t.priority]}`}>
                      {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.dueDate}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {t.estimatedValue > 0 ? `$${t.estimatedValue.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Members can update their own task status */}
                      {(!isAdmin || canEdit("sales")) && t.status !== "done" && (
                        <select
                          value={t.status}
                          onChange={e => handleStatusUpdate(t.id, e.target.value as SalesTask["status"])}
                          className="text-xs px-2 py-1 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      )}
                      {isAdmin && canEdit("sales") && (
                        <button onClick={() => openEdit(t)} className="text-brand-600 hover:text-brand-800 dark:text-brand-400 text-xs font-medium">Edit</button>
                      )}
                      {isAdmin && canDelete("sales") && (
                        <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 text-xs font-medium">Del</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-50 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? "Edit Task" : "Assign New Task"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title *</label>
                <input required type="text" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assign To *
                  {editing && editing.assignedTo !== form.assignedTo && (
                    <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                      Reassignment — both parties will be notified
                    </span>
                  )}
                </label>
                <select required value={form.assignedTo}
                  onChange={e => handleAssigneeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  {SALES_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as SalesTask["priority"] }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as SalesTask["status"] }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                  <input required type="date" value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Value ($)</label>
                  <input type="number" min="0" value={form.estimatedValue}
                    onChange={e => setForm(f => ({ ...f, estimatedValue: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
