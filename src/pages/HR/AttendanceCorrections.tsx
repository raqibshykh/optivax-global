import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  getAuditLog,
  exportCSV,
  STATUS_COLORS,
  type AuditEntry,
  type AttendanceStatus,
} from "../../mock/attendanceData";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present:      "Present",
  late:         "Late",
  "half-day":   "Half Day",
  absent:       "Absent",
  leave:        "Leave",
  "weekly-off": "Weekly Off",
  holiday:      "Holiday",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function AttendanceAuditLog() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [auditLog,     setAuditLog]     = useState<AuditEntry[]>([]);
  const [searchEmp,    setSearchEmp]    = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  useEffect(() => { setAuditLog(getAuditLog()); }, []);

  const filtered = useMemo(() => {
    let list = auditLog;
    if (searchEmp.trim()) {
      const q = searchEmp.toLowerCase();
      list = list.filter((e) =>
        e.employeeName.toLowerCase().includes(q) || e.editedBy.toLowerCase().includes(q)
      );
    }
    if (dateFrom) list = list.filter((e) => e.attendanceDate >= dateFrom);
    if (dateTo)   list = list.filter((e) => e.attendanceDate <= dateTo);
    return list.sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime());
  }, [auditLog, searchEmp, dateFrom, dateTo]);

  const handleExportCSV = () => {
    const heads = [
      "Edit Date", "Edit Time", "Edited By", "Employee", "Attendance Date",
      "Previous Status", "New Status", "Previous Check-In", "Previous Check-Out",
      "New Check-In", "New Check-Out", "Reason",
    ];
    const rows = filtered.map((e) => [
      fmtDate(e.editedAt), fmtTime(e.editedAt),
      e.editedBy, e.employeeName, e.attendanceDate,
      e.previousStatus, e.newStatus,
      e.previousCheckIn ?? "", e.previousCheckOut ?? "",
      e.newCheckIn ?? "", e.newCheckOut ?? "",
      e.reason,
    ]);
    exportCSV(heads, rows, `Attendance_Audit_Log.csv`);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd"/>
          </svg>
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">Access Restricted</p>
        <p className="text-gray-400 text-xs text-center max-w-sm">
          The Attendance Audit Log is only accessible to Super Admin. All attendance record edits are logged here for compliance.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Attendance Audit Log | Optivax HR" description="Super Admin audit trail of all attendance edits" />
      <PageBreadcrumb pageTitle="Attendance Audit Log" />

      {/* ── Info banner ─────────────────────────────────────────────────────── */}
      <div className="mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 flex gap-3 items-start">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
        <div className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Immutable audit trail.</strong> Every attendance record modification made by Super Admin is logged here automatically.
          Only Super Admin can edit attendance records; all other roles (HR, Managers, Employees) cannot.
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Edits",       value: auditLog.length,                                                        color: "text-brand-600 dark:text-brand-400" },
          { label: "Filtered Results",  value: filtered.length,                                                        color: "text-gray-700 dark:text-gray-300" },
          { label: "Unique Employees",  value: new Set(filtered.map((e) => e.employeeId)).size,                        color: "text-blue-600 dark:text-blue-400" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-1 text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search Employee / Editor</label>
          <input type="text" placeholder="Name of employee or editor…" value={searchEmp}
            onChange={(e) => setSearchEmp(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Attendance Date From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Attendance Date To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500" />
        </div>
        <button onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3v10m0 0-3-3m3 3 3-3M3 17h14" strokeLinecap="round"/></svg>
          Export CSV
        </button>
      </div>

      {/* ── Audit Log Table ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Attendance Edit History</h3>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} entries — most recent first</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {[
                  "Edit Date/Time", "Edited By", "Employee",
                  "Attendance Date", "Previous Status", "New Status",
                  "Previous Times", "New Times", "Reason",
                ].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-400">No audit entries found.</td></tr>
              ) : filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  {/* Edit timestamp */}
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {fmtDate(entry.editedAt)}<br />
                    <span className="text-gray-400">{fmtTime(entry.editedAt)}</span>
                  </td>
                  {/* Edited by */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900 dark:text-white">{entry.editedBy}</div>
                    <div className="text-[10px] text-gray-400 capitalize">{entry.editedByRole.replace(/_/g," ")}</div>
                  </td>
                  {/* Employee */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900 dark:text-white">{entry.employeeName}</div>
                    <div className="text-[10px] text-gray-400">{entry.employeeId}</div>
                  </td>
                  {/* Attendance date */}
                  <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{entry.attendanceDate}</td>
                  {/* Previous status */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[entry.previousStatus] ?? ""}`}>
                      {STATUS_LABEL[entry.previousStatus] ?? entry.previousStatus}
                    </span>
                  </td>
                  {/* New status */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[entry.newStatus] ?? ""}`}>
                      {STATUS_LABEL[entry.newStatus] ?? entry.newStatus}
                    </span>
                  </td>
                  {/* Previous times */}
                  <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {entry.previousCheckIn
                      ? <span>{entry.previousCheckIn} → {entry.previousCheckOut ?? "—"}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  {/* New times */}
                  <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {entry.newCheckIn
                      ? <span>{entry.newCheckIn} → {entry.newCheckOut ?? "—"}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  {/* Reason */}
                  <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                    <span title={entry.reason} className="block truncate max-w-[200px]">{entry.reason}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
