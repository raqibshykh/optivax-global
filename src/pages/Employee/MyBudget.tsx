import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { getBudgets, getBudgetStats, type Budget, type BudgetStatus } from "../../mock/budgetData";

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

const STATUS_STYLE: Record<BudgetStatus, string> = {
  active:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  overspent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function ProgressBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const bar =
    pct >= 100 ? "bg-red-500" :
    pct >= 85  ? "bg-orange-400" :
    pct >= 60  ? "bg-yellow-400" : "bg-green-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>Consumed {pct}%</span>
        <span>{fmtRs(used)} of {fmtRs(total)}</span>
      </div>
      <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`${bar} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  const remaining = budget.totalBudget - budget.usedBudget;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-400 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">Budget Assigned</p>
            <h3 className="text-base font-bold leading-snug">{budget.name}</h3>
            {budget.purpose && (
              <p className="text-sm opacity-90 mt-0.5 font-medium">{budget.purpose}</p>
            )}
          </div>
          <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/20 border border-white/30`}>
            {budget.status}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Amount summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
            <p className="text-[11px] text-gray-400 mb-1">Total</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtRs(budget.totalBudget)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
            <p className="text-[11px] text-gray-400 mb-1">Used</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmtRs(budget.usedBudget)}</p>
          </div>
          <div className={`rounded-xl p-3 ${remaining < 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
            <p className="text-[11px] text-gray-400 mb-1">Remaining</p>
            <p className={`text-sm font-bold ${remaining < 0 ? "text-red-600" : "text-green-600 dark:text-green-400"}`}>{fmtRs(remaining)}</p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar used={budget.usedBudget} total={budget.totalBudget} />

        {/* Details */}
        <div className="space-y-2.5 text-sm">
          {budget.description && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">Description</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{budget.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Detail label="Assigned By" value={budget.assignedByName} />
            <Detail label="Department" value={budget.department} />
            {budget.allocationDate && (
              <Detail label="Allocation Date" value={new Date(budget.allocationDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} />
            )}
            <Detail label="Fiscal Year" value={budget.fiscalYear} />
            {budget.projectName && <Detail label="Project" value={budget.projectName} />}
            {budget.taskName && <Detail label="Task" value={budget.taskName} />}
          </div>

          {budget.notes && (
            <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm">{budget.notes}</p>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[budget.status]}`}>
            {budget.status.charAt(0).toUpperCase() + budget.status.slice(1)}
          </span>
          <span className="text-xs text-gray-400">Updated {new Date(budget.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
    </div>
  );
}

export default function MyBudget() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    const all = getBudgets();
    setBudgets(all.filter(b => b.assignedToId === user?.id));
  }, [user?.id]);

  const stats = useMemo(() => getBudgetStats(budgets), [budgets]);

  return (
    <>
      <PageMeta title="My Budget | Optivax Global" description="View budgets assigned to you" />
      <PageBreadcrumb pageTitle="My Budget" />

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="text-5xl mb-4">💰</div>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No budgets assigned</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-sm text-center">
            Budgets assigned to you by your manager will appear here with full allocation details.
          </p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Assigned",  value: fmtRs(stats.total),     color: "text-gray-900 dark:text-white" },
              { label: "Total Consumed",  value: fmtRs(stats.used),      color: "text-blue-600 dark:text-blue-400" },
              { label: "Total Remaining", value: fmtRs(stats.remaining), color: stats.remaining < 0 ? "text-red-600" : "text-green-600 dark:text-green-400" },
              { label: "Utilization",     value: `${stats.utilPct}%`,    color: stats.utilPct >= 90 ? "text-red-600" : stats.utilPct >= 70 ? "text-yellow-600" : "text-green-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {budgets.map(b => <BudgetCard key={b.id} budget={b} />)}
          </div>
        </>
      )}
    </>
  );
}
