import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { RequirePermission } from "../../components/auth/RequirePermission";
import { useAuth } from "../../context/AuthContext";
import { UserService } from "../../services/userService";
import { ClientService } from "../../services/clientService";
import { safeParse } from "../../lib/storage";
import { StoredClient } from "../../types";

// ── Storage keys ─────────────────────────────────────────────────────────────
const PROD_ASSIGNMENTS_KEY = "production_client_assignments";
const PROD_MESSAGES_KEY = "optivax_client_messages";
const CLIENTS_KEY = "optivax_clients";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Task {
  id: string; title: string; assignedBy: string;
  status: "Pending" | "In Progress" | "Completed"; due_date: string;
}

interface Project {
  id: string; name: string; client: string; clientId: string;
  status: "Planning" | "In Progress" | "Review" | "Completed";
  completion_percentage: number;
}

interface Member {
  id: string; full_name: string; email: string; role: string;
}

interface ClientMessage {
  id: string; fromId: string; fromName: string;
  toClientId: string; toClientName: string;
  message: string; sentAt: string;
}

const MOCK_PROJECTS: Project[] = [
  { id: "p1", name: "Alpha App Redesign",  client: "Acme Corp",  clientId: "c1", status: "In Progress", completion_percentage: 60 },
  { id: "p2", name: "Backend Migration",   client: "Globex",     clientId: "c2", status: "Planning",    completion_percentage: 15 },
  { id: "p3", name: "E-Commerce Launch",   client: "Stark Ind",  clientId: "c3", status: "Review",      completion_percentage: 95 },
  { id: "p4", name: "Portal Development",  client: "Wayne Ent",  clientId: "c4", status: "Planning",    completion_percentage: 10 },
];

export default function ProductionPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "production_admin";

  const [activeTab, setActiveTab] = useState("tasks");

  const [tasks, setTasks] = useState<Task[]>([
    { id: "t1", title: "Design Homepage UI",      assignedBy: "Manager",    status: "In Progress", due_date: "2026-06-15" },
    { id: "t2", title: "Optimize DB Queries",     assignedBy: "Manager",    status: "Pending",     due_date: "2026-06-18" },
    { id: "t3", title: "Client Feedback Revisions", assignedBy: "Sales Admin", status: "Completed", due_date: "2026-06-10" },
  ]);

  const [projects, setProjects] = useState<Project[]>([
    { id: "p1", name: "Alpha App Redesign",  client: "Acme Corp",  clientId: "c1", status: "In Progress", completion_percentage: 60 },
    { id: "p2", name: "Backend Migration",   client: "Globex",     clientId: "c2", status: "Planning",    completion_percentage: 15 },
    { id: "p3", name: "E-Commerce Launch",   client: "Stark Ind",  clientId: "c3", status: "Review",      completion_percentage: 95 },
    { id: "p4", name: "Portal Development",  client: "Wayne Ent",  clientId: "c4", status: "Planning",    completion_percentage: 10 },
  ]);

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
  const [messages, setMessages] = useState<ClientMessage[]>(() =>
    safeParse<ClientMessage[]>(localStorage.getItem(PROD_MESSAGES_KEY), [])
  );
  const [msgClient, setMsgClient] = useState<StoredClient | null>(null);
  const [msgText, setMsgText] = useState("");

  const sendMessage = () => {
    if (!msgClient || !msgText.trim() || !user) return;
    const newMsg: ClientMessage = {
      id: `msg-${Date.now()}`,
      fromId: user.id,
      fromName: user.name,
      toClientId: msgClient.id,
      toClientName: msgClient.contactName,
      message: msgText.trim(),
      sentAt: new Date().toISOString(),
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(PROD_MESSAGES_KEY, JSON.stringify(updated));
    setMsgText("");
    setMsgClient(null);
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
  const myClients: StoredClient[] = isAdmin
    ? storedClients
    : storedClients.filter((c) =>
        (assignments[user?.id ?? ""] ?? []).includes(c.id)
      );

  // My messages sent (for member view)
  const myMessages = messages.filter((m) => m.fromId === user?.id);

  // Derived
  const pendingTasks = tasks.filter((t) => t.status !== "Completed");

  const handleTaskStatusChange = (id: string, newStatus: Task["status"]) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));

  const handleProjectStatusChange = (id: string, newStatus: Project["status"]) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));

  return (
    <>
      <PageMeta title="Production Dashboard | Optivax CRM" description="Production dashboard" />
      <PageBreadcrumb pageTitle="Production Dashboard" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Projects</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{projects.length}</h4>
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
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Assigned Tasks</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{task.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.assignedBy}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.due_date}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === "Completed" ? "bg-green-100 text-green-800" :
                          task.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <RequirePermission domain="production" action="EDIT" fallback={
                          <select className="rounded border border-gray-300 px-2 py-1 text-xs" value={task.status} disabled>
                            <option>Pending</option><option>In Progress</option><option>Completed</option>
                          </select>
                        }>
                          <select
                            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value as Task["status"])}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </RequirePermission>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Ongoing Projects Workflow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((proj) => (
                <div key={proj.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{proj.name}</h4>
                      <p className="text-xs text-gray-500">Client: {proj.client}</p>
                    </div>
                    <RequirePermission domain="production" action="EDIT" fallback={
                      <span className={`text-xs rounded-full px-2 py-1 font-medium ${
                        proj.status === "Completed" ? "bg-green-100 text-green-800" :
                        proj.status === "Review" ? "bg-purple-100 text-purple-800" :
                        proj.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                      }`}>{proj.status}</span>
                    }>
                      <select
                        className={`text-xs rounded-full px-2 py-1 font-medium border-0 focus:ring-0 ${
                          proj.status === "Completed" ? "bg-green-100 text-green-800" :
                          proj.status === "Review" ? "bg-purple-100 text-purple-800" :
                          proj.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                        value={proj.status}
                        onChange={(e) => handleProjectStatusChange(proj.id, e.target.value as Project["status"])}
                      >
                        <option className="bg-white text-gray-900" value="Planning">Planning</option>
                        <option className="bg-white text-gray-900" value="In Progress">In Progress</option>
                        <option className="bg-white text-gray-900" value="Review">Review</option>
                        <option className="bg-white text-gray-900" value="Completed">Completed</option>
                      </select>
                    </RequirePermission>
                  </div>
                  <div className="flex justify-between text-xs mb-1 mt-4">
                    <span className="text-gray-500">Completion</span>
                    <span className="font-medium text-gray-900 dark:text-white">{proj.completion_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full ${proj.completion_percentage === 100 ? "bg-green-500" : "bg-brand-500"}`}
                      style={{ width: `${proj.completion_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
                          {["Contact", "Company", "Phone", "Email", "Created By", "Created", "Status", "Assign Members"].map((h) => (
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

                {/* Messages sent by team to clients */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Client Communications Log</h3>
                  {messages.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No messages sent yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.slice().reverse().map((msg) => (
                        <div key={msg.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span><span className="font-medium text-gray-700 dark:text-gray-300">{msg.fromName}</span> → {msg.toClientName}</span>
                            <span>{new Date(msg.sentAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{msg.message}</p>
                        </div>
                      ))}
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
                      {myClients.map((client) => (
                        <div key={client.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{client.contactName}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">{client.companyName}</p>
                            </div>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap">
                              Assigned to you
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
                      ))}
                    </div>
                  </div>
                )}

                {/* Sent messages by this member */}
                {myMessages.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">My Sent Messages</h3>
                    <div className="space-y-3">
                      {myMessages.slice().reverse().map((msg) => (
                        <div key={msg.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>To: <span className="font-medium text-gray-700 dark:text-gray-300">{msg.toClientName}</span></span>
                            <span>{new Date(msg.sentAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Message Modal ──────────────────────────────────────────────────── */}
      {msgClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Message Client</h3>
                <p className="text-xs text-gray-500 mt-0.5">{msgClient.contactName} — {msgClient.companyName}</p>
              </div>
              <button
                onClick={() => setMsgClient(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p><span className="font-medium">To:</span> {msgClient.email}</p>
                <p><span className="font-medium">Company:</span> {msgClient.companyName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Message
                </label>
                <textarea
                  rows={5}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Type your message to the client..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setMsgClient(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!msgText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
