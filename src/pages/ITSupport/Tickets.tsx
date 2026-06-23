import { useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  getITTickets, saveITTickets,
  type ITTicket, type TicketCategory, type TicketPriority, type TicketStatus,
} from "../../mock/itSupportData";
import { mockUsers } from "../../mock/users";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high:     "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low:      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open:          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "in-progress": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed:        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  escalated:     "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// Only IT staff are assignable
const IT_MEMBERS = mockUsers.filter(u => u.role === "it_admin" || u.role === "it_member");

type TicketForm = {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
};

const EMPTY_FORM: TicketForm = { title: "", description: "", category: "system", priority: "medium" };

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000).toISOString();
const SLA_DAYS: Record<TicketPriority, number> = { critical: 1, high: 2, medium: 5, low: 10 };

// ── Component ─────────────────────────────────────────────────────────────────

export default function Tickets() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // ── Role guards ───────────────────────────────────────────────────────────
  // IT Support handles tickets — they do NOT create them.
  // Any other internal (non-client) employee can create tickets.
  const isITAdmin  = user?.role === "it_admin";
  const isITMember = user?.role === "it_member";
  const isITStaff  = isITAdmin || isITMember;
  const isSuperAdmin = user?.role === "super_admin";
  const isClient   = user?.role === "client";

  // Roles that MAY create tickets (all internal staff except IT Support and Clients)
  const canCreateTicket = !isITStaff && !isClient;

  // Roles that CAN manage tickets (assign, resolve, escalate, close)
  const canManageTickets = isITStaff || isSuperAdmin;

  // ── State ─────────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<ITTicket[]>(() => getITTickets());

  const [filterStatus,   setFilterStatus]   = useState<"all" | TicketStatus>("all");
  const [filterPriority, setFilterPriority] = useState<"all" | TicketPriority>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | TicketCategory>("all");
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<TicketForm>(EMPTY_FORM);

  const [detailTicket, setDetailTicket] = useState<ITTicket | null>(null);
  const [noteText, setNoteText] = useState("");
  const [assignTo, setAssignTo] = useState("");

  // ── Derived lists ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Clients never see the ticket system
    if (isClient) return [];
    return tickets.filter(t => {
      if (filterStatus   !== "all" && t.status   !== filterStatus)   return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !t.requestedByName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tickets, filterStatus, filterPriority, filterCategory, search, isClient]);

  const openCount       = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in-progress").length;
  const resolvedCount   = tickets.filter(t => t.status === "resolved").length;
  const escalatedCount  = tickets.filter(t => t.status === "escalated").length;
  const myAssigned      = tickets.filter(t => t.assignedTo === user?.id).length;

  // ── Ticket mutations ──────────────────────────────────────────────────────
  const persist = (updated: ITTicket[]) => {
    setTickets(updated);
    saveITTickets(updated);
  };

  const updateTicket = (id: string, patch: Partial<ITTicket>) => {
    const updated = tickets.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t);
    persist(updated);
    if (detailTicket?.id === id) setDetailTicket(prev => prev ? { ...prev, ...patch } : null);
  };

  const handleCreate = () => {
    if (!canCreateTicket) return;
    if (!form.title || !form.description) {
      showToast("Title and description are required.", "error");
      return;
    }
    const now = new Date();
    const newTicket: ITTicket = {
      id: `tkt-${Date.now()}`,
      ...form,
      status: "open",
      requestedBy: user?.id ?? "unknown",
      requestedByName: user?.name ?? "Unknown",
      requestedByDept: user?.departmentId?.replace("dept-", "").replace(/-/g, " ") ?? "Unknown",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      slaDeadline: addDays(now, SLA_DAYS[form.priority]),
    };
    persist([newTicket, ...tickets]);
    setIsCreateOpen(false);
    setForm(EMPTY_FORM);
    showToast("Ticket submitted to IT Support.", "success");
  };

  const handleAssign = () => {
    if (!detailTicket || !assignTo) return;
    const member = IT_MEMBERS.find(u => u.id === assignTo);
    updateTicket(detailTicket.id, {
      assignedTo: assignTo,
      assignedToName: member?.name,
      status: detailTicket.status === "open" ? "in-progress" : detailTicket.status,
    });
    setAssignTo("");
    showToast(`Ticket assigned to ${member?.name}.`, "success");
  };

  const handleAddNote = () => {
    if (!detailTicket || !noteText.trim()) return;
    const stamp = `[${new Date().toLocaleString()} — ${user?.name}]`;
    updateTicket(detailTicket.id, {
      notes: detailTicket.notes ? `${detailTicket.notes}\n\n${stamp} ${noteText}` : `${stamp} ${noteText}`,
    });
    setNoteText("");
    showToast("Note added.", "success");
  };

  const handleAccept = (id: string) => {
    updateTicket(id, { status: "in-progress", assignedTo: user?.id, assignedToName: user?.name });
    showToast("Ticket accepted and set to In Progress.", "success");
  };

  const handleResolve = (id: string) => {
    updateTicket(id, { status: "resolved", resolvedAt: new Date().toISOString() });
    showToast("Ticket resolved.", "success");
  };

  const handleEscalate = (id: string) => {
    updateTicket(id, { status: "escalated" });
    showToast("Ticket escalated.", "success");
  };

  const handleClose = (id: string) => {
    updateTicket(id, { status: "closed" });
    showToast("Ticket closed.", "success");
  };

  const handleReopen = (id: string) => {
    updateTicket(id, { status: "open", resolvedAt: undefined });
    showToast("Ticket reopened.", "success");
  };

  const f = <K extends keyof TicketForm>(k: K, v: TicketForm[K]) => setForm(p => ({ ...p, [k]: v }));

  const openDetail = (t: ITTicket) => {
    setDetailTicket(t);
    setNoteText("");
    setAssignTo(t.assignedTo ?? "");
  };

  // ── Client guard ─────────────────────────────────────────────────────────
  if (isClient) {
    return (
      <>
        <PageMeta title="IT Tickets | Optivax CRM" description="IT support ticketing" />
        <PageBreadcrumb pageTitle="IT Tickets" />
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500">You do not have access to the IT ticketing system.</p>
        </div>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title="IT Tickets | Optivax CRM" description="IT support ticketing system" />
      <PageBreadcrumb pageTitle="IT Tickets" />

      {/* ── IT Staff info banner (no create for IT) ────────────────────── */}
      {isITStaff && (
        <div className="mb-5 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 px-5 py-3 flex items-start gap-3">
          <span className="text-blue-500 text-lg mt-0.5">ℹ</span>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <strong>IT Support manages tickets — not creates them.</strong> Internal users across all departments
            submit tickets; IT Support accepts, assigns, updates, and resolves them.
            {isITMember && !isITAdmin && " Assigned tickets are shown below."}
          </div>
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isITStaff ? (
          // IT staff see their workload KPIs
          <>
            {[
              { label: "Open",        value: String(openCount),       color: "text-blue-600 dark:text-blue-400" },
              { label: "In Progress", value: String(inProgressCount), color: "text-yellow-600 dark:text-yellow-400" },
              { label: "Escalated",   value: String(escalatedCount),  color: escalatedCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400" },
              { label: isITAdmin ? "Resolved" : "Assigned to Me",
                value: isITAdmin ? String(resolvedCount) : String(myAssigned),
                color: "text-green-600 dark:text-green-400" },
            ].map(c => (
              <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
                <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </>
        ) : (
          // Other staff see overall status
          <>
            {[
              { label: "Open",        value: String(openCount),       color: "text-blue-600 dark:text-blue-400" },
              { label: "In Progress", value: String(inProgressCount), color: "text-yellow-600 dark:text-yellow-400" },
              { label: "Escalated",   value: String(escalatedCount),  color: escalatedCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400" },
              { label: "Resolved",    value: String(resolvedCount),   color: "text-green-600 dark:text-green-400" },
            ].map(c => (
              <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
                <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Header + Create ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          {isITStaff ? "Ticket Queue" : "IT Tickets"}
        </h2>
        {/* Only non-IT, non-client internal users can submit tickets */}
        {canCreateTicket && (
          <button onClick={() => setIsCreateOpen(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Submit IT Ticket
          </button>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white w-48" />

        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value as "all" | TicketStatus)}>
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterPriority} onChange={e => setFilterPriority(e.target.value as "all" | TicketPriority)}>
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterCategory} onChange={e => setFilterCategory(e.target.value as "all" | TicketCategory)}>
          <option value="all">All Categories</option>
          <option value="hardware">Hardware</option>
          <option value="software">Software</option>
          <option value="device">Device</option>
          <option value="system">System</option>
          <option value="network">Network</option>
          <option value="other">Other</option>
        </select>

        <span className="self-center text-sm text-gray-500">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Ticket table ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["ID", "Title", "Category", "Requested By", "Assigned To", "Priority", "Status", "SLA", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                    {isITStaff ? "No tickets in queue." : "No tickets found."}
                  </td>
                </tr>
              )}
              {filtered.map(t => {
                const slaDate = new Date(t.slaDeadline);
                const overdue = slaDate < new Date() && t.status !== "resolved" && t.status !== "closed";
                return (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{t.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-xs">
                      <span className="truncate block max-w-[200px]">{t.title}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{t.category}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      <div>{t.requestedByName}</div>
                      <div className="text-xs text-gray-400">{t.requestedByDept}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {t.assignedToName ?? <span className="italic text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                    </td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500"}`}>
                      {overdue ? "⚠ " : ""}{slaDate.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(t)}
                        className="text-brand-500 hover:text-brand-700 dark:text-brand-400 text-xs font-medium whitespace-nowrap">
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Ticket Modal (non-IT staff only) ────────────────────────── */}
      {isCreateOpen && canCreateTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Submit IT Support Ticket</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Title</label>
                <input type="text" placeholder="Brief description of the issue"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.title} onChange={e => f("title", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea rows={4} placeholder="Provide details — device name, error messages, steps to reproduce…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.description} onChange={e => f("description", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={form.category} onChange={e => f("category", e.target.value as TicketCategory)}>
                    <option value="hardware">Hardware Request</option>
                    <option value="software">Software Request</option>
                    <option value="device">Device Issue</option>
                    <option value="system">System Issue</option>
                    <option value="network">Network Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={form.priority} onChange={e => f("priority", e.target.value as TicketPriority)}>
                    <option value="low">Low — minor inconvenience</option>
                    <option value="medium">Medium — work affected</option>
                    <option value="high">High — work blocked</option>
                    <option value="critical">Critical — system down</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Your ticket will be reviewed by IT Support and assigned to a team member. SLA: Critical 1 day · High 2 days · Medium 5 days · Low 10 days.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button onClick={handleCreate}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail / Management Modal ──────────────────────────────────────── */}
      {detailTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate pr-4">{detailTicket.title}</h3>
              <button onClick={() => setDetailTicket(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PRIORITY_COLORS[detailTicket.priority]}`}>{detailTicket.priority}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[detailTicket.status]}`}>{detailTicket.status}</span>
                <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 capitalize">{detailTicket.category}</span>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Requested by: </span><span className="font-medium text-gray-800 dark:text-white">{detailTicket.requestedByName} ({detailTicket.requestedByDept})</span></div>
                <div><span className="text-gray-500">Assigned to: </span><span className="font-medium text-gray-800 dark:text-white">{detailTicket.assignedToName ?? "Unassigned"}</span></div>
                <div><span className="text-gray-500">Created: </span><span className="text-gray-700 dark:text-gray-300">{new Date(detailTicket.createdAt).toLocaleString()}</span></div>
                <div><span className="text-gray-500">SLA Deadline: </span>
                  <span className={`font-medium ${new Date(detailTicket.slaDeadline) < new Date() && detailTicket.status !== "resolved" && detailTicket.status !== "closed" ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                    {new Date(detailTicket.slaDeadline).toLocaleString()}
                  </span>
                </div>
                {detailTicket.resolvedAt && (
                  <div><span className="text-gray-500">Resolved: </span><span className="text-gray-700 dark:text-gray-300">{new Date(detailTicket.resolvedAt).toLocaleString()}</span></div>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 leading-relaxed">{detailTicket.description}</p>
              </div>

              {/* Notes log */}
              {detailTicket.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity Log</p>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed">{detailTicket.notes}</pre>
                </div>
              )}

              {/* ── IT Staff management panel ─────────────────────────────── */}
              {canManageTickets && (
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-5">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">IT Support Actions</p>

                  {/* Accept unassigned ticket */}
                  {detailTicket.status === "open" && !detailTicket.assignedTo && (
                    <button onClick={() => handleAccept(detailTicket.id)}
                      className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                      Accept Ticket (Assign to Me)
                    </button>
                  )}

                  {/* Assign to team member (admin only) */}
                  {isITAdmin && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assign to IT Member</label>
                      <div className="flex gap-2">
                        <select className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                          <option value="">— Select member —</option>
                          {IT_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role.replace("_", " ")})</option>)}
                        </select>
                        <button onClick={handleAssign}
                          className="px-3 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium whitespace-nowrap">
                          Assign
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add note */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Add Note / Update</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Update, workaround, next step…"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        value={noteText} onChange={e => setNoteText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddNote()} />
                      <button onClick={handleAddNote}
                        className="px-3 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium">
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Status transition buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(detailTicket.status === "open" || detailTicket.status === "in-progress" || detailTicket.status === "escalated") && (
                      <button onClick={() => handleResolve(detailTicket.id)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium">
                        Mark Resolved
                      </button>
                    )}
                    {isITAdmin && detailTicket.status !== "escalated" && detailTicket.status !== "resolved" && detailTicket.status !== "closed" && (
                      <button onClick={() => handleEscalate(detailTicket.id)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium">
                        Escalate
                      </button>
                    )}
                    {detailTicket.status === "resolved" && (
                      <button onClick={() => handleClose(detailTicket.id)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-medium">
                        Close Ticket
                      </button>
                    )}
                    {(detailTicket.status === "resolved" || detailTicket.status === "closed") && (
                      <button onClick={() => handleReopen(detailTicket.id)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium">
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
