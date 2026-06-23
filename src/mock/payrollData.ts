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
  overtime: number;          // total overtime pay amount
  deductions: PayrollItem[];
  advanceSalaryDeduction: number;
  grossSalary: number;       // basic + allowances + bonuses + overtime
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
  s.bonuses.reduce((a, i) => a + i.amount, 0) +
  s.overtime;

export const computeDeductions = (s: SalarySlip) =>
  s.deductions.reduce((a, i) => a + i.amount, 0) + s.advanceSalaryDeduction;

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
    overtime: 0,
    deductions: [
      { label: "Income Tax",      amount: 8500 },
      { label: "Provident Fund",  amount: 5000 },
    ],
    advanceSalaryDeduction: 0,
    grossSalary: 99250,
    totalDeductions: 13500,
    netSalary: 85750,
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
    overtime: 4500,
    deductions: [
      { label: "Income Tax",     amount: 6500 },
      { label: "Provident Fund", amount: 4000 },
    ],
    advanceSalaryDeduction: 15000,
    grossSalary: 79750,
    totalDeductions: 25500,
    netSalary: 54250,
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
    overtime: 0,
    deductions: [
      { label: "Income Tax",     amount: 5200 },
      { label: "Provident Fund", amount: 3500 },
    ],
    advanceSalaryDeduction: 0,
    grossSalary: 70500,
    totalDeductions: 8700,
    netSalary: 61800,
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
    overtime: 3000,
    deductions: [
      { label: "Income Tax",     amount: 9500 },
      { label: "Provident Fund", amount: 5000 },
    ],
    advanceSalaryDeduction: 0,
    grossSalary: 112250,
    totalDeductions: 14500,
    netSalary: 97750,
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
    overtime: 0,
    deductions: [
      { label: "Income Tax",           amount: 4200 },
      { label: "Provident Fund",       amount: 3000 },
      { label: "Late Arrival Penalty", amount: 1000 },
    ],
    advanceSalaryDeduction: 0,
    grossSalary: 55500,
    totalDeductions: 8200,
    netSalary: 47300,
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
    overtime: 6000,
    deductions: [
      { label: "Income Tax",     amount: 7800 },
      { label: "Provident Fund", amount: 4000 },
    ],
    advanceSalaryDeduction: 0,
    grossSalary: 89250,
    totalDeductions: 11800,
    netSalary: 77450,
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

// ── Print helper ──────────────────────────────────────────────────────────────

export function printSalarySlip(slip: SalarySlip) {
  const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;
  const monthLabel = new Date(slip.salaryMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });

  const rows = (items: PayrollItem[], prefix = "") =>
    items.map(i => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#555;">${i.label}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#111;">${prefix}${fmtRs(i.amount)}</td>
      </tr>`).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Salary Slip — ${slip.employeeName} — ${monthLabel}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;}
  .header{background:#1e3a5f;color:#fff;padding:24px 32px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;}
  .company{font-size:22px;font-weight:700;letter-spacing:0.5px;}
  .slip-title{font-size:14px;opacity:0.8;margin-top:4px;}
  .employee-section{background:#f8fafc;border:1px solid #e2e8f0;padding:20px 32px;display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .field{margin-bottom:8px;}
  .field label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;}
  .field value{display:block;font-size:14px;font-weight:600;color:#111;margin-top:2px;}
  table{width:100%;border-collapse:collapse;margin-top:0;}
  .section-header td{background:#f1f5f9;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#475569;padding:10px 12px;}
  .totals-row td{font-weight:700;padding:10px 12px;border-top:2px solid #cbd5e1;}
  .net-row td{background:#1e3a5f;color:#fff;font-size:16px;font-weight:700;padding:14px 12px;}
  .footer{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#999;text-align:center;}
  @media print{body{padding:0;} @page{margin:24px;}}
</style></head><body>
<div class="header">
  <div>
    <div class="company">OPTIVAX GLOBAL</div>
    <div class="slip-title">SALARY SLIP — ${monthLabel.toUpperCase()}</div>
  </div>
  <div style="text-align:right;font-size:12px;opacity:0.8;">
    Generated: ${new Date(slip.generatedAt).toLocaleDateString()}<br>
    Slip ID: ${slip.id.toUpperCase()}
  </div>
</div>

<div class="employee-section">
  <div>
    <div class="field"><label>Employee Name</label><value>${slip.employeeName}</value></div>
    <div class="field"><label>Employee ID</label><value>${slip.employeeId.toUpperCase()}</value></div>
    <div class="field"><label>Email</label><value>${slip.employeeEmail}</value></div>
  </div>
  <div>
    <div class="field"><label>Department</label><value>${slip.department}</value></div>
    <div class="field"><label>Designation</label><value>${slip.designation}</value></div>
    <div class="field"><label>Salary Month</label><value>${monthLabel}</value></div>
  </div>
</div>

<table>
  <tr class="section-header"><td colspan="2">Earnings</td></tr>
  <tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#555;">Basic Salary</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${fmtRs(slip.basicSalary)}</td></tr>
  ${rows(slip.allowances)}
  ${rows(slip.bonuses)}
  ${slip.overtime > 0 ? `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#555;">Overtime</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmtRs(slip.overtime)}</td></tr>` : ""}
  <tr class="totals-row"><td>Gross Salary</td><td style="text-align:right;">${fmtRs(slip.grossSalary)}</td></tr>

  <tr class="section-header"><td colspan="2">Deductions</td></tr>
  ${rows(slip.deductions, "−")}
  ${slip.advanceSalaryDeduction > 0 ? `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#555;">Advance Salary Recovery</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#dc2626;">−${fmtRs(slip.advanceSalaryDeduction)}</td></tr>` : ""}
  <tr class="totals-row"><td>Total Deductions</td><td style="text-align:right;color:#dc2626;">−${fmtRs(slip.totalDeductions)}</td></tr>

  <tr class="net-row"><td>NET SALARY</td><td style="text-align:right;">${fmtRs(slip.netSalary)}</td></tr>
</table>

${slip.notes ? `<div style="margin-top:16px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:12px;color:#92400e;"><strong>Note:</strong> ${slip.notes}</div>` : ""}

<div class="footer">
  This is a computer-generated salary slip and does not require a physical signature.
  Generated by ${slip.generatedByName} (${slip.generatedByRole}).
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}
