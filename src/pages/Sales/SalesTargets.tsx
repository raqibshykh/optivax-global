import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getTargets, saveTargets, SALES_MEMBERS } from "../../mock/salesData";
import { SalesTarget } from "../../types";

const pctBarColor = (pct: number) =>
  pct >= 100 ? "bg-green-500" : pct >= 75 ? "bg-brand-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";

const pctTextColor = (pct: number) =>
  pct >= 100 ? "text-green-600 dark:text-green-400"
    : pct >= 75 ? "text-brand-600 dark:text-brand-400"
    : pct >= 50 ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400";

export default function SalesTargets() {
  const { user, canCreate, canEdit, checkPermission } = useAuth();
  const { showToast } = useToast();

  const isAdmin = checkPermission("sales", "APPROVE") || user?.role === "management";

  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesTarget | null>(null);
  const [form, setForm] = useState({
    memberId: SALES_MEMBERS[0]?.id || "",
    memberName: SALES_MEMBERS[0]?.name || "",
    period: "2026-Q3",
    monthlyTarget: 0,
    quarterlyTarget: 0,
    annualTarget: 0,
    achievedAmount: 0,
  });

  const loadData = () => {
    const all = getTargets();
    if (!isAdmin && user) {
      setTargets(all.filter(t => t.memberId === user.id));
    } else {
      setTargets(all);
    }
  };

  useEffect(() => { loadData(); }, [isAdmin, user?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      memberId: SALES_MEMBERS[0]?.id || "",
      memberName: SALES_MEMBERS[0]?.name || "",
      period: "2026-Q3",
      monthlyTarget: 0,
      quarterlyTarget: 0,
      annualTarget: 0,
      achievedAmount: 0,
    });
    setIsModalOpen(true);
  };

  const openEdit = (t: SalesTarget) => {
    setEditing(t);
    setForm({
      memberId: t.memberId,
      memberName: t.memberName,
      period: t.period,
      monthlyTarget: t.monthlyTarget,
      quarterlyTarget: t.quarterlyTarget,
      annualTarget: t.annualTarget,
      achievedAmount: t.achievedAmount,
    });
    setIsModalOpen(true);
  };

  const handleMemberChange = (id: string) => {
    const member = SALES_MEMBERS.find(m => m.id === id);
    setForm(f => ({ ...f, memberId: id, memberName: member?.name || id }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const all = getTargets();
    if (editing) {
      saveTargets(all.map(t =>
        t.id === editing.id
          ? { ...t, ...form, updatedAt: new Date().toISOString() }
          : t
      ));
      showToast("Target updated", "success");
    } else {
      const next: SalesTarget = {
        id: `st${Date.now()}`,
        ...form,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveTargets([...all, next]);
      showToast("Target assigned", "success");
    }
    setIsModalOpen(false);
    loadData();
  };

  const totalMonthly   = targets.reduce((s, t) => s + t.monthlyTarget, 0);
  const totalAchieved  = targets.reduce((s, t) => s + t.achievedAmount, 0);
  const totalRemaining = targets.reduce((s, t) => s + Math.max(0, t.monthlyTarget - t.achievedAmount), 0);
  const avgPct = targets.length > 0
    ? Math.round(targets.reduce((s, t) => s + (t.monthlyTarget > 0 ? (t.achievedAmount / t.monthlyTarget) * 100 : 0), 0) / targets.length)
    : 0;

  const numFields = [
    { key: "monthlyTarget",   label: "Monthly Target ($)" },
    { key: "quarterlyTarget", label: "Quarterly Target ($)" },
    { key: "annualTarget",    label: "Annual Target ($)" },
    { key: "achievedAmount",  label: "Achieved Amount ($)" },
  ] as const;

  return (
    <>
      <PageMeta title="Sales Targets | Optivax Sales" description="Track and manage sales targets" />
      <PageBreadcrumb pageTitle="Sales Targets" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { label: isAdmin ? "Team Monthly Target" : "Monthly Target", value: `$${totalMonthly.toLocaleString()}`, color: "text-gray-900 dark:text-white" },
          { label: "Achieved (MTD)",   value: `$${totalAchieved.toLocaleString()}`,  color: "text-green-500" },
          { label: "Remaining",        value: `$${totalRemaining.toLocaleString()}`, color: "text-red-500" },
          { label: "Avg Achievement",  value: `${avgPct}%`,                          color: pctTextColor(avgPct) },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Targets Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isAdmin ? "Team Sales Targets" : "My Sales Targets"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Period: {targets[0]?.period || "Q2 2026"}</p>
          </div>
          {isAdmin && canCreate("sales") && (
            <button onClick={openCreate} className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors">
              + Assign Target
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {[
                  ...(isAdmin ? ["Member"] : []),
                  "Monthly Target", "Achieved (MTD)", "Remaining", "Achievement", "Progress",
                  "Quarterly", "Annual",
                  ...(isAdmin ? ["Actions"] : []),
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {targets.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No targets assigned yet.
                  </td>
                </tr>
              )}
              {targets.map(t => {
                const pct = t.monthlyTarget > 0 ? Math.round((t.achievedAmount / t.monthlyTarget) * 100) : 0;
                const remaining = Math.max(0, t.monthlyTarget - t.achievedAmount);
                return (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {isAdmin && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400">
                            {t.memberName.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.memberName}</div>
                            <div className="text-xs text-gray-400">{t.period}</div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">${t.monthlyTarget.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">${t.achievedAmount.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">${remaining.toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-bold ${pctTextColor(pct)}`}>{pct}%</span>
                        {pct >= 100 && <span className="text-xs">🏆</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-28 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className={`h-2 rounded-full ${pctBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">${t.quarterlyTarget.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">${t.annualTarget.toLocaleString()}</td>
                    {isAdmin && (
                      <td className="px-4 py-4">
                        {canEdit("sales") && (
                          <button onClick={() => openEdit(t)} className="text-brand-600 hover:text-brand-800 dark:text-brand-400 text-xs font-medium">Edit</button>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-50 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? "Update Target" : "Assign Sales Target"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Member *</label>
                <select
                  required value={form.memberId}
                  onChange={e => handleMemberChange(e.target.value)}
                  disabled={!!editing}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60"
                >
                  {SALES_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period</label>
                <input
                  type="text" value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  placeholder="e.g. 2026-Q3"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              {numFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input
                    type="number" min="0" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">Save Target</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
