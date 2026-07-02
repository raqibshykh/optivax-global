import { loadYearData, computeMonthlyReport, STAFF_USERS, COMPANY_HOLIDAYS_2026, COMPANY_HOLIDAYS_2025 } from "./attendanceData";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  salaryMonth: string;             // "YYYY-MM"
  basicSalary: number;
  allowances?: PayrollItem[];      // kept optional for stored-record compat; ignored in all calculations
  bonuses?: PayrollItem[];         // kept optional for stored-record compat; ignored in all calculations
  deductions: PayrollItem[];
  advanceSalaryDeduction: number;
  // Attendance-based deductions (policy: all leaves unpaid, every 3 lates = 1 day deduction)
  unpaidLeaveDays?: number;        // leave + absent days for the month
  unpaidLeaveDeduction?: number;   // unpaidLeaveDays × dailyRate
  halfDayDeduction?: number;       // halfDays × dailyRate × 0.5
  latePenaltyCount?: number;       // total late arrivals
  latePenaltyDays?: number;        // floor(lateArrivals / 3)
  latePenaltyDeduction?: number;   // latePenaltyDays × dailyRate
  grossSalary: number;             // equals basicSalary — policy: no allowances or bonuses
  totalDeductions: number;         // all deductions combined
  netSalary: number;               // basicSalary - totalDeductions
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

// ── Storage keys ──────────────────────────────────────────────────────────────

export const SALARY_SLIPS_KEY       = "mock_salary_slips";
export const ADVANCE_REQUESTS_KEY   = "mock_advance_requests";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
// These components are DISPLAY ONLY — they always sum to grossSalary and do not add extra earnings.
// Percentages: Basic 50%, House Rent 30%, Medical 10%, Conveyance 10% (remainder).

export interface SlipBreakdown {
  basic:      number; // 50% of gross
  hra:        number; // 30% of gross
  medical:    number; // 10% of gross
  conveyance: number; // remainder (ensures exact sum = gross)
}

export function computeSlipBreakdown(grossSalary: number): SlipBreakdown {
  const basic      = Math.round(grossSalary * 0.50);
  const hra        = Math.round(grossSalary * 0.30);
  const medical    = Math.round(grossSalary * 0.10);
  const conveyance = grossSalary - basic - hra - medical;
  return { basic, hra, medical, conveyance };
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_SLIPS: SalarySlip[] = [
  {
    id: "slip-001",
    employeeId: "u8",
    employeeName: "James Carter",
    employeeEmail: "sales.admin@example.com",
    department: "Sales",
    designation: "Sales Admin",
    salaryMonth: "2026-04",
    basicSalary: 65000,
    allowances: [],
    bonuses: [],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 65000,
    totalDeductions: 0,
    netSalary: 65000,
    generatedAt: "2026-04-30T10:00:00.000Z",
    generatedById: "u11",
    generatedByName: "Ava Johnson",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-002",
    employeeId: "u9",
    employeeName: "David Chen",
    employeeEmail: "production.admin@example.com",
    department: "Production",
    designation: "Production Admin",
    salaryMonth: "2026-04",
    basicSalary: 55000,
    allowances: [],
    bonuses: [],
    deductions: [],
    advanceSalaryDeduction: 15000,
    grossSalary: 55000,
    totalDeductions: 15000,
    netSalary: 40000,
    generatedAt: "2026-04-30T10:15:00.000Z",
    generatedById: "u11",
    generatedByName: "Ava Johnson",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-003",
    employeeId: "u10",
    employeeName: "Olivia Brown",
    employeeEmail: "marketing.admin@example.com",
    department: "Marketing",
    designation: "Marketing Admin",
    salaryMonth: "2026-04",
    basicSalary: 48000,
    allowances: [],
    bonuses: [],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 48000,
    totalDeductions: 0,
    netSalary: 48000,
    generatedAt: "2026-04-30T10:30:00.000Z",
    generatedById: "u11",
    generatedByName: "Ava Johnson",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-004",
    employeeId: "u8",
    employeeName: "James Carter",
    employeeEmail: "sales.admin@example.com",
    department: "Sales",
    designation: "Sales Admin",
    salaryMonth: "2026-05",
    basicSalary: 65000,
    allowances: [],
    bonuses: [],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 65000,
    totalDeductions: 0,
    netSalary: 65000,
    generatedAt: "2026-05-31T10:00:00.000Z",
    generatedById: "u11",
    generatedByName: "Ava Johnson",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-005",
    employeeId: "u15",
    employeeName: "Ethan Lee",
    employeeEmail: "hr.member@example.com",
    department: "HR",
    designation: "HR Specialist",
    salaryMonth: "2026-05",
    basicSalary: 42000,
    allowances: [],
    bonuses: [],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 42000,
    totalDeductions: 0,
    netSalary: 42000,
    generatedAt: "2026-05-31T11:00:00.000Z",
    generatedById: "u11",
    generatedByName: "Ava Johnson",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-006",
    employeeId: "u9",
    employeeName: "David Chen",
    employeeEmail: "production.admin@example.com",
    department: "Production",
    designation: "Production Admin",
    salaryMonth: "2026-05",
    basicSalary: 55000,
    allowances: [],
    bonuses: [],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 55000,
    totalDeductions: 0,
    netSalary: 55000,
    generatedAt: "2026-05-31T11:30:00.000Z",
    generatedById: "u11",
    generatedByName: "Ava Johnson",
    generatedByRole: "hr_admin",
  },
];

const SEED_ADVANCE_REQUESTS: AdvanceSalaryRequest[] = [
  {
    id: "adv-001",
    employeeId: "u9",
    employeeName: "David Chen",
    employeeRole: "production_admin",
    department: "Production",
    requestedAmount: 15000,
    reason: "Emergency medical expenses for family member.",
    requestDate: "2026-04-10T09:00:00.000Z",
    status: "paid",
    approvedById: "u11",
    approvedByName: "Ava Johnson",
    approvedAt: "2026-04-11T10:30:00.000Z",
    notes: "Approved with deduction in April salary.",
  },
  {
    id: "adv-002",
    employeeId: "u10",
    employeeName: "Olivia Brown",
    employeeRole: "marketing_admin",
    department: "Marketing",
    requestedAmount: 20000,
    reason: "Home renovation expenses.",
    requestDate: "2026-05-05T11:00:00.000Z",
    status: "approved",
    approvedById: "u2",
    approvedByName: "Sarah Mitchell",
    approvedAt: "2026-05-06T09:15:00.000Z",
    notes: "Deduction to be spread over 2 months.",
  },
  {
    id: "adv-003",
    employeeId: "u12",
    employeeName: "Emma Wilson",
    employeeRole: "sales_member",
    department: "Sales",
    requestedAmount: 10000,
    reason: "Children school fee payment.",
    requestDate: "2026-06-01T08:30:00.000Z",
    status: "pending",
  },
  {
    id: "adv-004",
    employeeId: "u15",
    employeeName: "Ethan Lee",
    employeeRole: "hr_member",
    department: "HR",
    requestedAmount: 25000,
    reason: "Vehicle repair after accident.",
    requestDate: "2026-06-05T10:00:00.000Z",
    status: "pending",
  },
  {
    id: "adv-005",
    employeeId: "u22",
    employeeName: "Chris Nolan",
    employeeRole: "sales_member",
    department: "Sales",
    requestedAmount: 30000,
    reason: "Business trip advance before reimbursement.",
    requestDate: "2026-06-10T14:00:00.000Z",
    status: "rejected",
    approvedById: "u11",
    approvedByName: "Ava Johnson",
    approvedAt: "2026-06-11T09:00:00.000Z",
    rejectionReason: "Advance limit exceeded for this quarter. Please submit a reimbursement claim instead.",
  },
  {
    id: "adv-006",
    employeeId: "u24",
    employeeName: "Edgar Wright",
    employeeRole: "production_member",
    department: "Production",
    requestedAmount: 8000,
    reason: "Utility bills during power outage recovery period.",
    requestDate: "2026-06-15T11:30:00.000Z",
    status: "pending",
  },
];

// ── CRUD ──────────────────────────────────────────────────────────────────────

function seed<T>(key: string, data: T[]): T[] {
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw) as T[]; } catch { /* fall through to seed */ }
  }
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

export const getSalarySlips = (): SalarySlip[] =>
  seed<SalarySlip>(SALARY_SLIPS_KEY, SEED_SLIPS);

export const saveSalarySlips = (slips: SalarySlip[]) =>
  localStorage.setItem(SALARY_SLIPS_KEY, JSON.stringify(slips));

export const appendSalarySlip = (slip: SalarySlip) => {
  const all = getSalarySlips();
  const idx = all.findIndex(s => s.id === slip.id);
  const updated = idx >= 0 ? all.map((s, i) => (i === idx ? slip : s)) : [...all, slip];
  saveSalarySlips(updated);
};

export const getAdvanceRequests = (): AdvanceSalaryRequest[] =>
  seed<AdvanceSalaryRequest>(ADVANCE_REQUESTS_KEY, SEED_ADVANCE_REQUESTS);

export const saveAdvanceRequests = (reqs: AdvanceSalaryRequest[]) =>
  localStorage.setItem(ADVANCE_REQUESTS_KEY, JSON.stringify(reqs));

// ── Advance Salary Audit Log ──────────────────────────────────────────────────

export type AdvanceAuditAction =
  | "REQUEST_CREATED"
  | "APPROVED"
  | "REJECTED"
  | "MARKED_PAID"
  | "CANCELLED"
  | "SELF_APPROVAL_ATTEMPT";

export interface AdvanceSalaryAuditEntry {
  id: string;
  action: AdvanceAuditAction;
  requestId: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  amount: number;
  performedById: string;
  performedByName: string;
  performedByRole: string;
  timestamp: string;
  notes?: string;
}

export const ADVANCE_AUDIT_KEY = "mock_advance_salary_audit";

export function getAdvanceAuditLog(): AdvanceSalaryAuditEntry[] {
  try {
    const raw = localStorage.getItem(ADVANCE_AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AdvanceSalaryAuditEntry[]) : [];
  } catch { return []; }
}

export function appendAdvanceAuditEntry(entry: Omit<AdvanceSalaryAuditEntry, "id" | "timestamp">): void {
  const log = getAdvanceAuditLog();
  const full: AdvanceSalaryAuditEntry = {
    ...entry,
    id: `adv-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  // Cap at 1000 most recent entries
  const updated = [full, ...log].slice(0, 1000);
  try { localStorage.setItem(ADVANCE_AUDIT_KEY, JSON.stringify(updated)); } catch { /* storage full */ }
}

// ── Visibility logic ──────────────────────────────────────────────────────────

const HR_ROLES       = new Set(["hr_admin", "hr_member"]);
const MGMT_ROLES     = new Set(["management"]);
const SA_ROLES       = new Set(["super_admin"]);
// Dept admins (non-HR) who can approve their own dept's member requests
const DEPT_ADMIN_ROLES = new Set(["sales_admin", "production_admin", "marketing_admin", "it_admin"]);

function _deptPrefix(role: string): string {
  const idx = role.indexOf("_");
  return idx > 0 ? role.slice(0, idx) : role;
}

export function canViewRequest(
  viewerRole: string,
  viewerId: string,
  req: AdvanceSalaryRequest
): boolean {
  // Always see own request
  if (viewerId === req.employeeId) return true;

  const isSA   = SA_ROLES.has(viewerRole);
  const isMgmt = MGMT_ROLES.has(viewerRole);
  const isHR   = HR_ROLES.has(viewerRole);
  const isDeptAdmin = DEPT_ADMIN_ROLES.has(viewerRole);

  // Super admin requests → Management only (per approval matrix)
  if (SA_ROLES.has(req.employeeRole)) {
    return isMgmt;
  }

  // Management requests → HR or Super Admin
  if (MGMT_ROLES.has(req.employeeRole)) {
    return isHR || isSA;
  }

  // HR requests → Management or Super Admin
  if (HR_ROLES.has(req.employeeRole)) {
    return isMgmt || isSA;
  }

  // Dept admin requests → HR, Management, or Super Admin
  if (DEPT_ADMIN_ROLES.has(req.employeeRole)) {
    return isHR || isMgmt || isSA;
  }

  // Member/employee requests → same-dept admin, HR, Management, Super Admin
  if (req.employeeRole.endsWith("_member")) {
    const empDept = _deptPrefix(req.employeeRole);
    if (isDeptAdmin && _deptPrefix(viewerRole) === empDept) return true;
    return isHR || isMgmt || isSA;
  }

  // Fallback — management and super admin see everything else
  return isMgmt || isSA;
}

export function canApproveRequest(
  viewerRole: string,
  viewerId: string,
  req: AdvanceSalaryRequest
): boolean {
  // Block and surface self-approval at logic level
  if (viewerId === req.employeeId) return false;
  return canViewRequest(viewerRole, viewerId, req);
}

// ── Salary slip stats ─────────────────────────────────────────────────────────

export interface SlipStats {
  totalSlips: number;
  totalNetPaid: number;
  pendingAdvances: number;
  pendingAdvanceAmount: number;
}

export function getPayrollStats(slips: SalarySlip[], requests: AdvanceSalaryRequest[]): SlipStats {
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const thisMonthSlips = slips.filter(s => s.salaryMonth === currentMonth);
  const pending = requests.filter(r => r.status === "pending");
  return {
    totalSlips: slips.length,
    totalNetPaid: thisMonthSlips.reduce((s, sl) => s + sl.netSalary, 0),
    pendingAdvances: pending.length,
    pendingAdvanceAmount: pending.reduce((s, r) => s + r.requestedAmount, 0),
  };
}

// ── Strict Deductions Logic ───────────────────────────────────────────────────

const ADVANCE_INSTALLMENT_MONTHS = 3;

// Counts weekday (Mon–Fri, non-holiday) approved leave days for an employee in a given month.
// Reads from mock_leave_requests — the authoritative store written by LeaveRequests.tsx.
function _countApprovedLeaveDays(employeeId: string, year: number, month: number): number {
  try {
    const raw = localStorage.getItem("mock_leave_requests");
    if (!raw) return 0;
    const all = JSON.parse(raw) as Array<{ userId?: string; status?: string; startDate?: string; endDate?: string }>;
    const approved = all.filter(l => l.userId === employeeId && l.status === "approved");
    if (approved.length === 0) return 0;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0);
    let total = 0;
    for (const leave of approved) {
      if (!leave.startDate || !leave.endDate) continue;
      const s = new Date(leave.startDate);
      const e = new Date(leave.endDate);
      const rangeStart = s < monthStart ? new Date(monthStart) : s;
      const rangeEnd   = e > monthEnd   ? new Date(monthEnd)   : e;
      if (rangeStart > rangeEnd) continue;
      const cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        const dow = cur.getDay();
        const iso = cur.toISOString().slice(0, 10);
        const holidays = cur.getFullYear() === 2025 ? COMPANY_HOLIDAYS_2025 : COMPANY_HOLIDAYS_2026;
        if (dow !== 0 && dow !== 6 && !holidays.includes(iso)) total++;
        cur.setDate(cur.getDate() + 1);
      }
    }
    return total;
  } catch { return 0; }
}

export interface StrictDeductions {
  advanceSalaryDeduction: number;
  unpaidLeaveDays: number;       // leave + absent days
  unpaidLeaveDeduction: number;  // unpaidLeaveDays × dailyRate
  halfDayDeduction: number;      // halfDays × dailyRate × 0.5
  lateCount: number;             // total late arrivals
  lateAttendanceDeduction: number; // floor(lateCount/3) × dailyRate
}

export function computeStrictDeductions(employeeId: string, salaryMonth: string, basicSalary: number): StrictDeductions {
  // Advance salary recovery
  const advances = getAdvanceRequests().filter(
    (r) => r.employeeId === employeeId && (r.status === "approved" || r.status === "paid")
  );
  const totalApprovedAdvance = advances.reduce((s, r) => s + r.requestedAmount, 0);
  const pastSlips = getSalarySlips().filter((s) => s.employeeId === employeeId);
  const totalRecovered = pastSlips.reduce((s, sl) => s + sl.advanceSalaryDeduction, 0);
  const outstandingAdvance = Math.max(0, totalApprovedAdvance - totalRecovered);
  // Spread advance recovery over installments instead of deducting the full balance at once
  const monthlyInstallment = totalApprovedAdvance > 0
    ? Math.ceil(totalApprovedAdvance / ADVANCE_INSTALLMENT_MONTHS)
    : 0;
  const advanceSalaryDeduction = Math.min(outstandingAdvance, monthlyInstallment);

  // Attendance-based deductions — read live from attendance records
  let unpaidLeaveDays = 0;
  let halfDaysCount = 0;
  let lateCount = 0;
  try {
    const parts = salaryMonth.split("-");
    const year  = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (!isNaN(year) && !isNaN(month)) {
      const staff = STAFF_USERS.find(u => u.id === employeeId);
      if (staff) {
        const allRecords = loadYearData(year);
        const report = computeMonthlyReport(staff.id, staff.name, staff.role, month, year, allRecords);
        // Use approved leaves from mock_leave_requests (authoritative) instead of pseudo-random attendance leaveDays
        const approvedLeaveDays = _countApprovedLeaveDays(employeeId, year, month);
        unpaidLeaveDays = approvedLeaveDays + report.absentDays;
        halfDaysCount   = report.halfDays;
        lateCount       = report.lateArrivals;
      }
    }
  } catch { /* attendance data unavailable — deductions default to 0 */ }

  const dailyRate             = basicSalary > 0 ? basicSalary / 30 : 0;
  const unpaidLeaveDeduction  = Math.round(unpaidLeaveDays * dailyRate);
  const halfDayDeduction      = Math.round(halfDaysCount * dailyRate * 0.5);
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

// ── Company branding (read directly from localStorage — no import needed) ─────

interface _CompanyBranding {
  name: string; tagline: string; address: string; city: string; country: string;
  phone: string; email: string; website: string; logoDataUrl: string;
}

function _readBranding(): _CompanyBranding {
  const def: _CompanyBranding = {
    name: "Optivax Global", tagline: "Digital Marketing Agency",
    address: "", city: "Karachi", country: "Pakistan",
    phone: "", email: "info@optivaxglobal.com",
    website: "www.optivaxglobal.com", logoDataUrl: "",
  };
  try {
    const raw = localStorage.getItem("optivax_company_settings");
    if (raw) return { ...def, ...(JSON.parse(raw) as Partial<_CompanyBranding>) };
    const old = JSON.parse(localStorage.getItem("optivax_profile_settings") ?? "{}") as { name?: string; email?: string };
    return { ...def, ...(old.name ? { name: old.name } : {}), ...(old.email ? { email: old.email } : {}) };
  } catch { return def; }
}

function _slipHtml(slip: SalarySlip, co: _CompanyBranding): string {
  const fmtR = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;
  const ml   = new Date(slip.salaryMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });
  const bd         = computeSlipBreakdown(slip.basicSalary);
  const displayNet = computeNet(slip);

  const lineRows = (items: PayrollItem[], cls = "earn", prefix = "") =>
    items.map(i =>
      `<div class="lr"><span class="ll">${i.label}</span><span class="lv ${cls}">${prefix}${fmtR(i.amount)}</span></div>`
    ).join("");

  const addrParts = [co.address, co.city, co.country].filter(Boolean).join(", ");
  const contactLine = [
    co.phone   ? `Tel: ${co.phone}`     : "",
    co.email   ? `Email: ${co.email}`   : "",
    co.website ? `Web: ${co.website}`   : "",
  ].filter(Boolean).join("  &nbsp;|&nbsp;  ");

  const logoSrc  = `${window.location.origin}/images/logo/logo-icon-dark.png`;
  const logoHtml = `<img src="${logoSrc}" style="width:68px;height:68px;object-fit:contain;border-radius:10px;background:#fff;padding:6px;display:block;" alt="${co.name}" />`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Salary Slip — ${slip.employeeName} — ${ml}</title>
<style>
*{box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;background:#f4f6f9;color:#111827;position:relative;}
/* Watermark: fixed to viewport/page, outside .wrap, never clipped */
.wm{position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;}
.wm img{width:58%;max-width:420px;height:auto;object-fit:contain;opacity:0.04;transform:rotate(30deg);}
/* Main card sits above watermark */
.wrap{max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:visible;box-shadow:0 4px 24px rgba(0,0,0,0.10);position:relative;z-index:1;}
/* Header */
.hdr{display:flex;align-items:center;gap:18px;padding:22px 28px;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;border-radius:12px 12px 0 0;}
.co-block{flex:1;min-width:0;}
.co-name{font-size:19px;font-weight:800;letter-spacing:0.3px;margin:0 0 2px;}
.co-tag{font-size:11px;opacity:.80;margin:0 0 5px;font-style:italic;}
.co-det{font-size:10.5px;opacity:.85;line-height:1.65;}
.slip-box{text-align:right;flex-shrink:0;}
.slip-badge{display:inline-block;border:1px solid rgba(255,255,255,0.55);background:rgba(255,255,255,0.18);border-radius:5px;padding:4px 11px;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:5px;}
.slip-mo{font-size:14px;font-weight:600;}
.slip-id{font-size:9.5px;opacity:.75;margin-top:3px;}
/* Employee grid */
.eg{display:grid;grid-template-columns:repeat(3,1fr);background:#f0f4f8;border-bottom:2px solid #c7d3e0;}
.ec{padding:13px 18px;border-right:1px solid #d1dae5;}
.ec:last-child{border-right:none;}
.ec.row2{border-top:1px solid #d1dae5;}
.el{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#5a7a99;margin-bottom:4px;}
.ev{font-size:13px;font-weight:700;color:#111827;}
.ev.sm{font-size:11px;}
/* Section headers */
.sh{background:#dde5ef;padding:9px 18px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1e3a5f;border-top:1px solid #c7d3e0;border-bottom:1px solid #c7d3e0;}
/* Salary line rows */
.lr{display:flex;justify-content:space-between;padding:7px 18px;border-bottom:1px solid #e8edf4;font-size:12.5px;}
.ll{color:#1f2937;font-weight:400;}
.lv{font-weight:600;}
.lv.earn{color:#111827;}
.lv.bon{color:#065f46;}
.lv.ded{color:#991b1b;}
/* Sub-total row */
.sub{display:flex;justify-content:space-between;padding:10px 18px;background:#e2e8f0;font-size:13.5px;font-weight:800;color:#0f172a;border-top:2px solid #b8c6d6;}
.sub.ded{color:#7f1d1d;}
/* Net salary */
.net{display:flex;justify-content:space-between;align-items:center;padding:20px 28px;background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);color:#fff;border-top:3px solid #1e3a5f;}
.net-lbl{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:1;}
.net-right{text-align:right;}
.net-tag{font-size:9px;font-weight:600;letter-spacing:1.5px;opacity:.75;margin-bottom:2px;text-transform:uppercase;}
.net-amt{font-size:30px;font-weight:900;letter-spacing:-0.5px;}
/* Notes */
.notes{margin:14px 18px 0;padding:10px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;font-size:11px;color:#78350f;}
/* Footer */
.ftr{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 28px 16px;border-top:1px solid #dde5ef;background:#f8fafc;margin-top:0;border-radius:0 0 12px 12px;}
.ft{font-size:9.5px;color:#6b7280;line-height:1.6;}
.ft strong{color:#374151;}
@media print{
  body{background:#fff;padding:0;}
  .wm{position:fixed;top:0;left:0;width:100%;height:100%;}
  .wm img{width:58%;max-width:380px;opacity:0.04;}
  .wrap{box-shadow:none;border-radius:0;overflow:visible;}
  .hdr{border-radius:0;}
  .ftr{border-radius:0;}
  @page{margin:12mm;size:A4 portrait;}
}
</style></head><body>
<div class="wm"><img src="${logoSrc}" alt="" /></div>
<div class="wrap">
  <div class="hdr">
    <div style="flex-shrink:0;">${logoHtml}</div>
    <div class="co-block">
      <div class="co-name">${co.name.toUpperCase()}</div>
      ${co.tagline ? `<div class="co-tag">${co.tagline}</div>` : ""}
      <div class="co-det">
        ${addrParts ? addrParts + "<br>" : ""}
        ${contactLine}
      </div>
    </div>
    <div class="slip-box">
      <div class="slip-badge">SALARY SLIP</div>
      <div class="slip-mo">${ml}</div>
      <div class="slip-id">ID: ${slip.id.toUpperCase()}</div>
    </div>
  </div>

  <div class="eg">
    <div class="ec"><div class="el">Employee Name</div><div class="ev">${slip.employeeName}</div></div>
    <div class="ec"><div class="el">Employee ID</div><div class="ev">${slip.employeeId}</div></div>
    <div class="ec"><div class="el">Email</div><div class="ev sm">${slip.employeeEmail}</div></div>
    <div class="ec row2"><div class="el">Department</div><div class="ev">${slip.department}</div></div>
    <div class="ec row2"><div class="el">Designation</div><div class="ev">${slip.designation}</div></div>
    <div class="ec row2"><div class="el">Salary Period</div><div class="ev">${ml}</div></div>
  </div>

  <div class="sh">Salary Breakdown</div>
  <div class="lr"><span class="ll">Basic Salary</span><span class="lv earn">${fmtR(bd.basic)}</span></div>
  <div class="lr"><span class="ll">House Rent Allowance</span><span class="lv earn">${fmtR(bd.hra)}</span></div>
  <div class="lr"><span class="ll">Medical Allowance</span><span class="lv earn">${fmtR(bd.medical)}</span></div>
  <div class="lr"><span class="ll">Conveyance Allowance</span><span class="lv earn">${fmtR(bd.conveyance)}</span></div>
  <div class="sub"><span>Total Gross Salary</span><span>${fmtR(slip.basicSalary)}</span></div>

  ${computeDeductions(slip) > 0 ? `
  <div class="sh">Deductions</div>
  ${lineRows(slip.deductions, "ded", "−")}
  ${slip.advanceSalaryDeduction > 0 ? `<div class="lr"><span class="ll">Advance Salary Recovery</span><span class="lv ded">−${fmtR(slip.advanceSalaryDeduction)}</span></div>` : ""}
  ${(slip.unpaidLeaveDeduction ?? 0) > 0 ? `<div class="lr"><span class="ll">Unpaid Leave — ${slip.unpaidLeaveDays ?? 0} day${(slip.unpaidLeaveDays ?? 0) !== 1 ? "s" : ""} (all leaves unpaid)</span><span class="lv ded">−${fmtR(slip.unpaidLeaveDeduction ?? 0)}</span></div>` : ""}
  ${(slip.halfDayDeduction ?? 0) > 0 ? `<div class="lr"><span class="ll">Half Day Deduction</span><span class="lv ded">−${fmtR(slip.halfDayDeduction ?? 0)}</span></div>` : ""}
  ${(slip.latePenaltyDeduction ?? 0) > 0 ? `<div class="lr"><span class="ll">Late Penalty — ${slip.latePenaltyCount ?? 0} late arrivals → ${slip.latePenaltyDays ?? 0} day${(slip.latePenaltyDays ?? 0) !== 1 ? "s" : ""}</span><span class="lv ded">−${fmtR(slip.latePenaltyDeduction ?? 0)}</span></div>` : ""}
  <div class="sub ded"><span>Total Deductions</span><span>−${fmtR(computeDeductions(slip))}</span></div>
  ` : ""}

  <div class="net">
    <span class="net-lbl">Net Salary Payable</span>
    <div class="net-right">
      <div class="net-tag">Total Take-Home</div>
      <div class="net-amt">${fmtR(displayNet)}</div>
    </div>
  </div>

  ${slip.notes ? `<div class="notes"><strong>Note:</strong> ${slip.notes}</div>` : ""}

  <div class="ftr">
    <div class="ft">
      <strong>Generated by:</strong> ${slip.generatedByName} (${slip.generatedByRole})<br>
      <strong>Generated on:</strong> ${new Date(slip.generatedAt).toLocaleString()}
    </div>
    <div class="ft" style="text-align:right;">
      This is a computer-generated salary slip.<br>
      No physical signature is required.
    </div>
  </div>
</div>
</body></html>`;
}

// ── Print helper ──────────────────────────────────────────────────────────────

export function printSalarySlip(slip: SalarySlip) {
  const co  = _readBranding();
  const html = _slipHtml(slip, co);
  const w   = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
}

export function printSalarySlipsBulk(slips: SalarySlip[]) {
  if (slips.length === 0) return;
  const co      = _readBranding();
  const logoSrc = `${window.location.origin}/images/logo/logo-icon-dark.png`;

  // Strip each slip's own <style>, <body> tags, and per-slip .wm watermark div
  // so the bulk document applies one unified stylesheet and one shared watermark.
  const pages = slips.map(s => {
    const body = _slipHtml(s, co)
      .replace(/^[\s\S]*?<body[^>]*>/, "")
      .replace(/<\/body>[\s\S]*$/, "")
      .replace(/<div class="wm">[\s\S]*?<\/div>\s*/, "");
    return `<div style="page-break-after:always;">${body}</div>`;
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Bulk Salary Slips — ${co.name}</title>
<style>
*{box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:24px;background:#f4f6f9;color:#111827;position:relative;}
/* Single watermark covers every printed page */
.wm{position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;}
.wm img{width:58%;max-width:420px;height:auto;object-fit:contain;opacity:0.04;transform:rotate(30deg);}
.wrap{max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:visible;box-shadow:0 4px 24px rgba(0,0,0,0.08);position:relative;z-index:1;}
.hdr{display:flex;align-items:center;gap:18px;padding:22px 28px;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;border-radius:12px 12px 0 0;}
.co-block{flex:1;min-width:0;}.co-name{font-size:19px;font-weight:800;margin:0 0 2px;}.co-tag{font-size:11px;opacity:.80;margin:0 0 5px;font-style:italic;}.co-det{font-size:10.5px;opacity:.85;line-height:1.65;}
.slip-box{text-align:right;flex-shrink:0;}.slip-badge{display:inline-block;border:1px solid rgba(255,255,255,0.55);background:rgba(255,255,255,0.18);border-radius:5px;padding:4px 11px;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:5px;}.slip-mo{font-size:14px;font-weight:600;}.slip-id{font-size:9.5px;opacity:.75;margin-top:3px;}
.eg{display:grid;grid-template-columns:repeat(3,1fr);background:#f0f4f8;border-bottom:2px solid #c7d3e0;}.ec{padding:13px 18px;border-right:1px solid #d1dae5;}.ec:last-child{border-right:none;}.ec.row2{border-top:1px solid #d1dae5;}.el{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#5a7a99;margin-bottom:4px;}.ev{font-size:13px;font-weight:700;color:#111827;}.ev.sm{font-size:11px;}
.sh{background:#dde5ef;padding:9px 18px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1e3a5f;border-top:1px solid #c7d3e0;border-bottom:1px solid #c7d3e0;}
.lr{display:flex;justify-content:space-between;padding:7px 18px;border-bottom:1px solid #e8edf4;font-size:12.5px;}.ll{color:#1f2937;font-weight:400;}.lv{font-weight:600;}.lv.earn{color:#111827;}.lv.bon{color:#065f46;}.lv.ded{color:#991b1b;}
.sub{display:flex;justify-content:space-between;padding:10px 18px;background:#e2e8f0;font-size:13.5px;font-weight:800;color:#0f172a;border-top:2px solid #b8c6d6;}.sub.ded{color:#7f1d1d;}
.net{display:flex;justify-content:space-between;align-items:center;padding:20px 28px;background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);color:#fff;border-top:3px solid #1e3a5f;}.net-lbl{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;}.net-right{text-align:right;}.net-tag{font-size:9px;font-weight:600;letter-spacing:1.5px;opacity:.75;margin-bottom:2px;text-transform:uppercase;}.net-amt{font-size:30px;font-weight:900;letter-spacing:-0.5px;}
.notes{margin:14px 18px 0;padding:10px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;font-size:11px;color:#78350f;}
.ftr{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 28px 16px;border-top:1px solid #dde5ef;background:#f8fafc;border-radius:0 0 12px 12px;}.ft{font-size:9.5px;color:#6b7280;line-height:1.6;}.ft strong{color:#374151;}
@media print{
  body{background:#fff;padding:0;}
  .wm{position:fixed;top:0;left:0;width:100%;height:100%;}
  .wm img{width:58%;max-width:380px;opacity:0.04;}
  .wrap{page-break-after:always;box-shadow:none;border-radius:0;overflow:visible;}
  .hdr,.ftr{border-radius:0;}
  @page{margin:12mm;size:A4 portrait;}
}
</style></head><body>
<div class="wm"><img src="${logoSrc}" alt="" /></div>
${pages.join("\n")}
</body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
}
