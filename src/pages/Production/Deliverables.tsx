import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { Deliverable, DeliverableStatus, StoredClient } from "../../types";
import { safeParse } from "../../lib/storage";
import {
  notifyDeliverableUploaded,
  notifyDeliverableApproved,
} from "../../services/notificationHelpers";

export const DELIVERABLES_KEY = "optivax_deliverables";
export const CLIENTS_KEY = "optivax_clients";

const STATUS_ORDER: DeliverableStatus[] = ["Pending", "In Progress", "Review", "Approved", "Delivered"];

const STATUS_COLORS: Record<DeliverableStatus, string> = {
  Pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  Delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const readDeliverables = (): Deliverable[] =>
  safeParse<Deliverable[]>(localStorage.getItem(DELIVERABLES_KEY), []);

const writeDeliverables = (items: Deliverable[]) => {
  localStorage.setItem(DELIVERABLES_KEY, JSON.stringify(items));
};

const readClients = (): StoredClient[] =>
  safeParse<StoredClient[]>(localStorage.getItem(CLIENTS_KEY), []);

interface DeliverableFormData {
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  projectName: string;
  dueDate: string;
  notes: string;
}

const emptyForm: DeliverableFormData = {
  title: "", description: "", clientId: "", clientName: "",
  projectName: "", dueDate: "", notes: "",
};

export default function Deliverables() {
  const { user, checkPermission } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [clients, setClients] = useState<StoredClient[]>([]);
  const [filter, setFilter] = useState<DeliverableStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DeliverableFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const isAdmin = checkPermission("production", "EDIT");
  const isMember = !isAdmin && (user?.role === "production_member");
  const isClient = user?.role === "client";
  const isManagement = !isAdmin && !isMember && !isClient;

  useEffect(() => {
    setDeliverables(readDeliverables());
    setClients(readClients());
  }, []);

  const visibleDeliverables = deliverables.filter((d) => {
    if (isClient) return d.status === "Approved" || d.status === "Delivered";
    if (isMember) return d.uploadedBy === user?.id;
    return true; // admin, management, super_admin see all
  }).filter((d) => !filter || d.status === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title || !form.clientId || !form.dueDate) return;
    setSaving(true);
    const newItem: Deliverable = {
      id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: form.clientId,
      clientName: form.clientName,
      projectName: form.projectName || undefined,
      title: form.title,
      description: form.description,
      status: "Pending",
      dueDate: form.dueDate,
      uploadedBy: user.id,
      uploadedByName: user.name,
      uploadedAt: new Date().toISOString(),
      notes: form.notes || undefined,
    };
    const updated = [newItem, ...readDeliverables()];
    writeDeliverables(updated);
    setDeliverables(updated);
    notifyDeliverableUploaded(user.id, user.name, user.role, form.title, newItem.id, form.clientName);
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
  };

  const advanceStatus = (id: string) => {
    if (!user) return;
    setStatusUpdating(id);
    const all = readDeliverables();
    const updated = all.map((d) => {
      if (d.id !== id) return d;
      const idx = STATUS_ORDER.indexOf(d.status);
      const nextStatus = idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : d.status;
      const patch: Partial<Deliverable> = { status: nextStatus };
      if (nextStatus === "Approved") {
        patch.approvedBy = user.id;
        patch.approvedByName = user.name;
        patch.approvedAt = new Date().toISOString();
        notifyDeliverableApproved(user.id, user.name, d.clientId, d.clientName, d.title, d.id);
      }
      if (nextStatus === "Review") {
        patch.reviewedBy = user.id;
        patch.reviewedByName = user.name;
        patch.reviewedAt = new Date().toISOString();
      }
      return { ...d, ...patch };
    });
    writeDeliverables(updated);
    setDeliverables(updated);
    setStatusUpdating(null);
  };

  const revertStatus = (id: string) => {
    const all = readDeliverables();
    const updated = all.map((d) => {
      if (d.id !== id) return d;
      const idx = STATUS_ORDER.indexOf(d.status);
      const prev = idx > 0 ? STATUS_ORDER[idx - 1] : d.status;
      return { ...d, status: prev };
    });
    writeDeliverables(updated);
    setDeliverables(updated);
  };

  return (
    <>
      <PageMeta title="Deliverables | Optivax Global" description="Production deliverables management" />

      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Deliverables</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isClient ? "View your approved deliverables" : "Manage project deliverables and approvals"}
          </p>
        </div>
        {(isAdmin || isMember) && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + New Deliverable
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["", ...STATUS_ORDER] as (DeliverableStatus | "")[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {s || "All"}
            {s && (
              <span className="ml-1.5 text-xs opacity-70">
                ({deliverables.filter((d) => d.status === s && (isClient ? (d.status === "Approved" || d.status === "Delivered") : true) && (isMember ? d.uploadedBy === user?.id : true)).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Deliverables list */}
      {visibleDeliverables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isClient
              ? "No approved deliverables yet. Check back once your deliverables are approved."
              : "No deliverables found. Create one to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleDeliverables.map((d) => {
            const statusIdx = STATUS_ORDER.indexOf(d.status);
            const canAdvance = isAdmin && statusIdx < STATUS_ORDER.length - 1;
            const canRevert = isAdmin && statusIdx > 0;
            const memberCanAdvance = isMember && d.uploadedBy === user?.id && d.status === "Pending";

            return (
              <div key={d.id} className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{d.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Client: {d.clientName}
                      {d.projectName ? ` · ${d.projectName}` : ""}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[d.status]}`}>
                    {d.status}
                  </span>
                </div>

                {d.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{d.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>Due: {fmt(d.dueDate)}</span>
                  <span>By: {d.uploadedByName}</span>
                  <span>Uploaded: {fmt(d.uploadedAt)}</span>
                  {d.approvedByName && <span>Approved by: {d.approvedByName}</span>}
                </div>

                {/* Status progress bar */}
                <div className="flex gap-1 mb-4">
                  {STATUS_ORDER.map((s, i) => (
                    <div
                      key={s}
                      className={`flex-1 h-1.5 rounded-full ${i <= statusIdx ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}
                    />
                  ))}
                </div>

                {/* Actions */}
                {(canAdvance || canRevert || memberCanAdvance) && (
                  <div className="flex gap-2 flex-wrap">
                    {(canAdvance || memberCanAdvance) && (
                      <button
                        onClick={() => advanceStatus(d.id)}
                        disabled={statusUpdating === d.id}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        → Move to {STATUS_ORDER[statusIdx + 1]}
                      </button>
                    )}
                    {canRevert && (
                      <button
                        onClick={() => revertStatus(d.id)}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        ← Revert
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Deliverable Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Deliverable</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Deliverable title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                <select
                  required
                  value={form.clientId}
                  onChange={(e) => {
                    const c = clients.find((c) => c.id === e.target.value);
                    setForm({ ...form, clientId: e.target.value, clientName: c ? `${c.contactName} (${c.companyName})` : "" });
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select client…</option>
                  {clients.length === 0 && (
                    <option disabled>No clients yet — Sales Admin must create clients first</option>
                  )}
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.contactName} — {c.companyName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project (optional)</label>
                  <input
                    value={form.projectName}
                    onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                  <input
                    required
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Describe this deliverable…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Internal notes"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(emptyForm); }}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Create Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
