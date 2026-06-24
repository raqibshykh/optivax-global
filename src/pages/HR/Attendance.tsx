import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { mockUsers } from "../../mock/users";
import {
  appendAuditEntry,
  STATUS_COLORS,
  type AttendanceStatus,
} from "../../mock/attendanceData";

const STORAGE_KEY = "mock_attendance";

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  notes?: string;
}

const STAFF_USERS = mockUsers.filter((u) => u.role !== "client" && u.role !== "super_admin");

function loadRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const today = new Date().toISOString().split("T")[0];
      const seed: AttendanceRecord[] = STAFF_USERS.map((u, i) => ({
        id: `att-seed-${u.id}`,
        userId: u.id, userName: u.name, userRole: u.role,
        date: today,
        checkIn: `0${8 + (i % 3)}:${i % 2 === 0 ? "00" : "30"}`,
        checkOut: i % 5 === 0 ? undefined : "17:00",
        status: (["present", "present", "late", "present", "leave", "half-day"] as AttendanceStatus[])[i % 6],
        notes: "",
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch { return []; }
}
function saveRecords(data: AttendanceRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nowTime(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

function autoStatus(checkIn: string): AttendanceStatus {
  const [h, m] = checkIn.split(":").map(Number);
  return h > 9 || (h === 9 && m > 30) ? "late" : "present";
}

const today = new Date().toISOString().split("T")[0];

export default function Attendance() {
  const { user, canView } = useAuth();
  const { showToast }     = useToast();

  // Only super_admin can manually edit/mark attendance records
  const canManage  = user?.role === "super_admin";
  const canViewAll = canView("hr");

  const [records, setRecords]             = useState<AttendanceRecord[]>([]);
  const [filterDate, setFilterDate]       = useState(today);
  const [filterStatus, setFilterStatus]   = useState("all");
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [form, setForm] = useState<{
    userId: string; userName: string; userRole: string;
    date: string; checkIn: string; checkOut: string;
    status: AttendanceStatus; notes: string; reason: string;
  }>({
    userId: STAFF_USERS[0]?.id ?? "", userName: STAFF_USERS[0]?.name ?? "",
    userRole: STAFF_USERS[0]?.role ?? "", date: today,
    checkIn: "09:00", checkOut: "17:00", status: "present", notes: "", reason: "",
  });

  useEffect(() => { setRecords(loadRecords()); }, []);

  // ── Self attendance ────────────────────────────────────────────────────────
  const myToday        = records.find((r) => r.userId === user?.id && r.date === today);
  const isSelfUser     = user?.role !== "client" && !canViewAll;
  const canSelfCheckin = !canManage && user?.role !== "client";

  const handleSelfCheckIn = () => {
    if (!user) return;
    if (myToday) { showToast("Already checked in for today", "error"); return; }
    const t = nowTime();
    const rec: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId: user.id, userName: user.name, userRole: user.role,
      date: today, checkIn: t, status: autoStatus(t), notes: "",
    };
    const updated = [rec, ...records];
    saveRecords(updated);
    setRecords(updated);
    showToast(`Checked in at ${t}${rec.status === "late" ? " — marked Late" : ""}`, "success");
  };

  const handleSelfCheckOut = () => {
    if (!user || !myToday) return;
    const t = nowTime();
    const updated = records.map((r) => r.id === myToday.id ? { ...r, checkOut: t } : r);
    saveRecords(updated);
    setRecords(updated);
    showToast(`Checked out at ${t}`, "success");
  };

  // ── Super Admin attendance management ──────────────────────────────────────
  const dateRecords    = records.filter((r) => r.date === filterDate);
  const displayRecords = canViewAll
    ? dateRecords.filter((r) => filterStatus === "all" || r.status === filterStatus)
    : records.filter((r) => r.userId === user?.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  const presentCount  = dateRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const absentCount   = dateRecords.filter((r) => r.status === "absent").length;
  const lateCount     = dateRecords.filter((r) => r.status === "late").length;
  const attendancePct = dateRecords.length > 0 ? Math.round((presentCount / dateRecords.length) * 100) : 0;

  const handleUserChange = (id: string) => {
    const u = STAFF_USERS.find((x) => x.id === id);
    setForm((f) => ({ ...f, userId: id, userName: u?.name ?? id, userRole: u?.role ?? "" }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (canManage && !form.reason.trim()) {
      showToast("Reason is required for attendance edits", "error");
      return;
    }
    if (editingRecord) {
      const updated = records.map((r) => r.id === editingRecord.id ? { ...r, ...form } : r);
      saveRecords(updated);
      setRecords(updated);
      // Log every super_admin edit in the audit trail
      if (canManage && user) {
        appendAuditEntry({
          editedAt:        new Date().toISOString(),
          editedBy:        user.name,
          editedByRole:    user.role,
          employeeId:      editingRecord.userId,
          employeeName:    editingRecord.userName,
          attendanceDate:  editingRecord.date,
          previousStatus:  editingRecord.status as AttendanceStatus,
          newStatus:       form.status,
          previousCheckIn:  editingRecord.checkIn,
          previousCheckOut: editingRecord.checkOut,
          newCheckIn:       form.checkIn || undefined,
          newCheckOut:      form.checkOut || undefined,
          reason:          form.reason,
        });
      }
      showToast("Attendance updated", "success");
    } else {
      if (records.find((r) => r.userId === form.userId && r.date === form.date)) {
        showToast("Record for this employee on this date already exists", "error");
        return;
      }
      const rec: AttendanceRecord = { id: `att-${Date.now()}`, ...form };
      const updated = [rec, ...records];
      saveRecords(updated);
      setRecords(updated);
      if (canManage && user) {
        appendAuditEntry({
          editedAt:       new Date().toISOString(),
          editedBy:       user.name,
          editedByRole:   user.role,
          employeeId:     form.userId,
          employeeName:   form.userName,
          attendanceDate: form.date,
          previousStatus: "absent",
          newStatus:      form.status,
          newCheckIn:     form.checkIn || undefined,
          newCheckOut:    form.checkOut || undefined,
          reason:         form.reason,
        });
      }
      showToast("Attendance recorded", "success");
    }
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const openEdit = (r: AttendanceRecord) => {
    setEditingRecord(r);
    setForm({
      userId: r.userId, userName: r.userName, userRole: r.userRole, date: r.date,
      checkIn: r.checkIn ?? "", checkOut: r.checkOut ?? "",
      status: r.status, notes: r.notes ?? "", reason: "",
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingRecord(null);
    setForm({
      userId: STAFF_USERS[0]?.id ?? "", userName: STAFF_USERS[0]?.name ?? "",
      userRole: STAFF_USERS[0]?.role ?? "", date: filterDate,
      checkIn: "09:00", checkOut: "17:00", status: "present", notes: "", reason: "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this attendance record?")) return;
    const updated = records.filter((r) => r.id !== id);
    saveRecords(updated);
    setRecords(updated);
    showToast("Record deleted", "success");
  };

  return (
    <>
      <PageMeta title="Attendance | Optivax HR" description="Track employee attendance" />
      <PageBreadcrumb pageTitle="Attendance Tracking" />

      {/* ── Report navigation shortcuts ───────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Link to="/hr/attendance"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-brand-500 text-white">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
          Daily
        </Link>
        <Link to="/hr/attendance/monthly"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="13" rx="1.5"/><path d="M5 1v2M11 1v2M1 6h14" strokeLinecap="round"/></svg>
          Monthly
        </Link>
        <Link to="/hr/attendance/yearly"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12L6 7l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Yearly
        </Link>
        <Link to="/hr/attendance/analytics"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12l4-4 3 3 3-4 4-2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="5" r="1.5" fill="currentColor" stroke="none"/></svg>
          Analytics
        </Link>
        <Link to="/hr/attendance/calendar"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="13" rx="1.5"/><path d="M5 1v2M11 1v2M1 6h14" strokeLinecap="round"/><circle cx="5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/></svg>
          Calendar
        </Link>
        {canViewAll && (
          <Link to="/hr/attendance/payroll"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M5 8h6M8 6v4" strokeLinecap="round"/></svg>
            Payroll
          </Link>
        )}
        {canManage && (
          <Link to="/hr/attendance/corrections"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8h12M2 4h12M2 12h8" strokeLinecap="round"/><circle cx="13" cy="12" r="2.5"/><path d="M12 12h2M13 11v2" strokeLinecap="round"/></svg>
            Audit Log
          </Link>
        )}
      </div>

      {/* ── Employee Self Check-In Panel ──────────────────────────────────── */}
      {canSelfCheckin && (
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Today's Attendance</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            {!myToday ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Not checked in yet</span>
                <button onClick={handleSelfCheckIn}
                  className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                  ✓ Check In
                </button>
              </div>
            ) : !myToday.checkOut ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_COLORS[myToday.status]}`}>{myToday.status}</span>
                  <p className="text-xs text-gray-400 mt-0.5">Checked in {myToday.checkIn}</p>
                </div>
                <button onClick={handleSelfCheckOut}
                  className="px-5 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors">
                  ✓ Check Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_COLORS[myToday.status]}`}>{myToday.status}</span>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">{myToday.checkIn}</span>
                  {" → "}
                  <span className="font-medium text-gray-900 dark:text-white">{myToday.checkOut}</span>
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Complete</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs (admin view only) ────────────────────────────────────────── */}
      {canViewAll && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Present",         value: presentCount,        color: "text-green-600 dark:text-green-400" },
            { label: "Absent",          value: absentCount,         color: "text-red-500" },
            { label: "Late",            value: lateCount,           color: "text-yellow-600 dark:text-yellow-400" },
            { label: "Attendance Rate", value: `${attendancePct}%`, color: "text-brand-600 dark:text-brand-400" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {canViewAll ? "Attendance Log" : "My Attendance History"}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {canViewAll && (
              <>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="half-day">Half Day</option>
                  <option value="leave">Leave</option>
                  <option value="absent">Absent</option>
                </select>
              </>
            )}
            {canManage && (
              <button onClick={openCreate}
                className="px-4 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap">
                + Mark Attendance
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {[
                  ...(canViewAll ? ["Employee"] : ["Date"]),
                  "Status", "Check In", "Check Out", "Notes",
                  ...(canManage ? ["Actions"] : []),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {displayRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    {canViewAll ? "No attendance records for this date." : "No attendance records found."}
                  </td>
                </tr>
              )}
              {displayRecords.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  {canViewAll ? (
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{r.userName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{r.userRole.replace(/_/g, " ")}</div>
                    </td>
                  ) : (
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.date}</td>
                  )}
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_COLORS[r.status] ?? ""}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.checkIn || "—"}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.checkOut || "—"}</td>
                  <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-48 truncate">{r.notes || "—"}</td>
                  {canManage && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(r)} className="text-brand-600 hover:text-brand-800 dark:text-brand-400 text-xs font-medium">Edit</button>
                        <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 text-xs font-medium">Del</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!canViewAll && isSelfUser && (
          <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-800">
            Showing last 30 attendance records. Contact Super Admin for corrections.
          </p>
        )}
      </div>

      {/* ── Mark / Edit Modal (super_admin only) ──────────────────────────── */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-50 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingRecord ? "Edit Attendance" : "Mark Attendance"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
                <select value={form.userId} onChange={(e) => handleUserChange(e.target.value)} required disabled={!!editingRecord}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60">
                  {STAFF_USERS.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, " ")})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} disabled={!!editingRecord}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AttendanceStatus }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="half-day">Half Day</option>
                  <option value="leave">Leave (Unpaid)</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check In</label>
                  <input type="time" value={form.checkIn}
                    onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check Out</label>
                  <input type="time" value={form.checkOut}
                    onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input type="text" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              {/* Reason is required for every super_admin edit — goes to audit log */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Edit *
                  <span className="ml-1 text-xs font-normal text-gray-400">(logged in audit trail)</span>
                </label>
                <textarea required rows={2} value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Why is this attendance record being changed?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">Save & Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
