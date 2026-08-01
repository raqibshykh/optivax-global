import{i as c}from"./index-BF5lcj23.js";import{L as h}from"./leaveRequestService-kQ2EQhXR.js";import{e as M}from"./calculations-_OHnW426.js";const E=e=>e.basicSalary,y=e=>e.advanceSalaryDeduction+(e.unpaidLeaveDeduction??0)+(e.halfDayDeduction??0)+(e.latePenaltyDeduction??0)+e.deductions.reduce((t,a)=>t+a.amount,0),P=e=>E(e)-y(e);function _(e){const t=Math.round(e*.5),a=Math.round(e*.3),n=Math.round(e*.1),i=e-t-a-n;return{basic:t,hra:a,medical:n,conveyance:i}}function B(e,t){const a=new Date().toISOString().slice(0,7),n=e.filter(o=>o.salaryMonth===a),i=t.filter(o=>o.status==="pending");return{totalSlips:e.length,totalNetPaid:n.reduce((o,d)=>o+d.netSalary,0),pendingAdvances:i.length,pendingAdvanceAmount:i.reduce((o,d)=>o+d.requestedAmount,0)}}const w=new Set(["hr_admin","hr_member"]),D=new Set(["management"]),$=new Set(["super_admin"]),S=new Set(["sales_admin","production_admin","marketing_admin","it_admin"]);function k(e){const t=e.indexOf("_");return t>0?e.slice(0,t):e}function j(e,t,a){if(t===a.employeeId)return!0;const n=$.has(e),i=D.has(e),o=w.has(e),d=S.has(e);if($.has(a.employeeRole))return i;if(D.has(a.employeeRole))return o||n;if(w.has(a.employeeRole))return i||n;if(S.has(a.employeeRole))return o||i||n;if(a.employeeRole.endsWith("_member")){const r=k(a.employeeRole);return d&&k(e)===r?!0:o||i||n}return i||n}function O(e,t,a){return t===a.employeeId?!1:j(e,t,a)}const N=3;function C(e,t,a,n,i){const o=t.reduce((m,b)=>m+b.requestedAmount,0),d=a.reduce((m,b)=>m+b.advanceSalaryDeduction,0),r=Math.max(0,o-d),p=o>0?Math.ceil(o/N):0,l=Math.min(r,p),s=n+((i==null?void 0:i.absentDays)??0),g=(i==null?void 0:i.halfDays)??0,u=(i==null?void 0:i.lateArrivals)??0,x=e>0?e/30:0,v=Math.round(s*x),A=Math.round(g*x*.5),L=Math.round(Math.floor(u/3)*x);return{advanceSalaryDeduction:l,unpaidLeaveDays:s,unpaidLeaveDeduction:v,halfDayDeduction:A,lateCount:u,lateAttendanceDeduction:L}}function z(e,t,a,n){const i=new Date(e),o=new Date(t),d=i<a?new Date(a):i,r=o>n?new Date(n):o;if(d>r)return 0;let p=0;const l=new Date(d);for(;l<=r;){const s=l.toISOString().slice(0,10);M(s)&&p++,l.setDate(l.getDate()+1)}return p}async function q(e,t,a){const[n,i]=await Promise.all([h.getAll(),h.getEmployeeRequests()]),o=n.filter(s=>s.userId===e&&s.status==="approved"),d=i.filter(s=>s.employeeId===e&&s.status==="Approved");if(o.length===0&&d.length===0)return 0;const r=new Date(t,a-1,1),p=new Date(t,a,0);let l=0;for(const s of o)!s.startDate||!s.endDate||(l+=z(s.startDate,s.endDate,r,p));for(const s of d)!s.startDate||!s.endDate||(l+=z(s.startDate,s.endDate,r,p));return l}const f="/saas/v1/payroll";class G{static async getSalarySlips(){return await c.get(`${f}/salary-slips`)||[]}static async saveSalarySlips(t){await c.put(`${f}/salary-slips`,{slips:t})}static async appendSalarySlip(t){await c.post(`${f}/salary-slips`,t)}static async getAdvanceRequests(){return await c.get(`${f}/advance-requests`)||[]}static async saveAdvanceRequests(t){await c.put(`${f}/advance-requests`,{requests:t})}static async getAdvanceAuditLog(){return await c.get(`${f}/advance-audit`)||[]}static async appendAdvanceAuditEntry(t){return c.post(`${f}/advance-audit`,t)}}function R(e,t){const a=g=>`Rs. ${Math.round(g).toLocaleString()}`,n=new Date(e.salaryMonth+"-01").toLocaleString("default",{month:"long",year:"numeric"}),i=_(e.basicSalary),o=P(e),d=(g,u="earn",x="")=>g.map(v=>`<div class="lr"><span class="ll">${v.label}</span><span class="lv ${u}">${x}${a(v.amount)}</span></div>`).join(""),r=[t.address,t.city,t.country].filter(Boolean).join(", "),p=[t.phone?`Tel: ${t.phone}`:"",t.email?`Email: ${t.email}`:"",t.website?`Web: ${t.website}`:""].filter(Boolean).join("  &nbsp;|&nbsp;  "),l=`${window.location.origin}/images/logo/logo-icon-dark.png`,s=`<img src="${l}" style="width:68px;height:68px;object-fit:contain;border-radius:10px;background:#fff;padding:6px;display:block;" alt="${t.name}" />`;return`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Salary Slip — ${e.employeeName} — ${n}</title>
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
<div class="wm"><img src="${l}" alt="" /></div>
<div class="wrap">
  <div class="hdr">
    <div style="flex-shrink:0;">${s}</div>
    <div class="co-block">
      <div class="co-name">${t.name.toUpperCase()}</div>
      ${t.tagline?`<div class="co-tag">${t.tagline}</div>`:""}
      <div class="co-det">
        ${r?r+"<br>":""}
        ${p}
      </div>
    </div>
    <div class="slip-box">
      <div class="slip-badge">SALARY SLIP</div>
      <div class="slip-mo">${n}</div>
      <div class="slip-id">ID: ${e.id.toUpperCase()}</div>
    </div>
  </div>

  <div class="eg">
    <div class="ec"><div class="el">Employee Name</div><div class="ev">${e.employeeName}</div></div>
    <div class="ec"><div class="el">Employee ID</div><div class="ev">${e.employeeId}</div></div>
    <div class="ec"><div class="el">Email</div><div class="ev sm">${e.employeeEmail}</div></div>
    <div class="ec row2"><div class="el">Department</div><div class="ev">${e.department}</div></div>
    <div class="ec row2"><div class="el">Designation</div><div class="ev">${e.designation}</div></div>
    <div class="ec row2"><div class="el">Salary Period</div><div class="ev">${n}</div></div>
  </div>

  <div class="sh">Salary Breakdown</div>
  <div class="lr"><span class="ll">Basic Salary</span><span class="lv earn">${a(i.basic)}</span></div>
  <div class="lr"><span class="ll">House Rent Allowance</span><span class="lv earn">${a(i.hra)}</span></div>
  <div class="lr"><span class="ll">Medical Allowance</span><span class="lv earn">${a(i.medical)}</span></div>
  <div class="lr"><span class="ll">Conveyance Allowance</span><span class="lv earn">${a(i.conveyance)}</span></div>
  <div class="sub"><span>Total Gross Salary</span><span>${a(e.basicSalary)}</span></div>

  ${y(e)>0?`
  <div class="sh">Deductions</div>
  ${d(e.deductions,"ded","−")}
  ${e.advanceSalaryDeduction>0?`<div class="lr"><span class="ll">Advance Salary Recovery</span><span class="lv ded">−${a(e.advanceSalaryDeduction)}</span></div>`:""}
  ${(e.unpaidLeaveDeduction??0)>0?`<div class="lr"><span class="ll">Unpaid Leave — ${e.unpaidLeaveDays??0} day${(e.unpaidLeaveDays??0)!==1?"s":""} (all leaves unpaid)</span><span class="lv ded">−${a(e.unpaidLeaveDeduction??0)}</span></div>`:""}
  ${(e.halfDayDeduction??0)>0?`<div class="lr"><span class="ll">Half Day Deduction</span><span class="lv ded">−${a(e.halfDayDeduction??0)}</span></div>`:""}
  ${(e.latePenaltyDeduction??0)>0?`<div class="lr"><span class="ll">Late Penalty — ${e.latePenaltyCount??0} late arrivals → ${e.latePenaltyDays??0} day${(e.latePenaltyDays??0)!==1?"s":""}</span><span class="lv ded">−${a(e.latePenaltyDeduction??0)}</span></div>`:""}
  <div class="sub ded"><span>Total Deductions</span><span>−${a(y(e))}</span></div>
  `:""}

  <div class="net">
    <span class="net-lbl">Net Salary Payable</span>
    <div class="net-right">
      <div class="net-tag">Total Take-Home</div>
      <div class="net-amt">${a(o)}</div>
    </div>
  </div>

  ${e.notes?`<div class="notes"><strong>Note:</strong> ${e.notes}</div>`:""}

  <div class="ftr">
    <div class="ft">
      <strong>Generated by:</strong> ${e.generatedByName} (${e.generatedByRole})<br>
      <strong>Generated on:</strong> ${new Date(e.generatedAt).toLocaleString()}
    </div>
    <div class="ft" style="text-align:right;">
      This is a computer-generated salary slip.<br>
      No physical signature is required.
    </div>
  </div>
</div>
</body></html>`}function W(e,t){const a=R(e,t),n=window.open("","_blank");n&&(n.document.write(a),n.document.close(),setTimeout(()=>n.print(),500))}function U(e,t){if(e.length===0)return;const a=t,n=`${window.location.origin}/images/logo/logo-icon-dark.png`,i=e.map(r=>`<div style="page-break-after:always;">${R(r,a).replace(/^[\s\S]*?<body[^>]*>/,"").replace(/<\/body>[\s\S]*$/,"").replace(/<div class="wm">[\s\S]*?<\/div>\s*/,"")}</div>`),o=`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Bulk Salary Slips — ${a.name}</title>
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
<div class="wm"><img src="${n}" alt="" /></div>
${i.join(`
`)}
</body></html>`,d=window.open("","_blank");d&&(d.document.write(o),d.document.close(),setTimeout(()=>d.print(),600))}export{G as P,j as a,y as b,O as c,P as d,_ as e,C as f,q as g,B as h,U as i,W as p};
