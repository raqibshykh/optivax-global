import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getCampaigns, saveCampaigns, SALES_MEMBERS } from "../../mock/salesData";
import { CampaignBudget } from "../../types";
import { canManageBudget } from "../../utils/rbac";

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paused:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  planned:   "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const EMPTY_FORM = {
  campaignName: "",
  totalBudget: 0,
  budgetSpent: 0,
  startDate: "",
  endDate: "",
  assignedMembers: [] as string[],
  status: "planned" as CampaignBudget["status"],
  notes: "",
};

export default function CampaignBudgets() {
  const { user, canCreate, canEdit, canDelete } = useAuth();
  const { showToast } = useToast();

  // Only super_admin, management, and sales_admin can manage budgets
  const isAdmin = canManageBudget(user ?? null);

  const [campaigns, setCampaigns] = useState<CampaignBudget[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignBudget | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadData = () => {
    const all = getCampaigns();
    if (!isAdmin && user) {
      setCampaigns(all.filter(c => c.assignedMembers.includes(user.id)));
    } else {
      setCampaigns(all);
    }
  };

  useEffect(() => { loadData(); }, [isAdmin, user?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setIsModalOpen(true);
  };

  const openEdit = (c: CampaignBudget) => {
    setEditing(c);
    setForm({
      campaignName: c.campaignName,
      totalBudget: c.totalBudget,
      budgetSpent: c.budgetSpent,
      startDate: c.startDate,
      endDate: c.endDate,
      assignedMembers: [...c.assignedMembers],
      status: c.status,
      notes: c.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("You must be logged in to perform this action", "error");
      return;
    }
    const all = getCampaigns();
    if (editing) {
      saveCampaigns(all.map(c => c.id === editing.id ? { ...c, ...form } : c));
      showToast("Campaign updated", "success");
    } else {
      const next: CampaignBudget = {
        id: `cb${Date.now()}`,
        ...form,
        createdAt: new Date().toISOString(),
        createdBy: user.id,
      };
      saveCampaigns([next, ...all]);
      showToast("Campaign created", "success");
    }
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this campaign budget?")) return;
    saveCampaigns(getCampaigns().filter(c => c.id !== id));
    showToast("Campaign deleted", "success");
    loadData();
  };

  const toggleMember = (id: string) =>
    setForm(f => ({
      ...f,
      assignedMembers: f.assignedMembers.includes(id)
        ? f.assignedMembers.filter(m => m !== id)
        : [...f.assignedMembers, id],
    }));

  const filtered = campaigns.filter(c => {
    const matchSearch =
      c.campaignName.toLowerCase().includes(search.toLowerCase()) ||
      (c.notes || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalBudget  = campaigns.reduce((s, c) => s + c.totalBudget, 0);
  const totalSpent   = campaigns.reduce((s, c) => s + c.budgetSpent, 0);
  const totalRemain  = totalBudget - totalSpent;
  const activeCnt    = campaigns.filter(c => c.status === "active").length;
  const overallPct   = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const barColor = (pct: number) =>
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";

  return (
    <>
      <PageMeta title="Campaign Budgets | Optivax Sales" description="Manage campaign budgets and allocations" />
      <PageBreadcrumb pageTitle="Campaign Budgets" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { label: "Total Budget",       value: `$${totalBudget.toLocaleString()}`,  color: "text-brand-600 dark:text-brand-400" },
          { label: "Total Spent",        value: `$${totalSpent.toLocaleString()}`,   color: "text-red-500" },
          { label: "Remaining",          value: `$${totalRemain.toLocaleString()}`,  color: "text-green-500" },
          { label: "Active Campaigns",   value: `${activeCnt}`,                      color: "text-blue-500" },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
            {card.label === "Total Spent" && (
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${barColor(overallPct)}`} style={{ width: `${Math.min(overallPct, 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isAdmin ? "All Campaign Budgets" : "Your Assigned Campaigns"}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-44 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
            {isAdmin && canCreate("sales") && (
              <button onClick={openCreate} className="px-4 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap">
                + Create Campaign
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Campaign", "Total Budget", "Spent", "Remaining", "Utilization", "Assigned Members", "Period", "Status", ...(isAdmin ? ["Actions"] : [])].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No campaigns found.
                  </td>
                </tr>
              )}
              {filtered.map(c => {
                const remaining = c.totalBudget - c.budgetSpent;
                const pct = c.totalBudget > 0 ? Math.round((c.budgetSpent / c.totalBudget) * 100) : 0;
                const memberNames = c.assignedMembers
                  .map(id => SALES_MEMBERS.find(m => m.id === id)?.name || id)
                  .join(", ");
                return (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-4 max-w-52">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{c.campaignName}</div>
                      {c.notes && <div className="text-xs text-gray-500 mt-0.5 truncate">{c.notes}</div>}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">${c.totalBudget.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm font-medium text-red-500 whitespace-nowrap">${c.budgetSpent.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm font-medium text-green-600 dark:text-green-400 whitespace-nowrap">${remaining.toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 min-w-28">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-36">{memberNames || "—"}</td>
                    <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">{c.startDate}<br />{c.endDate}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[c.status]}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        {canEdit("sales") && (
                          <button onClick={() => openEdit(c)} className="text-brand-600 hover:text-brand-800 dark:text-brand-400 text-xs font-medium mr-3">Edit</button>
                        )}
                        {canDelete("sales") && (
                          <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 text-xs font-medium">Delete</button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-50 w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? "Edit Campaign Budget" : "Create Campaign Budget"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name *</label>
                <input
                  required type="text" value={form.campaignName}
                  onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Budget ($) *</label>
                  <input
                    required type="number" min="0" value={form.totalBudget}
                    onChange={e => setForm(f => ({ ...f, totalBudget: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget Spent ($)</label>
                  <input
                    type="number" min="0" value={form.budgetSpent}
                    onChange={e => setForm(f => ({ ...f, budgetSpent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                  <input
                    required type="date" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
                  <input
                    required type="date" value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as CampaignBudget["status"] }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign Members</label>
                <div className="space-y-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {SALES_MEMBERS.map(m => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignedMembers.includes(m.id)}
                        onChange={() => toggleMember(m.id)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{m.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  rows={3} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">Save Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
