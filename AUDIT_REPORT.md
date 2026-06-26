# OptiVax Global — Full Project Audit Report

**Date:** 2026-06-26
**Auditor:** Automated read-only analysis
**Scope:** Complete codebase — `src/` directory

---

## Executive Summary

The codebase is well-structured overall: routing, RBAC guards, and the budget module are solid. However, seven issues of MAJOR or higher severity were identified. The most critical are:

1. `src/types/role.ts` exports a stale `Role` type (`"admin"`) that does not exist in the active `UserRole` union and could silently break any consumer.
2. The salary-slip HTML print template computes `displayNet` as `basicSalary − totalDeductions` instead of `grossSalary − totalDeductions`, producing an understated net figure for employees with allowances.
3. Seed salary-slip data has incorrect pre-computed `grossSalary`/`netSalary` fields set to `basicSalary` only — components reading these directly will display wrong totals.
4. CommonJS `require()` used inside an ESM/Vite file will silently fail, causing all attendance-based deductions to default to 0.

No `TODO`/`FIXME` comments, no leave-quota strings, and no `console.log` statements were found in `.tsx` files. TypeScript reports zero errors across the full project.

---

## 1. Routes & Navigation

### Route Inventory (App.tsx)

| Path | Component | Guard Roles |
|------|-----------|-------------|
| `/` | Redirect → `/login` | — |
| `/login` | SignIn | Public |
| `/signup` | SignUp | Public |
| `/reset-password` | ResetPassword | Public |
| `/super-admin/dashboard` | SuperAdminPanel | `super_admin` |
| `/super-admin/departments` | Departments | `super_admin` |
| `/admin/dashboard` | AdminPanel | `super_admin` |
| `/admin/clients` | Clients | `super_admin` |
| `/admin/projects` | Projects | `super_admin` |
| `/admin/billing` | AdminBilling | `super_admin` |
| `/admin/files` | AdminFiles | `super_admin` |
| `/admin/notifications` | AdminNotifications | `super_admin` |
| `/admin/revisions` | AdminRevisions | `super_admin` |
| `/admin/settings` | Settings | `super_admin` |
| `/admin/reports` | Reports | `super_admin` |
| `/admin/audit-logs` | AuditLogs | `super_admin` |
| `/admin/commissions` | Commissions | `super_admin` |
| `/admin/email/campaigns` | Campaigns | `super_admin` |
| `/admin/email/templates` | Templates | `super_admin` |
| `/admin/email/audience` | Audience | `super_admin` |
| `/admin/email/analytics` | Analytics | `super_admin` |
| `/admin/email/automation` | Automation | `super_admin` |
| `/admin/users` | Employees | `super_admin` |
| `/sales/dashboard` | SalesPanel | `sales_admin`, `sales_member` |
| `/sales/leads` | SalesLeads | `sales_admin`, `sales_member` |
| `/sales/clients` | Clients | `sales_admin`, `sales_member` |
| `/sales/tasks` | SalesTasks | `sales_admin`, `sales_member` |
| `/sales/targets` | SalesTargets | `sales_admin`, `sales_member` |
| `/sales/campaigns` | CampaignBudgets | `sales_admin`, `sales_member` |
| `/sales/team-performance` | TeamPerformance | `sales_admin`, `sales_member` |
| `/sales/commissions` | Commissions | `sales_admin`, `sales_member` |
| `/sales/reports` | Reports | `sales_admin`, `sales_member` |
| `/sales/files` | AdminFiles | `sales_admin`, `sales_member` |
| `/sales/billing` | AdminBilling | `sales_admin` only |
| `/sales/notifications` | AdminNotifications | `sales_admin`, `sales_member` |
| `/sales/settings` | Settings | `sales_admin`, `sales_member` |
| `/sales/profile` | Profile | `sales_admin`, `sales_member` |
| `/sales/users` | Employees | `sales_admin`, `hr_admin`, `management` |
| `/production/dashboard` | ProductionPanel | `production_admin`, `production_member` |
| `/production/content-requests` | ContentCalendar | `production_admin`, `production_member` |
| `/production/projects` | Projects | `production_admin`, `production_member` |
| `/production/tasks` | Tasks | `production_admin`, `production_member` |
| `/production/deliverables` | Deliverables | `production_admin`, `production_member` |
| `/production/files` | AdminFiles | `production_admin`, `production_member` |
| `/production/reports` | Reports | `production_admin`, `production_member` |
| `/production/revisions` | AdminRevisions | `production_admin`, `production_member` |
| `/production/notifications` | AdminNotifications | `production_admin`, `production_member` |
| `/production/settings` | Settings | `production_admin`, `production_member` |
| `/production/profile` | Profile | `production_admin`, `production_member` |
| `/production/users` | Employees | `production_admin`, `hr_admin`, `management` |
| `/marketing/dashboard` | MarketingPanel | `marketing_admin`, `marketing_member` |
| `/marketing/leads` | MarketingLeads | `marketing_admin`, `marketing_member` |
| `/marketing/content-calendar` | ContentCalendar | `marketing_admin`, `marketing_member` |
| `/marketing/tasks` | Tasks | `marketing_admin`, `marketing_member` |
| `/marketing/social` | SocialTracking | `marketing_admin`, `marketing_member` |
| `/marketing/reports` | Reports | `marketing_admin`, `marketing_member` |
| `/marketing/files` | AdminFiles | `marketing_admin`, `marketing_member` |
| `/marketing/notifications` | AdminNotifications | `marketing_admin`, `marketing_member` |
| `/marketing/email/campaigns` | Campaigns | `marketing_admin`, `marketing_member` |
| `/marketing/email/templates` | Templates | `marketing_admin`, `marketing_member` |
| `/marketing/email/audience` | Audience | `marketing_admin`, `marketing_member` |
| `/marketing/email/analytics` | Analytics | `marketing_admin` only |
| `/marketing/email/automation` | Automation | `marketing_admin` only |
| `/marketing/settings` | Settings | `marketing_admin`, `marketing_member` |
| `/marketing/profile` | Profile | `marketing_admin`, `marketing_member` |
| `/marketing/users` | Employees | `marketing_admin`, `hr_admin`, `management` |
| `/hr/dashboard` | HRPanel | `hr_admin`, `hr_member` |
| `/hr/users` | Employees | `hr_admin`, `management` |
| `/hr/payroll` | Payroll | `hr_admin`, `hr_member` |
| `/hr/leave` | LeaveRequests | `hr_admin`, `hr_member` |
| `/hr/attendance` | Attendance | `hr_admin`, `hr_member` |
| `/hr/attendance/monthly` | AttendanceMonthly | `hr_admin`, `hr_member` |
| `/hr/attendance/yearly` | AttendanceYearly | `hr_admin`, `hr_member` |
| `/hr/attendance/analytics` | AttendanceAnalytics | `hr_admin`, `hr_member` |
| `/hr/attendance/calendar` | AttendanceCalendar | `hr_admin`, `hr_member` |
| `/hr/attendance/payroll` | AttendancePayroll | `hr_admin`, `management` |
| `/hr/attendance/corrections` | AttendanceCorrections | `super_admin` only |
| `/hr/tasks` | Tasks | `hr_admin`, `hr_member` |
| `/hr/files` | AdminFiles | `hr_admin`, `hr_member` |
| `/hr/settings` | Settings | `hr_admin`, `hr_member` |
| `/hr/reports` | Reports | `hr_admin`, `hr_member` |
| `/hr/notifications` | AdminNotifications | `hr_admin`, `hr_member` |
| `/hr/profile` | Profile | `hr_admin`, `hr_member` |
| `/hr/salary-slips` | SalarySlips | `super_admin`, `management`, `hr_admin` |
| `/hr/advance-salary` | AdvanceSalary | `super_admin`, `management`, `hr_admin` |
| `/hr/advance-salary/audit` | AdvanceSalaryAuditLog | `super_admin`, `hr_admin` |
| `/hr/bulk-salary-slips` | BulkSalarySlips | `super_admin`, `hr_admin` |
| `/management/dashboard` | ManagementPanel | `management` |
| `/management/projects` | Projects | `management` |
| `/management/clients` | Clients | `management` |
| `/management/billing` | AdminBilling | `management` |
| `/management/reports` | Reports | `management` |
| `/management/tasks` | Tasks | `management` |
| `/management/notifications` | AdminNotifications | `management` |
| `/management/audit-logs` | AuditLogs | `management` |
| `/management/deliverables` | Deliverables | `management` |
| `/management/revisions` | AdminRevisions | `management` |
| `/management/files` | AdminFiles | `management` |
| `/management/profile` | Profile | `management` |
| `/management/users` | Employees | `management` |
| `/conversations` | ClientConversations | `super_admin`, `management`, `sales_admin`, `sales_member`, `marketing_admin`, `marketing_member`, `production_admin`, `production_member` |
| `/budget` | BudgetManagement | `super_admin`, `management`, `sales_admin`, `production_admin`, `marketing_admin`, `hr_admin`, `it_admin` |
| `/my-budget` | MyBudget | `sales_member`, `production_member`, `marketing_member`, `hr_member`, `it_member` |
| `/salary-slips` | MySalarySlips | All internal roles |
| `/advance-salary` | AdvanceSalaryRequest | All internal roles |
| `/it/tickets` | ITTickets | All internal roles |
| `/it/dashboard` | ITSupportPanel | `it_admin`, `it_member` |
| `/it/attendance` | AttendanceDashboard | `it_admin`, `it_member` |
| `/it/devices` | Devices | `it_admin`, `it_member` |
| `/it/device-logs` | DeviceLogs | `it_admin`, `it_member` |
| `/it/exceptions` | AttendanceExceptions | `it_admin`, `it_member` |
| `/it/reports` | AttendanceReports | `it_admin`, `it_member` |
| `/it/notifications` | AdminNotifications | `it_admin`, `it_member` |
| `/it/profile` | Profile | `it_admin`, `it_member` |
| `/client/dashboard` | ClientPanel | `client` |
| `/client/projects` | MyProjects | `client` |
| `/client/billing` | ClientBilling | `client` |
| `/client/files` | ClientFiles | `client` |
| `/client/notifications` | ClientNotifications | `client` |
| `/client/messages` | ClientMessages | `client` |
| `/client/revisions` | MyRevisions | `client` |
| `/client/profile` | Profile | `client` |

### Navigation / Sidebar Cross-Reference

**All sidebar paths resolve to defined routes. No orphaned navigation links detected.**

**INFO — Label ambiguity:** `/hr/attendance/corrections` appears in the `super_admin` sidebar as "Audit Log" while a separate "Audit Logs" entry also exists at `/admin/audit-logs`. Two sidebar items labelled "Audit Log" pointing to different routes may confuse Super Admin users. Recommend renaming to "Attendance Corrections" for clarity.

**INFO — Dead inner guards:** `/sales/users`, `/production/users`, `/marketing/users` inner route guards list `hr_admin` and `management` as allowed roles, but these roles are blocked by the outer domain guard before reaching the inner one. These entries are harmless but misleading.

---

## 2. RBAC Audit

### Active Role Definitions (`src/types/index.ts` — `UserRole`)

```
super_admin | management | sales_admin | sales_member | production_admin | production_member
marketing_admin | marketing_member | hr_admin | hr_member | it_admin | it_member | client
```

Total: **13 roles**

### ProtectedRoute Logic

- `super_admin` bypasses ALL guards (ProtectedRoute.tsx line 35). Intentional and documented.
- All other roles are checked by role identity first, then domain permission.
- Double-guard nesting (outer domain + inner role) is used consistently across department routes.

### Issues Found

**MAJOR — Stale type file:** `src/types/role.ts` exports:
```ts
export type Role = "super_admin" | "management" | "admin" | "client";
```
`"admin"` is not a valid `UserRole`. The file is not imported anywhere (zero references found in grep), so there is no active breakage — but it is a maintenance trap for any future developer who imports it instead of `UserRole`.

**MINOR — `it_admin` RBAC matrix gap:** The route guard at App.tsx allows `it_admin` to access `/budget`. Inside `BudgetManagement.tsx`, `it_admin` correctly renders `DeptAdminView` (role ends with `_admin`). However, `RBAC_MATRIX` in `src/utils/rbac.ts` has **no `budget` permission entry for `it_admin`**. Functionally correct, but the matrix is inconsistent with actual access.

**MINOR — Dead inner role guards:**

| Route | Inner allowed roles | Reality |
|-------|---------------------|---------|
| `/sales/users` | `sales_admin`, `hr_admin`, `management` | `hr_admin` / `management` blocked by outer guard first |
| `/production/users` | `production_admin`, `hr_admin`, `management` | Same |
| `/marketing/users` | `marketing_admin`, `hr_admin`, `management` | Same |

These inner `hr_admin`/`management` entries are never reached and should be removed or documented.

---

## 3. Budget Module

### Import Health (`src/pages/Budget/BudgetManagement.tsx`)

| Import | Exported from `budgetData.ts` | Status |
|--------|-------------------------------|--------|
| `getCompanyBudget`, `saveCompanyBudget`, `resetCompanyBudget` | Yes | ✓ |
| `getDeptAllocations`, `saveDeptAllocations` | Yes | ✓ |
| `getMemberAllocations`, `saveMemberAllocations` | Yes | ✓ |
| `getBudgetAuditLog`, `appendBudgetAuditEntry` | Yes | ✓ |
| `getDeptBudgetSummaries`, `getMembersForDept`, `getAllDeptAdmins`, `deptFromRole` | Yes | ✓ |
| `getBudgetReturns`, `appendBudgetReturn`, `getBudgetReturnsByDept` | Yes | ✓ |
| `getBudgetRequests`, `appendBudgetRequest`, `updateBudgetRequest`, `getBudgetRequestsByDept`, `getPendingBudgetRequests` | Yes | ✓ |
| `CompanyBudget`, `DeptAllocation`, `MemberAllocation`, `BudgetAuditEntry`, `BudgetMasterAction`, `DeptBudgetSummary`, `BudgetReturn`, `BudgetRequest`, `BudgetRequestStatus`, `BudgetRequestPriority` | Yes | ✓ |
| `notifyBudgetReturned`, `notifyBudgetRequested`, `notifyBudgetRequestActioned` | Yes (notificationHelpers.ts) | ✓ |

**All 30+ imports resolve correctly. Zero missing exports.**

### ACTION_LABEL / ACTION_COLOR Map Coverage

All 16 `BudgetMasterAction` keys are present in both maps. No gaps.

| Key | In ACTION_LABEL | In ACTION_COLOR |
|-----|-----------------|-----------------|
| BUDGET_CREATED | ✓ | ✓ |
| BUDGET_UPDATED | ✓ | ✓ |
| BUDGET_INCREASED | ✓ | ✓ |
| BUDGET_REDUCED | ✓ | ✓ |
| BUDGET_RESET | ✓ | ✓ |
| BUDGET_REALLOCATED | ✓ | ✓ |
| BUDGET_PURPOSE_UPDATED | ✓ | ✓ |
| BUDGET_RETURNED | ✓ | ✓ |
| BUDGET_REQUEST_SUBMITTED | ✓ | ✓ |
| BUDGET_REQUEST_APPROVED | ✓ | ✓ |
| BUDGET_REQUEST_REJECTED | ✓ | ✓ |
| BUDGET_REQUEST_PARTIAL | ✓ | ✓ |
| DEPT_ALLOCATED | ✓ | ✓ |
| DEPT_ALLOCATION_UPDATED | ✓ | ✓ |
| MEMBER_ALLOCATED | ✓ | ✓ |
| MEMBER_ALLOCATION_UPDATED | ✓ | ✓ |

### Modal Prop Wiring

| Modal | Props Required | Wired Correctly |
|-------|---------------|-----------------|
| `CompanyBudgetModal` | `mode`, `budget`, `minAllowedTotal`, `onClose`, `onSave` | ✓ |
| `AssignBudgetModal` | `preselectedDept`, `companyTotal`, `deptSummaries`, `allDeptAllocs`, `onClose`, `onSave` | ✓ |
| `TransferBudgetModal` | `deptSummaries`, `allDeptAllocs`, `onClose`, `onTransfer` | ✓ |
| `MemberAllocModal` | `dept`, `deptAllocated`, `deptMemberAllocated`, `existing`, `members`, `onClose`, `onSave` | ✓ |
| `ReturnBudgetModal` | `dept`, `allocatedAmount`, `usedTotal`, `onClose`, `onReturn` | ✓ |
| `RequestBudgetModal` | `dept`, `currentAllocated`, `onClose`, `onRequest` | ✓ |
| `RequestActionModal` | `request`, `onClose`, `onAction` | ✓ |

### SuperAdminView Tab Coverage

| Tab | State Used | Handlers | Status |
|-----|------------|----------|--------|
| overview | `budget`, `stats`, `deptSummaries`, `allDeptAllocs` | `setBudgetModal`, `setAssignTarget`, `setShowTransfer` | ✓ |
| departments | `deptSummaries`, `allDeptAllocs` | `setAssignTarget`, `setShowTransfer` | ✓ |
| members | `members` | — | ✓ |
| requests | `pendingRequests`, `allRequests` | `setActioningRequest` → `handleRequestAction` | ✓ |
| audit | `auditLog` | — | ✓ |

### DeptAdminView Tab Coverage

| Tab | State Used | Handlers | Status |
|-----|------------|----------|--------|
| overview (My Budget) | `deptAlloc`, `usedTotal`, `memberAllocTotal`, `availableForAlloc` | `setShowReturn`, `setShowRequest` | ✓ |
| members (Team Members) | `myMembers`, `deptAlloc` | `setShowModal` → `handleAllocate` | ✓ |
| returns | `myReturns` | — | ✓ |
| requests | `myRequests` | `setShowRequest` | ✓ |
| audit (Activity Log) | `auditLog` | — | ✓ |

### Business Rule Validation

| Rule | Implemented | Location |
|------|-------------|----------|
| Used/Spent budget always read-only | ✓ | `AssignBudgetModal` (`usedFloor`), `MemberAllocModal` (`spentFloor`), `TransferBudgetModal` (`fromRemaining`) |
| Cannot reduce dept allocation below `usedTotal` | ✓ | `AssignBudgetModal` line ~420 |
| Cannot reduce company budget below `totalAllocatedToDepts` | ✓ | `CompanyBudgetModal` (`minAllowedTotal`) |
| Transfer only transfers remaining (not spent) | ✓ | `TransferBudgetModal` (`fromRemaining = allocated - usedTotal`) |
| Return only returns remaining (not spent) | ✓ | `ReturnBudgetModal` (`remaining = allocatedAmount - usedTotal`) |
| Budget request has no auto-approval | ✓ | `appendBudgetRequest` always sets `status: "Pending"` |
| Partial approval must be less than requested | ✓ | `RequestActionModal` validation |
| Rejection requires notes | ✓ | `RequestActionModal` validation |
| Audit log is append-only | ✓ | No delete/update functions exist for `BudgetAuditEntry` |
| Return records are append-only | ✓ | `appendBudgetReturn` only, no update/delete |

**All budget business rules correctly implemented.**

---

## 4. HR & Leave Module

### Leave Quota Cleanup — Full Codebase Search

Searched all `.tsx` and `.ts` files for the following banned terms. **Zero occurrences found.**

| Term | Occurrences |
|------|-------------|
| `Leave Quota` | 0 |
| `Leave Balance` | 0 |
| `Remaining Leaves` | 0 |
| `Available Leaves` | 0 |
| `Leave Credits` | 0 |
| `Paid Leave` | 0 |
| `Annual Leave Quota` | 0 |
| `Monthly Leave Quota` | 0 |
| `Leave Entitlements` | 0 |
| `leavesLeft` | 0 |
| `leaveQuota` | 0 |

**Leave quota language fully removed across the project.**

### HRPanel.tsx — Deduction Formula Audit

Current formula at `src/pages/Dashboard/HRPanel.tsx`:
```ts
const deduction = ex.leavesTaken > 0
  ? Math.round(ex.leavesTaken * (ex.salary / 30))
  : 0;
```

This correctly implements **unpaid leave = full salary deduction per day taken** (`leavesTaken × salary/30`). The old quota-based formula (`leavesTaken > 10 ? (leavesTaken - 10) * salary/30 : 0`) has been fully removed. **PASS.**

### HRPanel.tsx — Tab Coverage

| Tab | State | Handler | Status |
|-----|-------|---------|--------|
| Employee Directory | `employees`, `filteredEmployees`, `searchQuery`, `isLoadingEmployees` | `setSearchQuery` | ✓ |
| Leave Requests | `leaveRequests`, `leaveFilter`, `pendingLeaves` | `handleLeaveAction`, `setLeaveFilter` | ✓ |
| Attendance | `allAttendance`, `attendanceDate` | `setStatus`, `setAttendanceDate` | ✓ |
| Create User | `createForm`, `createLoading`, `createError`, `createSuccess` | `handleCreateUser` | ✓ |

**INFO — `HR_CREATABLE_ROLES` does not include `it_admin` or `it_member`.** HR Admin cannot create IT accounts. No comment in code explains whether this is intentional policy or an oversight.

### SuperAdminPanel.tsx — Leave Column Headers

Leave-related column headers are confirmed as "Leave Days Taken" (updated). Old "Leaves (Taken / Left)" header has been removed. **PASS.**

---

## 5. Payroll Module

### `src/mock/payrollData.ts` — Data Shape

The `SalarySlip` interface is comprehensive. Consumers (`SalarySlips.tsx`, `MySalarySlips.tsx`, `BulkSalarySlips.tsx`) use the correct field names. Interface fields and component field accesses are aligned.

### Issues Found

**MAJOR — `displayNet` in HTML print template uses `basicSalary` instead of `grossSalary`:**

```ts
// payrollData.ts line ~587
const displayNet = slip.basicSalary - slip.totalDeductions;
```

For an employee with:
- `basicSalary = 65,000`, `allowances = 24,250`, `bonuses = 10,000`
- Correct gross = `99,250`
- `displayNet` would show `65,000 − 0 = 65,000` (wrong)
- On-screen component uses `slip.netSalary` from the stored record (correct)
- Only the **printed/exported HTML salary slip** shows the wrong net figure

**MAJOR — Seed `SalarySlip` records have incorrect `grossSalary` / `netSalary`:**

Seed data bypasses `computeGross()` and stores `basicSalary` value in both `grossSalary` and `netSalary`:

| Slip ID | Employee | basicSalary | Stored grossSalary | Actual grossSalary |
|---------|----------|-------------|--------------------|--------------------|
| slip-001 | Aisha Rahman (Apr 2026) | 65,000 | 65,000 ❌ | 99,250 |
| slip-004 | Aisha Rahman (May 2026) | 65,000 | 65,000 ❌ | 109,250 |

Components reading `slip.grossSalary` directly show incorrect totals. Components using `computeGross(slip)` produce correct values. **Payroll reporting may be materially misleading during testing.**

**MAJOR — CommonJS `require()` in an ESM/Vite project:**

```ts
// payrollData.ts line ~530
const { loadYearData, computeMonthlyReport, STAFF_USERS } =
  require("./attendanceData") as typeof import("./attendanceData");
```

`require()` is wrapped in `try/catch` so it will **silently fail** in a Vite ESM environment. When it fails, all attendance-based deductions default to 0, meaning every generated salary slip shows 0 attendance deductions regardless of actual absences.

**MINOR — Advance salary seed employee IDs disconnected from `mockUsers`:**

Seed `AdvanceSalaryRequest` records use IDs `"seed-emp-01"` through `"seed-emp-07"`. These do not correspond to any ID in `mockUsers.ts` (which uses `"u8"`, `"u12"`, etc.). Self-approval identity checks (`viewerId === req.employeeId`) will never match logged-in mock users. Only affects mock/test environment.

---

## 6. Notifications

### Dead Exports (never called anywhere in the codebase)

| Function | Line | Risk |
|----------|------|------|
| `logAttendanceModified` | ~172 | No attendance changes are logged |
| `notifyLoginActivity` | ~609 | **Security hook unconnected** — login events generate no notification |
| `notifySecurityEvent` | ~624 | **Security hook unconnected** — security events generate no notification |
| `notifyBudgetChanged` | ~641 | Legacy; inline comment says "kept for compatibility" but has zero consumers |
| `notifyClientRevisionSubmitted` | ~745 | Client revision submissions are not notified |
| `notifyClientProfileUpdated` | ~750 | Client profile updates are not notified |
| `notifyGenericAction` | ~793 | Generic utility with no callers |

`notifyLoginActivity` and `notifySecurityEvent` are the most operationally significant — login and security events are not being tracked in the notification/audit system.

### Active Notification Functions (confirmed called)

`notifyUserCreated`, `notifyBudgetAllocatedToDept`, `notifyBudgetAllocatedToMember`, `notifyCompanyBudgetAction`, `notifyBudgetReturned`, `notifyBudgetRequested`, `notifyBudgetRequestActioned`, `notifyLeadCreated/Updated/Deleted/Converted`, `notifyTicketCreated/Assigned/StatusChanged`, `notifyDeliverableApproved/Uploaded`, `notifySalarySlipGenerated`, `notifyBulkSalarySlipsGenerated`, `notifySalarySlipDeleted`, `notifyInvoiceCreated/Updated/Deleted`, `notifyClientCreated/Assigned/Updated/Deleted`, `notifyClientConversationStarted/MessageSent/MessageReply`, `notifyTaskCreated/Updated/Deleted/Assigned/StatusChanged/Completed/Reassigned`, `notifyAdvanceSalaryRequested`, `notifyAdvanceSalaryDecision`, `notifySalesBudgetCreated/Updated/Deleted`, `notifyProjectCreated/Updated/Deleted/StatusChanged`.

---

## 7. Mock Data Consistency

### Mock File Inventory

| File | Purpose |
|------|---------|
| `src/mock/users.ts` | 23 mock users with full `UserRole` values |
| `src/mock/budgetData.ts` | Budget allocations, requests, returns, audit log |
| `src/mock/payrollData.ts` | Salary slips, advance salary requests |
| `src/mock/attendanceData.ts` | Attendance records per employee |
| `src/mock/salesData.ts` | Campaigns, targets, tasks |
| `src/mock/conversationsData.ts` | Client conversations |
| `src/mock/contentCalendarData.ts` | Content calendar entries |
| `src/mock/itSupportData.ts` | IT tickets, devices |
| `src/mock/server.ts` | Mock fetch interceptor |

### Role Values in Mock Users

All 23 entries in `mockUsers` use only values from the active `UserRole` union. No use of the stale `"admin"` value from `src/types/role.ts`. **PASS.**

### Budget Data ↔ Mock Users

| Check | Result |
|-------|--------|
| `seedDeptAllocations()` admin IDs (`u8`, `u9`, `u10`, `u11`, `u16`) exist in `mockUsers` | ✓ |
| `seedMemberAllocations()` member IDs all exist in `mockUsers` | ✓ |
| `getAllDeptAdmins()` maps roles to `mockUsers` identities | ✓ |

### Payroll Seed ↔ Mock Users

Seed `AdvanceSalaryRequest` records use IDs `"seed-emp-01"` through `"seed-emp-07"` — **these do not exist in `mockUsers`**. Cross-reference identity checks will never succeed. (MINOR — only affects mock/dev environment.)

---

## 8. TypeScript Health

### `@ts-ignore` / `@ts-nocheck`

Zero occurrences in any `.tsx` application file. **PASS.**

### `any` type usage

| Location | Count | Notes |
|----------|-------|-------|
| `.tsx` application files | 0 | **PASS** |
| `src/mock/server.ts` | ~40+ | Acceptable for mock development utility |

### TypeScript Errors

Running `npx tsc --noEmit` produces **zero errors** across the entire project. **PASS.**

### Stale Type File

**MAJOR** — `src/types/role.ts`:
```ts
export type Role = "super_admin" | "management" | "admin" | "client";
```
- `"admin"` is not a valid `UserRole`
- File is imported nowhere (zero references found)
- Entire file is dead code and a maintenance hazard

---

## 9. UI/UX Completeness

### Loading States

| Page | Has Loading State | Notes |
|------|-------------------|-------|
| HRPanel.tsx | ✓ | `isLoadingEmployees` spinner on employee directory |
| SalarySlips.tsx | ✓ | |
| BudgetManagement.tsx | N/A | localStorage is synchronous; no async loading needed |
| All auth pages | ✓ | Button disabled + loading text during submit |

### Empty States

| Page / Section | Empty State | Notes |
|----------------|-------------|-------|
| HRPanel — Employee directory | "No employees found" | ✓ |
| HRPanel — Leave requests | "No leave requests yet." | ✓ |
| BudgetManagement — Dept allocations | "No department allocations yet." | ✓ |
| BudgetManagement — Member allocations | "No allocations yet." | ✓ |
| BudgetManagement — Audit log | "No audit entries." | ✓ |
| BudgetManagement — Returns | "No budget returns yet." | ✓ |
| BudgetManagement — Requests | "No budget requests yet." | ✓ |
| BudgetManagement — No budget created | Dashed placeholder with "Create Company Budget" CTA | ✓ |
| BudgetManagement — DeptAdmin no allocation | Yellow warning card | ✓ |

### Error Handling

| Location | Error Handling | Notes |
|----------|----------------|-------|
| HRPanel — Create user | `createError` state with inline display | ✓ |
| All budget modals | `setError()` with inline red text | ✓ |
| AuthContext | `catch` block on session fetch | ✓ |
| SalarySlips.tsx | `try/catch` with `console.error` (see Section 10) | Partial |

### Hardcoded Values

**MINOR — Hardcoded company name:**
`src/pages/Dashboard/HRPanel.tsx` line 69:
```ts
company: "Optivax Global",
```
Should read from `companySettingsService` or a config constant. Fragile if company name changes.

**MINOR — Hardcoded default salary:**
`src/pages/Dashboard/HRPanel.tsx` line 113:
```ts
merged[emp.id] = { userId: emp.id, leavesTaken: 2, salary: 45000, ... };
```
`45000` default salary is used in payroll deduction calculations for employees without salary data on file. This will produce silent incorrect deductions rather than an error.

---

## 10. Debug Artifacts

### `console.log` statements in `.tsx` files

**Zero occurrences found.** PASS.

### `console.error` in production code path

`src/pages/HR/SalarySlips.tsx` line ~236:
```ts
console.error("Failed to parse employee extra data", err);
```
This is in a `catch` block and will log to the browser console in production. Not a security risk, but should be silenced or replaced with a toast notification.

### `debugger` statements

Zero occurrences found anywhere. **PASS.**

### TODO / FIXME comments

Zero occurrences found in any `.tsx` or `.ts` file. **PASS.**

---

## 11. Dead Code

### `src/types/role.ts` — Entire file

Exports `Role` type with stale `"admin"` value. Zero imports anywhere. Should be deleted.

### `src/config/roleMenu.ts` — `MENU_DOMAINS` export

Exports `MENU_DOMAINS` configuration object. Zero imports found anywhere in the codebase. Dead configuration. Should be deleted or integrated into `menuConfig.ts`.

### Dead Notification Exports (7 functions)

Documented in Section 6. All 7 exported functions in `src/services/notificationHelpers.ts` are never called.

### Legacy Budget No-Op Shims

`src/mock/budgetData.ts` lines ~479–487:
```ts
export function getAuditLogs(): BudgetAuditLog[] { return []; }
export function saveAuditLogs(_logs: BudgetAuditLog[]): void { /* no-op */ }
export function appendAuditLog(_entry: BudgetAuditLog): void { /* no-op */ }
export function getChangesThisMonth(_logs: BudgetAuditLog[]): number { return 0; }
export function saveBudgets(_budgets: Budget[]): void { /* no-op */ }
```
These are backward-compat stubs. `getBudgets()` and `getBudgetStats()` are called by `SalesPanel.tsx` and `ManagementPanel.tsx` and are functional. The no-op stubs cause silent zero returns but no errors.

---

## 12. Issue Summary Table

| # | Severity | File | Line | Issue | Recommendation |
|---|----------|------|------|-------|----------------|
| 1 | **MAJOR** | `src/types/role.ts` | 1 | Exports stale `Role` type containing `"admin"` — not a valid `UserRole`. File is imported nowhere but is a maintenance trap. | Delete the file, or replace with `export type { UserRole as Role } from "./index"`. |
| 2 | **MAJOR** | `src/mock/payrollData.ts` | ~587 | HTML print template computes `displayNet = slip.basicSalary − totalDeductions` instead of `grossSalary − totalDeductions`. Printed salary slips show understated net pay for employees with allowances or bonuses. | Change to `const displayNet = computeNet(slip)` or use `slip.netSalary`. |
| 3 | **MAJOR** | `src/mock/payrollData.ts` | ~80–238 | Seed `SalarySlip` records store `basicSalary` value in `grossSalary` and `netSalary` fields, ignoring allowances and bonuses. Components reading these fields directly show wrong totals. | Recalculate seed values using `computeGross()` / `computeNet()`, or run `computeGross(slip)` at point-of-use. |
| 4 | **MAJOR** | `src/mock/payrollData.ts` | ~530 | Uses CommonJS `require("./attendanceData")` in an ESM/Vite project. Will silently fail; all attendance-based salary deductions default to 0. | Replace with a static `import` at top of file, or a dynamic `await import()`. |
| 5 | **MINOR** | `src/utils/rbac.ts` | ~123 | `it_admin` has no `budget` permission in `RBAC_MATRIX` but `/budget` route guard allows `it_admin`. Matrix is inconsistent with actual access. | Add `budget: ["VIEW", "EXPORT"]` to `it_admin` in the matrix, or remove `it_admin` from the route guard. |
| 6 | **MINOR** | `src/services/notificationHelpers.ts` | ~609, ~624 | `notifyLoginActivity` and `notifySecurityEvent` are exported but never called. Security events (login, security changes) are not tracked in the notification/audit system. | Wire both hooks to the appropriate events in `AuthContext.tsx`. |
| 7 | **MINOR** | `src/services/notificationHelpers.ts` | ~172, ~641, ~745, ~750, ~793 | Five more dead exports: `logAttendanceModified`, `notifyBudgetChanged`, `notifyClientRevisionSubmitted`, `notifyClientProfileUpdated`, `notifyGenericAction`. | Mark as `@deprecated` and remove in a cleanup PR. |
| 8 | **MINOR** | `src/mock/payrollData.ts` | ~240–318 | Seed `AdvanceSalaryRequest` records use `employeeId` values (`"seed-emp-01"` etc.) that do not exist in `mockUsers.ts`. Identity checks will never match logged-in mock users. | Align seed IDs with `mockUsers` IDs (`"u8"`, `"u12"`, etc.). |
| 9 | **MINOR** | `src/config/roleMenu.ts` | whole file | `MENU_DOMAINS` export is never imported anywhere. Entire file is dead code. | Delete the file. |
| 10 | **MINOR** | `src/App.tsx` | ~176, ~195, ~220 | Inner route guards for `/sales/users`, `/production/users`, `/marketing/users` include `hr_admin` and `management` — roles blocked before reaching the inner guard. Dead, misleading entries. | Remove `hr_admin`/`management` from inner guards, or add a code comment explaining the pattern. |
| 11 | **MINOR** | `src/pages/Dashboard/HRPanel.tsx` | ~69 | Company name `"Optivax Global"` hardcoded in user creation. | Read from `companySettingsService` or a named constant. |
| 12 | **MINOR** | `src/pages/Dashboard/HRPanel.tsx` | ~113 | Default salary `45000` hardcoded for employees missing salary data. Affects deduction calculations silently. | Move to a named constant (`DEFAULT_SALARY`) or flag explicitly in the UI. |
| 13 | **MINOR** | `src/pages/HR/SalarySlips.tsx` | ~236 | `console.error(...)` in production code path outputs to browser console. | Remove or replace with a toast notification / silent catch. |
| 14 | **INFO** | `src/config/menuConfig.ts` | ~125 | Super Admin sidebar labels `/hr/attendance/corrections` as "Audit Log" — same label used for `/admin/audit-logs`. Confusing for Super Admin users. | Rename to "Attendance Corrections" for clarity. |
| 15 | **INFO** | `src/pages/Dashboard/HRPanel.tsx` | ~30 | `HR_CREATABLE_ROLES` excludes `it_admin` and `it_member`. No code comment explains whether this is intentional policy. | Add an inline comment explaining the policy decision. |
| 16 | **INFO** | `src/mock/budgetData.ts` | ~479–487 | Five no-op backward-compat shim functions exported but never called. Cause silent zero/empty returns. | Mark as `/** @deprecated */` or remove after confirming no consumers. |
| 17 | **INFO** | `src/types/role.ts` | 1 | `"admin"` is the pre-migration role name. File is leftover from RBAC migration. | Delete as part of next cleanup pass. |

---

### Issue Count by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| MAJOR | 4 |
| MINOR | 9 |
| INFO | 4 |
| **Total** | **17** |

---

*Report generated 2026-06-26. No files were modified during this audit.*
