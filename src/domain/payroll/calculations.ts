// Pure payroll calculation logic — relocated verbatim from src/mock/payrollData.ts.
// No business rule/formula here has changed; only the data source changed (callers
// now pass in the records this used to read from localStorage directly).

export interface PayrollItem {
  label: string;
  amount: number;
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  salaryMonth: string; // "YYYY-MM"
  basicSalary: number;
  allowances?: PayrollItem[]; // kept optional for stored-record compat; ignored in all calculations
  bonuses?: PayrollItem[]; // kept optional for stored-record compat; ignored in all calculations
  deductions: PayrollItem[];
  advanceSalaryDeduction: number;
  unpaidLeaveDays?: number;
  unpaidLeaveDeduction?: number;
  halfDayDeduction?: number;
  latePenaltyCount?: number;
  latePenaltyDays?: number;
  latePenaltyDeduction?: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  generatedAt: string;
  generatedById: string;
  generatedByName: string;
  generatedByRole: string;
  notes?: string;
}

export type AdvanceStatus = "pending" | "approved" | "rejected" | "paid";

export interface AdvanceSalaryRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  requestedAmount: number;
  reason: string;
  requestDate: string;
  status: AdvanceStatus;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

// Policy: grossSalary === basicSalary (the employee's official monthly salary).
// Allowances/bonuses are NOT added separately — gross = monthly salary.
export const computeGross = (s: SalarySlip) => s.basicSalary;

export const computeDeductions = (s: SalarySlip) =>
  s.advanceSalaryDeduction +
  (s.unpaidLeaveDeduction ?? 0) +
  (s.halfDayDeduction ?? 0) +
  (s.latePenaltyDeduction ?? 0) +
  s.deductions.reduce((a, i) => a + i.amount, 0);

export const computeNet = (s: SalarySlip) => computeGross(s) - computeDeductions(s);

// ── Salary slip display breakdown ─────────────────────────────────────────────
// Splits grossSalary (= employee monthly salary) into display components for salary slips.
// Percentages: Basic 50%, House Rent 30%, Medical 10%, Conveyance 10% (remainder).

export interface SlipBreakdown {
  basic: number;
  hra: number;
  medical: number;
  conveyance: number;
}

export function computeSlipBreakdown(grossSalary: number): SlipBreakdown {
  const basic = Math.round(grossSalary * 0.5);
  const hra = Math.round(grossSalary * 0.3);
  const medical = Math.round(grossSalary * 0.1);
  const conveyance = grossSalary - basic - hra - medical;
  return { basic, hra, medical, conveyance };
}

export interface SlipStats {
  totalSlips: number;
  totalNetPaid: number;
  pendingAdvances: number;
  pendingAdvanceAmount: number;
}

export function getPayrollStats(slips: SalarySlip[], requests: AdvanceSalaryRequest[]): SlipStats {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthSlips = slips.filter((s) => s.salaryMonth === currentMonth);
  const pending = requests.filter((r) => r.status === "pending");
  return {
    totalSlips: slips.length,
    totalNetPaid: thisMonthSlips.reduce((s, sl) => s + sl.netSalary, 0),
    pendingAdvances: pending.length,
    pendingAdvanceAmount: pending.reduce((s, r) => s + r.requestedAmount, 0),
  };
}

// ── Visibility logic (unchanged policy — who can view/approve advance requests) ──

const HR_ROLES = new Set(["hr_admin", "hr_member"]);
const MGMT_ROLES = new Set(["management"]);
const SA_ROLES = new Set(["super_admin"]);
const DEPT_ADMIN_ROLES = new Set(["sales_admin", "production_admin", "marketing_admin", "it_admin"]);

function _deptPrefix(role: string): string {
  const idx = role.indexOf("_");
  return idx > 0 ? role.slice(0, idx) : role;
}

export function canViewRequest(viewerRole: string, viewerId: string, req: AdvanceSalaryRequest): boolean {
  if (viewerId === req.employeeId) return true;

  const isSA = SA_ROLES.has(viewerRole);
  const isMgmt = MGMT_ROLES.has(viewerRole);
  const isHR = HR_ROLES.has(viewerRole);
  const isDeptAdmin = DEPT_ADMIN_ROLES.has(viewerRole);

  if (SA_ROLES.has(req.employeeRole)) return isMgmt;
  if (MGMT_ROLES.has(req.employeeRole)) return isHR || isSA;
  if (HR_ROLES.has(req.employeeRole)) return isMgmt || isSA;
  if (DEPT_ADMIN_ROLES.has(req.employeeRole)) return isHR || isMgmt || isSA;

  if (req.employeeRole.endsWith("_member")) {
    const empDept = _deptPrefix(req.employeeRole);
    if (isDeptAdmin && _deptPrefix(viewerRole) === empDept) return true;
    return isHR || isMgmt || isSA;
  }

  return isMgmt || isSA;
}

export function canApproveRequest(viewerRole: string, viewerId: string, req: AdvanceSalaryRequest): boolean {
  if (viewerId === req.employeeId) return false;
  return canViewRequest(viewerRole, viewerId, req);
}

// ── Strict deductions ──────────────────────────────────────────────────────────
// Same formula as before. Previously this function read `mock_leave_requests`,
// attendance year data, and advance-salary records directly from localStorage;
// now the caller (PayrollService) fetches those via AttendanceService/AdvanceSalaryService
// and passes them in, so the math itself is untouched.

const ADVANCE_INSTALLMENT_MONTHS = 3;

export interface MonthlyAttendanceSummary {
  absentDays: number;
  halfDays: number;
  lateArrivals: number;
}

export interface StrictDeductions {
  advanceSalaryDeduction: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  halfDayDeduction: number;
  lateCount: number;
  lateAttendanceDeduction: number;
}

export function computeStrictDeductions(
  basicSalary: number,
  approvedAdvances: AdvanceSalaryRequest[],
  pastSlips: SalarySlip[],
  approvedLeaveDaysInMonth: number,
  monthlyAttendance: MonthlyAttendanceSummary | null
): StrictDeductions {
  const totalApprovedAdvance = approvedAdvances.reduce((s, r) => s + r.requestedAmount, 0);
  const totalRecovered = pastSlips.reduce((s, sl) => s + sl.advanceSalaryDeduction, 0);
  const outstandingAdvance = Math.max(0, totalApprovedAdvance - totalRecovered);
  const monthlyInstallment =
    totalApprovedAdvance > 0 ? Math.ceil(totalApprovedAdvance / ADVANCE_INSTALLMENT_MONTHS) : 0;
  const advanceSalaryDeduction = Math.min(outstandingAdvance, monthlyInstallment);

  const unpaidLeaveDays = approvedLeaveDaysInMonth + (monthlyAttendance?.absentDays ?? 0);
  const halfDaysCount = monthlyAttendance?.halfDays ?? 0;
  const lateCount = monthlyAttendance?.lateArrivals ?? 0;

  const dailyRate = basicSalary > 0 ? basicSalary / 30 : 0;
  const unpaidLeaveDeduction = Math.round(unpaidLeaveDays * dailyRate);
  const halfDayDeduction = Math.round(halfDaysCount * dailyRate * 0.5);
  const lateAttendanceDeduction = Math.round(Math.floor(lateCount / 3) * dailyRate);

  return {
    advanceSalaryDeduction,
    unpaidLeaveDays,
    unpaidLeaveDeduction,
    halfDayDeduction,
    lateCount,
    lateAttendanceDeduction,
  };
}
