import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { ClientService } from "../../services/clientService";
import { ProjectService } from "../../services/projectService";
import { getOwnershipsByMember, getOwnershipHistory, type ClientOwnership } from "../../mock/clientOwnershipData";
import type { Client, Project } from "../../types";
import { useNavigate } from "react-router-dom";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// ── Client Card ───────────────────────────────────────────────────────────────

function ClientCard({
  client,
  ownership,
  projectCount,
  onViewProjects,
  onMessage,
}: {
  client:       Client;
  ownership:    ClientOwnership;
  projectCount: number;
  onViewProjects: () => void;
  onMessage:      () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{client.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{client.company}</p>
        </div>
        <span className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
          client.status === "active"
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        }`}>
          {client.status}
        </span>
      </div>

      <div className="space-y-1.5 mb-4 text-sm">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{client.email}</span>
        </div>
        {client.phone && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{client.phone}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-400">Projects</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">{projectCount}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-brand-50 dark:bg-brand-900/20">
          <p className="text-xs text-gray-400">Assigned</p>
          <p className="text-xs font-medium text-brand-700 dark:text-brand-400">{fmtDate(ownership.assignedAt)}</p>
        </div>
      </div>

      {ownership.notes && (
        <p className="text-xs text-gray-400 italic mb-4 truncate">"{ownership.notes}"</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onViewProjects}
          className="flex-1 text-sm font-medium py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          View Projects
        </button>
        <button
          onClick={onMessage}
          className="flex-1 text-sm font-medium py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
        >
          Message
        </button>
      </div>
    </div>
  );
}

// ── Project List Modal ────────────────────────────────────────────────────────

function ProjectsModal({
  clientName,
  projects,
  onClose,
}: {
  clientName: string;
  projects:   Project[];
  onClose:    () => void;
}) {
  const STATUS_COLOR: Record<string, string> = {
    "not-started": "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    "in-progress":  "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400",
    "completed":    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "on-hold":      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide">Related Projects</p>
            <h2 className="text-lg font-bold">{clientName}</h2>
          </div>
          <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {projects.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">No projects found for this client.</p>
          ) : (
            <div className="space-y-3">
              {projects.map(p => (
                <div key={p.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap ${STATUS_COLOR[p.status] ?? ""}`}>
                      {p.status.replace("-", " ")}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Priority: <span className="capitalize">{p.priority}</span></span>
                    <span>Deadline: {fmtDate(p.deadline)}</span>
                    <span>Progress: {p.progress}%</span>
                  </div>
                  {p.progress > 0 && (
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyClients() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ownerships, setOwnerships] = useState<ClientOwnership[]>([]);
  const [clients,    setClients]    = useState<Client[]>([]);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [viewProjectsClient, setViewProjectsClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const myOwnerships = getOwnershipsByMember(user.id);
    setOwnerships(myOwnerships);

    if (myOwnerships.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all([
      ClientService.getAll(),
      ProjectService.getAll(),
    ]).then(([cls, prjs]) => {
      const myClientIds = new Set(myOwnerships.map(o => o.clientId));
      setClients(cls.filter(c => myClientIds.has(c.id)));
      setProjects(prjs);
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const getProjectCount = (clientId: string) =>
    projects.filter(p => p.clientId === clientId).length;

  const getClientProjects = (clientId: string) =>
    projects.filter(p => p.clientId === clientId);

  const totalProjects = useMemo(
    () => clients.reduce((sum, c) => sum + getProjectCount(c.id), 0),
    [clients, projects]
  );

  const recentHistory = useMemo(() => {
    if (!user) return [];
    return getOwnershipHistory().filter(h => h.newOwnerId === user.id).slice(0, 5);
  }, [user?.id]);

  return (
    <>
      <PageMeta title="My Clients | OptiVax Global" description="View your assigned clients" />
      <PageBreadcrumb pageTitle="My Clients" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Assigned Clients", value: clients.length, color: "text-brand-600 dark:text-brand-400" },
          { label: "Total Projects",   value: totalProjects,  color: "text-gray-900 dark:text-white" },
          { label: "Active Clients",   value: clients.filter(c => c.status === "active").length, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      {clients.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search your clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Client Cards */}
      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">Loading your clients…</div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="text-5xl mb-3">👤</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No clients assigned to you yet</p>
          <p className="text-xs text-gray-400 mt-1">Your Production Admin or Manager will assign clients to you.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No clients match your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => {
            const ownership = ownerships.find(o => o.clientId === client.id);
            if (!ownership) return null;
            return (
              <ClientCard
                key={client.id}
                client={client}
                ownership={ownership}
                projectCount={getProjectCount(client.id)}
                onViewProjects={() => setViewProjectsClient(client)}
                onMessage={() => navigate("/conversations")}
              />
            );
          })}
        </div>
      )}

      {/* Recent assignment history for this member */}
      {recentHistory.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Assignments to You</h3>
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {["Client", "Action", "Assigned By", "Date", "Notes"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentHistory.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{h.clientName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        h.action === "assigned"   ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        h.action === "reassigned" ? "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400" :
                                                    "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400"
                      }`}>
                        {h.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{h.assignedByName}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(h.assignedAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 italic">{h.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {viewProjectsClient && (
        <ProjectsModal
          clientName={viewProjectsClient.name}
          projects={getClientProjects(viewProjectsClient.id)}
          onClose={() => setViewProjectsClient(null)}
        />
      )}
    </>
  );
}
