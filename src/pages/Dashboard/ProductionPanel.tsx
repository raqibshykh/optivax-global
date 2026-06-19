import React, { useState, useEffect, useCallback, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { RequirePermission } from "../../components/auth/RequirePermission";
import { useAuth } from "../../context/AuthContext";
import { UserService } from "../../services/userService";
import { ClientService } from "../../services/clientService";
import { safeParse } from "../../lib/storage";
import { StoredClient } from "../../types";
import type { MockTask } from "../Common/Tasks";

const PROJECTS_KEY = "mock_projects";

// ── Storage keys ─────────────────────────────────────────────────────────────
const PROD_ASSIGNMENTS_KEY = "production_client_assignments";
const PROD_MESSAGES_KEY    = "optivax_client_messages";
const CLIENTS_KEY          = "optivax_clients";
const TASKS_KEY            = "mock_tasks";

// Status mapping: MockTask → display
const TASK_STATUS_LABEL: Record<MockTask["status"], string> = {
  "todo":        "To Do",
  "in-progress": "In Progress",
  "done":        "Done",
  "blocked":     "Blocked",
};

interface Project {
  id: string;
  name: string;
  clientId: string;
  status: string;
  priority?: string;
  progress: number;
  budget?: number;
  spent?: number;
  deadline?: string;
  assignedTo?: string[];
}

interface Member {
  id: string; full_name: string; email: string; role: string;
}

interface ChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: string;
  toId: string;
  toName: string;
  message: string;
  sentAt: string;
  // legacy fields kept for backward-compat with old stored messages
  toClientId?: string;
  toClientName?: string;
}
const normMsg = (m: Record<string, unknown>): ChatMessage => {
  const r = m as Partial<ChatMessage> & { toClientId?: string; toClientName?: string };
  return {
    id: r.id ?? "",
    fromId: r.fromId ?? "",
    fromName: r.fromName ?? "",
    fromRole: r.fromRole ?? "production_member",
    toId: r.toId ?? r.toClientId ?? "",
    toName: r.toName ?? r.toClientName ?? "",
    message: r.message ?? "",
    sentAt: r.sentAt ?? "",
    toClientId: r.toClientId,
    toClientName: r.toClientName,
  };
};

export default function ProductionPanel() {
  const { user, checkPermission } = useAuth();
  const isAdmin = checkPermission("production", "EDIT");

  const [activeTab, setActiveTab] = useState("tasks");

  const [tasks, setTasks] = useState<MockTask[]>(() =>
    safeParse<MockTask[]>(localStorage.getItem(TASKS_KEY), [])
  );

  const loadTasks = useCallback(() => {
    setTasks(safeParse<MockTask[]>(localStorage.getItem(TASKS_KEY), []));
  }, []);

  useEffect(() => {
    const handler = () => loadTasks();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [loadTasks]);

  const [projects, setProjects] = useState<Project[]>(() =>
    safeParse<Project[]>(localStorage.getItem(PROJECTS_KEY), [])
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROJECTS_KEY)
        setProjects(safeParse<Project[]>(e.newValue, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Real clients from optivax_clients ────────────────────────────────────
  const [storedClients, setStoredClients] = useState<StoredClient[]>(() =>
    safeParse<StoredClient[]>(localStorage.getItem(CLIENTS_KEY), [])
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLIENTS_KEY)
        setStoredClients(safeParse<StoredClient[]>(e.newValue, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Client assignment state ──────────────────────────────────────────────
  const [assignments, setAssignments] = useState<Record<string, string[]>>(() =>
    safeParse<Record<string, string[]>>(localStorage.getItem(PROD_ASSIGNMENTS_KEY), {})
  );

  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    UserService.getAll()
      .then((all) =>
        setMembers(
          all
            .filter((u) => u.role === "production_member")
            .map((u) => ({ id: u.id, full_name: u.full_name ?? u.email, email: u.email, role: u.role }))
        )
      )
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(PROD_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }, [assignments]);

  // ── Messaging state ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    safeParse<any[]>(localStorage.getItem(PROD_MESSAGES_KEY), []).map(normMsg)
  );
  const [msgClient, setMsgClient] = useState<StoredClient | null>(null);
  const [msgText, setMsgText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Thread between current user and the open client chat
  const activeThread: ChatMessage[] = msgClient
    ? messages
        .filter(
          (m) =>
            (m.fromId === user?.id && (m.toId === msgClient.id || m.toClientId === msgClient.id)) ||
            (m.fromId === msgClient.id && (m.toId === user?.id))
        )
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
    : [];

  // Auto-scroll to latest message when thread or modal changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread.length, msgClient]);

  const sendMessage = () => {
    if (!msgClient || !msgText.trim() || !user) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      fromId: user.id,
      fromName: user.name,
      fromRole: user.role,
      toId: msgClient.id,
      toName: msgClient.contactName,
      toClientId: msgClient.id,
      toClientName: msgClient.contactName,
      message: msgText.trim(),
      sentAt: new Date().toISOString(),
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(PROD_MESSAGES_KEY, JSON.stringify(updated));
    setMsgText("");
    // keep modal open for continued conversation
  };

  // ── Assignment helpers ───────────────────────────────────────────────────
  const toggleAssignment = async (clientId: string, memberId: string) => {
    const existing = assignments[memberId] ?? [];
    const alreadyAssigned = existing.includes(clientId);
    const newMemberList = alreadyAssigned
      ? existing.filter((id) => id !== clientId)
      : [...existing, clientId];

    const newAssignments = { ...assignments, [memberId]: newMemberList };
    setAssignments(newAssignments);

    // Compute all members now assigned to this client and sync to client record
    const allAssignedToClient = Object.entries(newAssignments)
      .filter(([, clientIds]) => clientIds.includes(clientId))
      .map(([mId]) => mId);
    try {
      await ClientService.update(clientId, { assignedProductionMembers: allAssignedToClient });
    } catch {
      // local state still updated; non-critical sync failure
    }
  };

  const getAssignedMemberNames = (clientId: string): string => {
    const assignedIds = Object.entries(assignments)
      .filter(([, clientIds]) => clientIds.includes(clientId))
      .map(([memberId]) => memberId);
    if (assignedIds.length === 0) return "None";
    const names = assignedIds
      .map((id) => members.find((m) => m.id === id)?.full_name ?? id)
      .join(", ");
    return names;
  };

  // ── Visible clients for current user ─────────────────────────────────────
  // Members can see: (a) clients manually assigned by admin, OR (b) clients
  // whose projects have this member in assignedTo[]
  const myClients: StoredClient[] = isAdmin
    ? storedClients
    : storedClients.filter((c) => {
        const uid = user?.id ?? "";
        const directlyAssigned = (assignments[uid] ?? []).includes(c.id);
        const assignedViaProject = projects.some(
          (p) => p.clientId === c.id && (p.assignedTo ?? []).includes(uid)
        );
        return directlyAssigned || assignedViaProject;
      });

  // My messages sent (for member view)
  const myMessages = messages.filter((m) => m.fromId === user?.id);

  // Visible tasks: admin sees all, member sees only assigned to them
  const visibleTasks: MockTask[] = isAdmin
    ? tasks
    : tasks.filter((t) => t.assigneeId === user?.id);

  // Visible projects: admin sees all, member sees only projects where they are in assignedTo[]
  const visibleProjects: Project[] = isAdmin
    ? projects
    : projects.filter((p) => (p.assignedTo ?? []).includes(user?.id ?? ""));

  // Derived
  const pendingTasks = visibleTasks.filter((t) => t.status !== "done");

  const handleTaskStatusChange = (id: string, newStatus: MockTask["status"]) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
    setTasks(updated);
  };

  const handleProjectStatusChange = (id: string, newStatus: string) => {
    const updated = projects.map((p) => (p.id === id ? { ...p, status: newStatus } : p));
    setProjects(updated);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  };

  return (
    <>
      <PageMeta title="Production Dashboard | Optivax CRM" description="Production dashboard" />
      <PageBreadcrumb pageTitle="Production Dashboard" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{isAdmin ? "Total Projects" : "My Projects"}</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{visibleProjects.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Tasks</p>
          <h4 className="mt-2 text-2xl font-bold text-yellow-500">{pendingTasks.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {isAdmin ? "All Clients" : "My Clients"}
          </p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{myClients.length}</h4>
          {storedClients.length === 0 && <p className="text-xs text-gray-400 mt-1">Sales Admin must create clients</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-4 overflow-x-auto pb-px">
          {["tasks", "projects", "clients"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">
              {isAdmin ? "All Tasks" : "My Tasks"}
            </h3>
            {visibleTasks.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                {isAdmin ? "No tasks yet. Use the Tasks page to create them." : "No tasks assigned to you yet."}
              </p>
            ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {visibleTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{task.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.assignee}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.dueDate}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.priority === "high"   ? "bg-red-100 text-red-800" :
                          task.priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                        }`}>{task.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === "done"        ? "bg-green-100 text-green-800" :
                          task.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                          task.status === "blocked"     ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {TASK_STATUS_LABEL[task.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <RequirePermission domain="production" action="EDIT" fallback={
                          <select className="rounded border border-gray-300 px-2 py-1 text-xs" value={task.status} disabled>
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        }>
                          <select
                            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value as MockTask["status"])}
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </RequirePermission>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">
              {isAdmin ? "All Projects" : "My Projects"}
            </h3>
            {visibleProjects.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                {isAdmin ? "No projects yet." : "No projects assigned to you yet."}
              </p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleProjects.map((proj) => {
                const client = storedClients.find((c) => c.id === proj.clientId);
                const statusColor =
                  proj.status === "completed" ? "bg-green-100 text-green-800" :
                  proj.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                  proj.status === "review" ? "bg-purple-100 text-purple-800" : "bg-yellow-100 text-yellow-800";
                const pct = proj.progress ?? 0;
                return (
                  <div key={proj.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{proj.name}</h4>
                        <p className="text-xs text-gray-500">
                          Client: {client ? `${client.contactName} (${client.companyName})` : proj.clientId}
                        </p>
                        {proj.deadline && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Due: {new Date(proj.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <RequirePermission domain="production" action="EDIT" fallback={
                        <span className={`text-xs rounded-full px-2 py-1 font-medium ${statusColor}`}>
                          {proj.status}
                        </span>
                      }>
                        <select
                          className={`text-xs rounded-full px-2 py-1 font-medium border-0 focus:ring-0 ${statusColor}`}
                          value={proj.status}
                          onChange={(e) => handleProjectStatusChange(proj.id, e.target.value)}
                        >
                          <option className="bg-white text-gray-900" value="planning">Planning</option>
                          <option className="bg-white text-gray-900" value="in-progress">In Progress</option>
                          <option className="bg-white text-gray-900" value="review">Review</option>
                          <option className="bg-white text-gray-900" value="completed">Completed</option>
                        </select>
                      </RequirePermission>
                    </div>
                    <div className="flex justify-between text-xs mb-1 mt-4">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full ${pct === 100 ? "bg-green-500" : "bg-brand-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {proj.budget !== undefined && (
                      <p className="text-xs text-gray-400 mt-2">
                        Budget: <span className="font-medium text-gray-600 dark:text-gray-300">${proj.budget.toLocaleString()}</span>
                        {proj.spent !== undefined && (
                          <span> · Spent: <span className="text-red-500">${proj.spent.toLocaleString()}</span></span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <>
            {/* ── ADMIN VIEW: all clients + member assignment ──────────────── */}
            {isAdmin && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">All Clients</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Assign clients to team members to grant them access and communication rights.
                    </p>
                  </div>
                  {storedClients.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No clients yet. Sales Admin must create clients from the Sales dashboard.
                    </div>
                  ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead>
                        <tr>
                          {["Contact", "Company", "Phone", "Email", "Created By", "Created", "Status", "Message", "Assign Members"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {storedClients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{client.contactName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{client.companyName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{client.phone}</td>
                            <td className="px-4 py-3 text-sm text-brand-500">{client.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{client.createdByName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {new Date(client.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                client.status === "active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              }`}>{client.status}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => { setMsgClient(client); setMsgText(""); }}
                                className="text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-400 py-1 px-3 rounded-lg transition-colors whitespace-nowrap"
                              >
                                Message
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {members.length === 0 ? (
                                <span className="text-xs text-gray-400">No members</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {members.map((m) => {
                                    const assigned = (assignments[m.id] ?? []).includes(client.id);
                                    return (
                                      <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={assigned}
                                          onChange={() => toggleAssignment(client.id, m.id)}
                                          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                        />
                                        <span className={assigned ? "text-brand-600 dark:text-brand-400 font-medium" : "text-gray-600 dark:text-gray-400"}>
                                          {m.full_name}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>

                {/* Client Communications Log */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Client Communications Log</h3>
                  {messages.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet. Use the Message button above to start a conversation with a client.</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.slice().reverse().map((msg) => {
                        const isFromClient = msg.fromRole === "client";
                        return (
                          <div key={msg.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{msg.fromName}</span>
                                <span className="mx-1">→</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{msg.toName || msg.toClientName}</span>
                                {isFromClient && (
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">client reply</span>
                                )}
                              </span>
                              <span>{new Date(msg.sentAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{msg.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── MEMBER VIEW: only assigned clients + messaging ────────────── */}
            {!isAdmin && (
              <div className="space-y-6">
                {myClients.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-gray-900 text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Clients Assigned</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your production admin hasn't linked any clients to you yet. Once assigned, you'll be able to view client details and communicate with them directly.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">My Clients</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Clients assigned to you by the production admin. You can view their details and message them directly.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myClients.map((client) => {
                        const uid = user?.id ?? "";
                        const viaProject = !((assignments[uid] ?? []).includes(client.id)) &&
                          projects.some((p) => p.clientId === client.id && (p.assignedTo ?? []).includes(uid));
                        return (
                        <div key={client.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{client.contactName}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">{client.companyName}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${viaProject ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                              {viaProject ? "Via project" : "Assigned to you"}
                            </span>
                          </div>
                          <div className="space-y-1 mb-4">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Phone:</span> {client.phone}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Email:</span>{" "}
                              <a href={`mailto:${client.email}`} className="text-brand-500 hover:underline">{client.email}</a>
                            </p>
                          </div>
                          <button
                            onClick={() => { setMsgClient(client); setMsgText(""); }}
                            className="w-full text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-400 py-1.5 px-3 rounded-lg transition-colors"
                          >
                            Message Client
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Conversations summary for member */}
                {myMessages.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="mb-1 text-lg font-bold text-gray-800 dark:text-white">Recent Conversations</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click a client card above to open the chat thread.</p>
                    <div className="space-y-2">
                      {storedClients
                        .filter((c) => messages.some((m) =>
                          (m.fromId === user?.id && (m.toId === c.id || m.toClientId === c.id)) ||
                          (m.fromId === c.id && m.toId === user?.id)
                        ))
                        .map((c) => {
                          const lastMsg = messages
                            .filter((m) =>
                              (m.fromId === user?.id && (m.toId === c.id || m.toClientId === c.id)) ||
                              (m.fromId === c.id && m.toId === user?.id)
                            )
                            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0];
                          return (
                            <button
                              key={c.id}
                              onClick={() => { setMsgClient(c); setMsgText(""); }}
                              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-left transition-colors"
                            >
                              <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm flex-shrink-0">
                                {c.contactName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.contactName}</p>
                                {lastMsg && (
                                  <p className="text-xs text-gray-400 truncate">{lastMsg.fromId === user?.id ? "You: " : ""}{lastMsg.message}</p>
                                )}
                              </div>
                              {lastMsg && (
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {new Date(lastMsg.sentAt).toLocaleDateString()}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Chat Window ─────────────────────────────────────────────────────── */}
      {msgClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
            style={{ height: "540px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                  {msgClient.contactName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{msgClient.contactName}</p>
                  <p className="text-xs text-gray-500">{msgClient.companyName} · {msgClient.email}</p>
                </div>
              </div>
              <button
                onClick={() => setMsgClient(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeThread.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400 dark:text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                activeThread.map((msg) => {
                  const isMine = msg.fromId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? "bg-brand-500 text-white rounded-br-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                        }`}
                      >
                        {!isMine && (
                          <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.fromName}</p>
                        )}
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={`text-xs mt-1 ${isMine ? "text-white/60" : "text-gray-400"}`}>
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  rows={2}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message… (Enter to send)"
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!msgText.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors disabled:opacity-40 self-end"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
