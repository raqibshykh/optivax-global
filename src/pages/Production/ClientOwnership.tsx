import { useState, useEffect, useMemo, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ClientService } from "../../services/clientService";
import { UserService } from "../../services/userService";
import {
  getAllOwnerships, getClientOwnership, getOwnershipHistory,
  assignClientOwner, removeClientOwner,
  type ClientOwnership, type ClientOwnershipHistoryEntry,
} from "../../mock/clientOwnershipData";
import { AuditLogService } from "../../services/auditLogService";
import { NotificationService } from "../../services/notificationService";
import { safeParse } from "../../lib/storage";
import type { Client } from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductionMember {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ACTION_BADGE: Record<string, string> = {
  assigned:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reassigned: "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400",
  removed:    "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",
};

function getProfiles(): { id: string; role: string; full_name: string; email: string }[] {
  return safeParse(localStorage.getItem("mock_profiles"), []);
}

// ── Assign / Reassign Modal ───────────────────────────────────────────────────

function AssignModal({
  clients,
  members,
  ownerships,
  prefillClientId,
  onSave,
  onClose,
}: {
  clients:         Client[];
  members:         ProductionMember[];
  ownerships:      ClientOwnership[];
  prefillClientId: string | null;
  onSave:          (clientId: string, memberId: string, notes: string) => void;
  onClose:         () => void;
}) {
  const [clientId,  setClientId]  = useState(prefillClientId ?? "");
  const [memberId,  setMemberId]  = useState("");
  const [notes,     setNotes]     = useState("");

  const currentOwner = clientId
    ? ownerships.find(o => o.clientId === clientId)
    : null;

  useEffect(() => {
    if (currentOwner) setMemberId(currentOwner.ownerId);
  }, [currentOwner?.ownerId]);

  const isReassign = !!currentOwner;

  const valid = clientId && memberId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide">
              {isReassign ? "Reassign Client Owner" : "Assign Client Owner"}
            </p>
            <h2 className="text-lg font-bold">Client Ownership</h2>
          </div>
          <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Client selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Client *
            </label>
            <select
              value={clientId}
              onChange={e => { setClientId(e.target.value); setMemberId(""); }}
              disabled={!!prefillClientId}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="">— Select client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
              ))}
            </select>
          </div>

          {/* Current owner info */}
          {currentOwner && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">Current Owner</p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                {currentOwner.ownerName} — assigned {fmtDate(currentOwner.assignedAt)}
              </p>
            </div>
          )}

          {/* Production member selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Production Member *
            </label>
            <select
              value={memberId}
              onChange={e => setMemberId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">— Select member —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role === "production_admin" ? "Production Admin" : "Production Member"})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for assignment..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => valid && onSave(clientId, memberId, notes)}
              disabled={!valid}
              className="flex-1 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isReassign ? "Reassign Owner" : "Assign Owner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── History Modal ─────────────────────────────────────────────────────────────

function HistoryModal({
  clientName,
  history,
  onClose,
}: {
  clientName: string;
  history:    ClientOwnershipHistoryEntry[];
  onClose:    () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide">Assignment History</p>
            <h2 className="text-lg font-bold">{clientName}</h2>
          </div>
          <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {history.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">No assignment history yet.</p>
          ) : (
            <ol className="relative border-l-2 border-gray-200 dark:border-gray-700 space-y-6 ml-3">
              {history.map(h => (
                <li key={h.id} className="ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 ring-4 ring-white dark:ring-gray-900">
                    <svg className="h-3 w-3 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="4" />
                    </svg>
                  </span>
                  <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ACTION_BADGE[h.action] ?? ""}`}>
                        {h.action}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDateTime(h.assignedAt)}</span>
                    </div>
                    {h.action !== "removed" && (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Owner: {h.newOwnerName}
                      </p>
                    )}
                    {h.previousOwnerName && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {h.action === "removed" ? "Removed: " : "Previously: "}{h.previousOwnerName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      By {h.assignedByName} ({h.assignedByRole.replace(/_/g, " ")})
                    </p>
                    {h.notes && (
                      <p className="text-xs text-gray-500 italic mt-1">"{h.notes}"</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
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

const ALLOWED_TO_ASSIGN = new Set(["super_admin", "management", "production_admin"]);

export default function ClientOwnership() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [clients,    setClients]    = useState<Client[]>([]);
  const [members,    setMembers]    = useState<ProductionMember[]>([]);
  const [ownerships, setOwnerships] = useState<ClientOwnership[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [showAssign,  setShowAssign]  = useState(false);
  const [prefillId,   setPrefillId]   = useState<string | null>(null);
  const [historyClient, setHistoryClient] = useState<{ id: string; name: string } | null>(null);
  const [history,     setHistory]     = useState<ClientOwnershipHistoryEntry[]>([]);

  const [search,      setSearch]      = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "assigned" | "unassigned">("all");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const canAssign = user ? ALLOWED_TO_ASSIGN.has(user.role) : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cls] = await Promise.all([ClientService.getAll()]);
      setClients(cls);
      setOwnerships(getAllOwnerships());

      const profiles = getProfiles();
      const prodMembers: ProductionMember[] = profiles
        .filter(p => p.role === "production_admin" || p.role === "production_member")
        .map(p => ({ id: p.id, name: p.full_name, email: p.email, role: p.role }));
      setMembers(prodMembers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = clients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus === "assigned") {
      list = list.filter(c => ownerships.some(o => o.clientId === c.id));
    } else if (filterStatus === "unassigned") {
      list = list.filter(c => !ownerships.some(o => o.clientId === c.id));
    }
    return list;
  }, [clients, ownerships, search, filterStatus]);

  const handleAssign = useCallback((clientId: string, memberId: string, notes: string) => {
    if (!user) return;

    const client  = clients.find(c => c.id === clientId);
    const member  = members.find(m => m.id === memberId);
    if (!client || !member) return;

    const existing = ownerships.find(o => o.clientId === clientId);
    const isReassign = !!existing;

    const ownership: ClientOwnership = {
      clientId,
      clientName:     client.name,
      ownerId:        member.id,
      ownerName:      member.name,
      ownerEmail:     member.email,
      assignedById:   user.id,
      assignedByName: user.name,
      assignedByRole: user.role,
      assignedAt:     new Date().toISOString(),
      notes:          notes || undefined,
    };

    assignClientOwner(ownership);
    setOwnerships(getAllOwnerships());
    setShowAssign(false);
    setPrefillId(null);

    // Notify the assigned member
    NotificationService.create({
      userId:    member.id,
      title:     isReassign ? "Client Reassigned to You" : "Client Assigned to You",
      message:   `${user.name} ${isReassign ? "reassigned" : "assigned"} client "${client.name}" to you.`,
      type:      "system",
      module:    "client",
      read:      false,
      createdAt: new Date().toISOString(),
      actionUrl: "/production/my-clients",
      actionLabel: "View My Clients",
    }).catch(() => {});

    // If reassign, notify previous owner
    if (isReassign && existing && existing.ownerId !== member.id) {
      NotificationService.create({
        userId:    existing.ownerId,
        title:     "Client Ownership Transferred",
        message:   `"${client.name}" has been reassigned from you to ${member.name} by ${user.name}.`,
        type:      "system",
        module:    "client",
        read:      false,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }

    AuditLogService.add({
      action:          isReassign ? "CLIENT_OWNER_REASSIGNED" : "CLIENT_OWNER_ASSIGNED",
      entityType:      "client",
      entityId:        clientId,
      entityName:      client.name,
      performedBy:     user.id,
      performedByName: user.name,
      performedByRole: user.role,
      description:     `${user.name} ${isReassign ? "reassigned" : "assigned"} "${client.name}" owner to ${member.name}`,
      oldValue:        existing ? { ownerId: existing.ownerId, ownerName: existing.ownerName } : undefined,
      newValue:        { ownerId: member.id, ownerName: member.name },
    });

    showToast(
      isReassign
        ? `"${client.name}" reassigned to ${member.name}`
        : `"${client.name}" assigned to ${member.name}`,
      "success"
    );
  }, [user, clients, members, ownerships, showToast]);

  const handleRemove = useCallback((clientId: string) => {
    if (!user) return;
    if (confirmRemoveId !== clientId) {
      setConfirmRemoveId(clientId);
      return;
    }
    setConfirmRemoveId(null);

    const client   = clients.find(c => c.id === clientId);
    const existing = ownerships.find(o => o.clientId === clientId);
    if (!client) return;

    const entry = removeClientOwner(clientId, client.name, user.id, user.name, user.role);
    if (!entry) return;

    setOwnerships(getAllOwnerships());

    if (existing) {
      NotificationService.create({
        userId:    existing.ownerId,
        title:     "Client Ownership Removed",
        message:   `Your ownership of client "${client.name}" has been removed by ${user.name}.`,
        type:      "system",
        module:    "client",
        read:      false,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }

    AuditLogService.add({
      action:          "CLIENT_OWNER_REMOVED",
      entityType:      "client",
      entityId:        clientId,
      entityName:      client.name,
      performedBy:     user.id,
      performedByName: user.name,
      performedByRole: user.role,
      description:     `${user.name} removed ownership of "${client.name}" from ${existing?.ownerName ?? "unknown"}`,
      oldValue:        existing ? { ownerId: existing.ownerId, ownerName: existing.ownerName } : undefined,
    });

    showToast(`Ownership removed for "${client.name}"`, "success");
  }, [user, clients, ownerships, confirmRemoveId, showToast]);

  const openHistory = useCallback((client: Client) => {
    setHistoryClient({ id: client.id, name: client.name });
    setHistory(getOwnershipHistory(client.id));
  }, []);

  // KPI counts
  const totalClients   = clients.length;
  const assigned       = ownerships.length;
  const unassigned     = totalClients - assigned;

  return (
    <>
      <PageMeta title="Client Ownership | OptiVax Global" description="Assign production owners to clients" />
      <PageBreadcrumb pageTitle="Client Ownership Assignment" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Clients",   value: totalClients, color: "text-gray-900 dark:text-white" },
          { label: "Assigned",        value: assigned,     color: "text-green-600 dark:text-green-400" },
          { label: "Unassigned",      value: unassigned,   color: "text-red-500 dark:text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          <option value="all">All Clients</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
        {canAssign && (
          <button
            onClick={() => { setPrefillId(null); setShowAssign(true); }}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> Assign Owner
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-400">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-sm text-gray-400">No clients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {["Client", "Company", "Status", "Assigned Owner", "Since", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map(client => {
                  const ownership = ownerships.find(o => o.clientId === client.id);
                  const isConfirmRemove = confirmRemoveId === client.id;

                  return (
                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{client.company}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          client.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ownership ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{ownership.ownerName}</p>
                            <p className="text-xs text-gray-400">{ownership.ownerEmail}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {ownership ? fmtDate(ownership.assignedAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canAssign && (
                            <button
                              onClick={() => { setPrefillId(client.id); setShowAssign(true); }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors font-medium"
                            >
                              {ownership ? "Reassign" : "Assign"}
                            </button>
                          )}
                          <button
                            onClick={() => openHistory(client)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            History
                          </button>
                          {canAssign && ownership && (
                            <button
                              onClick={() => handleRemove(client.id)}
                              className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                                isConfirmRemove
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                              }`}
                            >
                              {isConfirmRemove ? "Confirm?" : "Remove"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent History Feed */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Assignment Activity</h3>
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden shadow-sm">
          {(() => {
            const recent = getOwnershipHistory().slice(0, 10);
            if (recent.length === 0) {
              return <p className="p-8 text-center text-sm text-gray-400">No assignment activity yet.</p>;
            }
            return (
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {["Action", "Client", "Owner", "Performed By", "Date"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recent.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ACTION_BADGE[h.action] ?? ""}`}>
                          {h.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-white font-medium">{h.clientName}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                        {h.newOwnerName ?? <span className="italic text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{h.assignedByName}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(h.assignedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {/* Modals */}
      {showAssign && (
        <AssignModal
          clients={clients}
          members={members}
          ownerships={ownerships}
          prefillClientId={prefillId}
          onSave={handleAssign}
          onClose={() => { setShowAssign(false); setPrefillId(null); }}
        />
      )}
      {historyClient && (
        <HistoryModal
          clientName={historyClient.name}
          history={history}
          onClose={() => setHistoryClient(null)}
        />
      )}
    </>
  );
}
