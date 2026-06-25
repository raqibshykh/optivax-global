import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { RequirePermission } from "../../components/auth/RequirePermission";
import { useAuth } from "../../context/AuthContext";
import { UserService } from "../../services/userService";
import { ClientService } from "../../services/clientService";
import { safeParse } from "../../lib/storage";
import { StoredClient } from "../../types";
import type { MockTask } from "../Common/Tasks";
import { getConversations, getVisibleConversations, getConvStats } from "../../mock/conversationsData";
import { getContentEntries, PROD_STATUS_DOT, PROD_STATUS_BADGE, type ContentEntry } from "../../mock/contentCalendarData";

const PROJECTS_KEY = "mock_projects";

// ── Storage keys ─────────────────────────────────────────────────────────────
const PROD_ASSIGNMENTS_KEY = "production_client_assignments";
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

export default function ProductionPanel() {
  const { user, checkPermission } = useAuth();
  const navigate = useNavigate();
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

  // ── Conversation stats (for widget) ──────────────────────────────────────
  const convStats = (() => {
    if (!user) return { open: 0, awaitingTeam: 0, unreadByTeam: 0 };
    const all = getConversations();
    const visible = getVisibleConversations(all, user.role, user.id);
    const s = getConvStats(visible);
    return { open: s.open, awaitingTeam: s.awaitingTeam, unreadByTeam: s.unreadByTeam };
  })();

  // ── Marketing production requests ─────────────────────────────────────────
  const [prodRequests, setProdRequests] = useState<ContentEntry[]>([]);
  useEffect(() => {
    setProdRequests(getContentEntries().filter(e => e.productionSupportRequired));
  }, []);

  const prodStats = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    const in14  = new Date(); in14.setDate(new Date().getDate() + 14);
    const in14str = in14.toISOString().slice(0,10);
    return {
      pending:    prodRequests.filter(e => (e.productionStatus ?? "Pending") === "Pending").length,
      inProgress: prodRequests.filter(e => e.productionStatus === "In Progress").length,
      ready:      prodRequests.filter(e => e.productionStatus === "Ready For Marketing").length,
      upcoming:   prodRequests.filter(e =>
        e.productionStatus !== "Delivered" &&
        e.scheduledDate >= today && e.scheduledDate <= in14str
      ).sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0,5),
    };
  }, [prodRequests]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{isAdmin ? "Total Projects" : "My Projects"}</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{visibleProjects.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Tasks</p>
          <h4 className="mt-2 text-2xl font-bold text-yellow-500">{pendingTasks.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {isAdmin ? "All Clients" : "My Clients"}
          </p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{myClients.length}</h4>
          {storedClients.length === 0 && <p className="text-xs text-gray-400 mt-1">Sales Admin must create clients</p>}
        </div>
        <button
          onClick={() => navigate("/conversations")}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-left hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
        >
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Client Messages</p>
          <h4 className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">{convStats.open}</h4>
          {convStats.awaitingTeam > 0 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{convStats.awaitingTeam} awaiting reply</p>
          )}
          <p className="text-xs text-brand-500 mt-1 group-hover:underline">View all →</p>
        </button>
      </div>

      {/* ── Marketing Production Request Widgets ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">

        {/* Pending */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Pending Requests</h4>
            <span className={`w-2.5 h-2.5 rounded-full ${PROD_STATUS_DOT["Pending"]}`} />
          </div>
          <p className="text-3xl font-bold text-gray-500 dark:text-gray-400 mb-3">{prodStats.pending}</p>
          <Link to="/production/content-requests" className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline">
            View requests →
          </Link>
        </div>

        {/* In Progress */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">In Progress</h4>
            <span className={`w-2.5 h-2.5 rounded-full ${PROD_STATUS_DOT["In Progress"]}`} />
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-3">{prodStats.inProgress}</p>
          <Link to="/production/content-requests" className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline">
            View requests →
          </Link>
        </div>

        {/* Ready For Delivery */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Ready For Delivery</h4>
            <span className={`w-2.5 h-2.5 rounded-full ${PROD_STATUS_DOT["Ready For Marketing"]}`} />
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-3">{prodStats.ready}</p>
          <Link to="/production/content-requests" className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline">
            Mark as delivered →
          </Link>
        </div>

        {/* Upcoming Deadlines */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Upcoming (14 days)</h4>
            <span className="text-xs text-gray-400">{prodStats.upcoming.length}</span>
          </div>
          {prodStats.upcoming.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No upcoming deadlines</p>
          ) : (
            <div className="space-y-2">
              {prodStats.upcoming.map(e => (
                <div key={e.id} className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${PROD_STATUS_DOT[e.productionStatus ?? "Pending"]}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate leading-tight">{e.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(e.scheduledDate + "T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                      {" · "}{e.productionRequirementType}
                    </p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${PROD_STATUS_BADGE[e.productionStatus ?? "Pending"]}`}>
                    {e.productionStatus ?? "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link to="/production/content-requests" className="mt-3 block text-[10px] text-brand-600 dark:text-brand-400 hover:underline">
            All requests →
          </Link>
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

                {/* Client Messages Widget */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Client Messages</h3>
                    <button
                      onClick={() => navigate("/conversations")}
                      className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-2xl font-bold text-green-600">{convStats.open}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Open</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-2xl font-bold text-yellow-600">{convStats.awaitingTeam}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Awaiting Reply</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-2xl font-bold text-brand-600">{convStats.unreadByTeam}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Unread</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/conversations")}
                    className="mt-4 w-full py-2 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-xl transition-colors"
                  >
                    Open Client Messages
                  </button>
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
                            onClick={() => navigate("/conversations")}
                            className="w-full text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-400 py-1.5 px-3 rounded-lg transition-colors"
                          >
                            View Messages
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Client Messages Widget for member */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Client Messages</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    View and reply to client conversations assigned to your department.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xl font-bold text-green-600">{convStats.open}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Open</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xl font-bold text-yellow-600">{convStats.awaitingTeam}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Needs Reply</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xl font-bold text-brand-600">{convStats.unreadByTeam}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Unread</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/conversations")}
                    className="w-full py-2 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-xl transition-colors"
                  >
                    Open Client Messages
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>

    </>
  );
}
