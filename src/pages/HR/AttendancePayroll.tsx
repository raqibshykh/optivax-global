import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  loadYearData,
  computeMonthlyReport,
  computePayrollEntry,
  exportCSV,
  exportPrintHTML,
  fmtRs,
  STAFF_USERS,
  MONTHS,
  monthLabel,
  getAccessibleDepts,
  ROLE_TO_DEPT,
  DEPT_IDS,
  DEPT_LABELS,
  type PayrollEntry,
} from "../../mock/attendanceData";

const TODAY     = new Date();
const CUR_YEAR  = TODAY.getFullYear();
const CUR_MONTH = TODAY.getMonth() + 1;
const YEAR_OPTIONS = [CUR_YEAR, CUR_YEAR - 1].filter((y) => y >= 2025);

type SortKey = keyof PayrollEntry;
type SortDir = "asc" | "desc";

function DeductionBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  return <span className="text-red-600 dark:text-red-400 font-medium">−{fmtRs(value)}</span>;
}

export default function AttendancePayroll() {
  const { user } = useAuth();
  const role     = user?.role ?? "";

  const accessibleDepts = useMemo(() => getAccessibleDepts(role), [role]);
  const canSeePayroll   = ["super_admin", "management", "hr_admin"].includes(role);

  const [year,       setYear]       = useState(CUR_YEAR);
  const [month,      setMonth]      = useState(CUR_MONTH);
  const [deptFilter, setDeptFilter] = useState("all");
  const [search,     setSearch]     = useState("");
  const [sortKey,    setSortKey]    = useState<SortKey>("userName");
  const [sortDir,    setSortDir]    = useState<SortDir>("asc");
  const [records,    setRecords]    = useState<ReturnType<typeof loadYearData>>([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setLoading(true);
    setTimeout(() => { setRecords(loadYearData(year)); setLoading(false); }, 0);
  }, [year]);

  useEffect(() => { setPage(1); }, [deptFilter, search, month, year]);

  const visibleUsers = useMemo(() => {
    const depts: string[] = deptFilter !== "all" ? [deptFilter]
      : accessibleDepts === "all" ? DEPT_IDS : (accessibleDepts as string[]);
    return STAFF_USERS.filter((u) => {
      const d = (u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role] || "";
      return depts.length === 0 || depts.includes(d);
    });
  }, [accessibleDepts, deptFilter]);

  const payrollEntries = useMemo<PayrollEntry[]>(() => {
    return visibleUsers.map((u) => {
      const report = computeMonthlyReport(u.id, u.name, u.role, month, year, records);
      return computePayrollEntry(report);
    });
  }, [visibleUsers, month, year, records]);

  const filtered = useMemo(() => {
    let list = payrollEntries;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.userName.toLowerCase().includes(q) || e.userRole.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [payrollEntries, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => ({
    baseSalary:         filtered.reduce((s, e) => s + e.baseSalary, 0),
    totalLeaveDeduction: filtered.reduce((s, e) => s + e.totalLeaveDeduction, 0),
    latePenalty:        filtered.reduce((s, e) => s + e.latePenalty, 0),
    totalDeductions:    filtered.reduce((s, e) => s + e.totalDeductions, 0),
    netPayable:         filtered.reduce((s, e) => s + e.netPayable, 0),
    leaveDeduction:     filtered.reduce((s, e) => s + e.leaveDeduction, 0),
    halfDayDeduction:   filtered.reduce((s, e) => s + e.halfDayDeduction, 0),
  }), [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <span className="opacity-30 ml-0.5">↕</span>
      : sortDir === "asc" ? <span className="ml-0.5">↑</span> : <span className="ml-0.5">↓</span>;

  const handleExportCSV = () => {
    const heads = [
      "Employee", "Role", "Base Salary", "Absent Days", "Leave Days", "Half Days",
      "Leave Deduction", "Half Day Deduction", "Total Leave Deduction",
      "Late Arrivals", "Late Penalty Days", "Late Penalty",
      "Total Deductions", "Net Payable",
    ];
    const rows = filtered.map((e) => [
      e.userName, e.userRole, e.baseSalary,
      e.absentDays, e.leaveDays, e.halfDays,
      e.leaveDeduction, e.halfDayDeduction, e.totalLeaveDeduction,
      e.lateArrivals, e.latePenaltyDays, e.latePenalty,
      e.totalDeductions, e.netPayable,
    ]);
    exportCSV(heads, rows, `Payroll_${monthLabel(month)}_${year}.csv`);
  };

  const handleExportPDF = () => {
    const title   = `Payroll Report — ${monthLabel(month)} ${year}`;
    const heads   = ["Employee", "Base Salary", "Leave Ded.", "Half Day Ded.", "Late Penalty", "Total Ded.", "Net Payable"];
    const thRow   = heads.map((h) => `<th>${h}</th>`).join("");
    const rows    = filtered.map((e) => `<tr>
      <td>${e.userName}<br/><small style="color:#777">${e.userRole.replace(/_/g," ")}</small></td>
      <td>${fmtRs(e.baseSalary)}</td>
      <td style="color:#dc2626">${e.leaveDeduction > 0 ? "−"+fmtRs(e.leaveDeduction) : "—"}</td>
      <td style="color:#dc2626">${e.halfDayDeduction > 0 ? "−"+fmtRs(e.halfDayDeduction) : "—"}</td>
      <td style="color:#d97706">${e.latePenalty > 0 ? "−"+fmtRs(e.latePenalty)+" (${e.latePenaltyDays}d)" : "—"}</td>
      <td style="color:#dc2626"><b>${e.totalDeductions > 0 ? "−"+fmtRs(e.totalDeductions) : "—"}</b></td>
      <td><b>${fmtRs(e.netPayable)}</b></td>
    </tr>`).join("");
    exportPrintHTML(title, `<table><thead><tr>${thRow}</tr></thead><tbody>${rows}</tbody></table>`);
  };

  if (!canSeePayroll) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400 text-sm">
        You don't have permission to view payroll data.
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Payroll Integration | Optivax HR" description="Attendance-based payroll calculations" />
      <PageBreadcrumb pageTitle="Payroll Integration" />

      {/* ── Policy banner ───────────────────────────────────────────────────── */}
      <div className="mb-5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-4 py-3 flex gap-3 items-start">
        <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd"/></svg>
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Policy:</strong> Every leave day (including absent) = 1 full day salary deducted · Half day = 0.5 day · Every 3 late arrivals = 1 full day deducted · All leaves are unpaid.
          &nbsp;<strong>Formula:</strong> Net Payable = Basic Salary − Leave Deductions − Late Penalty
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {accessibleDepts === "all" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Department</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
              <option value="all">All Departments</option>
              {DEPT_IDS.map((d) => <option key={d} value={d}>{DEPT_LABELS[d]}</option>)}
            </select>
          </div>
        )}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
          <input type="text" placeholder="Search employee…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3v10m0 0-3-3m3 3 3-3M3 17h14" strokeLinecap="round"/></svg>
            Excel
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4" strokeLinecap="round"/></svg>
            PDF
          </button>
        </div>
      </div>

      {/* ── KPI Summary ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Payroll",         value: fmtRs(totals.baseSalary),          color: "text-brand-600 dark:text-brand-400" },
          { label: "Total Leave Deductions", value: fmtRs(totals.totalLeaveDeduction), color: "text-red-600 dark:text-red-400" },
          { label: "Total Late Penalties",   value: fmtRs(totals.latePenalty),         color: "text-orange-600 dark:text-orange-400" },
          { label: "Net Payable",            value: fmtRs(totals.netPayable),          color: "text-gray-900 dark:text-white" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{c.label}</p>
            <p className={`mt-1 text-base font-bold leading-tight ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Breakdown cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Unpaid Leave Deduction", value: fmtRs(totals.leaveDeduction),   color: "text-red-600 dark:text-red-400",    tip: "(Leave + Absent days) × daily rate — every day unpaid" },
          { label: "Half Day Deduction",     value: fmtRs(totals.halfDayDeduction), color: "text-orange-500",                   tip: "Half days × 0.5 × daily rate" },
          { label: "Late Penalties (÷3=1d)", value: fmtRs(totals.latePenalty),      color: "text-orange-600 dark:text-orange-400", tip: "Every 3 late arrivals = 1 full day deduction" },
          { label: "Total Deductions",       value: fmtRs(totals.totalDeductions),  color: "text-red-700 dark:text-red-300",    tip: "Leave + Half-day + Late penalty" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900" title={c.tip}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-1 text-sm font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {monthLabel(month)} {year} — Payroll Breakdown
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {filtered.length} employees · page {page}/{totalPages || 1}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {[
                    { label: "Employee",          key: "userName" as SortKey },
                    { label: "Base Salary",        key: "baseSalary" as SortKey },
                    { label: "Daily Rate",         key: "dailyRate" as SortKey },
                    { label: "Unpaid Leave Ded.",  key: "leaveDeduction" as SortKey },
                    { label: "Half Day Ded.",      key: "halfDayDeduction" as SortKey },
                    { label: "Late (×3=1d)",       key: "lateArrivals" as SortKey },
                    { label: "Late Penalty",       key: "latePenalty" as SortKey },
                    { label: "Total Deductions",   key: "totalDeductions" as SortKey },
                    { label: "Net Payable",        key: "netPayable" as SortKey },
                  ].map((h) => (
                    <th key={h.key} onClick={() => toggleSort(h.key)}
                      className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                      {h.label}<SortIcon k={h.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginated.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-400">No payroll data found.</td></tr>
                ) : paginated.map((e) => (
                  <tr key={e.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{e.userName}</div>
                      <div className="text-xs text-gray-400">{e.userRole.replace(/_/g," ")}</div>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{fmtRs(e.baseSalary)}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtRs(e.dailyRate)}/d</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <DeductionBadge value={e.leaveDeduction} />
                      {(e.absentDays + e.leaveDays) > 0 && (
                        <div className="text-[10px] text-gray-400 mt-0.5">{e.absentDays}ab+{e.leaveDays}lv</div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <DeductionBadge value={e.halfDayDeduction} />
                      {e.halfDays > 0 && <div className="text-[10px] text-gray-400 mt-0.5">{e.halfDays}×½d</div>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <span className={e.lateArrivals > 0 ? "text-yellow-600 dark:text-yellow-400 font-medium" : "text-gray-400"}>
                        {e.lateArrivals}
                      </span>
                      {e.lateArrivals >= 3 && (
                        <div className="text-[10px] text-orange-500">={e.latePenaltyDays}d ded.</div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {e.latePenalty > 0
                        ? <span className="text-orange-500 font-medium">−{fmtRs(e.latePenalty)}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`font-semibold ${e.totalDeductions > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                        {e.totalDeductions > 0 ? `−${fmtRs(e.totalDeductions)}` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-bold text-gray-900 dark:text-white">{fmtRs(e.netPayable)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 1 && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-300 dark:border-gray-600">
                    <td className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Totals</td>
                    <td className="px-3 py-3 font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap text-sm">{fmtRs(totals.baseSalary)}</td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-red-600 dark:text-red-400 font-bold text-xs whitespace-nowrap">−{fmtRs(totals.leaveDeduction)}</td>
                    <td className="px-3 py-3 text-red-600 dark:text-red-400 font-bold text-xs whitespace-nowrap">−{fmtRs(totals.halfDayDeduction)}</td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-orange-500 font-bold text-xs whitespace-nowrap">−{fmtRs(totals.latePenalty)}</td>
                    <td className="px-3 py-3 text-red-600 dark:text-red-400 font-bold text-xs whitespace-nowrap">−{fmtRs(totals.totalDeductions)}</td>
                    <td className="px-3 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmtRs(totals.netPayable)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${pg === page ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">›</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
