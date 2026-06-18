import React, { useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { getCampaigns, getTargets, getSalesTasks, SALES_MEMBERS } from "../../mock/salesData";

const pctBarColor = (pct: number) =>
  pct >= 100 ? "bg-green-500" : pct >= 75 ? "bg-brand-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";

const pctTextColor = (pct: number) =>
  pct >= 100 ? "text-green-600 dark:text-green-400"
    : pct >= 75 ? "text-brand-600 dark:text-brand-400"
    : pct >= 50 ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400";

export default function TeamPerformance() {
  const { user, checkPermission } = useAuth();
  const isAdmin = checkPermission("sales", "APPROVE") || user?.role === "management";

  const campaigns = useMemo(() => getCampaigns(), []);
  const targets   = useMemo(() => getTargets(), []);
  const tasks     = useMemo(() => getSalesTasks(), []);

  // KPIs
  const teamRevenue   = targets.reduce((s, t) => s + t.achievedAmount, 0);
  const teamTarget    = targets.reduce((s, t) => s + t.monthlyTarget, 0);
  const teamPct       = teamTarget > 0 ? Math.round((teamRevenue / teamTarget) * 100) : 0;
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalBudget   = campaigns.reduce((s, c) => s + c.totalBudget, 0);
  const totalSpent    = campaigns.reduce((s, c) => s + c.budgetSpent, 0);
  const budgetUtilPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const activeTasks   = tasks.filter(t => t.status === "in-progress" || t.status === "todo").length;
  const doneTasks     = tasks.filter(t => t.status === "done").length;
  const blockedTasks  = tasks.filter(t => t.status === "blocked").length;

  // Per-member performance
  const memberStats = SALES_MEMBERS.map(m => {
    const target = targets.find(t => t.memberId === m.id);
    const myTasks = tasks.filter(t => t.assignedTo === m.id);
    const done    = myTasks.filter(t => t.status === "done").length;
    const active  = myTasks.filter(t => t.status === "in-progress").length;
    const blocked = myTasks.filter(t => t.status === "blocked").length;
    const pct = target && target.monthlyTarget > 0
      ? Math.round((target.achievedAmount / target.monthlyTarget) * 100)
      : 0;
    const pipelineValue = myTasks
      .filter(t => t.status !== "done")
      .reduce((s, t) => s + t.estimatedValue, 0);
    return {
      ...m,
      achieved: target?.achievedAmount || 0,
      monthly:  target?.monthlyTarget || 0,
      pct,
      myTasks:  myTasks.length,
      done,
      active,
      blocked,
      pipelineValue,
    };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <>
      <PageMeta title="Team Performance | Optivax Sales" description="Sales team performance dashboard" />
      <PageBreadcrumb pageTitle="Team Performance" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Team Revenue (MTD)",
            value: `$${teamRevenue.toLocaleString()}`,
            sub:   `Target $${teamTarget.toLocaleString()}`,
            pct:   teamPct,
            color: pctTextColor(teamPct),
          },
          {
            label: "Target Achievement",
            value: `${teamPct}%`,
            sub:   teamPct >= 100 ? "Goal reached!" : `${100 - teamPct}% remaining`,
            pct:   teamPct,
            color: pctTextColor(teamPct),
          },
          {
            label: "Budget Utilization",
            value: `${budgetUtilPct}%`,
            sub:   `$${totalSpent.toLocaleString()} of $${totalBudget.toLocaleString()}`,
            pct:   budgetUtilPct,
            color: budgetUtilPct >= 90 ? "text-red-600 dark:text-red-400" : budgetUtilPct >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400",
          },
          {
            label: "Active Campaigns",
            value: String(activeCampaigns),
            sub:   `${campaigns.length} total campaigns`,
            pct:   null,
            color: "text-brand-600 dark:text-brand-400",
          },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            {card.pct !== null && (
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${pctBarColor(card.pct)}`} style={{ width: `${Math.min(card.pct, 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Task Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Active Tasks",   value: activeTasks,  color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-900/10" },
          { label: "Completed Tasks", value: doneTasks,   color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/10" },
          { label: "Blocked Tasks",  value: blockedTasks, color: "text-red-600 dark:text-red-400",   bg: "bg-red-50 dark:bg-red-900/10" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-gray-200 dark:border-gray-800 ${s.bg} p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Member Leaderboard */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performers</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ranked by monthly target achievement</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Rank", "Sales Rep", "Revenue (MTD)", "Target", "Achievement", "Progress",
                  "Tasks Done", "Active", "Blocked", "Pipeline Value"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {memberStats.map((m, i) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-4">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : i === 1 ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    }`}>
                      {i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400">
                        {m.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                    ${m.achieved.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    ${m.monthly.toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-sm font-bold ${pctTextColor(m.pct)}`}>{m.pct}%</span>
                    {m.pct >= 100 && <span className="ml-1 text-xs">🏆</span>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-28 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className={`h-2 rounded-full ${pctBarColor(m.pct)}`} style={{ width: `${Math.min(m.pct, 100)}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-green-600 dark:text-green-400 font-medium text-center">{m.done}</td>
                  <td className="px-4 py-4 text-sm text-blue-600 dark:text-blue-400 font-medium text-center">{m.active}</td>
                  <td className="px-4 py-4 text-sm text-red-500 font-medium text-center">{m.blocked || "—"}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {m.pipelineValue > 0 ? `$${m.pipelineValue.toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Budget Performance</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {campaigns.map(c => {
            const utilPct = c.totalBudget > 0 ? Math.round((c.budgetSpent / c.totalBudget) * 100) : 0;
            const remaining = c.totalBudget - c.budgetSpent;
            const barColor = utilPct >= 90 ? "bg-red-500" : utilPct >= 70 ? "bg-yellow-500" : "bg-green-500";
            const statusColors: Record<string, string> = {
              active:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              planned:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
              paused:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            };
            return (
              <div key={c.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.campaignName}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[c.status]}`}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Spent: <span className="font-semibold text-gray-700 dark:text-gray-300">${c.budgetSpent.toLocaleString()}</span></span>
                    <span>Budget: <span className="font-semibold text-gray-700 dark:text-gray-300">${c.totalBudget.toLocaleString()}</span></span>
                    <span>Remaining: <span className={`font-semibold ${remaining < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>${Math.abs(remaining).toLocaleString()}</span></span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{utilPct}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
