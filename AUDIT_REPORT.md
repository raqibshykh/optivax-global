# OptiVax Global — Enterprise SaaS CRM/ERP Full Audit Report

**Date:** 2026-07-01 (Phase 1) / updated same day (Phase 2 — Phases A–J)
**Auditors:** Multi-Agent Automated System (10 specialized agents)
**Stack:** React 19 · React Router 7 · Tailwind 4 · TypeScript 5.7 · Vite 6
**Scope:** Complete codebase — RBAC, routing, dashboards, payroll, budget, billing, tasks, notifications, leave/attendance, mock data integrity, department workflows, security, production readiness
**Previous Audits:** 2026-06-16 (RBAC migration), 2026-06-20 (workflow audit), 2026-06-22 (runtime audit)

---

## 1. Executive Summary

The system is a full-featured SaaS CRM/ERP with 14 role types, 50+ pages, and a complete in-browser mock server. Phase 2 deepened the audit across 10 additional domains (Phases A–J), covering budget hierarchy, super admin authority, payroll accuracy, invoice/billing, task management, notification permissions, leave/attendance lifecycle, mock data consistency, department workflows, and deployment readiness.

**Phase 2 uncovered 7 new Critical, 17 new High, 14 new Medium, and 10 new Low issues**, bringing the combined totals to:

| Severity | Phase 1 | Phase 2 New | Grand Total |
|----------|---------|-------------|-------------|
| Critical | 4 | 7 | **11** |
| High | 7 | 17 | **24** |
| Medium | 10 | 14 | **24** |
| Low | 6 | 10 | **16** |
| **Total** | **27** | **48** | **75** |

**Top Phase 2 findings (new):**
- The Leave → Payroll integration is entirely broken: approved leaves write to `mock_leave_requests` but all three payroll engines read from completely different stores — approved leaves never affect any salary calculation
- The Tasks server API returns **all tasks** to every `_member` role with no server-side filtering — client-side isolation is the only data boundary
- Stripe `confirmCardPayment()` is commented out and replaced with a 1.4-second `setTimeout` — no real payment processing occurs
- Plaintext passwords are stored in `localStorage["mock_passwords"]` readable by any script on the page
- Budget `usedAmount` is static seed data — no integration with project spending, invoices, or any real transaction exists
- `vercel.json` has zero security headers (no CSP, no X-Frame-Options, no HSTS)
- `.env.production` sets `VITE_USE_MOCK_SERVER=true` — the live Vercel deployment runs entirely on in-browser mock data with no real backend

**Updated Overall Health: 38 / 100** — Visually complete; fundamentally broken data chains, missing server-side enforcement, and serious security gaps prevent production use.

---

## 2. Critical Issues

### C1 — `hr_member` Full Payroll Data Exposure via Route (CRITICAL)

**File:** `src/App.tsx`

`/hr/payroll` has no nested route guard. `hr_member` passes the outer HR block guard. The Payroll page exposes every employee's base salary, bonus, deductions, and net pay. `canEdit("hr")` passes for `hr_member` (they have `hr: ["VIEW","EDIT"]`), so they can view AND edit every salary entry.

**Fix:** Add `<Route element={<ProtectedRoute allowedRoles={["hr_admin", "super_admin"]} />}>` nested around `/hr/payroll`.

---

### C2 — `hr_member` Full Salary Exposure via AttendancePayroll Guard Bug (CRITICAL)

**File:** `src/pages/HR/AttendancePayroll.tsx:144`

```tsx
// Wrong — explicitly grants hr_member access:
if (!canSeePayroll && role !== "hr_member") { return <AccessDenied />; }
// Fix:
if (!canSeePayroll) { return <AccessDenied />; }
```

`canSeePayroll = ["super_admin","management","hr_admin"].includes(role)`. When `role === "hr_member"` the condition evaluates `true && false = false` — access denied is never shown. `hr_member` sees full payroll calculations for all employees.

---

### C3 — MySalarySlips Shows Zero Slips for All Real Test Logins (CRITICAL)

**File:** `src/mock/payrollData.ts` — `SEED_SLIPS` array

All 6 seed salary slips use fictional `employeeId` values (`seed-emp-01` through `seed-emp-07`) that match no `mockUsers` ID. All 6 seed advance requests use the same fictional IDs. The `generatedById: "user-hr-01"` is also a ghost ID.

| Seed ID | Should be | Real user |
|---------|-----------|-----------|
| `seed-emp-01` | u8 | James Carter (sales_admin) |
| `seed-emp-02` | u9 | David Chen (production_admin) |
| `seed-emp-03` | u10 | Olivia Brown (marketing_admin) |
| `seed-emp-04` | u15 | Ethan Lee (hr_member) |
| `seed-emp-05` | u12 | Emma Wilson (sales_member) |
| `seed-emp-06` | u22 | Chris Nolan (sales_member) |
| `seed-emp-07` | u24 | Edgar Wright (production_member) |

**Fix:** Replace all `seed-emp-*` values with real `mockUsers` IDs throughout `SEED_SLIPS` and `SEED_ADVANCE_REQUESTS`.

---

### C4 — All Seed Conversations Reference Non-Existent Users (CRITICAL)

**File:** `src/mock/conversationsData.ts` — `seedConversations()`

All 8 seed conversations use ghost user IDs and fictional client IDs. Every single `clientId` (`client-001` through `client-004`) and three of four `assignedUserId` values are wrong:

| Ghost in seed | Correct mapping |
|---------------|-----------------|
| `"u4"` Omar Farooq (sales_admin) | u8 James Carter |
| `"u9"` Layla Hassan (marketing_admin) | u10 Olivia Brown |
| `"u14"` Yusuf Okafor (production_admin) | u9 David Chen |
| `"u2"` Rania Al-Sayed | u2 Sarah Mitchell (correct ID, wrong name) |
| `"client-001"` | u6 Alice Johnson (Acme Corp) |
| `"client-002"` | u7 Bob Williams (Globex Corp) |
| `"client-003"` | u30 Carol Stevens (TechNova Inc) |
| `"client-004"` | u31 Daniel Foster (BluePeak Retail) |

**Fix:** Replace all fictional IDs, names, and roles throughout `seedConversations()`.

---

### C5 — `SalarySlips.tsx` List View Displays Wrong Net Salary (CRITICAL)

**File:** `src/pages/HR/SalarySlips.tsx:591`

```tsx
// Wrong — uses basicSalary instead of gross:
{fmtRs(slip.basicSalary - computeDeductions(slip))}

// Fix:
{fmtRs(computeGross(slip) - computeDeductions(slip))}
// or simply:
{fmtRs(computeNet(slip))}
```

The table list column shows a lower, incorrect net salary for any employee with allowances, bonuses, or overtime. The View modal (line 181) and PDF print correctly call `computeNet(slip)`. Only the table summary row is wrong — but it is what admins see first in the salary slip register.

---

### C6 — Stripe `confirmCardPayment()` Is Commented Out — No Real Payments (CRITICAL)

**File:** `src/pages/Client/Billing.tsx`

```tsx
// Real call is commented out:
// const result = await stripe.confirmCardPayment(clientSecret, {...});

// Replaced with:
await new Promise(resolve => setTimeout(resolve, 1400));
const chargeId = `ch_mock_${Date.now()}`;
```

`useStripe()` and `useElements()` return values are discarded. No card is charged. No payment gateway is called. Every "successful" payment is a 1.4-second delay followed by a hardcoded mock charge ID. The Stripe publishable key `pk_test_mock_optivax_dev` is not a real Stripe key.

---

### C7 — Tasks Server API Returns ALL Tasks to `_member` Roles (CRITICAL)

**File:** `src/mock/server.ts:1035`

The `GET /saas/v1/tasks` handler filters:
- `client` role → filtered by `assigneeId`
- `*_admin` role → filtered by `assigneeDept`
- **All other roles (including `_member`)** → `return ok(tasks)` — full unfiltered task list

A `sales_member` who inspects the raw API response receives every task in the system, across all departments. Client-side filtering in `Tasks.tsx:317` is the only isolation, and it can be bypassed via direct API inspection.

**Fix:** Add a `_member` branch in `server.ts:1023–1035` that filters tasks by `t.assigneeId === mockUserId`.

---

### C8 — `POST /saas/v1/notifications` Has No Role or User Verification (CRITICAL)

**File:** `src/mock/server.ts:1081–1096`

```ts
// Handler accepts any body with any userId — no check:
if (method === "POST" && p === "/saas/v1/notifications") {
  const n = { id: `n-${Math.random()...}`, ...body };
  localStorage.setItem(NOTIFS_KEY, JSON.stringify([n, ...notifs]));
  return ok(n);
}
```

Any authenticated user can POST a notification to any `userId`, including other users, admins, or non-existent IDs. No schema validation, no recipient verification, no role check. An IT member could send forged "management approval" notifications to any employee.

**Fix:** Add role validation: check `body.userId` is either the caller's own ID or that the caller has `management`/`super_admin` role before accepting the write.

---

### C9 — Admin Notifications "Send Notification" Button Not Role-Gated (CRITICAL)

**File:** `src/pages/Admin/Notifications.tsx:104`

The "Send Notification" button and `NotificationModal` are unconditionally rendered for any user who can reach `/admin/notifications`. The modal shows a dropdown of all clients and allows free-text message composition. No role check exists in the component. Combined with C8, an IT employee who can navigate to that route can send arbitrary notifications to any client.

**Fix:** Gate the "Send Notification" button on `["super_admin", "management"].includes(user.role)`.

---

### C10 — Leave Approval → Payroll Chain Completely Broken (CRITICAL)

**Files:** `src/pages/HR/LeaveRequests.tsx:162–179`, `src/mock/payrollData.ts:517`, `src/lib/devSeed.ts:407`

Three separate leave-related localStorage keys exist with zero interconnection:

| Key | Written by | Read by |
|-----|-----------|---------|
| `mock_leave_requests` | `LeaveRequests.tsx` (the UI) | `LeaveRequests.tsx` only |
| `optivax_leave_requests` | `lib/devSeed.ts` seed | `Payroll.tsx` (leave deduction) |
| `loadYearData` / `mock_att_year_v2_YEAR` | Deterministic generator | `SalarySlips.tsx`, `AttendancePayroll.tsx` |

When HR approves a leave via the UI:
1. `LeaveRequests.tsx:162` writes status `"approved"` to `mock_leave_requests`
2. No code writes a corresponding attendance record to `mock_att_year_v2_YEAR`
3. No code writes to `optivax_leave_requests`
4. `SalarySlips.tsx` reads `loadYearData` — never sees the approval
5. `Payroll.tsx` reads `optivax_leave_requests` — never sees the UI approval
6. **Result: Approved leave requests have zero effect on any salary calculation.**

An employee with 10 approved unpaid leave days will see the same net salary as one with zero leaves.

**Fix (minimum viable):** In `LeaveRequests.tsx` approval handler, also write an attendance record with `status: "leave"` to `mock_att_year_v2_YEAR` for each approved leave day.

---

### C11 — Plaintext Passwords in `localStorage["mock_passwords"]` (CRITICAL)

**File:** `src/mock/server.ts:357`

The mock authentication server stores user passwords in plaintext in `localStorage["mock_passwords"]`. Any XSS vulnerability (reflected, stored, or DOM-based) gives an attacker immediate access to every user's password. All 25+ users share the same default password (`"password123"`) seeded at boot — making lateral movement trivial.

**Note:** This is an architectural consequence of the mock server design and requires a real authentication backend to fully resolve. For the mock, at minimum use hashed values.

---

## 3. High Priority Issues

### H1 — `management` Cannot Access Payroll (Route Missing)

**Files:** `src/App.tsx`, `src/config/menuConfig.ts`

`management` has `payroll: ALL_ACTIONS` in RBAC but no `/management/payroll` route and no sidebar entry.

**Fix:** Add route and `MENU_CONFIG.management` entry.

---

### H2 — Export CSV Button Dead in AttendanceReports (No onClick)

**File:** `src/pages/ITSupport/AttendanceReports.tsx:54`

Button renders with no `onClick` handler.

---

### H3 — `sales_member` URL Bypass on Admin-Only Sales Pages

**File:** `src/App.tsx`

`/sales/campaigns` and `/sales/team-performance` have no nested guard. `sales_member` sees full campaign budget breakdowns and team performance data.

---

### H4 — `hr_member` URL Bypass on HR Settings and Reports

**File:** `src/App.tsx`

`/hr/settings` and `/hr/reports` have no nested guard. `hr_member` can reach system-level configuration via direct URL.

---

### H5 — SSE Notification Channel Silent for Business Events

**File:** `src/mock/server.ts`

Payment, file upload, and lead conversion handlers write directly to localStorage and never call the SSE emit path. Real-time notification toasts never appear for these events.

---

### H6 — Wrong Staff Names in Conversation Seed Data

**File:** `src/mock/conversationsData.ts`

Even after fixing IDs (C4), names must be corrected: `"Rania Al-Sayed"` → `"Sarah Mitchell"`, `"Layla Hassan"` → `"Olivia Brown"`, `"Yusuf Okafor"` → `"David Chen"`. Role fields must also match real users.

---

### H7 — `management` Cannot View Advance Salary Audit Log

**Files:** `src/App.tsx:295`, `src/pages/HR/AdvanceSalaryAuditLog.tsx:84`

`management` can approve and reject advance requests but is excluded from the audit log. Route guard allows only `["super_admin", "hr_admin"]`.

**Fix:** Add `"management"` to both the route guard and the component-level `allowed` check.

---

### H8 — Budget `usedAmount` Is Static Seed Data (No Spending Integration)

**File:** `src/mock/budgetData.ts:37`, `src/pages/Admin/BudgetManagement.tsx:2004`

`MemberAllocation.usedAmount` is set in seed data and never mutated by any function. `handleAllocate` explicitly preserves the existing value: `usedAmount: idx >= 0 ? all[idx].usedAmount : 0`. There is no code path that increments `usedAmount` when a member spends on a project or invoice. The "Used" column in Budget Management displays static seed numbers as live spending data.

---

### H9 — Project and Invoice Spending Siloed from Budget Hierarchy

**File:** `src/types/index.ts:107`, `src/mock/budgetData.ts`

`Project.spent` and `MemberAllocation.usedAmount` are completely independent fields. No code in `BudgetManagement.tsx`, `budgetData.ts`, or any project/invoice save function ever updates `MemberAllocation.usedAmount` from project activity. The budget hierarchy and the project tracker each maintain separate `spent` values that never synchronize.

---

### H10 — Paid Invoices Have No Server-Side Immutability Guard

**File:** `src/mock/server.ts:639–643`

```ts
// PUT /saas/v1/invoices/update — no status check:
const idx = invoices.findIndex(i => i.id === body.id);
invoices[idx] = { ...invoices[idx], ...body };
writeInvoices(invoices);
return ok(invoices[idx]);
```

Any user with UI access can edit a paid invoice's amount, client, or project. The admin billing UI hides the "Edit" button for paid invoices, but this is client-side only. A direct PUT request bypasses it entirely.

**Fix:** Add `if (invoices[idx]?.status === "paid") return err(403, "Cannot edit a paid invoice")`.

---

### H11 — Invoice Budget Cap Validation Skips When `budget === 0`

**File:** `src/mock/server.ts` — `POST /saas/v1/invoices/generate` handler

```ts
// Falsy check — skips validation for budget: 0:
if (proj?.budget) {
  if (proj.spent + amount > proj.budget) { /* cap check */ }
}
```

A project with `budget: 0` (either intentional or unset) receives no cap enforcement. Invoices of any amount can be generated against it.

**Fix:** Change to `if (proj?.budget !== undefined && proj.budget !== null)`.

---

### H12 — No Server-Side Role Check on Invoice Generation

**File:** `src/mock/server.ts:607–636`

`POST /saas/v1/invoices/generate` has no role validation. Any authenticated user who can reach the endpoint can generate invoices for any project and client. The UI gates this with `checkPermission("billing","CREATE")` but the server does not enforce it.

---

### H13 — Advance Salary Has No Installment Spreading Mechanism

**Files:** `src/mock/payrollData.ts:517`, `src/pages/HR/SalarySlips.tsx`

`computeStrictDeductions` deducts the full outstanding advance balance in the first slip generated after approval. Advance request notes commonly say "spread over 2 months" but no such logic exists. An employee approved for Rs. 50,000 advance will have Rs. 50,000 deducted from their very next slip.

---

### H14 — Leave Deduction Source Divergence

**Files:** `src/pages/HR/Payroll.tsx`, `src/pages/HR/SalarySlips.tsx`

`Payroll.tsx` reads leave counts from `optivax_leave_requests` (seeded by `lib/devSeed.ts`). `SalarySlips.tsx` reads from `loadYearData` (`mock_att_year_v2_YEAR`). These two keys have different data. The same employee for the same month can show different leave deduction amounts in the payroll register vs. their salary slip — even without any UI interaction.

---

### H15 — Two Orphaned Leave Storage Keys

**Files:** `src/pages/HR/LeaveRequests.tsx`, `src/lib/devSeed.ts:407`

`lib/devSeed.ts` seeds 5 leave records into `"optivax_leave_requests"`. `LeaveRequests.tsx` reads from and writes to `"mock_leave_requests"` exclusively. The `devSeed.ts` seed data is permanently orphaned — it is never read by `LeaveRequests.tsx`. These are two completely parallel leave systems in separate keys.

---

### H16 — `INITIAL_TASKS` Constant Is Dead Code — Tasks Board Empty on First Load

**File:** `src/pages/Tasks/Tasks.tsx:37–48`

`INITIAL_TASKS` contains 10 seeded tasks but is **never used** anywhere in the component. The mock server reads tasks from `localStorage["mock_tasks"]` which starts as `safeParse(..., [])` — an empty array. On first load with empty localStorage, the tasks Kanban board is always empty despite the seed array appearing in the source file.

**Fix:** Call the seed function at server init, similar to how other modules are seeded.

---

### H17 — `PUT /saas/v1/tasks/:id` Has No Role or Ownership Check

**File:** `src/mock/server.ts:1050–1056`

The task update handler applies any body fields to any task ID without verifying the caller's role or that the task belongs to their department. Any user can craft a PUT to reassign or modify any task in the system.

---

### H18 — No Duplicate Task Prevention in Either Task System

**Files:** `src/mock/server.ts:1038–1048`, `src/pages/Sales/SalesTasks.tsx:157–164`

Neither the API-backed Tasks board nor the localStorage-only SalesTasks performs any uniqueness check on title, assignee, or project. Identical tasks can be created unlimited times with no deduplication warning.

---

### H19 — SSE Broadcasts to All Tab Connections Without userId Filtering

**File:** `src/mock/server.ts:1091–1093`

`MockEventSource` uses a global in-tab `sseClients` set. When any notification is POSTed, every active SSE connection in the browser tab receives the raw event regardless of recipient `userId`. If multiple roles are logged in across tabs in the same browser session, notifications cross-contaminate.

---

### H20 — Sales Targets `achievedAmount` Is Manual-Entry Only

**File:** `src/pages/Sales/SalesTargets.tsx:264`

The "Achieved (MTD)" KPI (`targets.reduce((s, t) => s + t.achievedAmount, 0)`) displays whatever number was typed into the input field. There is no code path that reads converted lead `estimatedValue` values and computes actual achievement. Sales performance metrics are entirely fictional.

---

### H21 — Commission Calculation Is Entirely Manual

**Files:** `src/pages/Sales/Commissions.tsx`, `src/mock/salesData.ts`

Commission amounts are manually entered into `salesData.ts` and stored in `sales_commissions`. There is no formula linking `SalesDeal.amount` to commission percentage. The commission `status` field is toggled manually. No automation exists.

---

### H22 — Marketing → Production Handoff Is Visibility-Only

**File:** `src/pages/Marketing/ContentCalendar.tsx:770–772`

When marketing sets `productionSupportRequired = true`, production staff can see the calendar entry filtered into their view. However:
- No `Deliverable` record is created in `optivax_deliverables`
- No notification is sent to any production staff
- Production must manually create a Deliverable referencing the calendar entry
- The two systems (ContentCalendar and Deliverables) are completely separate with no bridging code

---

### H23 — `.env.production` Sets `VITE_USE_MOCK_SERVER=true`

**File:** `.env.production:2`

The production environment is explicitly configured to run the in-browser mock server. The live Vercel deployment has no real backend, all data lives in the visitor's browser localStorage, and all data is lost on page close or private browsing. Simultaneously, `VITE_API_URL` and `VITE_API_BASE` are empty strings in both `.env` and `.env.production`.

---

### H24 — `vercel.json` Has Zero Security Headers

**File:** `vercel.json`

The Vercel configuration has no `headers` array. Missing headers:
- `Content-Security-Policy` — allows any inline script, any external script source (XSS amplified)
- `X-Frame-Options: DENY` — clickjacking risk
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`
- `Referrer-Policy`

Combined with C11 (plaintext passwords) and C8 (unrestricted notification writes), the absence of CSP means any XSS gives full access to all localStorage data.

---

## 4. Medium Priority Issues

### M1 — Three Competing Attendance Data Stores (Architecture)

| Store | Written by | Read by |
|-------|-----------|---------|
| `mock_attendance` | `Attendance.tsx` self check-in, super_admin mark | Attendance.tsx only |
| `loadYearData` / `mock_att_year_v2_YEAR` | Deterministic generator + daily records via `appendYearRecord` | Monthly, Yearly, Analytics, Payroll |
| `itSupportData.ts` exceptions | IT pages | AttendanceDashboard, Exceptions, AttendanceReports |

Self check-in records in `mock_attendance` are **never merged** into `loadYearData`. Super_admin attendance edits written to `mock_attendance` via `Attendance.tsx` do NOT propagate to the yearly dataset used by payroll.

---

### M2 — Three Competing Payroll Systems (Architecture)

| System | Source of truth | Formula |
|--------|----------------|---------|
| `Payroll.tsx` | `optivax_employee_extra` + `optivax_leave_requests` | Manual entry |
| `AttendancePayroll.tsx` | `loadYearData` | `computePayrollEntry()` |
| `SalarySlips.tsx` / `BulkSalarySlips.tsx` | `loadYearData` + advance deductions | `computeStrictDeductions()` |

The same employee for the same month shows three different net salary figures across these three pages.

---

### M3 — Employee Salary Slip Hides Itemized Deductions

**File:** `src/pages/Employee/MySalarySlips.tsx`

`unpaidLeaveDeduction`, `halfDayDeduction`, and `latePenaltyDeduction` exist on the `SalarySlip` type but are not displayed. Employees cannot see why their salary was reduced.

---

### M4 — No Employee Attendance Correction Request Workflow

`Attendance.tsx` tells employees "Contact Super Admin for corrections" with no in-app form, no pending/approved/rejected tracking, and no employee notification when a correction is made.

---

### M5 — IT Attendance Dashboard Shows Fabricated Data

**File:** `src/pages/ITSupport/AttendanceDashboard.tsx:115`

Statuses assigned by `index % statuses.length` with a hardcoded array. Department KPI always shows `value: "85%"`. Real attendance records from any store never feed this dashboard.

---

### M6 — No `/it/settings` Route for `it_admin`

`it_admin` has `system: ["VIEW","EDIT"]` in RBAC but no route, no component, and no sidebar entry for IT settings. The permission is dead.

---

### M7 — `management` Has No Employee Self-Service Layer

No leave request submission, personal attendance view, or salary slip self-service path exists for `management` role. Every other role including members has these pages.

---

### M8 — Dual Seed Conflict Between `devSeed.ts` and `server.ts`

Both define separate seed functions with different data for the same localStorage keys. `devSeed.ts` wins if it runs first, but a cold start can land on sparse server-side seed data (3 clients vs 10, 3 invoices vs 13).

---

### M9 — Management Approves Advances But Cannot See Audit Trail

`management` writes `APPROVED`, `REJECTED`, `MARKED_PAID` entries into the advance salary audit log but is locked out of viewing that log (covered above as H7 at route level, documented here as the component-level aspect).

---

### M10 — Exception Approval Is Purely Cosmetic

**File:** `src/pages/ITSupport/AttendanceExceptions.tsx`

Approving an exception updates the exception's `status` field but writes no corrected attendance record into `mock_attendance` or `loadYearData`. No notification is sent to the affected employee. The approval has zero payroll effect.

---

### M11 — No Concurrency Protection on Budget Mutations

**File:** `src/pages/Admin/BudgetManagement.tsx:1389–1499`

All budget operations (assign, transfer, approve request) follow a read-modify-write pattern on localStorage with no optimistic concurrency token, no version check, and no transaction locking. In a multi-tab session, two concurrent budget actions will silently overwrite each other.

---

### M12 — No Partial Invoice Payment Support

**File:** `src/pages/Client/Billing.tsx`, `src/mock/server.ts:654–751`

Invoices are paid in full or not at all. There is no `amountPaid`, `remainingBalance`, or installment concept on the invoice model. The server marks any invoice `"paid"` regardless of the amount passed in the payment body.

---

### M13 — Seed Paid Invoices Have No Payment Records

**File:** `src/lib/devSeed.ts`

`inv-1` and `inv-3` are seeded as `status: "paid"` with `paidAt` timestamps but have no corresponding payment record in `mock_payments`. The "Total Collected via Stripe" KPI on the billing dashboard sums payment records and shows $0 collected despite two paid invoices being visible.

---

### M14 — No Leave Balance / Quota Enforcement

**File:** `src/pages/HR/LeaveRequests.tsx:136–160`

`handleSubmit` validates only that `endDate >= startDate`. There is no per-employee leave quota, no maximum annual days check, and no balance counter. An employee can submit unlimited annual, sick, or casual leave with no system enforcement. `leavesTaken` in `optivax_employee_extra` is a static display number, never decremented by approvals.

---

### M15 — No Overlap Validation for Leave Requests

**File:** `src/pages/HR/LeaveRequests.tsx:136–160`

The submit handler does not check for existing approved or pending requests that cover overlapping date ranges. An employee can submit duplicate overlapping requests that will both be stored and potentially both deducted.

---

### M16 — Leave Day Count Does Not Exclude Weekends or Public Holidays

**File:** `src/pages/HR/LeaveRequests.tsx:88`

```tsx
const calcDays = (s: string, e: string) =>
  Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000) + 1;
```

Naive calendar-day count. A Mon–Fri leave spanning a public holiday on Wednesday deducts 5 days, not 4. `attendanceData.ts` does exclude holidays from working day counts — but the leave submission form does not use that logic.

---

### M17 — No Client Invoice Dispute Mechanism

**File:** `src/pages/Client/Billing.tsx`

Clients can view invoices but cannot dispute amounts, request corrections, or flag errors. No dispute model, workflow, or notification path exists. The revision system covers deliverables only.

---

### M18 — Sales Lead Pipeline Missing Proposal and Won Stages

**File:** `src/pages/Sales/Leads.tsx:12`

Lead statuses are `new | contacted | qualified | lost | converted`. The canonical `Proposal`, `Negotiation`, and `Won` stages defined in `SalesPanel.tsx:23` (`SalesDeal` interface) exist in a separate interface never connected to the Leads page. Sales reps can jump directly from `new` to `converted` with no intermediate stage requirement.

---

### M19 — No Automatic Deliverable Creation from Client Revision Requests

**File:** `src/pages/Client/MyProjects.tsx`, `src/pages/Admin/Revisions.tsx`

When a client submits a revision request, it creates a `Revision` record but does NOT auto-create a new `Deliverable`. Production staff must read the revision in `Admin/Revisions.tsx` and manually create a new deliverable. No notification is sent to production when revision status changes (`Admin/Revisions.tsx` has no `notifyRevisionStatusChanged` call).

---

### M20 — `VITE_LOGO_URL` Missing from All `.env` Files

**Files:** `src/components/AppSidebar.tsx:52`, `src/layouts/AuthPageLayout.tsx:24`

`VITE_LOGO_URL` is referenced in two layout components but is defined in none of `.env`, `.env.production`, or `.env.example`. The sidebar and login page will display a broken image URL in any environment.

---

### M21 — `tsconfig.json` Contains Stale Next.js Artifacts

**File:** `tsconfig.json:16,26`

```json
"plugins": [{ "name": "next" }]    // Next.js-only, no-op in Vite
"include": ["next-env.d.ts", ...]  // file does not exist in this project
```

The config was scaffolded from a Next.js template and never cleaned up. The `next` plugin is silently ignored at build time but signals misconfiguration. `skipLibCheck: true` prevents the missing `next-env.d.ts` from erroring.

---

### M22 — Task Dept-Isolation for Dept Admins Is UI-Only

**File:** `src/mock/server.ts:1038–1048`

The task creation `POST` handler only blocks a `_member` assigning to someone other than themselves. A `marketing_admin` can craft a POST body assigning a task to a `sales_member` — the server does not verify that the assignee belongs to the creator's department. Dept isolation is enforced only in the UI assignee dropdown.

---

### M23 — SalesTasks Completion Triggers No Admin Notification

**File:** `src/pages/Sales/SalesTasks.tsx:183–188`

`handleStatusUpdate` writes status changes directly to `localStorage["sales_tasks"]` with no API call and no notification. A sales admin is never informed when a team member marks a task "done".

---

### M24 — `SalesTasks.tsx writeNotification()` Bypasses SSE

**File:** `src/pages/Sales/SalesTasks.tsx:97–111`

The inline `writeNotification()` function writes directly to `localStorage["mock_notifications"]` without calling `NotificationService.create()`. The SSE dispatch and `BroadcastChannel` sync in `server.ts:1086–1094` are never triggered. Sales task assignment notifications are not delivered in real time — recipients must reload to see them.

---

## 5. Low Priority Issues

### L1 — Duplicate "Salary Slips" Sidebar Entry for `super_admin`

**File:** `src/config/menuConfig.ts`

Two entries point to `/hr/salary-slips` — one top-level and one inside SA-HR sub-menu. **Fix:** Remove the top-level duplicate.

---

### L2 — Redundant Nested Guard on `/management/users`

**File:** `src/App.tsx:268–270`

The inner `ProtectedRoute` around `/management/users` is identical to its parent guard. Dead code.

---

### L3 — All PDF Generation Uses Browser Print Dialog

**Files:** `payrollData.ts` (`printSalarySlip`, `printSalarySlipsBulk`)

No real PDF library. Generating bulk slips for 10+ employees opens 10+ sequential browser print dialogs. **Recommended fix:** Add `jsPDF` or `@react-pdf/renderer`.

---

### L4 — ZKTeco Integration Fully Stubbed

`handleTestConnection` reads stored status, `handleSyncNow` generates random fake records. No ZKTeco SDK in `package.json`. Synced "records" never appear in any attendance table.

---

### L5 — Payroll.tsx CSV Export Is a Stub

**File:** `src/pages/HR/Payroll.tsx`

`showToast("CSV export coming soon", "info")`. Not implemented. `AttendancePayroll.tsx` has a working `exportCSV()` function that can be reused.

---

### L6 — Cross-Tab Notification Sync Broken

**File:** `src/hooks/useNotifications.ts`

Hook listens for `storage` event on key `"__saas_notifications_update"`. The mock server never writes this key — it dispatches `CustomEvent("saas:notification")` instead. Notification badges do not update across open tabs.

---

### L7 — Budget Request Amount Has No Upper Bound

**File:** `src/pages/Admin/BudgetManagement.tsx` — `RequestBudgetModal`

`<input type="number" min="1">` with no `max`. A dept admin can request an amount larger than the entire company budget. No server-side cap check on budget request amounts.

---

### L8 — Dept Allocation Floor Uses `usedTotal` Not `memberAllocatedTotal`

**File:** `src/pages/Admin/BudgetManagement.tsx:373–374`, `AssignBudgetModal`

The validation floor for reducing a dept allocation is `usedTotal` (money spent), not `memberAllocatedTotal` (money already assigned to members). A super_admin can set a dept total below the sum of member allocations, creating a negative "Available to Assign" balance without any blocking error.

---

### L9 — No Idempotency Guard on Budget `handleRequestAction`

**File:** `src/pages/Admin/BudgetManagement.tsx:1472`

`handleRequestAction` finds the request by ID but does not check `req.status === "Pending"` before processing. The "Review" button only appears in the UI for pending requests, but nothing at the data layer prevents re-approving an already-approved request and adding funds to the dept allocation a second time.

---

### L10 — `lib/devSeed.ts` Seeds Leave Type `"Personal"` Outside `LeaveType` Union

**File:** `src/lib/devSeed.ts:427`

`leave-3` seeds `type: "Personal"` which is not in `LeaveType = "annual" | "sick" | "casual" | "maternity" | "unpaid"` defined at `LeaveRequests.tsx:10`. This record will fail TypeScript validation if the type is ever enforced at runtime.

---

### L11 — `AttendanceCorrections.tsx` Is Read-Only (Name Is Misleading)

**File:** `src/pages/HR/AttendanceCorrections.tsx`

The component is a read-only audit log viewer (`getAuditLog()` at line 39). No edit, revert, or correction action exists here. Actual corrections are performed in `Attendance.tsx` by super_admin. The component name implies write capability that does not exist.

---

### L12 — IT SLA Enforcement Is Display-Only

**File:** `src/pages/ITSupport/Tickets.tsx:347`

SLA deadline is calculated at creation (`addDays(now, SLA_DAYS[priority])`) and an `overdue` flag is shown in the table. There is no automatic escalation trigger, no notification on SLA breach, and no priority escalation mechanism. The SLA deadline is cosmetic.

---

### L13 — User Deletion Orphans All Assigned Tasks

**File:** `src/mock/server.ts:468–472`

Deleting a user removes only the profile. Tasks with that user's `assigneeId` remain in `mock_tasks`. The task card silently loses the role badge; for members, their tasks become unreachable but the data persists.

---

### L14 — No Rate Limiting on Notification Creation

**Files:** `src/mock/server.ts:1081–1096`, `src/hooks/useNotifications.ts:129–138`

The POST handler creates a notification on every call with no throttle, no dedup check, and no idempotency key. Rapid task reassignments or form re-submits will write duplicate notifications for every affected user.

---

### L15 — `notifyAdminsOfCompletion()` in `Tasks.tsx` Is Dead Code

**File:** `src/pages/Tasks/Tasks.tsx:296–313`, `Tasks.tsx:197–199`

The function exists in the file but is never called. The live code path calls `notifyTaskStatusChanged()` instead. The dead function adds confusion without purpose.

---

### L16 — `@types/deno` in `devDependencies`

**File:** `package.json`

`@types/deno` is listed in devDependencies but this is a Vite + React project with no Deno runtime. The package has no effect but indicates the `package.json` was partially copied from a different project template without cleanup.

---

## 6. Security Risk Summary

| Risk | Severity | Location |
|------|----------|----------|
| `hr_member` views/edits all employee salaries | CRITICAL | `App.tsx` + `AttendancePayroll.tsx:144` |
| All tasks returned to `_member` roles by API | CRITICAL | `server.ts:1035` |
| POST `/notifications` has no role check | CRITICAL | `server.ts:1081` |
| Admin Notifications Send button not role-gated | CRITICAL | `Admin/Notifications.tsx:104` |
| Stripe payments are fully simulated | CRITICAL | `Client/Billing.tsx` |
| Leave approval has zero payroll effect | CRITICAL | `LeaveRequests.tsx:162` — broken chain |
| Plaintext passwords in `localStorage["mock_passwords"]` | CRITICAL | `server.ts:357` |
| `vercel.json` has zero security headers | HIGH | `vercel.json` |
| PUT `/tasks/:id` has no role/ownership check | HIGH | `server.ts:1050` |
| PUT `/invoices/update` has no paid-status check | HIGH | `server.ts:639` |
| SSE broadcasts to all tab connections | HIGH | `server.ts:1091` |
| `sales_member` URL-bypasses admin pages | MEDIUM | `App.tsx` |
| `hr_member` accesses system settings | MEDIUM | `App.tsx` |
| Task dept isolation is UI-only at server level | MEDIUM | `server.ts:1038` |
| SalesTasks `writeNotification()` bypasses SSE | MEDIUM | `SalesTasks.tsx:97` |
| No rate limiting on notifications | LOW | Global |
| Stripe test key `pk_test_mock_optivax_dev` in browser | LOW | `ClientBilling.tsx` |

---

## 7. RBAC Violations Table

| Role | Route / Feature | Status | Severity |
|------|----------------|--------|----------|
| `hr_member` | `/hr/payroll` | LEAK | CRITICAL |
| `hr_member` | `AttendancePayroll` salary view | LEAK | CRITICAL |
| `hr_member` | `/hr/settings` | LEAK | MEDIUM |
| `hr_member` | `/hr/reports` | LEAK | MEDIUM |
| `management` | `/hr/payroll` | LOCKOUT | HIGH |
| `management` | Advance Salary Audit Log | LOCKOUT | HIGH |
| `sales_member` | `/sales/campaigns` | LEAK | MEDIUM |
| `sales_member` | `/sales/team-performance` | LEAK | MEDIUM |
| `_member` (all) | `GET /saas/v1/tasks` | LEAK | CRITICAL |
| Any user | `POST /saas/v1/notifications` | UNRESTRICTED | CRITICAL |
| Any user on `/admin/notifications` | "Send Notification" button | LEAK | CRITICAL |
| `it_admin` | `/it/settings` | MISSING ROUTE | MEDIUM |
| `management` | Employee self-service | MISSING | MEDIUM |
| `super_admin` | Duplicate Salary Slips sidebar | UX BUG | LOW |
| `management` | `/management/users` redundant guard | CODE SMELL | LOW |

---

## 8. Broken Routes

| Route | Status | Cause |
|-------|--------|-------|
| `/it/settings` | MISSING | No route, no component, no sidebar entry |
| `/management/payroll` | MISSING | RBAC grants permission but route never added |

---

## 9. Broken Features

| Feature | File | Issue |
|---------|------|-------|
| Employee Salary Slips | `payrollData.ts` | Seed uses `seed-emp-*` IDs — employees see 0 slips (C3) |
| Advance Salary History | `payrollData.ts` | Same fictional IDs — employees see 0 history (C3) |
| Client Messaging Portal | `conversationsData.ts` | Ghost IDs — no real client sees seed conversations (C4) |
| Salary Slip Net (list view) | `SalarySlips.tsx:591` | Uses `basicSalary` instead of `gross` — wrong net displayed (C5) |
| Stripe Payment | `Client/Billing.tsx` | `confirmCardPayment()` commented out; no real charge (C6) |
| Leave → Payroll Deduction | `LeaveRequests.tsx:162` | Approval writes wrong key; no payroll engine reads it (C10) |
| Tasks Board (first load) | `Tasks.tsx:37` | `INITIAL_TASKS` is dead code; board starts empty (H16) |
| IT Attendance Export CSV | `AttendanceReports.tsx` | Button has no `onClick` handler (H2) |
| Exception Approval Effect | `AttendanceExceptions.tsx` | Approval writes no corrected attendance record (M10) |
| Real-time Notifications | `server.ts` | Payment/file/lead events bypass SSE path (H5) |
| Cross-tab Notification Sync | `useNotifications.ts` | Storage key `__saas_notifications_update` never written (L6) |
| IT Attendance Dashboard | `AttendanceDashboard.tsx` | Hardcoded 85% rates + random status per load (M5) |
| Budget Spent Tracking | `budgetData.ts` | `usedAmount` is static seed data; never updated (H8) |
| Sales Task Notifications | `SalesTasks.tsx:97` | `writeNotification()` bypasses SSE — no real-time delivery (M24) |

---

## 10. Incomplete Features

| Feature | Status | What Is Missing |
|---------|--------|----------------|
| ZKTeco Integration | STUB | Real TCP connection, SDK, actual biometric sync |
| Attendance Correction Requests | MISSING | Employee submission form, pending/approve/reject workflow |
| Payroll CSV Export (`Payroll.tsx`) | STUB | Shows "coming soon" toast |
| Bulk PDF Generation | BROKEN UX | N sequential print dialogs for N employees |
| IT Admin Settings | MISSING | Route, page, sidebar entry |
| Email Campaign "Send Test" | STUB | Button is a no-op |
| Email Campaign "sent" Transition | MISSING | No UI to mark campaign as sent |
| SalesTasks / Tasks Integration | SEPARATE | Uses `sales_tasks` key, not `/saas/v1/tasks` — no shared board |
| Employee Deduction Breakdown | PARTIAL | `MySalarySlips.tsx` hides itemized leave/late/half-day deductions |
| Management Employee Self-Service | MISSING | No leave/attendance personal view for management role |
| Advance Salary Installments | MISSING | Full balance deducted at once; no spreading logic |
| Sales Commission Auto-Calc | MISSING | Manual entry only; no formula linking deals to commissions |
| Sales Target Auto-Achievement | MISSING | Manual entry only; not computed from converted leads |
| Client Invoice Dispute | MISSING | No dispute model, workflow, or UI exists |
| Marketing→Production Deliverable Automation | MISSING | Handoff is visibility-only; no auto-deliverable creation |
| Revision→Deliverable Automation | MISSING | Production must manually create deliverable from revision |
| Client Notification on Revision Status Change | MISSING | No `notifyRevisionStatusChanged` call in `Admin/Revisions.tsx` |
| Partial Invoice Payments | MISSING | Full-amount only; no installment model |
| Leave Balance Enforcement | MISSING | No quota system; unlimited leaves can be submitted |
| Lead Pipeline Stages | INCOMPLETE | Missing Proposal, Negotiation, Won stages |

---

## 11. Production Risks

| Risk | Impact | Severity |
|------|--------|----------|
| `.env.production` runs on mock server | All deployed data lives in visitor's browser, lost on close | CRITICAL |
| Plaintext passwords in localStorage | XSS → full credential dump | CRITICAL |
| No security headers in `vercel.json` | CSP absent; XSS unrestricted; clickjacking possible | HIGH |
| Tasks API returns all tasks to members | Dept data isolation breakable via API inspection | HIGH |
| Leave approval has zero payroll effect | HR staff will approve leaves that are never deducted | HIGH |
| All 70+ routes eagerly imported | 2–4 MB initial JS bundle; slow Time to Interactive | HIGH |
| Missing `VITE_LOGO_URL` env var | Broken image on sidebar and login page | MEDIUM |
| Seed data ghost IDs (C3, C4) | Employee portal and client messaging unusable with real test logins | HIGH |
| `tsconfig.json` stale Next.js plugin | Signals unvetted config; may cause IDE tooling confusion | LOW |
| `@types/deno` in devDependencies | Configuration drift; misleads contributors | LOW |

---

## 12. Dashboard Audit

| Dashboard | Status | Issues |
|-----------|--------|--------|
| SuperAdminPanel | COMPLETE | — |
| AdminPanel | COMPLETE | — |
| ManagementPanel | COMPLETE | No payroll access route (H1) |
| HRPanel | COMPLETE | — |
| SalesPanel | PARTIAL | Target/commission figures are manual, not computed (H20, H21) |
| ProductionPanel | COMPLETE | — |
| MarketingPanel | PARTIAL | Production handoff is visibility-only (H22) |
| ITSupportPanel | INCOMPLETE | Hardcoded 85% rates, random attendance status (M5) |
| ClientPanel | PARTIAL | Conversation list empty until C4 fixed; no dispute (M17) |
| Employee Dashboard | MISSING | No `/employee/dashboard` route or panel page exists |

---

## 13. Module Completeness

| Module | Status | Notes |
|--------|--------|-------|
| Employee Management | COMPLETE | Full CRUD, RBAC-scoped |
| Client Management | COMPLETE | Lead conversion, email dedup |
| Project Management | COMPLETE | Budget tracking; `spent` siloed from budget hierarchy (H9) |
| Task Management | PARTIAL | Board starts empty (H16); server API leaks to members (C7) |
| Budget Management | PARTIAL | Rich UI; `usedAmount` static; no spending integration (H8, H9) |
| Payroll Register | INCOMPLETE | CSV stub; no period selector; wrong formula visible (C5) |
| Salary Slips (Admin) | PARTIAL | Generate/print/notify work; list net formula wrong (C5) |
| Salary Slips (Employee) | BROKEN | Seed ID mismatch → 0 slips (C3) |
| Advance Salary Workflow | PARTIAL | 4-state lifecycle; no installment spreading (H13) |
| Advance Salary (Employee) | BROKEN | Seed ID mismatch → empty history (C3) |
| Attendance (Daily) | COMPLETE | Self check-in, admin mark, audit log |
| Attendance (Reports) | INCOMPLETE | Self check-ins invisible to payroll (M1) |
| Leave Management | BROKEN | Approval has zero payroll effect (C10); no balance enforcement (M14) |
| ZKTeco / IT Attendance | STUB | No real device connectivity (L4) |
| IT Tickets | COMPLETE | Submit, assign, resolve, escalate, SLA (display-only) |
| Client Conversations | BROKEN | Ghost IDs; no real user sees seed data (C4) |
| Client Messages Portal | BROKEN | Filters by real user ID → empty (C4) |
| Client Billing | PARTIAL | UI complete; Stripe is fully mocked (C6); no dispute (M17) |
| Email Marketing | INCOMPLETE | Send Test is no-op; no campaign → "sent" transition |
| Social Tracking | COMPLETE | CRUD, click tracking, analytics |
| Sales Leads | PARTIAL | Convert/dedup/notify work; pipeline missing stages (M18) |
| Sales Commissions | INCOMPLETE | Manual entry only; no auto-calculation (H21) |
| Sales Targets | INCOMPLETE | Manual `achievedAmount`; not computed from closed deals (H20) |
| Content Calendar | PARTIAL | Marketing → Production visibility only; no auto-deliverable (H22) |
| Deliverables | COMPLETE | Status workflow, member advance guard |
| Revisions | PARTIAL | Workflow exists; no client notification on status change (M19) |
| Budget (Member View) | PARTIAL | `usedAmount` display only; static data (H8) |
| Reports | COMPLETE | CSV download, RBAC-scoped |
| Audit Logs | COMPLETE | Filterable, exportable |
| Settings | COMPLETE | System config, org management |
| Notifications | PARTIAL | 50+ event types; SSE has userId leak (H19); payments silent (H5) |

---

## 14. Performance Audit

| Issue | Component | Recommendation |
|-------|-----------|----------------|
| All 70+ routes eagerly imported | `App.tsx` | `React.lazy()` + `<Suspense>` for code splitting |
| FullCalendar (6 packages) + ApexCharts + Stripe all bundled eagerly | Multiple | Lazy-load non-critical chart/calendar pages |
| `BudgetManagement.tsx` is 2,474 lines | `BudgetManagement.tsx` | Extract 5 tab views into separate components |
| `loadYearData` generates 365 × N records synchronously | `attendanceData.ts` | Cache in `sessionStorage`; move to Web Worker for large N |
| `AttendancePayroll.tsx` recomputes all staff payroll on year change | `AttendancePayroll.tsx` | Memoize per-user per-month |
| Estimated initial bundle: 2–4 MB uncompressed | — | Add `build.rollupOptions.output.manualChunks` in `vite.config.ts` |

---

## 15. WordPress Migration Readiness

| Blocker | Severity | Detail |
|---------|----------|--------|
| All state in React context + localStorage | BLOCKING | WordPress requires REST API + PHP session layer |
| 6 feature domains bypass mock API entirely | BLOCKING | IT tickets, conversations, budget, advance salary, attendance, ZKTeco need real REST endpoints |
| No backend API enforcement (Phase 4 pending) | BLOCKING | Every RBAC permission is frontend-only |
| Three competing payroll systems | HIGH | Must consolidate before a real backend can be built |
| Stripe integration partially wired | MEDIUM | `loadStripe` works; webhook handlers need PHP |
| `HashRouter` (not `BrowserRouter`) | LOW | Compatible with WordPress subdirectory installs |

---

## 16. Recommended Fix Order

```
SPRINT 0 — Security (do before any external demo)
---------------------------------------------------
C7   server.ts — Add _member branch filtering tasks by assigneeId
C8   server.ts — Add role check to POST /saas/v1/notifications
C9   Admin/Notifications.tsx — Gate "Send Notification" on super_admin/management
C11  server.ts — Remove plaintext passwords from localStorage (use hashed tokens)
H24  vercel.json — Add security headers (CSP, X-Frame-Options, HSTS, nosniff)

SPRINT 1 — Data Integrity (before any employee/client logs in)
---------------------------------------------------------------
C1   App.tsx — Nested payroll guard allowedRoles=["hr_admin","super_admin"]
C2   AttendancePayroll.tsx:144 — Remove && role !== "hr_member" from guard
C3   payrollData.ts — Replace all seed-emp-* IDs with real mockUsers IDs
C4   conversationsData.ts — Replace all ghost user/client IDs and wrong names
C5   SalarySlips.tsx:591 — Change slip.basicSalary to computeGross(slip)
C10  LeaveRequests.tsx — Write attendance record to loadYearData on leave approval
H15  Consolidate orphaned leave stores (mock_leave_requests → optivax_leave_requests)
H16  Tasks.tsx / server.ts — Wire INITIAL_TASKS seed data to server init

SPRINT 2 — RBAC / Business Logic Gaps
----------------------------------------
H1   App.tsx + menuConfig.ts — Add /management/payroll route and sidebar entry
H2   AttendanceReports.tsx — Add onClick CSV export handler
H3   App.tsx — Nested guards on /sales/campaigns and /sales/team-performance
H4   App.tsx — Nested guards on /hr/settings and /hr/reports
H7   App.tsx + AdvanceSalaryAuditLog.tsx — Add management to advance audit log
H10  server.ts — Add paid-invoice immutability check on PUT handler
H11  server.ts — Fix budget cap falsy check (budget === 0)
H12  server.ts — Add role check to POST /saas/v1/invoices/generate
H13  payrollData.ts — Add installment spreading to advance deduction
H17  server.ts — Add role/ownership check to PUT /saas/v1/tasks/:id
L1   menuConfig.ts — Remove duplicate salary-slips from super_admin top-level
L2   App.tsx — Remove redundant /management/users nested guard

SPRINT 3 — UX / Medium Issues
--------------------------------
H19  server.ts — Filter SSE events by notification.userId before emit
H20  SalesTargets.tsx — Compute achievedAmount from converted lead estimatedValue
M5   AttendanceDashboard.tsx — Replace hardcoded 85% with exception-based calc
M6   Add /it/settings route and page
M7   Add personal leave/attendance routes under management prefix
M14  LeaveRequests.tsx — Add leave quota enforcement
M15  LeaveRequests.tsx — Add overlap validation on submission
M16  LeaveRequests.tsx — Use attendanceData holiday/weekend exclusion in calcDays
M20  .env files — Add VITE_LOGO_URL
M21  tsconfig.json — Remove stale Next.js plugin and next-env.d.ts reference
M22  server.ts — Validate assignee dept on task creation
L6   useNotifications.ts — Fix storage key to match server's CustomEvent key

SPRINT 4 — Architecture Consolidation
----------------------------------------
M1   Unify three attendance data stores
M2   Unify three payroll systems (canonicalize computeStrictDeductions)
H5   Fix SSE silent path for payment/file/lead events
H8   Integrate project/invoice spending into budget usedAmount
H9   Connect Project.spent to MemberAllocation.usedAmount on invoice payment
H22  Wire ContentCalendar productionSupportRequired to auto-create Deliverable

BACKLOG
---------
H21  Implement commission auto-calculation from deal amounts
L3   Add jsPDF or @react-pdf/renderer for real PDF generation
L4   Implement ZKTeco SDK integration
L5   Implement Payroll.tsx CSV export
M4   Build employee attendance correction request workflow
M8   Resolve dual seed conflict (devSeed.ts vs server.ts)
M10  Make AttendanceExceptions approval write corrected attendance records
M12  Add partial invoice payment support
M13  Add payment records for seed paid invoices
M17  Build client invoice dispute workflow
M18  Add Proposal/Negotiation/Won stages to sales lead pipeline
M19  Auto-create Deliverable from client revision request
H23  Remove VITE_USE_MOCK_SERVER=true from .env.production (requires real backend)
```

---

## 17. Files Requiring Changes (Sprint 0–1)

| Priority | File | Change Required |
|----------|------|----------------|
| C7 | `src/mock/server.ts` | Add _member task filter; role check on POST /notifications; paid-invoice check on PUT |
| C9 | `src/pages/Admin/Notifications.tsx` | Gate Send button on super_admin/management |
| C1+C2 | `src/App.tsx` | Nested payroll guard; /management/payroll route; guards for /sales/*, /hr/settings, /hr/reports; management on advance audit route |
| C2 | `src/pages/HR/AttendancePayroll.tsx` | Fix guard condition on line 144 |
| C3 | `src/mock/payrollData.ts` | Replace seed-emp-* IDs in SEED_SLIPS and SEED_ADVANCE_REQUESTS |
| C4 | `src/mock/conversationsData.ts` | Replace ghost user/client IDs and wrong staff names |
| C5 | `src/pages/HR/SalarySlips.tsx` | Line 591: change basicSalary to computeGross(slip) |
| C10 | `src/pages/HR/LeaveRequests.tsx` | Write attendance record to loadYearData on approval |
| H15 | `src/pages/HR/LeaveRequests.tsx` + `src/lib/devSeed.ts` | Consolidate to single leave storage key |
| H16 | `src/pages/Tasks/Tasks.tsx` + `src/mock/server.ts` | Wire INITIAL_TASKS to server seed init |
| H1 | `src/config/menuConfig.ts` | Add Payroll to management menu; remove super_admin duplicate |
| H7 | `src/pages/HR/AdvanceSalaryAuditLog.tsx` | Add management to allowed roles |
| H24 | `vercel.json` | Add headers array with CSP, X-Frame-Options, HSTS, nosniff, Referrer-Policy |

---

## 18. Phase A — Master Budget System

**Audited:** `src/pages/Admin/BudgetManagement.tsx` (2,474 lines), `src/mock/budgetData.ts` (488 lines)

### Passing

| Check | Result |
|-------|--------|
| Super Admin company budget CRUD (create/edit/increase/reduce/reset) | PASS — all 5 operations present with floor/ceiling validation and audit entries |
| Dept Admin member allocation floor (cannot go below `usedAmount`) | PASS — `MemberAllocModal` enforces both floor and ceiling client-side |
| Members cannot modify any budget | PASS — `_member` roles fall through to locked view; route guard excludes them from `/budget` |
| Company budget pool enforcement across depts | PASS — `maxAllowable = companyTotal - totalAllocatedOthers` is computed correctly |
| 4-state budget request machine (Pending/Approved/Rejected/Partial) | PASS — state machine is correct; fund movement only on approval |
| Partially approved requests | PASS — `approvedAmount` field supported; separate audit entry written |
| Budget return workflow | PASS — `ReturnBudgetModal` validates `amt <= remaining` correctly |
| Transfer between depts | PASS — validates target dept exists; atomic debit/credit in same handler |

### Issues Found

| Issue ID | Severity | Finding |
|----------|----------|---------|
| H8 | HIGH | `usedAmount` is static seed data — no integration with spending events. `handleAllocate` preserves existing value: `usedAmount: idx >= 0 ? all[idx].usedAmount : 0`. Never incremented by invoices, projects, or expenses. |
| H9 | HIGH | `Project.spent` and `MemberAllocation.usedAmount` are completely separate fields; no synchronization code exists in any file |
| M11 | MEDIUM | All budget mutations use read-modify-write on localStorage with no locking — multi-tab race condition possible |
| L7 | LOW | Budget request amount has no upper bound (no `max` on input, no server cap) |
| L8 | LOW | Dept allocation floor uses `usedTotal` (spent) not `memberAllocatedTotal` (assigned) — dept can be set below member sum without error |
| L9 | LOW | No idempotency guard on `handleRequestAction` — re-approving an already-approved request adds funds a second time (UI-only guard) |
| INFO | — | No CSV/bulk import feature for budget exists anywhere in the codebase |

---

## 19. Phase B — Super Admin Authority

**Audited:** `src/components/auth/ProtectedRoute.tsx`, `src/config/menuConfig.ts`, `src/pages/HR/SalarySlips.tsx`, `src/pages/HR/AdvanceSalaryAuditLog.tsx`, `src/App.tsx`

### Passing

| Check | Result |
|-------|--------|
| `ProtectedRoute` super_admin bypass is unconditional | PASS — `if (user.role === "super_admin") return <Outlet />` fires before any `allowedRoles` check |
| Super admin can generate slips for any employee | PASS — `isAdminView` includes `"super_admin"`; dropdown shows all non-client employees |
| Super admin sees Advance Salary Audit Log | PASS — `allowed = role === "super_admin" || role === "hr_admin"` passes |
| Super admin accesses IT Attendance Dashboard | PASS — `ProtectedRoute` bypass applies despite route having `allowedRoles={["it_admin","it_member"]}` |
| No nested double-guard issue found | PASS — all inner routes under SA-only outer guards use `<Outlet />` correctly |
| SA sidebar covers all major routes | PASS — 50+ sidebar entries across all dept sub-menus |

### Issues Found

| Issue ID | Severity | Finding |
|----------|----------|---------|
| INFO | — | `/it/settings` does not exist — no route in `App.tsx`, no component, no sidebar entry. Missing feature, not misconfiguration. |
| INFO | — | SA sidebar links to `/hr/salary-slips` (admin view) but also has access to `/salary-slips` (employee self-service) — the self-service link is absent from menu (minor UX gap, not a security issue) |

**Verdict: Super Admin authority is correctly implemented. The `ProtectedRoute` bypass is unconditional and applies globally. No hidden blocks found.**

---

## 20. Phase C — Payroll Workflow

**Audited:** `src/pages/HR/Payroll.tsx`, `src/pages/HR/AttendancePayroll.tsx`, `src/pages/HR/SalarySlips.tsx`, `src/pages/HR/BulkSalarySlips.tsx`, `src/mock/payrollData.ts`

### Passing

| Check | Result |
|-------|--------|
| `computeGross` formula | PASS — `basicSalary + allowances + overtime` |
| `computeDeductions` formula | PASS — sums all deduction types |
| `computeNet` formula | PASS — `computeGross - computeDeductions` |
| `computeStrictDeductions` reads advance balance | PASS — reads `mock_advance_requests` correctly |
| BulkSalarySlips resets `rowActions` on dept filter change | PASS — `onChange={e => { setFilterDept(e.target.value); setRowActions({}); }}` (line 506) — Phase 1 false positive removed |
| HR Admin generates slips for any non-client employee | PASS |
| Salary slip isolates by employee for employee portal | PASS — filters `getSalarySlips().filter(s => s.employeeId === user.id)` |

### Issues Found

| Issue ID | Severity | Finding |
|----------|----------|---------|
| C5 | CRITICAL | `SalarySlips.tsx:591` list table shows `slip.basicSalary - computeDeductions(slip)` instead of `computeNet(slip)` — wrong net for any employee with allowances/bonuses |
| H13 | HIGH | Advance deduction: `computeStrictDeductions` deducts full outstanding balance at once. No installment spreading. An approved Rs. 50,000 advance is fully deducted in the next slip. |
| H14 | HIGH | `Payroll.tsx` reads leave deductions from `optivax_leave_requests` (devSeed key); `SalarySlips.tsx` reads from `loadYearData` attendance — same employee same month can show different leave deductions on different pages |
| C10 | CRITICAL | Leave approval writes to `mock_leave_requests`; no payroll engine reads this key; approved leaves have zero salary impact (see Section 2, C10) |
| L3 | LOW | PDF generation uses `window.print()` — no real PDF library; bulk print opens N sequential dialogs |
| L5 | LOW | `Payroll.tsx` CSV export shows "coming soon" toast |

---

## 21. Phase D — Invoice & Client Billing

**Audited:** `src/pages/Admin/Billing.tsx`, `src/pages/Client/Billing.tsx`, `src/mock/server.ts` (billing handlers)

### Passing

| Check | Result |
|-------|--------|
| Invoice creation UI gated by `checkPermission("billing","CREATE")` | PASS — frontend check present |
| Edit button hidden for paid invoices in Admin UI | PASS — UI-only guard applied |
| Overdue auto-detection | PASS — `GET /saas/v1/invoices/list` flags `pending` invoices where `dueDate < today` |
| Invoice creates notification for client and admins | PASS — `notifyInvoiceCreated` called |
| Invoice `stripe-confirm` updates `project.spent` | PASS — server handler correctly increments `project.spent` |

### Issues Found

| Issue ID | Severity | Finding |
|----------|----------|---------|
| C6 | CRITICAL | `stripe.confirmCardPayment()` commented out; replaced with 1.4s `setTimeout`; `useStripe()` return discarded; no real payment occurs |
| H10 | HIGH | `PUT /saas/v1/invoices/update` — no `status === "paid"` check; paid invoices fully editable via API |
| H11 | HIGH | Budget cap: `if (proj?.budget)` — falsy; projects with `budget: 0` have no cap enforcement |
| H12 | HIGH | `POST /saas/v1/invoices/generate` — no server-side role check; any authenticated user can create invoices |
| M12 | MEDIUM | No partial payment support; invoice marked "paid" regardless of amount passed |
| M13 | MEDIUM | `inv-1` and `inv-3` seeded as "paid" with no payment records → "Collected via Stripe" KPI shows $0 |
| M17 | MEDIUM | No client invoice dispute mechanism exists anywhere |
| NOTE | — | `stripe-confirm` handler does NOT update `client.totalBilled` on payment — client billing summary understates total received |

---

## 22. Phase E — Task Management

**Audited:** `src/pages/Tasks/Tasks.tsx`, `src/pages/Sales/SalesTasks.tsx`, `src/mock/server.ts` (task handlers), `src/mock/salesData.ts`

### Passing

| Check | Result |
|-------|--------|
| `canAddTask` gates Add Task button correctly | PASS — `_member` roles have `canAddTask = false` |
| Members can only advance their own tasks | PASS — `moveTask` checks `t.assigneeId === user.id` for members |
| SalesTasks admin-only creation | PASS — `isAdmin && canCreate("sales")` gating |
| Task reassignment notifies old and new assignee | PASS — `notifyTaskReassigned` calls both |
| SalesTasks members see only their own tasks | PASS — `filter(t => t.assignedTo === user.id)` for non-admin |
| Projects clientId references all valid | PASS — all 10 projects reference real `mockUsers` client IDs |
| Tasks assigneeId references all valid | PASS — all 14 seed tasks reference real `mockUsers` IDs |

### Issues Found

| Issue ID | Severity | Finding |
|----------|----------|---------|
| C7 | CRITICAL | `GET /saas/v1/tasks` returns all tasks to `_member` roles — no server-side filter for this role class |
| H16 | HIGH | `INITIAL_TASKS` constant in `Tasks.tsx:37` is dead code — server starts from empty `mock_tasks` |
| H17 | HIGH | `PUT /saas/v1/tasks/:id` applies body changes with no role/ownership check |
| H18 | HIGH | No duplicate task prevention in either system |
| M22 | MEDIUM | Dept admin assignee restriction is UI-only — server doesn't verify cross-dept assignment |
| M23 | MEDIUM | SalesTasks completion triggers no admin notification |
| M24 | MEDIUM | `SalesTasks.tsx writeNotification()` bypasses SSE — no real-time delivery |
| L13 | LOW | User deletion orphans all assigned tasks — no cascade |
| L15 | LOW | `notifyAdminsOfCompletion()` in `Tasks.tsx` is dead code |
| NOTE | — | `Tasks.tsx` and `SalesTasks.tsx` use separate localStorage keys (`mock_tasks` vs `sales_tasks`) and share only the revision log — no unified task board |

---

## 23. Phase F — Notification Permissions

**Audited:** `src/mock/notificationHelpers.ts`, `src/pages/Admin/Notifications.tsx`, `src/pages/Client/Notifications.tsx`, `src/hooks/useNotifications.ts`, `src/mock/server.ts` (SSE + notification handlers)

### Passing

| Check | Result |
|-------|--------|
| Client notifications isolated by userId | PASS — `getByUserId` passes `userId` param; server filters correctly |
| `super_admin` sees all notifications | PASS — `NotificationService.getAll()` for super_admin in `useNotifications` |
| 50+ event types have dedicated notification helpers | PASS — comprehensive coverage in `notificationHelpers.ts` |
| `_member` roles only receive personal notifications | PASS — helpers target assignee/employee specifically, never broadcast to all members |
| Lead created/updated/converted → sales_admin notified | PASS |

### Issues Found

| Issue ID | Severity | Finding |
|----------|----------|---------|
| C8 | CRITICAL | `POST /saas/v1/notifications` — no role check, no recipient validation, any body accepted |
| C9 | CRITICAL | Admin Notifications "Send Notification" button not role-gated |
| H19 | HIGH | SSE `sseClients` is a global in-tab set — all connections receive every event regardless of `userId` |
| H5 | HIGH | Stripe payment, file upload, lead conversion handlers write localStorage directly without calling SSE path |
| M24 | MEDIUM | `SalesTasks.tsx writeNotification()` bypasses `NotificationService` → no SSE, no BroadcastChannel |
| L6 | LOW | `useNotifications` listens for `"__saas_notifications_update"` storage key; server never writes it |
| L14 | LOW | No rate limiting or spam prevention on notification creation |
| NOTE | — | `markAllAsRead` for clients may silently fail if email-to-clientId resolution returns empty — fallback uses `user.id` which may not match notification `userId` |

---

## 24. Phase G — Leave & Attendance

**Audited:** `src/pages/HR/LeaveRequests.tsx`, `src/pages/HR/Attendance.tsx`, `src/pages/HR/AttendanceCorrections.tsx`, `src/mock/attendanceData.ts`, `src/mock/payrollData.ts`

### Passing

| Check | Result |
|-------|--------|
| Leave type enforced as union | PASS — `LeaveType = "annual" | "sick" | "casual" | "maternity" | "unpaid"` via `<select>` |
| `hr_member` sees only their own leaves | PASS — filters `l.userId === user.id` for non-admin/non-dept-admin |
| Self check-in and check-out | PASS — `handleSelfCheckIn` and `handleSelfCheckOut` in `Attendance.tsx` |
| Attendance edit writes audit entry | PASS — `appendAuditEntry` fires on every super_admin change |
| Check-out only appears after check-in | PASS — `!myToday.checkOut` gating on UI |

### Issues Found

| Issue ID | Severity | Finding |
|----------|----------|---------|
| C10 | CRITICAL | Leave approval writes to `mock_leave_requests`; no payroll engine reads this key; approved leaves have zero salary effect |
| H15 | HIGH | Two orphaned leave keys: `mock_leave_requests` (LeaveRequests.tsx) and `optivax_leave_requests` (devSeed.ts + Payroll.tsx) — parallel systems with no crossover |
| M1 | MEDIUM | `mock_attendance` (daily) and `mock_att_year_v2_YEAR` (payroll engine) are separate — super_admin edits to daily records never reach payroll |
| M14 | MEDIUM | No leave quota per employee — unlimited leaves can be submitted |
| M15 | MEDIUM | No overlap validation — duplicate date-range requests both persist |
| M16 | MEDIUM | `calcDays` uses naive calendar math — weekends and public holidays not excluded from leave day count |
| L10 | LOW | `lib/devSeed.ts:427` seeds leave type `"Personal"` outside the `LeaveType` union |
| L11 | LOW | `AttendanceCorrections.tsx` is a read-only audit log viewer despite the name implying write capability |
| NOTE | — | No leave escalation path — pending requests remain indefinitely if HR Admin is unavailable |
| NOTE | — | Half-day attendance exists as an attendance status but leave requests have no half-day option |

---

## 25. Phase H — Mock Data Consistency

**Audited:** `src/mock/users.ts`, `src/mock/conversationsData.ts`, `src/mock/payrollData.ts`, `src/mock/budgetData.ts`, `src/lib/devSeed.ts`

### Clean (All IDs Valid)

| Dataset | Result |
|---------|--------|
| `budgetData.ts` member allocations (12 entries) | CLEAN — all 12 reference real `mockUsers` IDs |
| `devSeed.ts` projects (10 entries) — clientId | CLEAN — all reference u6, u7, u30–u33 |
| `devSeed.ts` invoices (13 entries) — projectId + clientId | CLEAN — all valid |
| `devSeed.ts` tasks (14 entries) — assigneeId | CLEAN — all reference real users |
| `devSeed.ts` deliverables (4 entries) — projectId + uploadedBy | CLEAN |
| `devSeed.ts` leave requests (5 entries) — employeeId | CLEAN — all reference real users |
| `mockUsers.ts` — 25 users, u1–u33 (no u3–u5, no u17–u19, no u28–u29) | CLEAN — no duplicate IDs |

### Issues Found (Ghost IDs)

| Dataset | Field | Ghost Values | Correct Mapping |
|---------|-------|-------------|-----------------|
| `conversationsData.ts` — all 8 conversations | `clientId` | `client-001..004` | u6, u7, u30, u31 |
| `conversationsData.ts` — 3 conversations | `assignedUserId` | `u4` (non-existent) | u8 James Carter |
| `conversationsData.ts` — names mismatch | `assignedUserName` | `"Layla Hassan"` on u9, `"Yusuf Okafor"` on u14, `"Rania Al-Sayed"` on u2 | David Chen, Noah Davis, Sarah Mitchell |
| `payrollData.ts` SEED_SLIPS (6 slips) | `employeeId` | `seed-emp-01..04` | u8, u9, u10, u15, u12, u22, u24 |
| `payrollData.ts` SEED_SLIPS | `generatedById` | `user-hr-01` | u11 (Ava Johnson, hr_admin) |
| `payrollData.ts` SEED_ADVANCE_REQUESTS (6 records) | `employeeId` | `seed-emp-02..07` | See C3 mapping table |
| `payrollData.ts` SEED_ADVANCE_REQUESTS | `approvedById` | `user-hr-01`, `user-m-01` | u11, u2 |
| `lib/devSeed.ts:427` | `type` on leave-3 | `"Personal"` | Must be one of the `LeaveType` union values |

**Summary:** Budget, projects, invoices, tasks, deliverables, and employee extras use real IDs throughout. Only the payroll seed and conversation seed are comprehensively broken. The conversation system has 0 valid records out of 8; the payroll seed has 0 valid employee IDs out of 12.

---

## 26. Phase I — Department Workflow

**Audited:** Department-specific pages across HR, Sales, Production, Marketing, IT, Client modules

### HR Workflow

| Flow | Status | Notes |
|------|--------|-------|
| HR Admin creates employee | PARTIAL | No explicit dept assignment form — `departmentId` inferred from role prefix at runtime |
| HR Admin approves leave | WORKS IN UI | Approval updates leave status but has zero payroll effect (C10) |
| HR Member sees only own leaves | PASS | |
| Leave escalation if HR Admin unavailable | MISSING | No delegation, no timeout, no substitute approver |
| Onboarding wizard | MISSING | User creation, dept assignment, budget allocation, payroll init are 4 siloed steps with no automation |

### Sales Workflow

| Flow | Status | Notes |
|------|--------|-------|
| Lead → Client conversion | PARTIAL | Atomic conversion works; pipeline missing Proposal/Won stages (M18) |
| Sales targets linked to closed leads | BROKEN | `achievedAmount` is manual-entry (H20) |
| Commission auto-calculation | BROKEN | Manual entry only; no formula linking deals to commissions (H21) |
| Team performance metrics | SEEDED | Hardcoded from salesData.ts; not derived from actual activity |

### Production Workflow

| Flow | Status | Notes |
|------|--------|-------|
| Deliverable status machine (5 states) | COMPLETE | Pending→In Progress→Review→Approved→Delivered; roles correctly gated |
| Client revision → new deliverable | MANUAL | No auto-creation; production must create manually (M19) |
| Marketing→Production handoff | VISIBILITY ONLY | Calendar flag visible to production; no auto-deliverable, no notification (H22) |
| Client sees own deliverables only | PASS | API scopes by `clientId` |

### Marketing Workflow

| Flow | Status | Notes |
|------|--------|-------|
| Content calendar with production support flag | WORKS | `productionSupportRequired` stored and visible to production |
| Production status update on calendar entry | WORKS | `productionStatus` field updated in modal |
| Marketing lead attribution | MISSING | Two separate lead systems with no cross-attribution |
| Social tracking click data | WORKS (mock) | Lost silently in production when `VITE_USE_MOCK_SERVER=false` |

### IT Workflow

| Flow | Status | Notes |
|------|--------|-------|
| Ticket full lifecycle (create/assign/resolve/close/reopen) | COMPLETE | All states implemented |
| SLA calculation at creation | COMPLETE | `SLA_DAYS = {critical:1, high:2, medium:5, low:10}` |
| SLA enforcement | DISPLAY ONLY | No auto-escalation, no breach notification (L12) |
| Escalation notification | PARTIAL | Notifies requester, not IT Admin supervisor |

### Client Workflow

| Flow | Status | Notes |
|------|--------|-------|
| Client sees only their projects | PASS | API scopes by `clientId` |
| Invoice history visible | PASS | |
| Invoice dispute | MISSING | No mechanism exists (M17) |
| File access isolation | PASS (mock) | Multi-client on same browser can theoretically share localStorage |
| Revision full lifecycle | PARTIAL | No client notification on status change (M19) |

---

## 27. Phase J — Deployment & Production Readiness

**Audited:** `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `.env`, `.env.production`

### Configuration Issues

| Item | Finding | Severity |
|------|---------|----------|
| `.env.production:2` | `VITE_USE_MOCK_SERVER=true` — production runs in-browser mock | HIGH (H23) |
| `vercel.json` | Zero security headers in `headers` array | HIGH (H24) |
| `VITE_API_URL` / `VITE_API_BASE` | Empty strings in both `.env` and `.env.production` | HIGH |
| `VITE_LOGO_URL` | Referenced in AppSidebar.tsx and AuthPageLayout.tsx; missing from all .env files | MEDIUM (M20) |
| `tsconfig.json` | `"plugins": [{"name":"next"}]` and `"include": ["next-env.d.ts"]` — stale Next.js artifacts | MEDIUM (M21) |
| `package.json` | `@types/deno` in devDependencies — Deno type defs in a Vite/React project | LOW (L16) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | In `.env.example` only; not in `.env` or `.env.production` | LOW |

### Security (localStorage)

Sensitive data stored in plaintext:

| Key | Contains |
|-----|---------|
| `mock_passwords` | Plaintext user passwords (CRITICAL — C11) |
| `mock_session` | Auth token + user id + role |
| `mock_profiles` | All user emails, names, roles (PII) |
| `mock_reset_token` | Password reset token |
| `optivax_clients` | Client company, email, phone (PII) |
| `mock_invoices` | Billing amounts per client |
| `optivax_stripe_settings` | Stripe config |

Any XSS on the page exposes all of the above simultaneously.

### Bundle & Performance

| Item | Finding |
|------|---------|
| Code splitting | None — all 70+ routes eagerly imported |
| Heavy packages (FullCalendar × 6, ApexCharts, Stripe, Swiper) | All eagerly bundled |
| Estimated initial bundle | 2–4 MB uncompressed |
| `vite.config.ts` | No `manualChunks`, no `chunkSizeWarningLimit`, no `sourcemap` |
| `React.lazy()` calls | Zero found anywhere in codebase |

### TypeScript Health

| Item | Finding |
|------|---------|
| `strict: true` | PASS — strict mode enabled |
| Unsafe casts | `(user as { departmentId?: string }).departmentId` in `LeaveRequests.tsx:103` |
| Cross-domain imports | `HRPanel.tsx` imports `LeaveRequest` type from `../Client/Profile` |
| Local interface shadowing | `SalesPanel.tsx` defines `SalesLead`, `SalesDeal`, `SalesCommission` locally — may drift from global types |

### What Breaks Without Mock Server

If `VITE_USE_MOCK_SERVER=false` with empty `VITE_API_URL`:
- **Breaks immediately**: Login, lead CRUD, project listing, files, revisions, social tracking, SSE, password reset
- **Continues working** (localStorage-only): Deliverables, Sales Targets, Leave Requests, IT Tickets, Content Calendar, Payroll, Budget Management

---

## 28. FINAL ERP AUDIT SCORE

### Category Scores (out of 100)

| # | Category | Score | Max | Key Issues |
|---|----------|-------|-----|------------|
| 1 | **RBAC & Access Control** | 8 | 15 | `hr_member` payroll leaks (C1/C2); tasks API returns all data to members (C7); notifications unrestricted (C8/C9) |
| 2 | **Data Integrity & Seed Data** | 3 | 10 | Payroll seed 100% ghost IDs (C3); conversations 100% ghost IDs (C4); two orphaned leave stores (H15); tasks board dead seed (H16) |
| 3 | **Business Logic & Workflows** | 5 | 15 | Leave→payroll chain broken (C10); budget `usedAmount` static (H8); project spending siloed (H9); commission/targets manual (H20/H21); marketing→production gap (H22) |
| 4 | **Security Hardening** | 3 | 15 | Plaintext passwords in localStorage (C11); zero security headers (H24); SSE broadcasts without userId filter (H19); notification endpoint unrestricted (C8) |
| 5 | **Payroll & Finance Accuracy** | 3 | 10 | Three competing payroll systems (M2); SalarySlips wrong net (C5); Stripe mocked (C6); no installment spreading (H13); leave deduction divergence (H14) |
| 6 | **Module Completeness & UX** | 7 | 10 | Rich feature set across 50+ pages; key gaps in leave balance, dispute, commission auto-calc, PDF generation |
| 7 | **Notification System** | 3 | 5 | 50+ event types; SSE userId leak (H19); payment/lead events silent (H5); SalesTasks bypasses SSE (M24) |
| 8 | **Task & Project Management** | 2 | 5 | Tasks board starts empty (H16); server-side data leak to members (C7); no dedup (H18); PUT unguarded (H17) |
| 9 | **Performance & Bundling** | 2 | 5 | No code splitting; no lazy loading; estimated 2–4 MB bundle; BudgetManagement.tsx is 2,474 lines |
| 10 | **Deployment & Production Readiness** | 2 | 10 | Mock server in production (H23); no backend wired; zero security headers (H24); missing env vars (M20) |

### TOTAL: 38 / 100

**Grade: D+**

> The system is visually mature with 50+ feature pages, a comprehensive RBAC model, rich notification coverage, and a complete IT ticket lifecycle. However, critical data-chain breaks (leave→payroll), pervasive ghost seed data, zero server-side enforcement on the task API and notification endpoint, and a production environment explicitly configured to run on in-browser mock data make this system unsuitable for any real user or client data. The architectural gap between the three competing payroll systems and the three competing attendance stores must be resolved before a real backend can be built.

### Score Breakdown Summary

```
RBAC & Access Control      ████████░░░░░░░  8/15  (53%)
Data Integrity             ███░░░░░░░       3/10  (30%)
Business Logic             █████░░░░░░░░░░  5/15  (33%)
Security Hardening         ███░░░░░░░░░░░░  3/15  (20%)
Payroll & Finance          ███░░░░░░░       3/10  (30%)
Module Completeness        ███████░░░       7/10  (70%)
Notification System        ███░░            3/5   (60%)
Task & Project Mgmt        ██░░░            2/5   (40%)
Performance & Bundling     ██░░░            2/5   (40%)
Deployment Readiness       ██░░░░░░░░       2/10  (20%)
─────────────────────────────────────────────────
TOTAL                                      38/100 (38%)
```

### Path to 80/100

| Milestone | Target Score | What Gets Fixed |
|-----------|-------------|-----------------|
| Sprint 0 (Security) | ~48/100 | C7, C8, C9, C11, H24 — eliminate critical data leaks and missing headers |
| Sprint 1 (Data Integrity) | ~58/100 | C1–C5, C10, H15, H16 — fix seed ghost IDs, leave chain, SalarySlips formula |
| Sprint 2 (Business Logic) | ~65/100 | H1–H4, H7, H10–H13, H17–H18 — RBAC routes, invoice guards, task security |
| Sprint 3 (Architecture) | ~72/100 | M1, M2, H5, H8, H9, H19 — unify attendance/payroll stores, fix SSE, wire budget spending |
| Sprint 4 (Feature Completeness) | ~80/100 | H20–H22, M14–M18, M22 — commission auto-calc, leave balance, pipeline stages, handoffs |

---

*Report generated 2026-07-01 by 10-agent automated audit system covering 28 phases across 80+ source files.*
*Phase 1 Agents: RBAC/Security · Dashboard/Modules · Mock Server/Data · Attendance/Payroll/IT*
*Phase 2 Agents: Budget/SuperAdmin · Payroll/Billing · Tasks/Notifications · Leave/MockData · DeptWorkflows/Production*
