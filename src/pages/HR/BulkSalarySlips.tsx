import { useState, useEffect, useMemo, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { UserService, type UserProfile } from "../../services/userService";
import {
  getSalarySlips, saveSalarySlips, printSalarySlip, printSalarySlipsBulk,
  computeNet, computeDeductions, computeStrictDeductions, computeSlipBreakdown,
  type SalarySlip,
} from "../../mock/payrollData";
import { AuditLogService } from "../../services/auditLogService";
import { getCompanySettings } from "../../services/companySettingsService";
import { useToast } from "../../context/ToastContext";
import { notifySalarySlipGenerated } from "../../services/notificationHelpers";
import { safeParse } from "../../lib/storage";

// ── Types ──────────────────────────────────────────────────────────────────────

const EXTRA_KEY = "optivax_employee_extra";

interface EmployeeExtraData {
  salary?: number;
}

type BulkAction = "generate" | "regenerate" | "skip";

interface EmployeeRow {
  emp: UserProfile;
  dept: string;
  basicSalary: number;
  existingSlip: SalarySlip | null;
  action: BulkAction;
}

// ── Constants ──────────────────────────────────────────────────────────────────

// Roles that never get salary slips
const EXCLUDED_ROLES = new Set(["client"]);

const MONTHS: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  const d = new Date(2026, 0, 1);
  for (let i = 0; i < 12; i++) {
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value: v, label: d.toLocaleString("default", { month: "long", year: "numeric" }) });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
})();

const DEPT_COLOR: Record<string, string> = {
  Sales:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Marketing:    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Production:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  HR:           "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Management:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "IT Support": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

const selectCls = "rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

function getDeptFromRole(role: string): string {
  if (role.startsWith("sales"))      return "Sales";
  if (role.startsWith("production")) return "Production";
  if (role.startsWith("marketing"))  return "Marketing";
  if (role.startsWith("hr"))         return "HR";
  if (role.startsWith("it"))         return "IT Support";
  if (role === "management")         return "Management";
  if (role === "super_admin")        return "Management";
  return "General";
}

function buildSlip(
  emp: UserProfile,
  month: string,
  basicSalary: number,
  generator: { id: string; name: string; role: string }
): SalarySlip {
  const dept = getDeptFromRole(emp.role ?? "");

  const strictDeductions       = computeStrictDeductions(emp.id, month, basicSalary);
  const advanceSalaryDeduction = strictDeductions.advanceSalaryDeduction;
  const grossSalary            = basicSalary;
  const totalDeductions        = advanceSalaryDeduction
    + strictDeductions.unpaidLeaveDeduction
    + strictDeductions.halfDayDeduction
    + strictDeductions.lateAttendanceDeduction;

  return {
    id: `slip-bulk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    employeeId:            emp.id,
    employeeName:          emp.full_name || emp.email,
    employeeEmail:         emp.email,
    department:            dept,
    designation:           emp.role ?? "Employee",
    salaryMonth:           month,
    basicSalary,
    allowances:   [],
    bonuses:      [],
    deductions:   [],
    advanceSalaryDeduction,
    unpaidLeaveDays:       strictDeductions.unpaidLeaveDays,
    unpaidLeaveDeduction:  strictDeductions.unpaidLeaveDeduction,
    halfDayDeduction:      strictDeductions.halfDayDeduction,
    latePenaltyCount:      strictDeductions.lateCount,
    latePenaltyDays:       Math.floor(strictDeductions.lateCount / 3),
    latePenaltyDeduction:  strictDeductions.lateAttendanceDeduction,
    grossSalary,
    totalDeductions,
    netSalary:    Math.max(0, grossSalary - totalDeductions),
    generatedAt:  new Date().toISOString(),
    generatedById:   generator.id,
    generatedByName: generator.name,
    generatedByRole: generator.role,
  };
}

// ── Slip view modal ────────────────────────────────────────────────────────────

function SlipViewModal({ slip, onClose }: { slip: SalarySlip; onClose: () => void }) {
  const monthLabel = new Date(slip.salaryMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });
  const company    = useMemo(() => getCompanySettings(), []);
  const bd         = computeSlipBreakdown(slip.basicSalary);

  const Row = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${accent ?? "text-gray-900 dark:text-white"}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative overflow-hidden w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Background watermark */}
        <img
          src="/images/logo/logo-icon-dark.png"
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[35deg] w-[52%] opacity-[0.07] pointer-events-none select-none z-[1]"
        />
        {/* Company branded header */}
        <div className="relative z-[2] bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] text-white px-6 py-4 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/images/logo/logo-icon-dark.png"
              alt={company.name}
              className="w-10 h-10 object-contain rounded-lg bg-white p-1 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-widest opacity-75 uppercase">{company.name}</p>
              {company.tagline && <p className="text-[10px] opacity-60 italic">{company.tagline}</p>}
            </div>
            <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-2xl leading-none ml-2">×</button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs opacity-65 uppercase tracking-wide mb-0.5">Salary Slip</p>
              <h3 className="text-lg font-bold">{slip.employeeName}</h3>
              <p className="text-sm opacity-80">{monthLabel} · {slip.department}</p>
            </div>
            <div className="text-right text-xs opacity-60 mt-1">
              <p>ID: {slip.id.toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="relative z-[2] overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
            <div><span className="text-xs text-gray-400 block">Employee ID</span><span className="font-medium">{slip.employeeId}</span></div>
            <div><span className="text-xs text-gray-400 block">Designation</span><span className="font-medium">{slip.designation}</span></div>
            <div><span className="text-xs text-gray-400 block">Department</span><span className="font-medium">{slip.department}</span></div>
            <div><span className="text-xs text-gray-400 block">Salary Month</span><span className="font-medium">{monthLabel}</span></div>
          </div>

          {/* Salary Breakdown */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Salary Breakdown</p>
            <Row label="Basic Salary" value={fmtRs(bd.basic)} />
            <Row label="House Rent Allowance" value={fmtRs(bd.hra)} />
            <Row label="Medical Allowance" value={fmtRs(bd.medical)} />
            <Row label="Conveyance Allowance" value={fmtRs(bd.conveyance)} />
            <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Total Gross Salary</span>
              <span className="font-bold text-sm text-gray-900 dark:text-white">{fmtRs(slip.basicSalary)}</span>
            </div>
          </div>

          {computeDeductions(slip) > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Deductions</p>
              {slip.advanceSalaryDeduction > 0 && <Row label="Advance Salary Recovery" value={`−${fmtRs(slip.advanceSalaryDeduction)}`} accent="text-red-600 dark:text-red-400" />}
              {(slip.unpaidLeaveDeduction ?? 0) > 0 && <Row label={`Unpaid Leave (${slip.unpaidLeaveDays ?? 0} days)`} value={`−${fmtRs(slip.unpaidLeaveDeduction ?? 0)}`} accent="text-red-600 dark:text-red-400" />}
              {(slip.halfDayDeduction ?? 0) > 0 && <Row label="Half Day Deduction" value={`−${fmtRs(slip.halfDayDeduction ?? 0)}`} accent="text-red-600 dark:text-red-400" />}
              {(slip.latePenaltyDeduction ?? 0) > 0 && <Row label={`Late Penalty (${slip.latePenaltyCount ?? 0} late arrivals)`} value={`−${fmtRs(slip.latePenaltyDeduction ?? 0)}`} accent="text-red-600 dark:text-red-400" />}
              <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-sm">Total Deductions</span>
                <span className="font-bold text-sm text-red-600">−{fmtRs(computeDeductions(slip))}</span>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-brand-600 text-white px-5 py-4 flex justify-between items-center">
            <span className="text-sm font-semibold">NET SALARY</span>
            <span className="text-xl font-bold">{fmtRs(computeNet(slip))}</span>
          </div>

          <p className="text-xs text-gray-400 text-center">Generated by {slip.generatedByName} on {new Date(slip.generatedAt).toLocaleDateString()}</p>
        </div>

        <div className="relative z-[2] px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Close</button>
          <button onClick={() => printSalarySlip(slip)} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">Print / Download PDF</button>
        </div>
      </div>
    </div>
  );
}

// ── Audit log section ──────────────────────────────────────────────────────────

function AuditSection() {
  const logs = useMemo(
    () => AuditLogService.getByEntityType("salary_slip").filter(l => l.action === "BULK_SALARY_SLIPS_GENERATED").slice(0, 10),
    []
  );

  if (logs.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Bulk Generation History</h3>
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              {["Generated By", "Role", "Period", "Department", "Slips", "Date & Time"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map(log => {
              const nv = (log.newValue ?? {}) as Record<string, unknown>;
              return (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">{log.performedByName}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{log.performedByRole}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{String(nv.month ?? "—")}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{String(nv.department ?? "—")}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400">
                      {String(nv.count ?? 0)} slips
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BulkSalarySlips() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const canUse = ["super_admin", "hr_admin"].includes(user?.role ?? "");

  const [employees, setEmployees]   = useState<UserProfile[]>([]);
  const [allSlips, setAllSlips]     = useState<SalarySlip[]>([]);
  const [extraData, setExtraData]   = useState<Record<string, EmployeeExtraData>>({});
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterDept, setFilterDept]     = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "generated">("all");

  // Per-row action overrides (empId → BulkAction)
  const [rowActions, setRowActions] = useState<Record<string, BulkAction>>({});

  // Viewing slip modal
  const [viewingSlip, setViewingSlip] = useState<SalarySlip | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const allUsers = await UserService.getAll();
        setEmployees(allUsers.filter(u => !EXCLUDED_ROLES.has(u.role ?? "")));
        setExtraData(safeParse<Record<string, EmployeeExtraData>>(localStorage.getItem(EXTRA_KEY), {}));
      } catch {
        showToast("Failed to load employee data", "error");
      } finally {
        setLoading(false);
      }
    })();
    setAllSlips(getSalarySlips());
  }, []);

  const departments = useMemo(
    () => [...new Set(employees.map(e => getDeptFromRole(e.role ?? "")))].sort(),
    [employees]
  );

  // Build the per-employee rows for the selected period
  const employeeRows = useMemo<EmployeeRow[]>(() => {
    return employees
      .filter(emp => filterDept === "all" || getDeptFromRole(emp.role ?? "") === filterDept)
      .map(emp => {
        const existingSlip = allSlips.find(
          s => s.employeeId === emp.id && s.salaryMonth === selectedMonth
        ) ?? null;

        const defaultAction: BulkAction = existingSlip ? "skip" : "generate";
        const action = rowActions[emp.id] ?? defaultAction;

        return {
          emp,
          dept: getDeptFromRole(emp.role ?? ""),
          basicSalary: existingSlip?.basicSalary ?? (extraData[emp.id]?.salary ?? 45000),
          existingSlip,
          action,
        };
      })
      .filter(row => {
        if (filterStatus === "pending")   return row.existingSlip === null;
        if (filterStatus === "generated") return row.existingSlip !== null;
        return true;
      });
  }, [employees, allSlips, extraData, selectedMonth, filterDept, filterStatus, rowActions]);

  const stats = useMemo(() => ({
    total:       employeeRows.length,
    toGenerate:  employeeRows.filter(r => r.action === "generate").length,
    toRegenerate:employeeRows.filter(r => r.action === "regenerate").length,
    existing:    employeeRows.filter(r => r.existingSlip !== null).length,
  }), [employeeRows]);

  const setAction = useCallback((empId: string, action: BulkAction) => {
    setRowActions(prev => ({ ...prev, [empId]: action }));
  }, []);

  const selectAllNew = useCallback(() => {
    const updates: Record<string, BulkAction> = {};
    // Reset overrides for employees without existing slips → "generate"
    employeeRows.forEach(r => {
      if (!r.existingSlip) updates[r.emp.id] = "generate";
    });
    setRowActions(prev => ({ ...prev, ...updates }));
  }, [employeeRows]);

  const skipAll = useCallback(() => {
    const updates: Record<string, BulkAction> = {};
    employeeRows.forEach(r => { updates[r.emp.id] = "skip"; });
    setRowActions(prev => ({ ...prev, ...updates }));
  }, [employeeRows]);

  const handleGenerate = useCallback(async () => {
    const toProcess = employeeRows.filter(r => r.action === "generate" || r.action === "regenerate");
    if (toProcess.length === 0) {
      showToast("No employees selected for generation. Select at least one.", "info");
      return;
    }

    setGenerating(true);
    try {
      const currentSlips = getSalarySlips();
      const generator = { id: user?.id ?? "", name: user?.name ?? "", role: user?.role ?? "" };

      const newSlips: SalarySlip[] = toProcess.map(row =>
        buildSlip(row.emp, selectedMonth, row.basicSalary, generator)
      );

      // Remove old slips for employees being regenerated
      const toRegenerateIds = new Set(
        employeeRows.filter(r => r.action === "regenerate" && r.existingSlip).map(r => r.existingSlip!.id)
      );
      const retained = currentSlips.filter(s => !toRegenerateIds.has(s.id));
      const updated  = [...retained, ...newSlips];

      saveSalarySlips(updated);
      setAllSlips(updated);

      // Reset processed rows to "skip" (slip now exists)
      const reset: Record<string, BulkAction> = {};
      toProcess.forEach(r => { reset[r.emp.id] = "skip"; });
      setRowActions(prev => ({ ...prev, ...reset }));

      // Audit log
      const monthLabel = new Date(selectedMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });
      const deptLabel  = filterDept === "all" ? "All Departments" : filterDept;
      AuditLogService.add({
        action:          "BULK_SALARY_SLIPS_GENERATED",
        entityType:      "salary_slip",
        entityId:        `bulk-${selectedMonth}-${Date.now()}`,
        entityName:      `Bulk Salary Slips — ${monthLabel}`,
        performedBy:     user?.id ?? "",
        performedByName: user?.name ?? "",
        performedByRole: user?.role ?? "",
        description:     `Generated ${newSlips.length} salary slip${newSlips.length !== 1 ? "s" : ""} for ${monthLabel} (${deptLabel}) by ${user?.name ?? ""}`,
        department:      deptLabel,
        newValue: {
          month:       selectedMonth,
          count:       newSlips.length,
          department:  deptLabel,
          employeeIds: newSlips.map(s => s.employeeId),
        },
      });

      newSlips.forEach(slip => {
        notifySalarySlipGenerated(
          user?.id ?? "", user?.name ?? "", user?.role ?? "",
          slip.employeeId, slip.employeeName, monthLabel
        );
      });

      showToast(
        `${newSlips.length} salary slip${newSlips.length !== 1 ? "s" : ""} generated successfully!`,
        "success"
      );
    } catch {
      showToast("Failed to generate salary slips", "error");
    } finally {
      setGenerating(false);
    }
  }, [employeeRows, selectedMonth, filterDept, user, showToast]);

  const handleBulkDownload = useCallback(() => {
    const slipsToDownload = employeeRows
      .filter(r => r.existingSlip !== null)
      .map(r => r.existingSlip!);

    if (slipsToDownload.length === 0) {
      showToast("No generated slips to download for current filters.", "info");
      return;
    }
    printSalarySlipsBulk(slipsToDownload);
  }, [employeeRows, showToast]);

  // ── Access guard ─────────────────────────────────────────────────────────────

  if (!canUse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <PageMeta title="Access Denied" description="" />
        <div className="text-center p-8 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-lg font-semibold text-red-700 dark:text-red-400">Access Denied</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-2">
            Only Super Admin and HR Admin can access bulk salary slip generation.
          </p>
        </div>
      </div>
    );
  }

  const activeCount = stats.toGenerate + stats.toRegenerate;
  const monthLabel  = new Date(selectedMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <>
      <PageMeta title="Bulk Salary Slips | Optivax Global" description="Generate salary slips for all active employees" />
      <PageBreadcrumb pageTitle="Bulk Salary Slip Generation" />

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 mb-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Filter Employees</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Salary Period</label>
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setRowActions({}); }}
              className={selectCls}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Department</label>
            <select
              value={filterDept}
              onChange={e => { setFilterDept(e.target.value); setRowActions({}); }}
              className={selectCls}
            >
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Slip Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as "all" | "pending" | "generated")}
              className={selectCls}
            >
              <option value="all">All Employees</option>
              <option value="pending">No Slip Yet</option>
              <option value="generated">Already Generated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Employees Shown",    value: stats.total,        color: "text-gray-900 dark:text-white" },
          { label: "Slips Already Exist",value: stats.existing,     color: "text-blue-600 dark:text-blue-400" },
          { label: "New to Generate",    value: stats.toGenerate,   color: "text-green-600 dark:text-green-400" },
          { label: "To Regenerate",      value: stats.toRegenerate, color: "text-orange-600 dark:text-orange-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Action Bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={selectAllNew}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Select All New
        </button>
        <button
          onClick={skipAll}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Deselect All
        </button>
        <div className="ml-auto flex gap-3">
          <button
            onClick={handleBulkDownload}
            className="px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-xl transition-colors whitespace-nowrap"
          >
            Bulk Download PDF ({stats.existing})
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || activeCount === 0}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors whitespace-nowrap flex items-center gap-2"
          >
            {generating && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Generate Selected ({activeCount})
          </button>
        </div>
      </div>

      {/* ── Period label ─────────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing salary slips for <strong className="text-gray-800 dark:text-gray-200">{monthLabel}</strong>
        </span>
      </div>

      {/* ── Employee Table ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {["Employee", "Department", "Role", "Basic Salary", "Slip Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {employeeRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                      No employees match the current filters.
                    </td>
                  </tr>
                ) : (
                  employeeRows.map(row => (
                    <EmployeeTableRow
                      key={row.emp.id}
                      row={row}
                      onActionChange={setAction}
                      onView={setViewingSlip}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Audit Log ───────────────────────────────────────────────────── */}
      <AuditSection />

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {viewingSlip && <SlipViewModal slip={viewingSlip} onClose={() => setViewingSlip(null)} />}
    </>
  );
}

// ── Employee table row (extracted to avoid re-render of whole table on action change) ──

function EmployeeTableRow({
  row,
  onActionChange,
  onView,
}: {
  row: EmployeeRow;
  onActionChange: (empId: string, action: BulkAction) => void;
  onView: (slip: SalarySlip) => void;
}) {
  const { emp, dept, basicSalary, existingSlip, action } = row;

  const statusBadge = (() => {
    if (action === "skip" && existingSlip)
      return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Exists — Skipped</span>;
    if (action === "regenerate")
      return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Will Regenerate</span>;
    if (action === "generate")
      return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Will Generate</span>;
    // skip with no existing slip
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Skipped</span>;
  })();

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
      {/* Employee */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.full_name || emp.email}</p>
        <p className="text-xs text-gray-400">{emp.email}</p>
      </td>

      {/* Department */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEPT_COLOR[dept] ?? "bg-gray-100 text-gray-600"}`}>
          {dept}
        </span>
      </td>

      {/* Role */}
      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{emp.role}</td>

      {/* Basic Salary */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{fmtRs(basicSalary)}</td>

      {/* Slip Status */}
      <td className="px-4 py-3 whitespace-nowrap">{statusBadge}</td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-wrap gap-1.5">
          {existingSlip ? (
            <>
              <button
                onClick={() => onView(existingSlip)}
                className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                View
              </button>
              <button
                onClick={() => onActionChange(emp.id, action === "regenerate" ? "skip" : "regenerate")}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  action === "regenerate"
                    ? "bg-orange-500 text-white"
                    : "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40"
                }`}
              >
                {action === "regenerate" ? "Regenerating ✓" : "Regenerate"}
              </button>
              <button
                onClick={() => onActionChange(emp.id, action === "skip" ? "regenerate" : "skip")}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  action === "skip"
                    ? "bg-gray-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {action === "skip" ? "Skipped ✓" : "Skip"}
              </button>
            </>
          ) : (
            <button
              onClick={() => onActionChange(emp.id, action === "generate" ? "skip" : "generate")}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                action === "generate"
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {action === "generate" ? "Selected ✓" : "Include"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
