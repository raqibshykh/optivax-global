import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  loadYearData,
  STAFF_USERS,
  MONTHS,
  monthLabel,
  getAccessibleDepts,
  ROLE_TO_DEPT,
  DEPT_IDS,
  DEPT_LABELS,
  STATUS_COLORS,
  type AttendanceStatus,
  type AttendanceRecord,
} from "../../mock/attendanceData";

const TODAY     = new Date();
const CUR_YEAR  = TODAY.getFullYear();
const CUR_MONTH = TODAY.getMonth() + 1;
const YEAR_OPTIONS = [CUR_YEAR, CUR_YEAR - 1].filter((y) => y >= 2025);

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present:      "bg-green-500",
  late:         "bg-yellow-400",
  "half-day":   "bg-orange-400",
  absent:       "bg-red-500",
  leave:        "bg-blue-500",
  "weekly-off": "bg-gray-300 dark:bg-gray-600",
  holiday:      "bg-indigo-400",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present:      "Present",
  late:         "Late",
  "half-day":   "Half Day",
  absent:       "Absent",
  leave:        "Leave",
  "weekly-off": "Weekly Off",
  holiday:      "Holiday",
};

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isToday(date: Date): boolean {
  return date.toDateString() === TODAY.toDateString();
}

export default function AttendanceCalendar() {
  const { user, canView } = useAuth();
  const isAdmin = canView("hr");
  const role    = user?.role ?? "";

  const accessibleDepts = useMemo(() => getAccessibleDepts(role), [role]);

  const visibleUsers = useMemo(() => {
    if (!isAdmin && accessibleDepts !== "all") {
      return STAFF_USERS.filter((u) => {
        const d = (u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role] || "";
        return (accessibleDepts as string[]).includes(d);
      });
    }
    return STAFF_USERS;
  }, [isAdmin, accessibleDepts]);

  const [year,      setYear]      = useState(CUR_YEAR);
  const [month,     setMonth]     = useState(CUR_MONTH);
  const [empFilter, setEmpFilter] = useState<string>(() => {
    if (!isAdmin) return user?.id ?? "";
    return "all";
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ date: string; record: AttendanceRecord | null; x: number; y: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRecords(loadYearData(year));
      setLoading(false);
    }, 0);
  }, [year]);

  useEffect(() => {
    if (!isAdmin && user?.id) setEmpFilter(user.id);
  }, [isAdmin, user]);

  const calendarDays = useMemo(() => buildCalendarDays(year, month), [year, month]);

  const singleEmpMap = useMemo<Record<string, AttendanceRecord>>(() => {
    if (empFilter === "all") return {};
    return Object.fromEntries(
      records.filter((r) => r.userId === empFilter).map((r) => [r.date, r])
    );
  }, [records, empFilter]);

  const allEmpDayMap = useMemo<Record<string, Record<string, number>>>(() => {
    if (empFilter !== "all") return {};
    const map: Record<string, Record<string, number>> = {};
    const targetUsers = new Set(visibleUsers.map((u) => u.id));
    for (const r of records) {
      if (!targetUsers.has(r.userId)) continue;
      const [ry, rm] = r.date.split("-").map(Number);
      if (ry !== year || rm !== month) continue;
      if (!map[r.date]) map[r.date] = {};
      map[r.date][r.status] = (map[r.date][r.status] || 0) + 1;
    }
    return map;
  }, [records, empFilter, visibleUsers, year, month]);

  const empStats = useMemo(() => {
    const recs = Object.values(singleEmpMap).filter((r) => {
      const [ry, rm] = r.date.split("-").map(Number);
      return ry === year && rm === month;
    });
    const count = (st: AttendanceStatus[]) => recs.filter((r) => (st as string[]).includes(r.status)).length;
    return {
      present: count(["present", "late"]),
      absent:  count(["absent"]),
      leave:   count(["leave"]),
      halfDay: count(["half-day"]),
      late:    count(["late"]),
    };
  }, [singleEmpMap, year, month]);

  const selectedUser = visibleUsers.find((u) => u.id === empFilter);

  const deptUserList = useMemo(() => {
    if (accessibleDepts === "all") return visibleUsers;
    return visibleUsers.filter((u) => {
      const d = (u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role] || "";
      return (accessibleDepts as string[]).includes(d);
    });
  }, [visibleUsers, accessibleDepts]);

  return (
    <>
      <PageMeta title="Attendance Calendar | Optivax HR" description="Monthly attendance calendar" />
      <PageBreadcrumb pageTitle="Attendance Calendar" />

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
        {(isAdmin || (accessibleDepts !== "all" && (accessibleDepts as string[]).length > 0)) && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Employee</label>
            <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500">
              {isAdmin && <option value="all">All Employees (Overview)</option>}
              {deptUserList.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* ── Calendar ──────────────────────────────────────────────────────── */}
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {monthLabel(month)} {year}
              </h3>
              {selectedUser && (
                <p className="text-xs text-gray-400 mt-0.5">{selectedUser.name} · {selectedUser.role.replace(/_/g," ")}</p>
              )}
              {empFilter === "all" && (
                <p className="text-xs text-gray-400 mt-0.5">Company overview — {visibleUsers.length} employees</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const d = new Date(year, month - 2, 1); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                ‹
              </button>
              <button onClick={() => { const d = new Date(year, month, 1); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                ›
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} />;
                  const dateStr    = date.toISOString().split("T")[0];
                  const isFuture   = date > TODAY;
                  const isCurrentDay = isToday(date);
                  const record     = empFilter !== "all" ? singleEmpMap[dateStr] : null;
                  const allCounts  = empFilter === "all" ? allEmpDayMap[dateStr] : null;

                  return (
                    <div key={dateStr}
                      onMouseEnter={(e) => {
                        if (record || allCounts) setHovered({ date: dateStr, record: record ?? null, x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHovered(null)}
                      className={[
                        "relative min-h-[56px] rounded-lg p-1.5 transition-colors cursor-default",
                        isCurrentDay
                          ? "ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                        isFuture ? "opacity-40" : "",
                      ].join(" ")}
                    >
                      <span className={`text-xs font-medium ${isCurrentDay ? "text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
                        {date.getDate()}
                      </span>

                      {record && !isFuture && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[record.status] ?? "bg-gray-300"}`} />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-none">
                              {STATUS_LABEL[record.status] ?? record.status}
                            </span>
                          </div>
                          {record.checkIn && (
                            <span className="text-[9px] text-gray-400 leading-none pl-3">{record.checkIn}–{record.checkOut ?? "—"}</span>
                          )}
                        </div>
                      )}

                      {allCounts && !isFuture && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {Object.entries(allCounts)
                            .filter(([st]) => !["weekly-off", "holiday"].includes(st))
                            .map(([st, cnt]) => (
                              <span key={st}
                                className={`w-2 h-2 rounded-full ${STATUS_DOT[st as AttendanceStatus] ?? "bg-gray-300"}`}
                                title={`${cnt} ${STATUS_LABEL[st as AttendanceStatus] ?? st}`}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar stats ────────────────────────────────────────────────── */}
        <div className="w-full xl:w-56 space-y-4">
          {empFilter !== "all" && (
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Monthly Summary</h4>
              <div className="space-y-2.5">
                {[
                  { label: "Present", value: empStats.present, color: "text-green-600 dark:text-green-400",  dot: "bg-green-500" },
                  { label: "Absent",  value: empStats.absent,  color: "text-red-500 dark:text-red-400",     dot: "bg-red-500" },
                  { label: "Leave",   value: empStats.leave,   color: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500" },
                  { label: "Half Day",value: empStats.halfDay, color: "text-orange-600 dark:text-orange-400", dot: "bg-orange-400" },
                  { label: "Late",    value: empStats.late,    color: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{s.label}</span>
                    </div>
                    <span className={`text-sm font-semibold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm p-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Legend</h4>
            <div className="space-y-2">
              {(Object.entries(STATUS_DOT) as [AttendanceStatus, string][]).map(([st, dot]) => (
                <div key={st} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{STATUS_LABEL[st]}</span>
                </div>
              ))}
            </div>
          </div>

          {empFilter === "all" && (
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Departments</h4>
              <div className="space-y-2">
                {DEPT_IDS.map((deptId) => {
                  const users = visibleUsers.filter((u) => {
                    const d = (u as { departmentId?: string }).departmentId || ROLE_TO_DEPT[u.role] || "";
                    return d === deptId;
                  });
                  return (
                    <div key={deptId} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{DEPT_LABELS[deptId]}</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{users.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tooltip ────────────────────────────────────────────────────────── */}
      {hovered?.record && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs pointer-events-none"
          style={{ left: hovered.x + 12, top: hovered.y - 8 }}
        >
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{hovered.date}</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[hovered.record.status] ?? ""}`}>
            {STATUS_LABEL[hovered.record.status] ?? hovered.record.status}
          </span>
          {hovered.record.checkIn && (
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {hovered.record.checkIn} → {hovered.record.checkOut ?? "—"}
            </p>
          )}
        </div>
      )}
    </>
  );
}
