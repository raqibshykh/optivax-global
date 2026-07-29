import { api } from "../lib/client";
import type { CompanySettings } from "./companySettingsService";
import { LeaveRequestService } from "./leaveRequestService";
import { isWorkingDay } from "./attendanceService";
import {
  computeGross,
  computeDeductions,
  computeNet,
  computeSlipBreakdown,
  getPayrollStats,
  canViewRequest,
  canApproveRequest,
  computeStrictDeductions,
  type PayrollItem,
  type SalarySlip,
  type AdvanceStatus,
  type AdvanceSalaryRequest,
  type SlipBreakdown,
  type SlipStats,
  type MonthlyAttendanceSummary,
  type StrictDeductions,
} from "../domain/payroll/calculations";

// Re-export types + pure calculation helpers so consumers only need one import
// (`services/payrollService`) instead of reaching into `domain/payroll/calculations`.
export {
  computeGross,
  computeDeductions,
  computeNet,
  computeSlipBreakdown,
  getPayrollStats,
  canViewRequest,
  canApproveRequest,
  computeStrictDeductions,
};
export type {
  PayrollItem,
  SalarySlip,
  AdvanceStatus,
  AdvanceSalaryRequest,
  SlipBreakdown,
  SlipStats,
  MonthlyAttendanceSummary,
  StrictDeductions,
};

// ── Advance Salary Audit Log types (previously in mock/payrollData.ts) ─────────

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

/** Counts the weekday, non-holiday days a single [startDate, endDate] range contributes within the given month. */
function countWeekdaysInRangeForMonth(startDate: string, endDate: string, monthStart: Date, monthEnd: Date): number {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const rangeStart = s < monthStart ? new Date(monthStart) : s;
  const rangeEnd = e > monthEnd ? new Date(monthEnd) : e;
  if (rangeStart > rangeEnd) return 0;
  let count = 0;
  const cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    const iso = cur.toISOString().slice(0, 10);
    if (isWorkingDay(iso)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Counts weekday (Mon–Fri), non-holiday approved leave days for an employee
// in a given month. Cross-domain calculation combining Leave Requests and the
// Attendance domain's company holiday calendars.
//
// Reads from BOTH leave-request stores (see leaveRequestService.ts's own doc
// comment on why two independent stores exist): the HR-administered store
// (HR/LeaveRequests.tsx) AND the employee self-service store (submitted from
// every role's own Profile page). Previously this only read the HR store, so
// leave approved through the standard self-service flow — the path almost
// every non-HR employee actually uses — silently produced zero payroll
// deduction. Each store uses its own status casing ("approved" vs "Approved").
export async function countApprovedLeaveDaysInMonth(employeeId: string, year: number, month: number): Promise<number> {
  const [hrRequests, employeeRequests] = await Promise.all([
    LeaveRequestService.getAll(),
    LeaveRequestService.getEmployeeRequests(),
  ]);

  const approvedHr = hrRequests.filter((l) => l.userId === employeeId && l.status === "approved");
  const approvedEmployee = employeeRequests.filter((l) => l.employeeId === employeeId && l.status === "Approved");

  if (approvedHr.length === 0 && approvedEmployee.length === 0) return 0;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  let total = 0;
  for (const leave of approvedHr) {
    if (!leave.startDate || !leave.endDate) continue;
    total += countWeekdaysInRangeForMonth(leave.startDate, leave.endDate, monthStart, monthEnd);
  }
  for (const leave of approvedEmployee) {
    if (!leave.startDate || !leave.endDate) continue;
    total += countWeekdaysInRangeForMonth(leave.startDate, leave.endDate, monthStart, monthEnd);
  }
  return total;
}

const BASE = "/saas/v1/payroll";

export class PayrollService {
  // ── Salary Slips ───────────────────────────────────────────────────────────

  static async getSalarySlips(): Promise<SalarySlip[]> {
    const data = await api.get<SalarySlip[]>(`${BASE}/salary-slips`);
    return data || [];
  }

  static async saveSalarySlips(slips: SalarySlip[]): Promise<void> {
    await api.put(`${BASE}/salary-slips`, { slips });
  }

  static async appendSalarySlip(slip: SalarySlip): Promise<void> {
    await api.post(`${BASE}/salary-slips`, slip);
  }

  // ── Advance Salary Requests ────────────────────────────────────────────────

  static async getAdvanceRequests(): Promise<AdvanceSalaryRequest[]> {
    const data = await api.get<AdvanceSalaryRequest[]>(`${BASE}/advance-requests`);
    return data || [];
  }

  static async saveAdvanceRequests(reqs: AdvanceSalaryRequest[]): Promise<void> {
    await api.put(`${BASE}/advance-requests`, { requests: reqs });
  }

  // ── Advance Salary Audit Log ───────────────────────────────────────────────

  static async getAdvanceAuditLog(): Promise<AdvanceSalaryAuditEntry[]> {
    const data = await api.get<AdvanceSalaryAuditEntry[]>(`${BASE}/advance-audit`);
    return data || [];
  }

  static async appendAdvanceAuditEntry(
    entry: Omit<AdvanceSalaryAuditEntry, "id" | "timestamp">
  ): Promise<AdvanceSalaryAuditEntry> {
    return api.post<AdvanceSalaryAuditEntry>(`${BASE}/advance-audit`, entry);
  }
}

// ── Salary slip printing (unchanged HTML/formula, branding now passed in) ─────

function _slipHtml(slip: SalarySlip, co: CompanySettings): string {
  const fmtR = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;
  const ml = new Date(slip.salaryMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });
  const bd = computeSlipBreakdown(slip.basicSalary);
  const displayNet = computeNet(slip);

  const lineRows = (items: PayrollItem[], cls = "earn", prefix = "") =>
    items
      .map(
        (i) =>
          `<div class="lr"><span class="ll">${i.label}</span><span class="lv ${cls}">${prefix}${fmtR(i.amount)}</span></div>`
      )
      .join("");

  const addrParts = [co.address, co.city, co.country].filter(Boolean).join(", ");
  const contactLine = [
    co.phone ? `Tel: ${co.phone}` : "",
    co.email ? `Email: ${co.email}` : "",
    co.website ? `Web: ${co.website}` : "",
  ]
    .filter(Boolean)
    .join("  &nbsp;|&nbsp;  ");

  const logoSrc = `${window.location.origin}/images/logo/logo-icon-dark.png`;
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

  ${
    computeDeductions(slip) > 0
      ? `
  <div class="sh">Deductions</div>
  ${lineRows(slip.deductions, "ded", "−")}
  ${slip.advanceSalaryDeduction > 0 ? `<div class="lr"><span class="ll">Advance Salary Recovery</span><span class="lv ded">−${fmtR(slip.advanceSalaryDeduction)}</span></div>` : ""}
  ${(slip.unpaidLeaveDeduction ?? 0) > 0 ? `<div class="lr"><span class="ll">Unpaid Leave — ${slip.unpaidLeaveDays ?? 0} day${(slip.unpaidLeaveDays ?? 0) !== 1 ? "s" : ""} (all leaves unpaid)</span><span class="lv ded">−${fmtR(slip.unpaidLeaveDeduction ?? 0)}</span></div>` : ""}
  ${(slip.halfDayDeduction ?? 0) > 0 ? `<div class="lr"><span class="ll">Half Day Deduction</span><span class="lv ded">−${fmtR(slip.halfDayDeduction ?? 0)}</span></div>` : ""}
  ${(slip.latePenaltyDeduction ?? 0) > 0 ? `<div class="lr"><span class="ll">Late Penalty — ${slip.latePenaltyCount ?? 0} late arrivals → ${slip.latePenaltyDays ?? 0} day${(slip.latePenaltyDays ?? 0) !== 1 ? "s" : ""}</span><span class="lv ded">−${fmtR(slip.latePenaltyDeduction ?? 0)}</span></div>` : ""}
  <div class="sub ded"><span>Total Deductions</span><span>−${fmtR(computeDeductions(slip))}</span></div>
  `
      : ""
  }

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

/** Prints a single salary slip. `company` must be fetched by the caller (e.g. via `getCompanySettings()`). */
export function printSalarySlip(slip: SalarySlip, company: CompanySettings) {
  const html = _slipHtml(slip, company);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

/** Prints multiple salary slips as one paginated document. `company` must be fetched by the caller. */
export function printSalarySlipsBulk(slips: SalarySlip[], company: CompanySettings) {
  if (slips.length === 0) return;
  const co = company;
  const logoSrc = `${window.location.origin}/images/logo/logo-icon-dark.png`;

  // Strip each slip's own <style>, <body> tags, and per-slip .wm watermark div
  // so the bulk document applies one unified stylesheet and one shared watermark.
  const pages = slips.map((s) => {
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
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }
}
