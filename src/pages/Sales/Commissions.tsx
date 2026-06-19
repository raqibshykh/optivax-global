import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useCommissions, Commission } from "../../hooks/useCommissions";
import { mockUsers } from "../../mock/users";

const SALES_USERS = mockUsers.filter((u) =>
  u.role === "sales_admin" || u.role === "sales_member"
);

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid:     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const EMPTY_FORM = {
  userId: SALES_USERS[0]?.id ?? "",
  userName: SALES_USERS[0]?.name ?? "",
  type: "percentage" as Commission["type"],
  value: 5,
  projectName: "",
  amount: 0,
  status: "pending" as Commission["status"],
  notes: "",
};

export default function Commissions() {
  const { user, checkPermission } = useAuth();
  const { showToast } = useToast();
  const { commissions, isLoading, addCommission, updateCommission, deleteCommission } = useCommissions();

  const isAdmin = checkPermission("sales", "APPROVE") || user?.role === "management" || user?.role === "super_admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Commission | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const myCommissions = isAdmin
    ? commissions
    : commissions.filter((c) => c.userId === user?.id);

  const filtered = myCommissions.filter((c) => {
    const matchSearch =
      c.userName.toLowerCase().includes(search.toLowerCase()) ||
      (c.projectName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.notes ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPaid    = myCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  const totalPending = myCommissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
  const totalApproved = myCommissions.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setIsModalOpen(true);
  };

  const openEdit = (c: Commission) => {
    setEditing(c);
    setForm({
      userId: c.userId,
      userName: c.userName,
      type: c.type,
      value: c.value,
      projectName: c.projectName ?? "",
      amount: c.amount,
      status: c.status,
      notes: c.notes ?? "",
    });
    setIsModalOpen(true);
  };

  const handleUserChange = (id: string) => {
    const u = SALES_USERS.find((x) => x.id === id);
    setForm((f) => ({ ...f, userId: id, userName: u?.name ?? id }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCommission(editing.id, form);
        showToast("Commission updated", "success");
      } else {
        await addCommission(form);
        showToast("Commission created", "success");
      }
      setIsModalOpen(false);
    } catch {
      showToast("Failed to save commission", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this commission record?")) return;
    try {
      await deleteCommission(id);
      showToast("Commission deleted", "success");
    } catch {
      showToast("Failed to delete commission", "error");
    }
  };

  const handleApprove = async (c: Commission) => {
    try {
      await updateCommission(c.id, { status: "approved" });
      showToast("Commission approved", "success");
    } catch {
      showToast("Failed to approve", "error");
    }
  };

  const handleMarkPaid = async (c: Commission) => {
    try {
      await updateCommission(c.id, { status: "paid" });
      showToast("Commission marked as paid", "success");
    } catch {
      showToast("Failed to update", "error");
    }
  };

  return (
    <>
      <PageMeta title="Commissions | Optivax Sales" description="Track and manage sales commissions" />
      <PageBreadcrumb pageTitle="Commissions" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        {[
          { label: "Pending",  value: `$${totalPending.toLocaleString()}`,  color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Approved", value: `$${totalApproved.toLocaleString()}`, color: "text-blue-600 dark:text-blue-400" },
          { label: "Paid",     value: `$${totalPaid.toLocaleString()}`,     color: "text-green-600 dark:text-green-400" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isAdmin ? "All Commissions" : "My Commissions"}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="px-4 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap"
              >
                + Add Commission
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {[
                    ...(isAdmin ? ["Salesperson"] : []),
                    "Project", "Type", "Rate / Amount", "Commission", "Status", "Actions",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                      No commissions found.
                    </td>
                  </tr>
                )}
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {isAdmin && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400">
                            {c.userName.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{c.userName}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-40">
                      {c.projectName || "—"}
                      {c.notes && <div className="text-xs text-gray-400 truncate mt-0.5">{c.notes}</div>}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 capitalize">{c.type}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {c.type === "percentage" ? `${c.value}%` : `$${c.value.toLocaleString()}`}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      ${c.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[c.status]}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAdmin && c.status === "pending" && (
                          <button onClick={() => handleApprove(c)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs font-medium">
                            Approve
                          </button>
                        )}
                        {isAdmin && c.status === "approved" && (
                          <button onClick={() => handleMarkPaid(c)} className="text-green-600 hover:text-green-800 dark:text-green-400 text-xs font-medium">
                            Mark Paid
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => openEdit(c)} className="text-brand-600 hover:text-brand-800 dark:text-brand-400 text-xs font-medium">
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 text-xs font-medium">
                            Del
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-50 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? "Edit Commission" : "Add Commission"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salesperson *</label>
                <select
                  value={form.userId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  {SALES_USERS.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
                <input
                  type="text"
                  value={form.projectName}
                  onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Commission["type"] }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {form.type === "percentage" ? "Rate (%)" : "Fixed Value ($)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission Amount ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Commission["status"] }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
