import React, { useState, useEffect, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  loadYearData,
  computeMonthlyReport,
  STAFF_USERS,
  MONTHS,
  monthLabel,
  DEPT_LABELS,
  DEPT_IDS,
  getAccessibleDepts,
  getUsersInDept,
  ROLE_TO_DEPT,
  type MonthlyReport,
} from "../../mock/attendanceData";

const TODAY     = new Date();
const CUR_YEAR  = TODAY.getFullYear();
const CUR_MONTH = TODAY.getMonth() + 1;
const YEAR_OPTIONS = [CUR_YEAR, CUR_YEAR - 1].filter((y) => y >= 2025);

const CHART_FONT  = "Inter, Outfit, sans-serif";
const GRID_COLOR  = "#E5E7EB";
const LABEL_COLOR = "#6B7280";

function baseChartOptions(type: string): ApexOptions {
  return {
    chart: { fontFamily: CHART_FONT, toolbar: { show: false }, background: "transparent", type: type as ApexOptions["chart"] extends { type?: infer T } ? T : never },
    grid:  { borderColor: GRID_COLOR, strokeDashArray: 3 },
    dataLabels: { enabled: false },
    tooltip:    { theme: "light" },
    legend:     { position: "top", fontFamily: CHART_FONT, fontSize: "13px" },
    xaxis: { labels: { style: { colors: LABEL_COLOR, fontFamily: CHART_FONT } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: LABEL_COLOR, fontFamily: CHART_FONT } } },
  };
}

function computeMonthlyTrend(
  year: number,
  records: ReturnType<typeof loadYearData>,
  accessibleUsers: typeof STAFF_USERS,
) {
  const months = Array.from({ length: CUR_YEAR === year ? CUR_MONTH : 12 }, (_, i) => i + 1);
  const presentPct: number[] = [];
  const leavePct:   number[] = [];
  const absentPct:  number[] = [];
  const lateCounts: number[] = [];

  for (const m of months) {
    const rpts  = accessibleUsers.map((u) =>
      computeMonthlyReport(u.id, u.name, u.role, m, year, records)
    );
    const wdays = rpts[0]?.totalWorkingDays || 1;
    const avgP  = rpts.reduce((s, r) => s + r.presentDays, 0) / rpts.length / wdays * 100;
    const avgL  = rpts.reduce((s, r) => s + r.leaveDays,   0) / rpts.length / wdays * 100;
    const avgA  = rpts.reduce((s, r) => s + r.absentDays,  0) / rpts.length / wdays * 100;
    presentPct.push(Math.round(avgP * 10) / 10);
    leavePct.push(Math.round(avgL * 10) / 10);
    absentPct.push(Math.round(avgA * 10) / 10);
    lateCounts.push(rpts.reduce((s, r) => s + r.lateArrivals, 0));
  }

  return { months: months.map((m) => MONTHS[m - 1].slice(0, 3)), presentPct, leavePct, absentPct, lateCounts };
}

function computeDeptComparison(
  year: number,
  month: number,
  records: ReturnType<typeof loadYearData>,
  accessibleDepts: string[] | "all",
) {
  const depts  = accessibleDepts === "all" ? DEPT_IDS : accessibleDepts;
  const labels: string[] = [];
  const pcts:   number[] = [];

  for (const deptId of depts) {
    const users = getUsersInDept(deptId);
    if (users.length === 0) continue;
    const rpts = users.map((u) => computeMonthlyReport(u.id, u.name, u.role, month, year, records));
    const avg  = rpts.reduce((s, r) => s + r.attendancePercentage, 0) / rpts.length;
    labels.push(DEPT_LABELS[deptId] || deptId);
    pcts.push(Math.round(avg * 10) / 10);
  }

  return { labels, pcts };
}

function computeLeaveDistribution(
  year: number,
  month: number,
  records: ReturnType<typeof loadYearData>,
  accessibleUsers: typeof STAFF_USERS,
) {
  const rpts = accessibleUsers.map((u) =>
    computeMonthlyReport(u.id, u.name, u.role, month, year, records)
  );
  return {
    leaveDays:  rpts.reduce((s, r) => s + r.leaveDays,  0),
    absentDays: rpts.reduce((s, r) => s + r.absentDays, 0),
  };
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 shadow-sm">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm p-5 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h4>
      {children}
    </div>
  );
}

export default function AttendanceAnalytics() {
  const { user } = useAuth();
  const role    = user?.role ?? "";

  const [year,       setYear]       = useState(CUR_YEAR);
  const [month,      setMonth]      = useState(CUR_MONTH);
  const [deptFilter, setDeptFilter] = useState("all");
  const [records,    setRecords]    = useState<ReturnType<typeof loadYearData>>([]);
  const [loading,    setLoading]    = useState(true);

  const accessibleDepts = useMemo(() => getAccessibleDepts(role), [role]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRecords(loadYearData(year));
      setLoading(false);
    }, 0);
  }, [year]);

  const visibleUsers = useMemo(() => {
    const activeDepts = deptFilter !== "all" ? [deptFilter]
      : accessibleDepts === "all" ? DEPT_IDS : accessibleDepts;
    if (activeDepts.length === 0) return STAFF_USERS;
    return STAFF_USERS.filter((u) => {
      const d = (u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role] || "";
      return (activeDepts as string[]).includes(d);
    });
  }, [accessibleDepts, deptFilter]);

  const trend     = useMemo(() => computeMonthlyTrend(year, records, visibleUsers), [year, records, visibleUsers]);
  const deptComp  = useMemo(() => computeDeptComparison(year, month, records, deptFilter === "all" ? accessibleDepts : [deptFilter]), [year, month, records, deptFilter, accessibleDepts]);
  const leaveDist = useMemo(() => computeLeaveDistribution(year, month, records, visibleUsers), [year, month, records, visibleUsers]);

  const monthReports = useMemo<MonthlyReport[]>(() =>
    visibleUsers.map((u) => computeMonthlyReport(u.id, u.name, u.role, month, year, records)),
    [visibleUsers, month, year, records]
  );

  const avgAtt    = monthReports.length ? monthReports.reduce((s, r) => s + r.attendancePercentage, 0) / monthReports.length : 0;
  const totalLate = monthReports.reduce((s, r) => s + r.lateArrivals, 0);
  const totalAbs  = monthReports.reduce((s, r) => s + r.absentDays, 0);

  const topPresent = [...monthReports].sort((a, b) => b.presentDays - a.presentDays).slice(0, 8);
  const topAbsent  = [...monthReports].sort((a, b) => b.absentDays  - a.absentDays).slice(0, 8);

  // ── Chart configs ────────────────────────────────────────────────────────────

  const trendOptions: ApexOptions = {
    ...baseChartOptions("area"),
    colors: ["#22c55e", "#3b82f6", "#ef4444"],
    stroke: { curve: "smooth", width: 2 },
    fill:   { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
    xaxis:  { ...baseChartOptions("area").xaxis, categories: trend.months },
    yaxis:  { ...baseChartOptions("area").yaxis, min: 0, max: 100,
              labels: { formatter: (v) => `${v}%`, style: { colors: LABEL_COLOR, fontFamily: CHART_FONT } } },
    tooltip: { y: { formatter: (v) => `${v}%` } },
  };
  const trendSeries = [
    { name: "Present %",  data: trend.presentPct },
    { name: "Leave %",    data: trend.leavePct   },
    { name: "Absent %",   data: trend.absentPct  },
  ];

  const deptOptions: ApexOptions = {
    ...baseChartOptions("bar"),
    colors:      ["#465FFF"],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%" } },
    xaxis: { ...baseChartOptions("bar").xaxis, categories: deptComp.labels, max: 100,
             labels: { formatter: (v) => `${v}%`, style: { colors: LABEL_COLOR, fontFamily: CHART_FONT } } },
    tooltip: { y: { formatter: (v) => `${v}%` } },
    legend: { show: false },
  };

  const leaveOptions: ApexOptions = {
    ...baseChartOptions("donut"),
    colors:  ["#3b82f6", "#ef4444"],
    labels:  ["Leave Days", "Absent Days"],
    legend:  { position: "bottom", fontFamily: CHART_FONT },
    plotOptions: { pie: { donut: { size: "65%" } } },
    tooltip: { y: { formatter: (v) => `${v} days` } },
  };
  const leaveSeries = [leaveDist.leaveDays, leaveDist.absentDays];

  const lateOptions: ApexOptions = {
    ...baseChartOptions("area"),
    colors: ["#f59e0b"],
    stroke: { curve: "smooth", width: 2 },
    fill:   { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    xaxis:  { ...baseChartOptions("area").xaxis, categories: trend.months },
    yaxis:  { ...baseChartOptions("area").yaxis, labels: { formatter: (v) => String(Math.round(Number(v))), style: { colors: LABEL_COLOR, fontFamily: CHART_FONT } } },
    legend: { show: false },
    tooltip: { y: { formatter: (v) => `${v} late arrivals` } },
  };

  const canSeeDeptFilter = accessibleDepts === "all";

  return (
    <>
      <PageMeta title="Attendance Analytics | Optivax HR" description="Attendance analytics and trends" />
      <PageBreadcrumb pageTitle="Attendance Analytics" />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Focus Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
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
        <div className="ml-auto text-xs text-gray-400 self-end pb-2">
          Showing {visibleUsers.length} employees · {monthLabel(month)} {year}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── KPI Cards ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <KpiCard label="Avg Attendance %" value={`${avgAtt.toFixed(1)}%`}
              sub={`${monthLabel(month)} ${year}`}
              color={avgAtt >= 90 ? "text-green-600 dark:text-green-400" : avgAtt >= 75 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500"} />
            <KpiCard label="Total Late Arrivals" value={totalLate}
              sub="this month"
              color="text-yellow-600 dark:text-yellow-400" />
            <KpiCard label="Total Absent Days" value={totalAbs}
              sub="this month"
              color="text-red-500 dark:text-red-400" />
          </div>

          {/* ── Monthly Attendance Trend ─────────────────────────────────────── */}
          <ChartCard title={`Monthly Attendance Trend — ${year}`} className="mb-6">
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <Chart options={trendOptions} series={trendSeries} type="area" height={280} />
              </div>
            </div>
          </ChartCard>

          {/* ── Dept Comparison + Leave Distribution ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            <ChartCard title={`Department Attendance % — ${monthLabel(month)}`} className="lg:col-span-3">
              {deptComp.labels.length > 0 ? (
                <Chart options={deptOptions} series={[{ name: "Attendance %", data: deptComp.pcts }]} type="bar" height={240} />
              ) : (
                <div className="py-10 text-center text-sm text-gray-400">No department data</div>
              )}
            </ChartCard>
            <ChartCard title={`Leave vs Absent — ${monthLabel(month)}`} className="lg:col-span-2">
              {leaveSeries.some((v) => v > 0) ? (
                <Chart options={leaveOptions} series={leaveSeries} type="donut" height={240} />
              ) : (
                <div className="py-10 text-center text-sm text-gray-400">No leave/absent data this month</div>
              )}
            </ChartCard>
          </div>

          {/* ── Late Arrival Trend ───────────────────────────────────────────── */}
          <ChartCard title={`Late Arrival Trend — ${year}`} className="mb-6">
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <Chart options={lateOptions} series={[{ name: "Late Arrivals", data: trend.lateCounts }]} type="area" height={220} />
              </div>
            </div>
          </ChartCard>

          {/* ── Employee Leaderboards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Most Present Employees</h4>
                <span className="ml-auto text-xs text-gray-400">{monthLabel(month)} {year}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {topPresent.map((r, i) => (
                  <div key={r.userId} className="flex items-center gap-3 px-5 py-3">
                    <span className={`text-sm font-bold w-5 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.userName}</p>
                      <p className="text-xs text-gray-400">{r.userRole.replace(/_/g," ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">{r.presentDays}d</p>
                      <div className="text-xs text-gray-400">{r.attendancePercentage}%</div>
                    </div>
                    <div className="w-20">
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(r.attendancePercentage, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Most Absent Employees</h4>
                <span className="ml-auto text-xs text-gray-400">{monthLabel(month)} {year}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {topAbsent.map((r, i) => (
                  <div key={r.userId} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-sm font-bold w-5 text-center text-gray-300">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.userName}</p>
                      <p className="text-xs text-gray-400">{r.userRole.replace(/_/g," ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-500 dark:text-red-400">{r.absentDays}d absent</p>
                      <div className="text-xs text-gray-400">{r.attendancePercentage}% att.</div>
                    </div>
                    <div className="w-20">
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((r.absentDays / Math.max(r.totalWorkingDays, 1)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
