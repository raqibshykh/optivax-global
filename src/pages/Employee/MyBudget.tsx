import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { getMemberAllocation, type MemberAllocation } from "../../mock/budgetData";

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

function ProgressBar({ used, total }: { used: number; total: number }) {
  const pct   = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-orange-400" : pct >= 60 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>Consumed {pct}%</span>
        <span>{fmtRs(used)} of {fmtRs(total)}</span>
      </div>
      <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`${color} h-3 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
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

function AllocationCard({ alloc }: { alloc: MemberAllocation }) {
  const remaining = alloc.allocatedAmount - alloc.usedAmount;
  const pct       = alloc.allocatedAmount > 0 ? Math.round((alloc.usedAmount / alloc.allocatedAmount) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-brand-600 to-brand-400 px-5 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">Budget Assigned</p>
        <p className="text-2xl font-bold">{fmtRs(alloc.allocatedAmount)}</p>
        <p className="text-xs opacity-75 mt-1">{alloc.department} Department</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
            <p className="text-[11px] text-gray-400 mb-1">Total</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtRs(alloc.allocatedAmount)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
            <p className="text-[11px] text-gray-400 mb-1">Used</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmtRs(alloc.usedAmount)}</p>
          </div>
          <div className={`rounded-xl p-3 ${remaining < 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
            <p className="text-[11px] text-gray-400 mb-1">Remaining</p>
            <p className={`text-sm font-bold ${remaining < 0 ? "text-red-600" : "text-green-600 dark:text-green-400"}`}>{fmtRs(remaining)}</p>
          </div>
        </div>

        <ProgressBar used={alloc.usedAmount} total={alloc.allocatedAmount} />

        <div className="grid grid-cols-2 gap-2">
          <Detail label="Allocated By"   value={alloc.allocatedByName} />
          <Detail label="Department"     value={alloc.department} />
          <Detail label="Allocation Date" value={new Date(alloc.allocatedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} />
          <Detail label="Utilization"    value={`${pct}%`} />
        </div>

        {pct >= 85 && (
          <div className={`p-3 rounded-xl text-sm ${pct >= 100 ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400"}`}>
            {pct >= 100 ? "Budget fully utilized. Contact your manager for a top-up." : "You have used more than 85% of your budget. Plan spending carefully."}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyBudget() {
  const { user } = useAuth();
  const [alloc, setAlloc] = useState<MemberAllocation | null>(null);

  useEffect(() => {
    if (user?.id) setAlloc(getMemberAllocation(user.id) ?? null);
  }, [user?.id]);

  return (
    <>
      <PageMeta title="My Budget | Optivax Global" description="View the budget assigned to you" />
      <PageBreadcrumb pageTitle="My Budget" />

      {!alloc ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="text-5xl mb-4">💰</div>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No budget assigned yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-sm text-center">
            Your department admin will allocate a budget to you. It will appear here once assigned.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Assigned",  value: fmtRs(alloc.allocatedAmount),                    color: "text-gray-900 dark:text-white" },
              { label: "Used",            value: fmtRs(alloc.usedAmount),                          color: "text-blue-600 dark:text-blue-400" },
              { label: "Remaining",       value: fmtRs(alloc.allocatedAmount - alloc.usedAmount),  color: alloc.usedAmount > alloc.allocatedAmount ? "text-red-600" : "text-green-600 dark:text-green-400" },
              { label: "Utilization",     value: `${alloc.allocatedAmount > 0 ? Math.round((alloc.usedAmount / alloc.allocatedAmount) * 100) : 0}%`, color: "text-brand-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="max-w-xl">
            <AllocationCard alloc={alloc} />
          </div>
        </>
      )}
    </>
  );
}
