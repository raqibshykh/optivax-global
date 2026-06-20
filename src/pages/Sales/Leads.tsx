import React, { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/client";
import type { Lead } from "../../types";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../icons";

// ── Types ─────────────────────────────────────────────────────────────────────
type LeadStatus = "new" | "contacted" | "qualified" | "lost" | "converted";

interface LeadRow extends Lead {
  assignedTo?: string;
}

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: LeadStatus;
  estimated_value: string;
}

const EMPTY_FORM: LeadFormData = {
  name: "", email: "", phone: "", company: "",
  source: "website", status: "new", estimated_value: "",
};

// ── Badge helpers ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<LeadStatus, string> = {
  new:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  contacted:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  qualified:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  lost:       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  converted:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const SOURCE_LABEL: Record<string, string> = {
  website:   "Website",
  referral:  "Referral",
  linkedin:  "LinkedIn",
  "cold-call": "Cold Call",
  event:     "Event",
  other:     "Other",
};

const ALL_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "lost", "converted"];
const ALL_SOURCES = ["website", "referral", "linkedin", "cold-call", "event", "other"];

function StatusBadge({ status }: { status: string }) {
  const s = status as LeadStatus;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[s] ?? "bg-gray-100 text-gray-600"}`}>
      {s}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Leads() {
  const { user, canCreate, canEdit, canDelete } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === "sales_admin" || user?.role === "super_admin" || user?.role === "management";

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<LeadFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (!isAdmin && user?.id) params.assignedTo = user.id;
      const res = await api.get<{ leads: LeadRow[] }>("/saas/v1/leads", { params });
      setLeads(res.leads ?? []);
    } catch {
      showToast("Failed to load leads", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, user?.id, showToast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (lead: LeadRow) => {
    setEditId(lead.id);
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      source: lead.source ?? "website",
      status: (lead.status ?? "new") as LeadStatus,
      estimated_value: lead.estimated_value ? String(lead.estimated_value) : "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showToast("Name and email are required", "error");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
        assignedTo: user?.id,
      };
      if (editId) {
        await api.put("/saas/v1/leads", { id: editId, ...payload });
        showToast("Lead updated", "success");
      } else {
        await api.post("/saas/v1/leads", payload);
        showToast("Lead created", "success");
      }
      setModalOpen(false);
      fetchLeads();
    } catch {
      showToast("Failed to save lead", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete("/saas/v1/leads", { id: deleteId });
      showToast("Lead deleted", "success");
      setDeleteId(null);
      fetchLeads();
    } catch {
      showToast("Failed to delete lead", "error");
    }
  };

  const handleConvert = async (lead: LeadRow) => {
    if (lead.status === "converted") {
      showToast("This lead has already been converted to a client.", "error");
      return;
    }
    if (!window.confirm(`Convert "${lead.name}" (${lead.company ?? lead.email}) to a client? This cannot be undone.`)) return;
    setConvertingId(lead.id);
    try {
      await api.post("/saas/v1/leads/convert", {
        leadId: lead.id,
        convertedBy: user?.id,
        convertedByName: user?.name,
      });
      showToast(`"${lead.name}" converted to client successfully.`, "success");
      fetchLeads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Conversion failed";
      showToast(msg, "error");
    } finally {
      setConvertingId(null);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.name.toLowerCase().includes(q)
      || l.email.toLowerCase().includes(q)
      || (l.company ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const kpiCounts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  return (
    <>
      <PageMeta title="Leads | Optivax CRM" description="Sales pipeline — manage and track leads" />
      <PageBreadcrumb pageTitle="Leads" />

      {/* ── KPI row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={`rounded-xl border p-4 text-left transition-all ${
              statusFilter === s
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-400"
                : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 hover:border-gray-300"
            }`}
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide capitalize">{s}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{kpiCounts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="all">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>
        {canCreate("sales") && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Lead
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Name", "Company", "Source", "Value", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {search || statusFilter !== "all" ? "No leads match your filters." : "No leads yet. Add your first lead to get started."}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{lead.email}</p>
                          {lead.phone && <p className="text-xs text-gray-400">{lead.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {lead.company ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {SOURCE_LABEL[lead.source ?? ""] ?? lead.source ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {lead.estimated_value ? `Rs. ${Number(lead.estimated_value).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={lead.status ?? "new"} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {canEdit("sales") && (
                            <button
                              onClick={() => openEdit(lead)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                              title="Edit lead"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && lead.status !== "converted" && (
                            <button
                              onClick={() => handleConvert(lead)}
                              disabled={convertingId === lead.id}
                              className="px-2 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                              title="Convert to client"
                            >
                              {convertingId === lead.id ? "Converting…" : "Convert"}
                            </button>
                          )}
                          {lead.status === "converted" && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              Client
                            </span>
                          )}
                          {canDelete("sales") && isAdmin && (
                            <button
                              onClick={() => setDeleteId(lead.id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete lead"
                            >
                              <TrashBinIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editId ? "Edit Lead" : "Add New Lead"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                  <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Source</label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                    {ALL_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s] ?? s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                    {ALL_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Value (Rs.)</label>
                  <input type="number" min={0} value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">
                  {isSaving ? "Saving…" : editId ? "Save Changes" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Lead</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This will permanently remove the lead. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
