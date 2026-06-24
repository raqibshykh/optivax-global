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
  salaryMonth: string;       // "YYYY-MM"
  basicSalary: number;
  allowances: PayrollItem[];
  bonuses: PayrollItem[];
  deductions: PayrollItem[];
  advanceSalaryDeduction: number;
  grossSalary: number;       // basic + allowances + bonuses
  totalDeductions: number;   // deductions + advanceSalaryDeduction
  netSalary: number;         // grossSalary - totalDeductions
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

export const computeGross = (s: SalarySlip) =>
  s.basicSalary +
  s.allowances.reduce((a, i) => a + i.amount, 0) +
  s.bonuses.reduce((a, i) => a + i.amount, 0);

export const computeDeductions = (s: SalarySlip) =>
  s.advanceSalaryDeduction;

export const computeNet = (s: SalarySlip) => computeGross(s) - computeDeductions(s);

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_SLIPS: SalarySlip[] = [
  {
    id: "slip-001",
    employeeId: "seed-emp-01",
    employeeName: "Aisha Rahman",
    employeeEmail: "aisha.rahman@optivaxglobal.com",
    department: "Sales",
    designation: "Sales Manager",
    salaryMonth: "2026-04",
    basicSalary: 65000,
    allowances: [
      { label: "House Rent Allowance", amount: 16250 },
      { label: "Transport Allowance",  amount: 5000 },
      { label: "Medical Allowance",    amount: 3000 },
    ],
    bonuses: [
      { label: "Performance Bonus", amount: 10000 },
    ],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 65000,
    totalDeductions: 0,
    netSalary: 65000,
    generatedAt: "2026-04-30T10:00:00.000Z",
    generatedById: "user-hr-01",
    generatedByName: "HR Admin",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-002",
    employeeId: "seed-emp-02",
    employeeName: "Bilal Siddiqui",
    employeeEmail: "bilal.siddiqui@optivaxglobal.com",
    department: "Production",
    designation: "Production Lead",
    salaryMonth: "2026-04",
    basicSalary: 55000,
    allowances: [
      { label: "House Rent Allowance", amount: 13750 },
      { label: "Transport Allowance",  amount: 4000 },
      { label: "Medical Allowance",    amount: 2500 },
    ],
    bonuses: [],
    deductions: [],
    advanceSalaryDeduction: 15000,
    grossSalary: 55000,
    totalDeductions: 15000,
    netSalary: 40000,
    generatedAt: "2026-04-30T10:15:00.000Z",
    generatedById: "user-hr-01",
    generatedByName: "HR Admin",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-003",
    employeeId: "seed-emp-03",
    employeeName: "Fatima Khan",
    employeeEmail: "fatima.khan@optivaxglobal.com",
    department: "Marketing",
    designation: "Marketing Executive",
    salaryMonth: "2026-04",
    basicSalary: 48000,
    allowances: [
      { label: "House Rent Allowance", amount: 12000 },
      { label: "Transport Allowance",  amount: 3500 },
      { label: "Medical Allowance",    amount: 2000 },
    ],
    bonuses: [
      { label: "Campaign Bonus", amount: 5000 },
    ],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 48000,
    totalDeductions: 0,
    netSalary: 48000,
    generatedAt: "2026-04-30T10:30:00.000Z",
    generatedById: "user-hr-01",
    generatedByName: "HR Admin",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-004",
    employeeId: "seed-emp-01",
    employeeName: "Aisha Rahman",
    employeeEmail: "aisha.rahman@optivaxglobal.com",
    department: "Sales",
    designation: "Sales Manager",
    salaryMonth: "2026-05",
    basicSalary: 65000,
    allowances: [
      { label: "House Rent Allowance", amount: 16250 },
      { label: "Transport Allowance",  amount: 5000 },
      { label: "Medical Allowance",    amount: 3000 },
    ],
    bonuses: [
      { label: "Quarterly Bonus", amount: 20000 },
    ],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 65000,
    totalDeductions: 0,
    netSalary: 65000,
    generatedAt: "2026-05-31T10:00:00.000Z",
    generatedById: "user-hr-01",
    generatedByName: "HR Admin",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-005",
    employeeId: "seed-emp-04",
    employeeName: "Omar Farooq",
    employeeEmail: "omar.farooq@optivaxglobal.com",
    department: "HR",
    designation: "HR Specialist",
    salaryMonth: "2026-05",
    basicSalary: 42000,
    allowances: [
      { label: "House Rent Allowance", amount: 10500 },
      { label: "Transport Allowance",  amount: 3000 },
    ],
    bonuses: [],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 42000,
    totalDeductions: 0,
    netSalary: 42000,
    generatedAt: "2026-05-31T11:00:00.000Z",
    generatedById: "user-hr-01",
    generatedByName: "HR Admin",
    generatedByRole: "hr_admin",
  },
  {
    id: "slip-006",
    employeeId: "seed-emp-02",
    employeeName: "Bilal Siddiqui",
    employeeEmail: "bilal.siddiqui@optivaxglobal.com",
    department: "Production",
    designation: "Production Lead",
    salaryMonth: "2026-05",
    basicSalary: 55000,
    allowances: [
      { label: "House Rent Allowance", amount: 13750 },
      { label: "Transport Allowance",  amount: 4000 },
      { label: "Medical Allowance",    amount: 2500 },
    ],
    bonuses: [
      { label: "Project Completion Bonus", amount: 8000 },
    ],
    deductions: [],
    advanceSalaryDeduction: 0,
    grossSalary: 55000,
    totalDeductions: 0,
    netSalary: 55000,
    generatedAt: "2026-05-31T11:30:00.000Z",
    generatedById: "user-hr-01",
    generatedByName: "HR Admin",
    generatedByRole: "hr_admin",
  },
];

const SEED_ADVANCE_REQUESTS: AdvanceSalaryRequest[] = [
  {
    id: "adv-001",
    employeeId: "seed-emp-02",
    employeeName: "Bilal Siddiqui",
    employeeRole: "production_admin",
    department: "Production",
    requestedAmount: 15000,
    reason: "Emergency medical expenses for family member.",
    requestDate: "2026-04-10T09:00:00.000Z",
    status: "paid",
    approvedById: "user-hr-01",
    approvedByName: "HR Admin",
    approvedAt: "2026-04-11T10:30:00.000Z",
    notes: "Approved with deduction in April salary.",
  },
  {
    id: "adv-002",
    employeeId: "seed-emp-03",
    employeeName: "Fatima Khan",
    employeeRole: "marketing_member",
    department: "Marketing",
    requestedAmount: 20000,
    reason: "Home renovation expenses.",
    requestDate: "2026-05-05T11:00:00.000Z",
    status: "approved",
    approvedById: "user-m-01",
    approvedByName: "Management",
    approvedAt: "2026-05-06T09:15:00.000Z",
    notes: "Deduction to be spread over 2 months.",
  },
  {
    id: "adv-003",
    employeeId: "seed-emp-05",
    employeeName: "Zainab Malik",
    employeeRole: "sales_member",
    department: "Sales",
    requestedAmount: 10000,
    reason: "Children school fee payment.",
    requestDate: "2026-06-01T08:30:00.000Z",
    status: "pending",
  },
  {
    id: "adv-004",
    employeeId: "seed-emp-04",
    employeeName: "Omar Farooq",
    employeeRole: "hr_member",
    department: "HR",
    requestedAmount: 25000,
    reason: "Vehicle repair after accident.",
    requestDate: "2026-06-05T10:00:00.000Z",
    status: "pending",
  },
  {
    id: "adv-005",
    employeeId: "seed-emp-06",
    employeeName: "Hassan Ali",
    employeeRole: "sales_admin",
    department: "Sales",
    requestedAmount: 30000,
    reason: "Business trip advance before reimbursement.",
    requestDate: "2026-06-10T14:00:00.000Z",
    status: "rejected",
    approvedById: "user-hr-01",
    approvedByName: "HR Admin",
    approvedAt: "2026-06-11T09:00:00.000Z",
    rejectionReason: "Advance limit exceeded for this quarter. Please submit a reimbursement claim instead.",
  },
  {
    id: "adv-006",
    employeeId: "seed-emp-07",
    employeeName: "Sara Ahmed",
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

// ── Visibility logic ──────────────────────────────────────────────────────────

const HR_ROLES    = new Set(["hr_admin", "hr_member"]);
const MGMT_ROLES  = new Set(["management"]);
const SA_ROLES    = new Set(["super_admin"]);
const APPROVER_ROLES = new Set(["super_admin", "management", "hr_admin"]);

export function canViewRequest(
  viewerRole: string,
  viewerId: string,
  req: AdvanceSalaryRequest
): boolean {
  // Always see own request
  if (viewerId === req.employeeId) return true;

  // Only designated approvers see others' requests
  if (!APPROVER_ROLES.has(viewerRole)) return false;

  // HR roles' requests are hidden from other HR — only management/super_admin see them
  if (HR_ROLES.has(req.employeeRole)) {
    return MGMT_ROLES.has(viewerRole) || SA_ROLES.has(viewerRole);
  }

  // Management's requests hidden from management — hr_admin/super_admin only
  if (MGMT_ROLES.has(req.employeeRole)) {
    return HR_ROLES.has(viewerRole) || SA_ROLES.has(viewerRole);
  }

  // Super admin requests — management / hr_admin see them
  if (SA_ROLES.has(req.employeeRole)) {
    return MGMT_ROLES.has(viewerRole) || HR_ROLES.has(viewerRole);
  }

  // Normal employee request → all approvers see it
  return true;
}

export function canApproveRequest(
  viewerRole: string,
  viewerId: string,
  req: AdvanceSalaryRequest
): boolean {
  if (viewerId === req.employeeId) return false; // never approve own
  if (!APPROVER_ROLES.has(viewerRole)) return false;
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

// ── Display-only salary breakdown — used ONLY in slip templates (PDF/preview) ─
// Stored payroll values, budgets, reports, and all other modules are unchanged.

export interface SlipBreakdown {
  basic:     number; // 50%
  hra:       number; // 20%
  transport: number; // 15%
  medical:   number; // 15% (remainder — ensures sum === grossSalary exactly)
}

export function computeSlipBreakdown(grossSalary: number): SlipBreakdown {
  const basic     = Math.round(grossSalary * 0.50);
  const hra       = Math.round(grossSalary * 0.20);
  const transport = Math.round(grossSalary * 0.15);
  const medical   = grossSalary - basic - hra - transport;
  return { basic, hra, transport, medical };
}

// ── Strict Deductions Logic ───────────────────────────────────────────────────

export interface StrictDeductions {
  advanceSalaryDeduction: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  lateCount: number;
  lateAttendanceDeduction: number;
}

export function computeStrictDeductions(employeeId: string, _salaryMonth: string, _basicSalary: number): StrictDeductions {
  // Per policy: only advance salary recovery is deducted in salary slips.
  const advances = getAdvanceRequests().filter(
    (r) => r.employeeId === employeeId && (r.status === "approved" || r.status === "paid")
  );
  const totalApprovedAdvance = advances.reduce((s, r) => s + r.requestedAmount, 0);

  const pastSlips = getSalarySlips().filter((s) => s.employeeId === employeeId);
  const totalRecovered = pastSlips.reduce((s, sl) => s + sl.advanceSalaryDeduction, 0);

  const outstandingAdvance = Math.max(0, totalApprovedAdvance - totalRecovered);

  return {
    advanceSalaryDeduction: outstandingAdvance,
    unpaidLeaveDays: 0,
    unpaidLeaveDeduction: 0,
    lateCount: 0,
    lateAttendanceDeduction: 0,
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
  const displayNet = slip.basicSalary - slip.totalDeductions;

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
body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;background:#f4f6f9;color:#1a2733;}
.wrap{max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);}
/* Header */
.hdr{display:flex;align-items:center;gap:18px;padding:22px 28px;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;}
.co-block{flex:1;min-width:0;}
.co-name{font-size:19px;font-weight:800;letter-spacing:0.3px;margin:0 0 2px;}
.co-tag{font-size:11px;opacity:.72;margin:0 0 5px;font-style:italic;}
.co-det{font-size:10.5px;opacity:.70;line-height:1.65;}
.slip-box{text-align:right;flex-shrink:0;}
.slip-badge{display:inline-block;border:1px solid rgba(255,255,255,0.45);background:rgba(255,255,255,0.15);border-radius:5px;padding:4px 11px;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:5px;}
.slip-mo{font-size:14px;font-weight:600;}
.slip-id{font-size:9.5px;opacity:.60;margin-top:3px;}
/* Employee grid */
.eg{display:grid;grid-template-columns:repeat(3,1fr);background:#f0f4f8;border-bottom:1px solid #dde3ec;}
.ec{padding:13px 18px;border-right:1px solid #dde3ec;}
.ec:last-child{border-right:none;}
.ec.row2{border-top:1px solid #dde3ec;}
.el{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7b8fa6;margin-bottom:3px;}
.ev{font-size:13px;font-weight:600;color:#1a2733;}
.ev.sm{font-size:11px;}
/* Salary lines */
.sh{background:#e8edf3;padding:8px 18px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#4a6075;border-top:1px solid #dde3ec;border-bottom:1px solid #dde3ec;}
.lr{display:flex;justify-content:space-between;padding:6.5px 18px;border-bottom:1px solid #f0f4f8;font-size:12.5px;}
.ll{color:#4a5568;}
.lv{font-weight:500;}
.lv.earn{color:#1a2733;}
.lv.bon{color:#047857;}
.lv.ded{color:#c53030;}
.sub{display:flex;justify-content:space-between;padding:9px 18px;background:#edf2f7;font-size:13px;font-weight:700;color:#1a2733;border-top:2px solid #dde3ec;}
.sub.ded{color:#c53030;}
/* Net */
.net{display:flex;justify-content:space-between;align-items:center;padding:18px 28px;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;}
.net-lbl{font-size:13px;font-weight:700;letter-spacing:1.5px;opacity:.9;}
.net-amt{font-size:26px;font-weight:800;}
/* Notes */
.notes{margin:14px 18px 0;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:11px;color:#92400e;}
/* Footer */
.ftr{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 28px 16px;border-top:1px solid #e8edf3;background:#f9fafb;margin-top:0;}
.ft{font-size:9.5px;color:#9aabb7;line-height:1.55;}
.ft strong{color:#7b8fa6;}
@media print{body{background:#fff;padding:0;}.wrap{box-shadow:none;border-radius:0;}@page{margin:12mm;size:A4 portrait;}}
</style></head><body>
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

  <div class="sh">Earnings</div>
  <div class="lr"><span class="ll">Basic Salary (50%)</span><span class="lv earn">${fmtR(bd.basic)}</span></div>
  <div class="lr"><span class="ll">House Rent Allowance (20%)</span><span class="lv earn">${fmtR(bd.hra)}</span></div>
  <div class="lr"><span class="ll">Transport Allowance (15%)</span><span class="lv earn">${fmtR(bd.transport)}</span></div>
  <div class="lr"><span class="ll">Medical Allowance (15%)</span><span class="lv earn">${fmtR(bd.medical)}</span></div>
  <div class="sub"><span>Total Earnings</span><span>${fmtR(slip.basicSalary)}</span></div>

  ${slip.deductions.length > 0 || slip.advanceSalaryDeduction > 0 ? `
  <div class="sh">Deductions</div>
  ${lineRows(slip.deductions, "ded", "−")}
  ${slip.advanceSalaryDeduction > 0 ? `<div class="lr"><span class="ll">Advance Salary Recovery</span><span class="lv ded">−${fmtR(slip.advanceSalaryDeduction)}</span></div>` : ""}
  <div class="sub ded"><span>Total Deductions</span><span>−${fmtR(slip.totalDeductions)}</span></div>
  ` : ""}

  <div class="net">
    <span class="net-lbl">NET SALARY PAYABLE</span>
    <span class="net-amt">${fmtR(displayNet)}</span>
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
  const co    = _readBranding();
  const pages = slips.map(s => `<div style="page-break-after:always; margin-bottom: 40px;">${_slipHtml(s, co).replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "")}</div>`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Bulk Salary Slips — ${co.name}</title>
<style>
*{box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:24px;background:#f4f6f9;}
.wrap{max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
.hdr{display:flex;align-items:center;gap:18px;padding:22px 28px;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;}
.co-block{flex:1;min-width:0;}.co-name{font-size:19px;font-weight:800;margin:0 0 2px;}.co-tag{font-size:11px;opacity:.72;margin:0 0 5px;font-style:italic;}.co-det{font-size:10.5px;opacity:.70;line-height:1.65;}
.slip-box{text-align:right;flex-shrink:0;}.slip-badge{display:inline-block;border:1px solid rgba(255,255,255,0.45);background:rgba(255,255,255,0.15);border-radius:5px;padding:4px 11px;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:5px;}.slip-mo{font-size:14px;font-weight:600;}.slip-id{font-size:9.5px;opacity:.60;margin-top:3px;}
.eg{display:grid;grid-template-columns:repeat(3,1fr);background:#f0f4f8;border-bottom:1px solid #dde3ec;}.ec{padding:13px 18px;border-right:1px solid #dde3ec;}.ec:last-child{border-right:none;}.ec.row2{border-top:1px solid #dde3ec;}.el{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7b8fa6;margin-bottom:3px;}.ev{font-size:13px;font-weight:600;color:#1a2733;}.ev.sm{font-size:11px;}
.sh{background:#e8edf3;padding:8px 18px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#4a6075;border-top:1px solid #dde3ec;border-bottom:1px solid #dde3ec;}
.lr{display:flex;justify-content:space-between;padding:6.5px 18px;border-bottom:1px solid #f0f4f8;font-size:12.5px;}.ll{color:#4a5568;}.lv{font-weight:500;}.lv.earn{color:#1a2733;}.lv.bon{color:#047857;}.lv.ded{color:#c53030;}
.sub{display:flex;justify-content:space-between;padding:9px 18px;background:#edf2f7;font-size:13px;font-weight:700;color:#1a2733;border-top:2px solid #dde3ec;}.sub.ded{color:#c53030;}
.net{display:flex;justify-content:space-between;align-items:center;padding:18px 28px;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;}.net-lbl{font-size:13px;font-weight:700;letter-spacing:1.5px;opacity:.9;}.net-amt{font-size:26px;font-weight:800;}
.notes{margin:14px 18px 0;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:11px;color:#92400e;}
.ftr{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 28px 16px;border-top:1px solid #e8edf3;background:#f9fafb;}.ft{font-size:9.5px;color:#9aabb7;line-height:1.55;}.ft strong{color:#7b8fa6;}
@media print{body{background:#fff;padding:0;}.wrap{page-break-after:always;box-shadow:none;border-radius:0;}@page{margin:12mm;size:A4 portrait;}}
</style></head><body>
${pages.join("\n")}
</body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
}
