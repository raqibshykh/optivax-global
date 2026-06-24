import { mockUsers } from "./users";

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
  date: string;         // YYYY-MM-DD
  checkIn?: string;     // HH:MM
  checkOut?: string;    // HH:MM
  status: AttendanceStatus;
  notes?: string;
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

export const STAFF_USERS = mockUsers.filter(
  (u) => u.role !== "client" && u.role !== "super_admin"
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsToHours(m: number): number {
  return Math.round((m / 60) * 10) / 10;
}

export function calcWorkingHours(checkIn: string, checkOut: string): number {
  return minsToHours(Math.max(0, timeToMins(checkOut) - timeToMins(checkIn)));
}

export function isLateArrival(checkIn: string): boolean {
  return timeToMins(checkIn) > timeToMins(LATE_THRESHOLD);
}

function companyHolidaysForYear(year: number): string[] {
  if (year === 2026) return COMPANY_HOLIDAYS_2026;
  if (year === 2025) return COMPANY_HOLIDAYS_2025;
  return [];
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

// ── Deterministic pseudo-random generator ─────────────────────────────────────

function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function randTime(baseH: number, baseM: number, spreadMins: number, seed: number): string {
  const totalMins = baseH * 60 + baseM + Math.floor(seededRand(seed) * spreadMins);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── Data Generation ───────────────────────────────────────────────────────────

// v2 key forces regeneration after status-type simplification
const YEAR_KEY = (y: number) => `mock_att_year_v2_${y}`;

export function generateYearData(year: number): AttendanceRecord[] {
  const today    = new Date();
  const holidays = companyHolidaysForYear(year);
  const records: AttendanceRecord[] = [];

  const start = new Date(year, 0, 1);
  const end   = year === today.getFullYear()
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
    : new Date(year, 11, 31);

  for (const user of STAFF_USERS) {
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr   = cur.toISOString().split("T")[0];
      const seed      = strHash(user.id + dateStr);
      const r         = seededRand(seed);
      const weekend   = isWeekend(cur);
      const isHoliday = holidays.includes(dateStr);

      let status: AttendanceStatus;
      let checkIn: string | undefined;
      let checkOut: string | undefined;

      if (weekend) {
        status = "weekly-off";
      } else if (isHoliday) {
        status = "holiday";
      } else {
        // Distribution across working days:
        // 52% present, 10% late, 6% half-day, 16% leave, 16% absent
        if (r < 0.52) {
          status   = "present";
          checkIn  = randTime(8, 30, 55, seed);          // 08:30–09:25
          checkOut = randTime(17, 0, 90, seed + 9);      // 17:00–18:30
        } else if (r < 0.62) {
          status   = "late";
          checkIn  = randTime(9, 35, 55, seed + 1);     // 09:35–10:30
          checkOut = randTime(17, 30, 60, seed + 2);    // 17:30–18:30
        } else if (r < 0.68) {
          status   = "half-day";
          checkIn  = randTime(9, 0, 30, seed + 5);      // 09:00–09:30
          checkOut = randTime(13, 0, 60, seed + 6);     // 13:00–14:00
        } else if (r < 0.84) {
          status = "leave";
        } else {
          status = "absent";
        }
      }

      records.push({
        id:       `yratt-v2-${year}-${user.id}-${dateStr}`,
        userId:   user.id,
        userName: user.name,
        userRole: user.role,
        date:     dateStr,
        checkIn,
        checkOut,
        status,
      });

      cur.setDate(cur.getDate() + 1);
    }
  }

  return records;
}

export function loadYearData(year: number): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(YEAR_KEY(year));
    if (raw) return JSON.parse(raw) as AttendanceRecord[];
  } catch { /* ignore */ }
  const data = generateYearData(year);
  try {
    localStorage.setItem(YEAR_KEY(year), JSON.stringify(data));
  } catch { /* quota exceeded — still return data */ }
  return data;
}

// ── Calculations ──────────────────────────────────────────────────────────────

export function computeMonthlyReport(
  userId: string,
  userName: string,
  userRole: string,
  month: number,
  year: number,
  allRecords: AttendanceRecord[],
): MonthlyReport {
  const daysInMonth  = new Date(year, month, 0).getDate();
  const holidays     = companyHolidaysForYear(year);
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
    if (isWeekend(dt))               weeklyOffDays++;
    else if (holidays.includes(str)) companyHolidayDays++;
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
    if (r.checkIn && r.checkOut) {
      totalWorkingHours += calcWorkingHours(r.checkIn, r.checkOut);
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
): YearlyReport {
  const holidays = companyHolidaysForYear(year);
  const today    = new Date();

  let totalWorkingDays = 0;
  const daysInYear = year % 4 === 0 ? 366 : 365;
  for (let d = 0; d < daysInYear; d++) {
    const dt  = new Date(year, 0, d + 1);
    if (dt > today && year === today.getFullYear()) break;
    const str = dt.toISOString().split("T")[0];
    if (!isWeekend(dt) && !holidays.includes(str)) totalWorkingDays++;
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

// ── Export Utilities ──────────────────────────────────────────────────────────

export function exportCSV(headers: string[], rows: (string | number)[][], filename: string): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines  = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPrintHTML(title: string, tableHTML: string): void {
  const win = window.open("", "_blank", "width=1100,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
      h2{font-size:16px;margin-bottom:4px}
      p.sub{font-size:11px;color:#666;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;font-weight:700;font-size:10px;text-transform:uppercase;padding:6px 8px;border:1px solid #ccc;text-align:left}
      td{padding:5px 8px;border:1px solid #ddd;vertical-align:top}
      tr:nth-child(even) td{background:#fafafa}
      @media print{@page{size:landscape;margin:10mm}}
    </style>
  </head><body>
    <h2>${title}</h2>
    <p class="sub">Generated: ${new Date().toLocaleString()}</p>
    ${tableHTML}
    <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
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

export function getUserDeptId(userId: string): string {
  const u = STAFF_USERS.find((x) => x.id === userId);
  return (u as { departmentId?: string })?.departmentId
    || ROLE_TO_DEPT[(u as { role?: string })?.role ?? ""] || "";
}

export function getUsersInDept(deptId: string): typeof STAFF_USERS {
  return STAFF_USERS.filter(
    (u) => (u as { departmentId?: string }).departmentId === deptId
      || ROLE_TO_DEPT[(u as { role?: string }).role ?? ""] === deptId
  );
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

function loadEmployeeExtra(): Record<string, { salary?: number }> {
  try {
    const raw = localStorage.getItem("optivax_employee_extra");
    if (raw) {
      const arr = JSON.parse(raw) as Array<{ userId: string; salary?: number }>;
      return Object.fromEntries(arr.map((x) => [x.userId, x]));
    }
  } catch { /* ignore */ }
  return {};
}

export function computePayrollEntry(report: MonthlyReport): PayrollEntry {
  const extra      = loadEmployeeExtra();
  const baseSalary = extra[report.userId]?.salary ?? ROLE_BASE_SALARY[report.userRole] ?? 60000;
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

// ── Attendance Audit Log ──────────────────────────────────────────────────────
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

const AUDIT_KEY = "mock_att_audit_v2";

function seedAuditLog(): AuditEntry[] {
  const now       = new Date();
  const employees = STAFF_USERS.slice(0, 6);
  const statuses: AttendanceStatus[] = ["absent", "late", "half-day", "leave", "absent", "late"];
  const newStats:  AttendanceStatus[] = ["present", "present", "present", "present", "leave", "present"];
  const reasons = [
    "Biometric device offline — employee confirmed present",
    "Late marked incorrectly — system clock error on device",
    "Employee was present full day — half-day was a data entry error",
    "Leave approved retroactively for medical emergency",
    "Reclassified from absent to leave per HR instruction",
    "Device sync failure caused incorrect late marking",
  ];

  return employees.map((u, i) => ({
    id:             `audit-v2-${String(i + 1).padStart(3, "0")}`,
    editedAt:       new Date(now.getTime() - (i + 1) * 7200000).toISOString(),
    editedBy:       "Super Admin",
    editedByRole:   "super_admin",
    employeeId:     u.id,
    employeeName:   u.name,
    attendanceDate: new Date(now.getTime() - (i + 2) * 86400000).toISOString().split("T")[0],
    previousStatus: statuses[i],
    newStatus:      newStats[i],
    previousCheckIn:  i % 2 === 0 ? "10:15" : undefined,
    previousCheckOut: i % 2 === 0 ? "17:00" : undefined,
    newCheckIn:       i % 2 === 0 ? "09:00" : undefined,
    newCheckOut:      i % 2 === 0 ? "17:00" : undefined,
    reason:         reasons[i],
  }));
}

export function getAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (raw) return JSON.parse(raw) as AuditEntry[];
  } catch { /* ignore */ }
  const seed = seedAuditLog();
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(seed)); } catch { /* quota */ }
  return seed;
}

export function appendAuditEntry(entry: Omit<AuditEntry, "id">): void {
  const log  = getAuditLog();
  const full: AuditEntry = { id: `audit-v2-${Date.now()}`, ...entry };
  log.unshift(full);
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 500))); } catch { /* quota */ }
}
