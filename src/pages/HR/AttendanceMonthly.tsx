import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  loadYearData,
  computeMonthlyReport,
  exportCSV,
  exportPrintHTML,
  STAFF_USERS,
  MONTHS,
  monthLabel,
  getAccessibleDepts,
  ROLE_TO_DEPT,
  DEPT_IDS,
  DEPT_LABELS,
  type MonthlyReport,
} from "../../mock/attendanceData";

type SortKey = keyof MonthlyReport;
type SortDir = "asc" | "desc";

const today    = new Date();
const CUR_YEAR  = today.getFullYear();
const CUR_MONTH = today.getMonth() + 1;

const YEAR_OPTIONS = [CUR_YEAR, CUR_YEAR - 1].filter((y) => y >= 2025);

const HEADERS: { label: string; key: SortKey; tip?: string }[] = [
  { label: "Employee",      key: "userName" },
  { label: "Working Days",  key: "totalWorkingDays",    tip: "Excl. weekends & holidays" },
  { label: "Present",       key: "presentDays",         tip: "Present + Late (counted as present)" },
  { label: "Absent",        key: "absentDays" },
  { label: "Leave Days",    key: "leaveDays",           tip: "All leaves (unpaid)" },
  { label: "Half Days",     key: "halfDays" },
  { label: "Late Arrivals", key: "lateArrivals" },
  { label: "Weekly Offs",   key: "weeklyOffDays" },
  { label: "Holidays",      key: "companyHolidayDays" },
  { label: "Attendance %",  key: "attendancePercentage" },
];

function pctColor(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-400 font-semibold";
  if (pct >= 75) return "text-yellow-600 dark:text-yellow-400 font-semibold";
  return "text-red-500 dark:text-red-400 font-semibold";
}

export default function AttendanceMonthly() {
  const { user, canView } = useAuth();
  const isAdmin  = canView("hr");
  const role     = user?.role ?? "";

  const accessibleDepts = useMemo(() => getAccessibleDepts(role), [role]);
  const canSeeDeptFilter = accessibleDepts === "all";

  const [selectedYear,  setSelectedYear]  = useState(CUR_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CUR_MONTH);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [empFilter,     setEmpFilter]     = useState("all");
  const [deptFilter,    setDeptFilter]    = useState("all");
  const [sortKey,       setSortKey]       = useState<SortKey>("userName");
  const [sortDir,       setSortDir]       = useState<SortDir>("asc");
  const [records,       setRecords]       = useState<ReturnType<typeof loadYearData>>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRecords(loadYearData(selectedYear));
      setLoading(false);
    }, 0);
  }, [selectedYear]);

  const visibleUsers = useMemo(() => {
    if (accessibleDepts !== "all") {
      const allowed = accessibleDepts as string[];
      return STAFF_USERS.filter((u) => {
        const d = (u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role] || "";
        return allowed.includes(d);
      });
    }
    if (!isAdmin && role === "hr_member") return STAFF_USERS.filter((u) => u.id === user?.id);
    return STAFF_USERS;
  }, [accessibleDepts, isAdmin, role, user]);

  const reports: MonthlyReport[] = useMemo(() => {
    return visibleUsers.map((u) =>
      computeMonthlyReport(u.id, u.name, u.role, selectedMonth, selectedYear, records)
    );
  }, [visibleUsers, selectedMonth, selectedYear, records]);

  const filtered = useMemo(() => {
    let list = reports;
    if (empFilter !== "all") list = list.filter((r) => r.userId === empFilter);
    if (deptFilter !== "all") {
      const deptUsers = new Set(
        STAFF_USERS.filter((u) => {
          const d = (u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role] || "";
          return d === deptFilter;
        }).map((u) => u.id)
      );
      list = list.filter((r) => deptUsers.has(r.userId));
    }
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
    const title = `Monthly_Attendance_${monthLabel(selectedMonth)}_${selectedYear}`;
    const heads = HEADERS.map((h) => h.label);
    const rows  = filtered.map((r) => [
      r.userName, r.totalWorkingDays, r.presentDays, r.absentDays,
      r.leaveDays, r.halfDays, r.lateArrivals,
      r.weeklyOffDays, r.companyHolidayDays, `${r.attendancePercentage}%`,
    ]);
    exportCSV(heads, rows, `${title}.csv`);
  };

  const handleExportPDF = () => {
    const title   = `Monthly Attendance Report — ${monthLabel(selectedMonth)} ${selectedYear}`;
    const thCells = HEADERS.map((h) => `<th>${h.label}</th>`).join("");
    const rows    = filtered.map((r) => `<tr>
      <td>${r.userName}<br/><small style="color:#777">${r.userRole.replace(/_/g," ")}</small></td>
      <td>${r.totalWorkingDays}</td>
      <td>${r.presentDays}</td>
      <td>${r.absentDays}</td>
      <td>${r.leaveDays}</td>
      <td>${r.halfDays}</td>
      <td>${r.lateArrivals}</td>
      <td>${r.weeklyOffDays}</td>
      <td>${r.companyHolidayDays}</td>
      <td><b>${r.attendancePercentage}%</b></td>
    </tr>`).join("");
    exportPrintHTML(title, `<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <span className="opacity-30 ml-0.5">↕</span>
      : sortDir === "asc" ? <span className="ml-0.5">↑</span>
      : <span className="ml-0.5">↓</span>;

  return (
    <>
      <PageMeta title="Monthly Attendance Report | Optivax HR" description="Monthly attendance summary" />
      <PageBreadcrumb pageTitle="Monthly Attendance Report" />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Month</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Employees",        value: filtered.length,                                                                     color: "text-brand-600 dark:text-brand-400" },
            { label: "Avg Present Days", value: (filtered.reduce((s,r)=>s+r.presentDays,0)/filtered.length).toFixed(1),             color: "text-green-600 dark:text-green-400" },
            { label: "Avg Attendance %", value: `${(filtered.reduce((s,r)=>s+r.attendancePercentage,0)/filtered.length).toFixed(1)}%`, color: "text-blue-600 dark:text-blue-400" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
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
              {monthLabel(selectedMonth)} {selectedYear} — Attendance Report
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
                      No records found for the selected period.
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
                        {r.presentDays}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.absentDays > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "text-gray-400"}`}>
                        {r.absentDays}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={r.leaveDays > 0 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-400"}>
                        {r.leaveDays}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{r.halfDays}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={r.lateArrivals > 0 ? "text-yellow-600 dark:text-yellow-400 font-medium" : "text-gray-400"}>
                        {r.lateArrivals}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-400">{r.weeklyOffDays}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{r.companyHolidayDays}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm ${pctColor(r.attendancePercentage)}`}>{r.attendancePercentage}%</span>
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${r.attendancePercentage >= 90 ? "bg-green-500" : r.attendancePercentage >= 75 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(r.attendancePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
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
                      filtered.reduce((s,r)=>s+r.presentDays,0),
                      filtered.reduce((s,r)=>s+r.absentDays,0),
                      filtered.reduce((s,r)=>s+r.leaveDays,0),
                      filtered.reduce((s,r)=>s+r.halfDays,0),
                      filtered.reduce((s,r)=>s+r.lateArrivals,0),
                    ].map((v, i) => (
                      <td key={i} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">{v}</td>
                    ))}
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-center text-xs font-bold text-brand-600 dark:text-brand-400">
                      {(filtered.reduce((s,r)=>s+r.attendancePercentage,0)/filtered.length).toFixed(1)}%
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
          { label: "Present = On-time + Late (both count as present)", color: "bg-green-500" },
          { label: "Leave = All leave types (all unpaid)", color: "bg-blue-500" },
          { label: "% = (Present + Half×0.5) ÷ Working Days", color: "bg-brand-500" },
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
