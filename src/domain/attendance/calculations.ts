// Pure attendance calculation logic — relocated verbatim from src/mock/attendanceData.ts.
// No business rule/formula here has changed; only the data source changed (callers now
// fetch AttendanceRecord[] via AttendanceService instead of reading loadYearData()'s
// localStorage cache). The deterministic demo-data generator (generateYearData) was
// intentionally NOT relocated here — see AttendanceService.getYearData for details.

import { DEFAULT_SHIFT, isLate, workedMinutesSimple, type ShiftConfig } from "./shift";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Simplified status set per company policy.
 * All leave types are unpaid. Remote WFH removed — must be marked present/leave.
 */
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half-day"
  | "leave"
  | "weekly-off"
  | "holiday";

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  date: string;         // YYYY-MM-DD — the Shift Date (the date the shift started), not necessarily the calendar date of every punch in it
  checkIn?: string;     // HH:MM
  checkOut?: string;    // HH:MM
  status: AttendanceStatus;
  notes?: string;
  // Multi-punch summary (biometric-sourced rows only — null/undefined on older rows and on
  // manual self-check-in rows, which are always a simple single in/out pair). When present,
  // calcWorkingHours() prefers these over deriving from checkIn/checkOut.
  shiftId?: string | null;
  workedMinutes?: number | null;
  breakMinutes?: number | null;
  overtimeMinutes?: number | null;
  punchCount?: number | null;
}

export interface MonthlyReport {
  userId: string;
  userName: string;
  userRole: string;
  month: number;   // 1–12
  year: number;
  // Calendar structure
  totalDaysInMonth: number;
  weeklyOffDays: number;
  companyHolidayDays: number;
  totalWorkingDays: number;
  // Attendance counts
  presentDays: number;   // present + late (on-time or late, still present)
  absentDays: number;    // absent status
  leaveDays: number;     // leave status (all treated as unpaid)
  halfDays: number;
  lateArrivals: number;
  // Hours
  totalWorkingHours: number;
  // Summary
  attendancePercentage: number;
}

export interface YearlyReport {
  userId: string;
  userName: string;
  userRole: string;
  year: number;
  totalWorkingDays: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  totalLeaveDays: number;
  totalHalfDays: number;
  totalLateArrivals: number;
  annualAttendancePercentage: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const COMPANY_HOLIDAYS_2026: string[] = [
  "2026-01-01",  // New Year's Day
  "2026-01-26",  // Republic Day
  "2026-03-25",  // Holi
  "2026-04-14",  // Ambedkar Jayanti
  "2026-05-01",  // Labour Day
  "2026-08-15",  // Independence Day
  "2026-10-02",  // Gandhi Jayanti
  "2026-11-14",  // Diwali
  "2026-12-25",  // Christmas
];

export const COMPANY_HOLIDAYS_2025: string[] = [
  "2025-01-01",
  "2025-01-26",
  "2025-03-14",
  "2025-04-14",
  "2025-05-01",
  "2025-08-15",
  "2025-10-02",
  "2025-10-20",
  "2025-12-25",
];

export const STANDARD_CHECKIN  = "09:00";
export const LATE_THRESHOLD    = "09:30";
export const STANDARD_CHECKOUT = "17:00";
export const EARLY_THRESHOLD   = "17:00";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsToHours(m: number): number {
  return Math.round((m / 60) * 10) / 10;
}

/**
 * `config` is optional (defaults to the standard 09:00-17:00 day shift, i.e. today's exact
 * prior behavior) — every existing call site that doesn't pass one is unaffected. For a
 * crossing shift, a checkOut numerically earlier than checkIn is treated as "next day" instead
 * of clamped to 0, which is what made this wrong for overnight shifts before.
 */
export function calcWorkingHours(checkIn: string, checkOut: string, config: ShiftConfig = DEFAULT_SHIFT): number {
  return minsToHours(workedMinutesSimple(checkIn, checkOut, config));
}

/**
 * Prefers the record's own stored workedMinutes (set by multi-punch aggregation on the
 * biometric-sourced path — accounts for breaks, not just first-in/last-out) when present,
 * falling back to deriving from checkIn/checkOut for older rows or manual self-check-in rows.
 */
export function calcWorkingHoursForRecord(record: AttendanceRecord, config: ShiftConfig = DEFAULT_SHIFT): number {
  if (record.workedMinutes != null) {
    return minsToHours(record.workedMinutes);
  }
  if (record.checkIn && record.checkOut) {
    return calcWorkingHours(record.checkIn, record.checkOut, config);
  }
  return 0;
}

export function isLateArrival(checkIn: string, config: ShiftConfig = DEFAULT_SHIFT): boolean {
  return isLate(checkIn, config);
}

function companyHolidaysForYear(year: number): string[] {
  if (year === 2026) return COMPANY_HOLIDAYS_2026;
  if (year === 2025) return COMPANY_HOLIDAYS_2025;
  return [];
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

/**
 * The single "is this shift date a holiday" check — pass the live list from
 * CompanyHolidayService.getAll() (falls back to companyHolidaysForYear()'s hardcoded arrays
 * when the caller has none loaded yet, e.g. before the first fetch resolves). `shiftDate` must
 * be the record's Shift Date (the date the shift started), never the calendar date of an
 * individual punch — a shift starting 31-Dec 22:00 is holiday-status only if 31-Dec itself is
 * the configured holiday, never because part of it falls on 1-Jan. Replaces four independent
 * re-implementations of this same check (computeMonthlyReport, computeYearlyReport,
 * payrollService.countWeekdaysInRangeForMonth, LeaveRequests.calcDays).
 */
export function isCompanyHoliday(shiftDate: string, liveHolidays?: string[] | null): boolean {
  if (liveHolidays && liveHolidays.length > 0) {
    return liveHolidays.includes(shiftDate);
  }
  const [y] = shiftDate.split("-").map(Number);
  return companyHolidaysForYear(y).includes(shiftDate);
}

/** True when `shiftDate` is neither a weekend nor a company holiday — the shared "is this a working day" predicate the 4 duplicated call sites now share. */
export function isWorkingDay(shiftDate: string, liveHolidays?: string[] | null): boolean {
  const [y, m, d] = shiftDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return !isWeekend(dt) && !isCompanyHoliday(shiftDate, liveHolidays);
}

// ── Calculations ──────────────────────────────────────────────────────────────

export function computeMonthlyReport(
  userId: string,
  userName: string,
  userRole: string,
  month: number,
  year: number,
  allRecords: AttendanceRecord[],
  liveHolidays?: string[] | null,
): MonthlyReport {
  const daysInMonth  = new Date(year, month, 0).getDate();
  const userRecs     = allRecords.filter((r) => {
    if (r.userId !== userId) return false;
    const [ry, rm] = r.date.split("-").map(Number);
    return ry === year && rm === month;
  });

  let weeklyOffDays      = 0;
  let companyHolidayDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt  = new Date(year, month - 1, d);
    const str = dt.toISOString().split("T")[0];
    if (isWeekend(dt))                              weeklyOffDays++;
    else if (isCompanyHoliday(str, liveHolidays))    companyHolidayDays++;
  }
  const totalWorkingDays = daysInMonth - weeklyOffDays - companyHolidayDays;

  // present = present + late (both counted as attendance)
  const presentDays  = userRecs.filter((r) => r.status === "present" || r.status === "late").length;
  const absentDays   = userRecs.filter((r) => r.status === "absent").length;
  const leaveDays    = userRecs.filter((r) => r.status === "leave").length;
  const halfDays     = userRecs.filter((r) => r.status === "half-day").length;
  const lateArrivals = userRecs.filter((r) => r.status === "late" || (r.checkIn && isLateArrival(r.checkIn))).length;

  let totalWorkingHours = 0;
  for (const r of userRecs) {
    if (r.workedMinutes != null || (r.checkIn && r.checkOut)) {
      totalWorkingHours += calcWorkingHoursForRecord(r);
    }
  }

  // Attendance % = (presentDays + halfDays×0.5) ÷ totalWorkingDays
  const effectivePresent = presentDays + halfDays * 0.5;
  const attendancePercentage = totalWorkingDays > 0
    ? Math.round((effectivePresent / totalWorkingDays) * 1000) / 10
    : 0;

  return {
    userId, userName, userRole, month, year,
    totalDaysInMonth:  daysInMonth,
    weeklyOffDays,
    companyHolidayDays,
    totalWorkingDays,
    presentDays,
    absentDays,
    leaveDays,
    halfDays,
    lateArrivals,
    totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
    attendancePercentage,
  };
}

export function computeYearlyReport(
  userId: string,
  userName: string,
  userRole: string,
  year: number,
  allRecords: AttendanceRecord[],
  liveHolidays?: string[] | null,
): YearlyReport {
  const today = new Date();

  let totalWorkingDays = 0;
  const daysInYear = year % 4 === 0 ? 366 : 365;
  for (let d = 0; d < daysInYear; d++) {
    const dt  = new Date(year, 0, d + 1);
    if (dt > today && year === today.getFullYear()) break;
    const str = dt.toISOString().split("T")[0];
    if (isWorkingDay(str, liveHolidays)) totalWorkingDays++;
  }

  const userRecs = allRecords.filter((r) => {
    if (r.userId !== userId) return false;
    const [ry] = r.date.split("-").map(Number);
    return ry === year;
  });

  const totalPresentDays  = userRecs.filter((r) => r.status === "present" || r.status === "late").length;
  const totalAbsentDays   = userRecs.filter((r) => r.status === "absent").length;
  const totalLeaveDays    = userRecs.filter((r) => r.status === "leave").length;
  const totalHalfDays     = userRecs.filter((r) => r.status === "half-day").length;
  const totalLateArrivals = userRecs.filter((r) => r.status === "late" || (r.checkIn && isLateArrival(r.checkIn))).length;

  const effective = totalPresentDays + totalHalfDays * 0.5;
  const annualAttendancePercentage = totalWorkingDays > 0
    ? Math.round((effective / totalWorkingDays) * 1000) / 10
    : 0;

  return {
    userId, userName, userRole, year,
    totalWorkingDays,
    totalPresentDays,
    totalAbsentDays,
    totalLeaveDays,
    totalHalfDays,
    totalLateArrivals,
    annualAttendancePercentage,
  };
}

// ── Month/Year label helpers ──────────────────────────────────────────────────

export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function monthLabel(m: number): string { return MONTHS[m - 1] ?? ""; }

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  late:          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "half-day":    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  absent:        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  leave:         "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "weekly-off":  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  holiday:       "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
};

// ── Department helpers ────────────────────────────────────────────────────────

export const DEPT_LABELS: Record<string, string> = {
  "dept-sales":      "Sales",
  "dept-production": "Production",
  "dept-marketing":  "Marketing",
  "dept-hr":         "HR",
  "dept-it-support": "IT Support",
};

export const DEPT_IDS = Object.keys(DEPT_LABELS);

export const ROLE_TO_DEPT: Record<string, string> = {
  sales_admin:        "dept-sales",
  sales_member:       "dept-sales",
  production_admin:   "dept-production",
  production_member:  "dept-production",
  marketing_admin:    "dept-marketing",
  marketing_member:   "dept-marketing",
  hr_admin:           "dept-hr",
  hr_member:          "dept-hr",
  it_admin:           "dept-it-support",
  it_member:          "dept-it-support",
};

export function getAccessibleDepts(role: string): string[] | "all" {
  if (["super_admin", "management", "hr_admin", "hr_member"].includes(role)) return "all";
  const dept = ROLE_TO_DEPT[role];
  return dept ? [dept] : [];
}

// ── Payroll engine ────────────────────────────────────────────────────────────
//
// POLICY:
//  • Every leave day (leave + absent status) = 1 full day salary deduction
//  • Half-day = 0.5 day salary deduction
//  • Every 3 late arrivals = 1 full day salary deduction (counter resets every 3)
//  • Final Salary = Basic Salary − Leave Deductions − Late Penalty

export interface PayrollEntry {
  userId: string;
  userName: string;
  userRole: string;
  month: number;
  year: number;
  baseSalary: number;
  dailyRate: number;
  // Leave deduction components
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  leaveDeduction: number;    // (absentDays + leaveDays) × dailyRate
  halfDayDeduction: number;  // halfDays × dailyRate × 0.5
  totalLeaveDeduction: number; // leaveDeduction + halfDayDeduction
  // Late penalty (every 3 lates = 1 day)
  lateArrivals: number;
  latePenaltyDays: number;   // Math.floor(lateArrivals / 3)
  latePenalty: number;       // latePenaltyDays × dailyRate
  // Summary
  totalDeductions: number;   // totalLeaveDeduction + latePenalty
  netPayable: number;        // max(0, baseSalary - totalDeductions)
}

const ROLE_BASE_SALARY: Record<string, number> = {
  management:        150000,
  hr_admin:           85000,
  hr_member:          55000,
  sales_admin:        90000,
  sales_member:       65000,
  production_admin:   80000,
  production_member:  58000,
  marketing_admin:    82000,
  marketing_member:   58000,
  it_admin:           95000,
  it_member:          70000,
};

export function computePayrollEntry(
  report: MonthlyReport,
  employeeExtra: Record<string, { salary?: number }> = {}
): PayrollEntry {
  const baseSalary = employeeExtra[report.userId]?.salary ?? ROLE_BASE_SALARY[report.userRole] ?? 60000;
  const wdays      = Math.max(report.totalWorkingDays, 1);
  const dailyRate  = baseSalary / wdays;

  // Leave deductions: every absent or leave day = 1 full day
  const leaveDeduction    = Math.round((report.absentDays + report.leaveDays) * dailyRate);
  const halfDayDeduction  = Math.round(report.halfDays * dailyRate * 0.5);
  const totalLeaveDeduction = leaveDeduction + halfDayDeduction;

  // Late penalty: every 3 late arrivals = 1 day deduction (counter resets)
  const latePenaltyDays = Math.floor(report.lateArrivals / 3);
  const latePenalty     = Math.round(latePenaltyDays * dailyRate);

  const totalDeductions = totalLeaveDeduction + latePenalty;
  const netPayable      = Math.max(0, baseSalary - totalDeductions);

  return {
    userId: report.userId, userName: report.userName, userRole: report.userRole,
    month: report.month, year: report.year,
    baseSalary,
    dailyRate:  Math.round(dailyRate),
    absentDays:    report.absentDays,
    leaveDays:     report.leaveDays,
    halfDays:      report.halfDays,
    leaveDeduction, halfDayDeduction, totalLeaveDeduction,
    lateArrivals:  report.lateArrivals,
    latePenaltyDays, latePenalty,
    totalDeductions, netPayable,
  };
}

export function fmtRs(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

// ── Attendance Audit Log types ─────────────────────────────────────────────────
//
// Only super_admin can edit attendance records.
// Every edit is logged here with full before/after detail.

export interface AuditEntry {
  id: string;
  editedAt: string;          // ISO timestamp
  editedBy: string;          // super_admin name
  editedByRole: string;      // always "super_admin"
  employeeId: string;
  employeeName: string;
  attendanceDate: string;    // the YYYY-MM-DD date whose record was changed
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  previousCheckIn?: string;
  previousCheckOut?: string;
  newCheckIn?: string;
  newCheckOut?: string;
  reason: string;            // required — super_admin must state reason
}
