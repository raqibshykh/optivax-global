import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { UserService, UserProfile } from "../../services/userService";
import { DepartmentService, type Department } from "../../services/departmentService";
import { ShiftService, type DepartmentShift } from "../../services/shiftService";
import { BudgetService, type DeptAllocation } from "../../services/budgetService";
import { ProjectService } from "../../services/projectService";
import { AttendanceService, type AttendanceRecord } from "../../services/attendanceService";
import { SecurityAuditLogService, type SecurityAuditLogEntry } from "../../services/securityAuditLogService";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../icons";
import type { PermissionDomain } from "../../types";

interface DeptFormData {
  name: string;
  domain: PermissionDomain;
  code: string;
  headUserId: string;
  description: string;
}

interface ShiftFormData {
  id: string | null;
  departmentId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  status: "active" | "inactive";
}

const DOMAIN_OPTIONS: { value: PermissionDomain; label: string }[] = [
  { value: "sales",       label: "Sales"       },
  { value: "production",  label: "Production"  },
  { value: "marketing",   label: "Marketing"   },
  { value: "hr",          label: "HR"          },
  { value: "it_support",  label: "IT Support"  },
  { value: "system",      label: "System"      },
  { value: "billing",     label: "Billing"     },
  { value: "reports",     label: "Reports"     },
];

const DOMAIN_COLORS: Record<string, string> = {
  sales:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  production: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  marketing:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  hr:         "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  it_support: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  system:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  billing:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  reports:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

const EMPTY_FORM: DeptFormData = { name: "", domain: "sales", code: "", headUserId: "", description: "" };
const EMPTY_SHIFT_FORM: ShiftFormData = { id: null, departmentId: "", shiftName: "", startTime: "09:00", endTime: "17:00", graceMinutes: 30, status: "active" };

const today = new Date().toISOString().split("T")[0];

export default function Departments() {
  const { canCreate, canEdit, canDelete } = useAuth();
  const { showToast } = useToast();

  const [depts, setDepts] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [shifts, setShifts] = useState<DepartmentShift[]>([]);
  const [allocations, setAllocations] = useState<DeptAllocation[]>([]);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [transferHistory, setTransferHistory] = useState<SecurityAuditLogEntry[]>([]);
  const [showInactive, setShowInactive] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DeptFormData>(EMPTY_FORM);

  const [shiftModalDeptId, setShiftModalDeptId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftFormData>(EMPTY_SHIFT_FORM);
  const [expandedShiftsFor, setExpandedShiftsFor] = useState<string | null>(null);

  useEffect(() => {
    UserService.getAll().then(setUsers).catch(() => {});
    DepartmentService.getAll().then(setDepts).catch(() => {});
    ShiftService.getAll().then(setShifts).catch(() => {});
    BudgetService.getDeptAllocations().then(setAllocations).catch(() => setAllocations([]));
    AttendanceService.getSelfRecords()
      .then((recs) => setTodayAttendance(recs.filter((r) => r.date === today)))
      .catch(() => setTodayAttendance([]));
    SecurityAuditLogService.list({ action: "department_changed", limit: 50 })
      .then(setTransferHistory)
      .catch(() => setTransferHistory([]));
  }, []);

  useEffect(() => {
    ProjectService.getAll()
      .then((projects) => {
        const counts: Record<string, number> = {};
        for (const dept of depts) {
          const memberIds = new Set(users.filter((u) => u.departmentId === dept.id).map((u) => u.id));
          counts[dept.id] = projects.filter((p) => (p.assignedTo || []).some((uid) => memberIds.has(uid))).length;
        }
        setProjectCounts(counts);
      })
      .catch(() => setProjectCounts({}));
  }, [depts, users]);

  const adminUsers = users.filter((u) => u.role?.endsWith("_admin") || u.role === "management");

  const memberCountByDept: Record<string, number> = users.reduce<Record<string, number>>((acc, u) => {
    if (u.departmentId) acc[u.departmentId] = (acc[u.departmentId] ?? 0) + 1;
    return acc;
  }, {});

  const budgetByDept = useMemo(() => {
    const map: Record<string, number> = {};
    for (const dept of depts) {
      map[dept.id] = allocations
        .filter((a) => a.department?.toLowerCase() === dept.name.toLowerCase())
        .reduce((sum, a) => sum + (a.allocatedAmount || 0), 0);
    }
    return map;
  }, [depts, allocations]);

  const attendanceSummaryByDept = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number }> = {};
    for (const dept of depts) {
      const memberIds = new Set(users.filter((u) => u.departmentId === dept.id).map((u) => u.id));
      const recs = todayAttendance.filter((r) => memberIds.has(r.userId));
      map[dept.id] = {
        present: recs.filter((r) => r.status === "present").length,
        absent: recs.filter((r) => r.status === "absent").length,
        late: recs.filter((r) => r.status === "late").length,
      };
    }
    return map;
  }, [depts, users, todayAttendance]);

  const visibleDepts = showInactive ? depts : depts.filter((d) => d.status !== "inactive");

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditId(dept.id);
    setForm({ name: dept.name, domain: dept.domain, code: dept.code || "", headUserId: dept.headUserId ?? "", description: dept.description ?? "" });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Department name is required", "error"); return; }

    try {
      if (editId) {
        const updated = await DepartmentService.update(editId, {
          name: form.name, domain: form.domain, code: form.code || undefined,
          headUserId: form.headUserId || undefined, description: form.description,
        });
        setDepts((prev) => prev.map((d) => (d.id === editId ? updated : d)));
        showToast("Department updated", "success");
      } else {
        const created = await DepartmentService.create({
          name: form.name, domain: form.domain, code: form.code || undefined,
          headUserId: form.headUserId || undefined, description: form.description,
        });
        setDepts((prev) => [...prev, created]);
        showToast("Department created", "success");
      }
      setModalOpen(false);
    } catch {
      showToast("Failed to save department", "error");
    }
  };

  // Departments are never hard-deleted — they must stay visible in reports, payroll history,
  // attendance history, and audit logs. "Delete" instead flips status to inactive: it
  // disappears from the employee-creation dropdown (HR/Employees.tsx) but every existing
  // assignment, record, and report keeps working exactly as before.
  const handleToggleActive = async (dept: Department) => {
    const nextStatus = dept.status === "inactive" ? "active" : "inactive";
    try {
      const updated = await DepartmentService.update(dept.id, { status: nextStatus });
      setDepts((prev) => prev.map((d) => (d.id === dept.id ? updated : d)));
      showToast(nextStatus === "inactive" ? "Department deactivated" : "Department reactivated", "success");
    } catch {
      showToast("Failed to update department status", "error");
    }
  };

  const getHeadName = (headUserId?: string) => {
    if (!headUserId) return "—";
    const u = users.find((u) => u.id === headUserId);
    return u?.full_name ?? u?.email ?? "—";
  };

  const shiftsForDept = (deptId: string) => shifts.filter((s) => s.departmentId === deptId);

  const openAddShift = (deptId: string) => {
    setShiftForm({ ...EMPTY_SHIFT_FORM, departmentId: deptId });
    setShiftModalDeptId(deptId);
  };

  const openEditShift = (shift: DepartmentShift) => {
    setShiftForm({
      id: shift.id, departmentId: shift.departmentId, shiftName: shift.shiftName,
      startTime: shift.startTime, endTime: shift.endTime, graceMinutes: shift.graceMinutes, status: shift.status,
    });
    setShiftModalDeptId(shift.departmentId);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.shiftName.trim()) { showToast("Shift name is required", "error"); return; }
    try {
      if (shiftForm.id) {
        const updated = await ShiftService.update(shiftForm.id, {
          shiftName: shiftForm.shiftName, startTime: shiftForm.startTime, endTime: shiftForm.endTime,
          graceMinutes: shiftForm.graceMinutes, status: shiftForm.status,
        });
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await ShiftService.create({
          departmentId: shiftForm.departmentId, shiftName: shiftForm.shiftName,
          startTime: shiftForm.startTime, endTime: shiftForm.endTime,
          graceMinutes: shiftForm.graceMinutes, status: shiftForm.status,
        });
        setShifts((prev) => [...prev, created]);
      }
      showToast("Shift saved", "success");
      setShiftModalDeptId(null);
    } catch {
      showToast("Failed to save shift", "error");
    }
  };

  const handleSetDefaultShift = async (dept: Department, shiftId: string) => {
    try {
      const updated = await DepartmentService.update(dept.id, { defaultShiftId: shiftId });
      setDepts((prev) => prev.map((d) => (d.id === dept.id ? updated : d)));
      showToast("Default shift updated", "success");
    } catch {
      showToast("Failed to set default shift", "error");
    }
  };

  const handleDeleteShift = async (shift: DepartmentShift) => {
    if (!window.confirm(`Remove shift "${shift.shiftName}"?`)) return;
    try {
      await ShiftService.delete(shift.id);
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      showToast("Shift removed", "success");
    } catch {
      showToast("Failed to remove shift", "error");
    }
  };

  return (
    <>
      <PageMeta title="Departments | Optivax CRM" description="Manage organisational departments" />
      <PageBreadcrumb pageTitle="Departments" />

      {/* ── Summary cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Departments", value: depts.length,               color: "border-blue-500" },
          { label: "Total Members",     value: users.filter(u => u.departmentId).length, color: "border-green-500" },
          { label: "Department Heads",  value: depts.filter(d => d.headUserId).length,   color: "border-purple-500" },
          { label: "Unassigned Users",  value: users.filter(u => !u.departmentId && u.role !== "super_admin" && u.role !== "management" && u.role !== "client").length, color: "border-amber-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 border-l-4 ${color} p-4 shadow-sm`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{visibleDepts.length} department{visibleDepts.length !== 1 ? "s" : ""}</p>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
        </div>
        {canCreate("system") && (
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
            <PlusIcon className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

      {/* ── Department cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {visibleDepts.map((dept) => {
          const attendance = attendanceSummaryByDept[dept.id] ?? { present: 0, absent: 0, late: 0 };
          const deptShifts = shiftsForDept(dept.id);
          const isInactive = dept.status === "inactive";
          return (
            <div key={dept.id} className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden ${isInactive ? "opacity-60" : ""}`}>
              <div className={`h-1.5 w-full ${
                dept.domain === "sales" ? "bg-green-500" :
                dept.domain === "production" ? "bg-orange-500" :
                dept.domain === "marketing" ? "bg-pink-500" :
                dept.domain === "hr" ? "bg-indigo-500" :
                dept.domain === "it_support" ? "bg-cyan-500" : "bg-brand-500"
              }`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                      {dept.code && <span className="text-xs font-mono text-gray-400">#{dept.code}</span>}
                    </div>
                    {dept.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{dept.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${DOMAIN_COLORS[dept.domain] ?? "bg-gray-100 text-gray-600"}`}>
                      {dept.domain}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${isInactive ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                      {isInactive ? "Inactive" : "Active"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Head / Admin</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getHeadName(dept.headUserId)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Employees</span>
                    <span className="font-medium text-gray-900 dark:text-white">{memberCountByDept[dept.id] ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total Budget</span>
                    <span className="font-medium text-gray-900 dark:text-white">₹{(budgetByDept[dept.id] ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Projects</span>
                    <span className="font-medium text-gray-900 dark:text-white">{projectCounts[dept.id] ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Today's Attendance</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      <span className="text-green-600 dark:text-green-400">{attendance.present} in</span>
                      {attendance.late > 0 && <span className="text-yellow-600 dark:text-yellow-400"> · {attendance.late} late</span>}
                      {attendance.absent > 0 && <span className="text-red-600 dark:text-red-400"> · {attendance.absent} absent</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Created</span>
                    <span className="text-gray-600 dark:text-gray-400">{new Date(dept.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>

                {/* ── Shifts ──────────────────────────────────────────── */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mb-3">
                  <button
                    onClick={() => setExpandedShiftsFor(expandedShiftsFor === dept.id ? null : dept.id)}
                    className="flex items-center justify-between w-full text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    <span>Shifts ({deptShifts.length})</span>
                    <span>{expandedShiftsFor === dept.id ? "▲" : "▼"}</span>
                  </button>
                  {expandedShiftsFor === dept.id && (
                    <div className="mt-2 space-y-1.5">
                      {deptShifts.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No shifts configured — employees use the standard 09:00–17:00 day shift.</p>
                      )}
                      {deptShifts.map((shift) => (
                        <div key={shift.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name={`default-shift-${dept.id}`} checked={dept.defaultShiftId === shift.id}
                              onChange={() => handleSetDefaultShift(dept, shift.id)} />
                            <span className="font-medium text-gray-700 dark:text-gray-200">{shift.shiftName}</span>
                            <span className="text-gray-400">{shift.startTime}–{shift.endTime}</span>
                            {dept.defaultShiftId === shift.id && <span className="text-brand-500 font-medium">(default)</span>}
                          </label>
                          {canEdit("system") && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => openEditShift(shift)} className="text-gray-500 hover:text-brand-600"><PencilIcon className="w-3 h-3" /></button>
                              <button onClick={() => handleDeleteShift(shift)} className="text-gray-500 hover:text-red-600"><TrashBinIcon className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                      {canCreate("system") && (
                        <button onClick={() => openAddShift(dept.id)}
                          className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline">
                          + Add Shift
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  {canEdit("system") && (
                    <button onClick={() => openEdit(dept)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <PencilIcon className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {canDelete("system") && (
                    <button onClick={() => handleToggleActive(dept)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                        isInactive
                          ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/40 hover:bg-green-50 dark:hover:bg-green-900/20"
                          : "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20"
                      }`}>
                      <TrashBinIcon className="w-3.5 h-3.5" /> {isInactive ? "Reactivate" : "Deactivate"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Members table ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">All Members by Department</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {["Name", "Email", "Role", "Department"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {users
                .filter((u) => u.role !== "super_admin" && u.role !== "client")
                .sort((a, b) => (a.departmentId ?? "zzz").localeCompare(b.departmentId ?? "zzz"))
                .map((u) => {
                  const dept = depts.find((d) => d.id === u.departmentId);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {u.full_name || u.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {dept ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DOMAIN_COLORS[dept.domain] ?? "bg-gray-100 text-gray-600"}`}>
                            {dept.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Transfer history ──────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Department Transfer History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {["Employee", "From", "To", "Changed By", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {transferHistory.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">No department transfers recorded yet</td></tr>
              ) : transferHistory.map((entry) => {
                const target = users.find((u) => u.id === entry.targetUserId);
                const fromId = (entry.oldValue?.department_id as string) || null;
                const toId = (entry.newValue?.department_id as string) || null;
                const fromName = depts.find((d) => d.id === fromId)?.name ?? (fromId ? "Unknown Department" : "Unassigned");
                const toName = depts.find((d) => d.id === toId)?.name ?? (toId ? "Unknown Department" : "Unassigned");
                return (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{target?.full_name ?? entry.targetUserId ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{fromName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{toName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{entry.actorRole ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(entry.createdAt).toLocaleString("en-GB")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit department modal ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editId ? "Edit Department" : "New Department"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Department Code</label>
                <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. PRD, SAL"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Permission Domain *</label>
                <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value as PermissionDomain })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  {DOMAIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Department Head</label>
                <select value={form.headUserId} onChange={(e) => setForm({ ...form, headUserId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  <option value="">— None —</option>
                  {adminUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                  {editId ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add/Edit shift modal ───────────────────────────────────── */}
      {shiftModalDeptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{shiftForm.id ? "Edit Shift" : "New Shift"}</h3>
              <button onClick={() => setShiftModalDeptId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <form onSubmit={handleSaveShift} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Shift Name *</label>
                <input type="text" required value={shiftForm.shiftName} onChange={(e) => setShiftForm({ ...shiftForm, shiftName: e.target.value })}
                  placeholder="e.g. Night, Morning, Weekend"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Start Time *</label>
                  <input type="time" required value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">End Time *</label>
                  <input type="time" required value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
              </div>
              <p className="text-xs text-gray-400">An end time earlier than or equal to the start time is treated as an overnight shift automatically.</p>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Grace Period (minutes)</label>
                <input type="number" min={0} value={shiftForm.graceMinutes} onChange={(e) => setShiftForm({ ...shiftForm, graceMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select value={shiftForm.status} onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value as "active" | "inactive" })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button type="button" onClick={() => setShiftModalDeptId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                  {shiftForm.id ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
