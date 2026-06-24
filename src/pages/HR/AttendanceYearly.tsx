import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  loadYearData,
  computeYearlyReport,
  exportCSV,
  exportPrintHTML,
  STAFF_USERS,
  getAccessibleDepts,
  ROLE_TO_DEPT,
  DEPT_IDS,
  DEPT_LABELS,
  type YearlyReport,
} from "../../mock/attendanceData";

type SortKey = keyof YearlyReport;
type SortDir = "asc" | "desc";

const CUR_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CUR_YEAR, CUR_YEAR - 1].filter((y) => y >= 2025);

const HEADERS: { label: string; key: SortKey; tip?: string }[] = [
  { label: "Employee",      key: "userName" },
  { label: "Working Days",  key: "totalWorkingDays",          tip: "Excl. weekends & holidays" },
  { label: "Present Days",  key: "totalPresentDays",          tip: "Present + Late" },
  { label: "Absent Days",   key: "totalAbsentDays" },
  { label: "Leave Days",    key: "totalLeaveDays",            tip: "All leaves (all unpaid)" },
  { label: "Half Days",     key: "totalHalfDays" },
  { label: "Late Arrivals", key: "totalLateArrivals" },
  { label: "Annual Att. %", key: "annualAttendancePercentage" },
];

function pctColor(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-400 font-bold";
  if (pct >= 75) return "text-yellow-600 dark:text-yellow-400 font-bold";
  return "text-red-500 dark:text-red-400 font-bold";
}

function PctBadge({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-green-500" : pct >= 75 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      <span className={`text-sm ${pctColor(pct)}`}>{pct}%</span>
      <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function AttendanceYearly() {
  const { user, canView } = useAuth();
  const isAdmin = canView("hr");

  const [selectedYear, setSelectedYear] = useState(CUR_YEAR);
  const [deptFilter,   setDeptFilter]   = useState("all");
  const [empFilter,    setEmpFilter]    = useState("all");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [sortKey,      setSortKey]      = useState<SortKey>("userName");
  const [sortDir,      setSortDir]      = useState<SortDir>("asc");
  const [records,      setRecords]      = useState<ReturnType<typeof loadYearData>>([]);
  const [loading,      setLoading]      = useState(true);

  const accessibleDepts = useMemo(() => {
    if (!user) return [] as string[];
    return getAccessibleDepts(user.role);
  }, [user]);

  const canSeeDeptFilter = useMemo(() => {
    return isAdmin && accessibleDepts === "all";
  }, [isAdmin, accessibleDepts]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRecords(loadYearData(selectedYear));
      setLoading(false);
    }, 0);
  }, [selectedYear]);

  const visibleUsers = useMemo(() => {
    if (!isAdmin) return STAFF_USERS.filter((u) => u.id === user?.id);
    if (accessibleDepts === "all") return STAFF_USERS;
    const myDept = user ? ((user as { departmentId?: string }).departmentId || ROLE_TO_DEPT[user.role] || "") : "";
    return STAFF_USERS.filter((u) => ((u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role]) === myDept);
  }, [isAdmin, user, accessibleDepts]);

  const reports: YearlyReport[] = useMemo(() => {
    return visibleUsers.map((u) =>
      computeYearlyReport(u.id, u.name, u.role, selectedYear, records)
    );
  }, [visibleUsers, selectedYear, records]);

  const filtered = useMemo(() => {
    let list = reports;
    if (deptFilter !== "all") {
      const deptUsers = new Set(
        STAFF_USERS
          .filter((u) => ((u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role]) === deptFilter)
          .map((u) => u.id)
      );
      list = list.filter((r) => deptUsers.has(r.userId));
    }
    if (empFilter !== "all") list = list.filter((r) => r.userId === empFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => r.userName.toLowerCase().includes(q) || r.userRole.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [reports, empFilter, deptFilter, searchQuery, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleExportCSV = () => {
    const heads = HEADERS.map((h) => h.label);
    const rows  = filtered.map((r) => [
      r.userName, r.totalWorkingDays, r.totalPresentDays, r.totalAbsentDays,
      r.totalLeaveDays, r.totalHalfDays, r.totalLateArrivals,
      `${r.annualAttendancePercentage}%`,
    ]);
    exportCSV(heads, rows, `Annual_Attendance_${selectedYear}.csv`);
  };

  const handleExportPDF = () => {
    const title   = `Annual Attendance Report — ${selectedYear}`;
    const thCells = HEADERS.map((h) => `<th>${h.label}</th>`).join("");
    const rows    = filtered.map((r) => `<tr>
      <td>${r.userName}<br/><small style="color:#777">${r.userRole.replace(/_/g," ")}</small></td>
      <td>${r.totalWorkingDays}</td><td>${r.totalPresentDays}</td><td>${r.totalAbsentDays}</td>
      <td>${r.totalLeaveDays}</td><td>${r.totalHalfDays}</td><td>${r.totalLateArrivals}</td>
      <td><b>${r.annualAttendancePercentage}%</b></td>
    </tr>`).join("");
    exportPrintHTML(title, `<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <span className="opacity-30 ml-0.5">↕</span>
      : sortDir === "asc" ? <span className="ml-0.5">↑</span>
      : <span className="ml-0.5">↓</span>;

  return (
    <>
      <PageMeta title="Yearly Attendance Report | Optivax HR" description="Annual attendance summary" />
      <PageBreadcrumb pageTitle="Yearly Attendance Report" />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {canSeeDeptFilter && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Department</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
              <option value="all">All Departments</option>
              {DEPT_IDS.map((d) => <option key={d} value={d}>{DEPT_LABELS[d]}</option>)}
            </select>
          </div>
        )}
        {(isAdmin || accessibleDepts !== "all") && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Employee</label>
            <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
              <option value="all">All Employees</option>
              {visibleUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
        {(isAdmin || accessibleDepts !== "all") && (
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <input type="text" placeholder="Search by name or role…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3v10m0 0-3-3m3 3 3-3M3 17h14" strokeLinecap="round"/></svg>
            Export Excel
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4" strokeLinecap="round"/></svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Summary KPIs ─────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Employees",         value: filtered.length,                                                                              color: "text-brand-600 dark:text-brand-400" },
            { label: "Avg Present Days",  value: (filtered.reduce((s,r)=>s+r.totalPresentDays,0)/filtered.length).toFixed(1),                 color: "text-green-600 dark:text-green-400" },
            { label: "Total Leave Days",  value: filtered.reduce((s,r)=>s+r.totalLeaveDays,0),                                                color: "text-blue-600 dark:text-blue-400" },
            { label: "Avg Annual Att. %", value: `${(filtered.reduce((s,r)=>s+r.annualAttendancePercentage,0)/filtered.length).toFixed(1)}%`, color: "text-brand-600 dark:text-brand-400" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{c.label}</p>
              <p className={`mt-1 text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedYear} — Annual Attendance Summary
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {filtered.length} {filtered.length === 1 ? "employee" : "employees"} · click column header to sort
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
                  {HEADERS.map((h) => (
                    <th key={h.key} onClick={() => toggleSort(h.key)} title={h.tip}
                      className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                      {h.label}<SortIcon k={h.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={HEADERS.length} className="px-6 py-12 text-center text-sm text-gray-400">
                      No records found for the selected year.
                    </td>
                  </tr>
                ) : filtered.map((r) => (
                  <tr key={r.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{r.userName}</div>
                      <div className="text-xs text-gray-400">{r.userRole.replace(/_/g, " ")}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-gray-800 dark:text-gray-200">{r.totalWorkingDays}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium">
                        {r.totalPresentDays}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.totalAbsentDays > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "text-gray-400"}`}>
                        {r.totalAbsentDays}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={r.totalLeaveDays > 0 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-400"}>
                        {r.totalLeaveDays}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{r.totalHalfDays}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={r.totalLateArrivals > 0 ? "text-yellow-600 dark:text-yellow-400 font-medium" : "text-gray-400"}>
                        {r.totalLateArrivals}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <PctBadge pct={r.annualAttendancePercentage} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 1 && isAdmin && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-300 dark:border-gray-600">
                    <td className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Totals / Avg</td>
                    <td className="px-3 py-3" />
                    {[
                      filtered.reduce((s,r)=>s+r.totalPresentDays,0),
                      filtered.reduce((s,r)=>s+r.totalAbsentDays,0),
                      filtered.reduce((s,r)=>s+r.totalLeaveDays,0),
                      filtered.reduce((s,r)=>s+r.totalHalfDays,0),
                      filtered.reduce((s,r)=>s+r.totalLateArrivals,0),
                    ].map((v, i) => (
                      <td key={i} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">{v}</td>
                    ))}
                    <td className="px-3 py-3 text-center text-xs font-bold text-brand-600 dark:text-brand-400">
                      {(filtered.reduce((s,r)=>s+r.annualAttendancePercentage,0)/filtered.length).toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {[
          { label: "Present = On-time + Late",                       color: "bg-green-500" },
          { label: "Leave = All leave types (all unpaid)",           color: "bg-blue-500" },
          { label: "Annual % = (Present + Half×0.5) ÷ Working Days", color: "bg-brand-500" },
          { label: "YTD — data up to today for the current year",    color: "bg-gray-400" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>
    </>
  );
}
