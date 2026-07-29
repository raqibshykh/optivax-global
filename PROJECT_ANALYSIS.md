# Optivax Global — Project Analysis & Audit Report
**Generated:** 2026-06-18  
**Auditor:** Claude Code (automated full-project scan)  
**Project:** Optivax Global SaaS Admin Dashboard

> **⚠️ Historical snapshot.** This audit predates the 2026-07 Phase 1 migration that removed the in-browser mock backend entirely (see the update note in §1 and the rewritten §3). Sections 1–3 have been updated to reflect the current Service-layer architecture; everything from §4 onward — page inventories, recommendations, scorecards, and every reference to `mock_*` localStorage keys, `src/mock/`, or seeded demo data — describes the **pre-migration** state and is kept for historical reference only. For current architecture, see `README.md`; for the migration record itself, see `PHASE1_IMPLEMENTATION_REPORT.md` at the project root.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Authentication & RBAC](#2-authentication--rbac)
3. [Mock Data Layer](#3-mock-data-layer)
4. [Pages & Routes](#4-pages--routes)
5. [Services & Hooks](#5-services--hooks)
6. [Types & Interfaces](#6-types--interfaces)
7. [Code Quality Issues](#7-code-quality-issues)
8. [Missing / Incomplete Features](#8-missing--incomplete-features)
9. [Strengths](#9-strengths)
10. [Recommendations (Prioritized)](#10-recommendations-prioritized)
11. [Summary Scorecard](#11-summary-scorecard)

---

## 1. Project Overview

| Property | Value |
|----------|-------|
| **App Name** | Optivax Global SaaS Admin Dashboard |
| **Purpose** | Role-based multi-department admin panel — clients, projects, billing, HR, sales, production, marketing |
| **React** | 19.2.6 |
| **TypeScript** | 5.7 |
| **Vite** | 6.1.0 |
| **Routing** | React Router 7.1.5 (HashRouter — `/#/route`) |
| **Styling** | Tailwind CSS 4.0.8 (dark mode supported) |
| **Charts** | ApexCharts 4.1.0 |
| **State** | React Context API (AuthContext, ToastContext) |
| **Data Persistence** | None on the client — every Service call goes over HTTP via `src/lib/client.ts` to `VITE_API_URL` |
| **Package Manager** | npm |

> **2026-07 update:** the in-browser mock backend (`src/mock/`, `src/lib/devSeed.ts`) has been fully removed. Every domain now goes through a thin Service class (`src/services/`) calling a real REST API; the backend itself is a Phase 2 deliverable. See `PHASE1_IMPLEMENTATION_REPORT.md` at the project root for the full migration record.

### Source Structure
```
src/
├── pages/          46 .tsx files across 9 role domains
├── components/     Dashboard, auth, tables, forms, UI primitives
├── services/       30+ service classes — one per domain, thin HTTP wrappers
├── domain/         Pure business-logic calculations (payroll, budget, attendance, activity)
├── hooks/          Data hooks
├── context/        AuthContext, ToastContext
├── lib/            client.ts (api helper), apiError.ts, storage.ts
├── config/         menuConfig.ts (sidebar links), environment.ts
├── types/          index.ts  (40+ interfaces/types)
├── utils/          rbac.ts
└── icons/
```

---

## 2. Authentication & RBAC

### Authentication Flow
- **Type:** Cookie-based session against the real backend, via `AuthService` (`src/services/authService.ts`)
- **Login:** `AuthService.login(email, password)` — `POST /saas/v1/auth/login`
- **Session restore:** `AuthService.getSession()` — `GET /saas/v1/auth/session`, called on mount by `AuthContext`; a 401 resolves to `null` (no session) rather than throwing
- **Logout:** `AuthService.logout()` — `POST /saas/v1/auth/logout`; the server owns clearing the cookie
- **401 handling:** `src/lib/client.ts` exposes `setUnauthorizedHandler(fn)`, wired from `AuthContext` to clear the in-memory user on any 401 response

### Roles (11 total)
| Role | Domain | Notes |
|------|--------|-------|
| `super_admin` | All | Bypasses every guard |
| `management` | All (VIEW only) | Cross-department read |
| `sales_admin` | Sales | Full sales CRUD |
| `sales_member` | Sales | Limited edit |
| `production_admin` | Production | Client-facing ops |
| `production_member` | Production | Own tasks only |
| `marketing_admin` | Marketing | Email + campaigns |
| `marketing_member` | Marketing | View + edit |
| `hr_admin` | HR | Employee management |
| `hr_member` | HR | View + limited edit |
| `client` | Client portal | Own projects/invoices |

### Permission Domains (11) & Actions (7)
**Domains:** `sales`, `production`, `marketing`, `hr`, `clients`, `system`, `billing`, `reports`, `files`, `notifications`, `tasks`  
**Actions:** `VIEW`, `CREATE`, `EDIT`, `DELETE`, `EXPORT`, `APPROVE`, `ASSIGN`

### Route Guard Implementation
- **File:** `src/components/auth/ProtectedRoute.tsx`
- **Line 35:** `if (user.role === "super_admin") return <Outlet />;` — super_admin bypasses everything
- **Lines 42–45:** `allowedRoles[]` check (explicit role list per route)
- **Lines 49–53:** Domain VIEW permission fallback via `hasPermission()`
- **`RequirePermission` component:** Wraps JSX to hide/show based on domain+action

### RBAC Matrix Source
- `src/utils/rbac.ts` — `RBAC_MATRIX` object mapping every role → domain → action[]
- `hasPermission(role, domain, action)` — primary check function
- `hasPermissionScoped(role, domain, action)` — prevents cross-department escalation

---

## 3. Service Layer

There is no mock backend, no seed data, and no hardcoded demo accounts anywhere in the frontend. Every domain has one `src/services/<domain>Service.ts` — a thin static class wrapping `api.get/post/put/patch/delete` (`src/lib/client.ts`), with zero business logic and no client-side persistence. Components call Service methods only; they never call `api.*` directly.

Pure calculation logic that has real business rules (payroll math, budget variance, attendance/activity report aggregation) lives in `src/domain/<name>/calculations.ts` — relocated verbatim from where it used to sit alongside demo data, math unchanged. The corresponding Service class calls into these functions and layers HTTP fetching on top.

There is intentionally no Repository layer underneath the Services: with exactly one data source (the backend REST API), a Repository would just be `XRepository.getAll()` calling `api.get(...)` and `XService.getAll()` calling `XRepository.getAll()`, adding a layer of indirection with no behavior.

### Representative Services

| Service | Domain |
|---|---|
| `authService.ts` | Login, session, logout, password reset |
| `userService.ts` | User/profile CRUD |
| `clientService.ts` | Client records |
| `projectService.ts` | Projects |
| `invoiceService.ts` / `paymentService.ts` | Billing |
| `taskService.ts` | General Kanban tasks |
| `leaveRequestService.ts` | HR leave requests (two sub-resources — HR full-lifecycle and employee-submitted, documented in-file) |
| `employeeExtraService.ts` | Per-employee salary overrides |
| `payrollService.ts` | Salary slips, advance-salary requests, print rendering |
| `attendanceService.ts` | Yearly attendance reports + self-check-in log |
| `budgetService.ts` | Company/department/member budget allocations |
| `revisionService.ts` | Revision/audit trail entries |
| `deliverableService.ts` | Production deliverables |
| `marketingCampaignService.ts` / `salesOpsService.ts` | Marketing and sales campaigns/targets/tasks |
| `itSupportService.ts` | IT tickets, biometric devices, sync logs, attendance exceptions |
| `organizationService.ts` / `subscriptionService.ts` | SaaS billing/multi-tenancy (super-admin only) |
| `emailService.ts` | Email templates, campaigns, automations |
| `notificationService.ts` / `notificationHelpers.ts` | Notification creation + ~60 typed notify-helpers |
| `auditLogService.ts` / `companySettingsService.ts` | Audit log, company branding settings |

### `src/lib/client.ts`

The single `api` object used by every Service. AbortController-based 15s timeout; bounded retry (max 2, GET-only, `network`/`timeout`/`server` errors); `ApiError`/`ApiErrorKind` classification (`unauthorized|forbidden|not_found|validation|server|network|timeout|unknown`); `setUnauthorizedHandler(fn)` as the single 401 extension point.

---

## 4. Pages & Routes

### Super Admin
| Route | Component | Data Sources |
|-------|-----------|-------------|
| `/super-admin/dashboard` | SuperAdminPanel | All 18 localStorage keys — 12 tabs |

### Admin (super_admin access)
| Route | Component | Notes |
|-------|-----------|-------|
| `/admin/dashboard` | AdminPanel | clients, projects, invoices |
| `/admin/clients` | Clients | Full client CRUD |
| `/admin/projects` | Projects | Full project CRUD |
| `/admin/billing` | Billing | Invoices + payments |
| `/admin/files` | AdminFiles | File management |
| `/admin/notifications` | AdminNotifications | Notification center |
| `/admin/revisions` | AdminRevisions | Client revision requests |
| `/admin/settings` | Settings | Stripe config + profile |
| `/admin/reports` | Reports | ⚠️ STUB — placeholder only |
| `/admin/audit-logs` | AuditLogs | localStorage-backed audit trail |
| `/admin/email/campaigns` | Campaigns | Email campaigns CRUD |
| `/admin/email/templates` | Templates | Email templates CRUD |
| `/admin/email/audience` | Audience | ⚠️ STUB — form only |
| `/admin/email/analytics` | Analytics | ⚠️ STUB — mock charts |
| `/admin/email/automation` | Automation | Automation rules CRUD |
| `/admin/users` | Employees | Full user management |

### Sales
| Route | Component | Notes |
|-------|-----------|-------|
| `/sales/dashboard` | SalesPanel | campaigns, targets, tasks, KPIs |
| `/sales/clients` | Clients | Filtered to sales context |
| `/sales/campaigns` | CampaignBudgets | Sales campaign budgets |
| `/sales/targets` | SalesTargets | Per-member targets |
| `/sales/tasks` | SalesTasks | Sales-specific tasks |
| `/sales/team-performance` | TeamPerformance | Team metrics dashboard |
| `/sales/billing` | Billing | Shared billing view |
| `/sales/reports` | Reports | ⚠️ STUB |
| `/sales/users` | Employees | HR-scoped user view |

### Production
| Route | Component | Notes |
|-------|-----------|-------|
| `/production/dashboard` | ProductionPanel | Projects, tasks, deliverables |
| `/production/projects` | Projects | All projects |
| `/production/deliverables` | Deliverables | Deliverables per client |
| `/production/tasks` | Tasks | Common tasks page |
| `/production/files` | AdminFiles | File management |
| `/production/reports` | Reports | ⚠️ STUB |

### Marketing
| Route | Component | Notes |
|-------|-----------|-------|
| `/marketing/dashboard` | MarketingPanel | Campaigns + KPIs |
| `/marketing/tasks` | Tasks | Marketing tasks |
| `/marketing/social` | SocialTracking | Social link tracking + analytics |
| `/marketing/email/campaigns` | Campaigns | Email campaigns |
| `/marketing/email/templates` | Templates | Email templates |
| `/marketing/email/audience` | Audience | ⚠️ STUB |
| `/marketing/email/analytics` | Analytics | ⚠️ STUB |
| `/marketing/email/automation` | Automation | Automation rules |
| `/marketing/reports` | Reports | ⚠️ STUB |

### HR
| Route | Component | Notes |
|-------|-----------|-------|
| `/hr/dashboard` | HRPanel | Employees, leave, attendance |
| `/hr/users` | Employees | Full employee management |
| `/hr/payroll` | Payroll | Salary + work mode data |
| `/hr/tasks` | Tasks | Shared task view |
| `/hr/reports` | Reports | ⚠️ STUB |

### Management
| Route | Component | Notes |
|-------|-----------|-------|
| `/management/dashboard` | ManagementPanel | Cross-dept overview: users, clients, projects, revenue |
| `/management/users` | Employees | Read-only + HR-delegated |
| `/management/projects` | Projects | All projects |
| `/management/clients` | Clients | All clients |
| `/management/deliverables` | Deliverables | All deliverables |
| `/management/billing` | Billing | Full billing view |
| `/management/tasks` | Tasks | All tasks |
| `/management/audit-logs` | AuditLogs | Audit trail |

### Client Portal
| Route | Component | Notes |
|-------|-----------|-------|
| `/client/dashboard` | ClientPanel | Own projects + invoices |
| `/client/projects` | MyProjects | Projects filtered to client |
| `/client/billing` | ClientBilling | Own invoices |
| `/client/files` | ClientFiles | Own files |
| `/client/revisions` | MyRevisions | Revision requests |
| `/client/profile` | Profile | Client company profile |

### Disabled Routes
| Route | Redirects To | Reason |
|-------|-------------|--------|
| `/signup` | `/login` | Registration disabled — `App.tsx:78` |
| `/reset-password` | `/login` | Not implemented — `App.tsx:79` |

---

## 5. Services & Hooks

### Services (13)

| Service | Key Methods | Endpoint / Storage |
|---------|-------------|-------------------|
| `userService.ts` | getAll, getById, create, update, delete | `/saas/v1/profiles/*` |
| `clientService.ts` | getAll, getById, create, update, delete | `/saas/v1/clients/*` |
| `projectService.ts` | getAll, getByClientId, create, update, delete, getByStatus | `/saas/v1/projects/*` |
| `invoiceService.ts` | getAll, getById, create, update, markAsPaid, delete | `/saas/v1/invoices/*` |
| `paymentService.ts` | getAll, getById, create | `/saas/v1/payments/*` |
| `fileService.ts` | getAll, upload, delete | `/saas/v1/files/*` |
| `notificationService.ts` | getAll, getByUser, create, markAsRead | `/saas/v1/notifications/*` |
| `emailService.ts` | sendEmail, getTemplates, updateTemplate | ⚠️ No real SMTP — stub |
| `eventService.ts` | logEvent, getEvents | `/saas/v1/events/*` |
| `leadService.ts` | getAll, create, update | localStorage direct |
| `auditLogService.ts` | log, getAll, getByEntity | `/saas/v1/audit-logs/*` |
| `notificationHelpers.ts` | notifyUserCreated, notifyClientCreated, notifyDeliverableApproved | Dispatches via notificationService |
| `payrollService.ts` | getAll, calculatePayroll | `optivax_employee_extra` |

### Hooks (17)

| Hook | Purpose |
|------|---------|
| `useClients` | Client CRUD + search |
| `useProjects` | Project CRUD + status update |
| `useInvoices` | Invoice CRUD + payment marking |
| `useFiles` | File upload/delete |
| `useNotifications` | Notification management |
| `useTasks` | Task CRUD |
| `useEmailMarketing` | Email templates, campaigns, automations |
| `useSocialTracking` | Social link tracking + analytics |
| `useLeads` | Sales leads CRUD |
| `useUserRole` | Current user role fetch |
| `useSSE` | Server-Sent Events mock listener |
| `useEvents` | Event log fetching |
| `useAutomation` | Email automation CRUD |
| `useBilling` | Combined invoices + payments |
| `useCommissions` | Sales commission calculations |
| `useModal` | Modal open/close state |
| `useGoBack` | navigate(-1) helper |

---

## 6. Types & Interfaces

All defined in `src/types/index.ts` (40+ exports).

### Auth & User
- `UserRole` — 11-value union string
- `PermissionDomain` — 11-value union
- `PermissionAction` — 7-value union
- `User` — id, email, name, role, avatar, phone?, address?, company?, joinDate, departmentId?
- `Employee` — userId, role, departmentId, salary?, workMode, annualLeaveBalance, status

### Business
- `Client` / `StoredClient` — Full company contact record with `assignedProductionMembers[]`
- `Project` — clientId, name, status, priority, progress, budget, spent, deadline, assignedTo[]
- `Task` — title, status, priority, assignedTo?, projectId?, dueDate
- `Lead` — name, email, company, source, status, estimated_value
- `Deliverable` — Full lifecycle: uploadedBy → reviewedBy → approvedBy with timestamps and `DeliverableStatus` enum
- `CampaignBudget` — campaignName, totalBudget, budgetSpent, assignedMembers[]
- `SalesTarget` — memberId, memberName, monthlyTarget, quarterlyTarget, annualTarget, achievedAmount

### Financial
- `Invoice` — number, clientId, projectId, amount, status, items[], invoice_url?
- `InvoiceItem` — description, quantity, rate, total
- `Payment` — invoiceId, amount, date, method, transactionId

### Marketing
- `EmailTemplate` — name, subject, content, type
- `EmailCampaign` — templateId, status, stats{ sent, opened, clicked }, audienceTags[]
- `EmailAutomation` — triggerType, delayHours, status
- `SocialLink` — platform, url, trackingId, status
- `SocialClickEvent` — linkId, platform, timestamp, device, browser

### System
- `Notification` — userId, type, title, message, read, actionUrl?
- `AuditLog` — action, entityType, performedBy, performedByRole, oldValue?, newValue?
- `DashboardStats` — totalRevenue, totalClients, totalProjects, pendingInvoices
- `Toast` — type ("success"|"error"|"warning"|"info"), message, duration

---

## 7. Code Quality Issues

### `console.log` — 3 files, 5 instances

| File | Line | Content | Risk |
|------|------|---------|------|
| `src/components/form/form-elements/DefaultInputs.tsx` | 17 | `console.log("Selected value:", value)` | Low — file never imported |
| `src/components/form/form-elements/DefaultInputs.tsx` | 67 | `console.log({ dates, currentDateString })` | Low — same |
| `src/components/form/form-elements/DefaultInputs.tsx` | 79 | `onChange={(e) => console.log(e.target.value)}` | Low — same |
| `src/hooks/useSSE.ts` | ~15 | Connection debug log | **Medium** — runs in production path |
| `src/layout/SidebarWidget.tsx` | ~35 | Debug log in handleAssign | Low — file never imported |

### Native Dialogs — 6 instances

| File | Line | Type | Impact |
|------|------|------|--------|
| `src/layout/SidebarWidget.tsx` | 40 | `alert(...)` | Low — never imported |
| `src/pages/Sales/SalesTasks.tsx` | 111 | `window.confirm(...)` | **High** — blocks UI on delete |
| `src/pages/Sales/CampaignBudgets.tsx` | 93 | `window.confirm(...)` | **High** — blocks UI on delete |
| `src/pages/HR/Employees.tsx` | 141 | `window.confirm(...)` | **High** — blocks UI on delete |
| `src/pages/Admin/Files.tsx` | 38 | `window.confirm(...)` | **High** — blocks UI on delete |
| `src/pages/AuthPages/ResetPassword.tsx` | 10 | `alert(...)` | Medium — feature stub |

### Hardcoded Role Strings Outside RBAC — 10+ instances

The pattern `checkPermission("domain", "APPROVE") || user?.role === "management"` is repeated in 4 sales pages instead of using a unified helper:

| File | Issue |
|------|-------|
| `src/pages/Sales/SalesPanel.tsx:32` | `user?.role === "management"` beside `checkPermission()` |
| `src/pages/Sales/SalesTargets.tsx:22` | Same mixed pattern |
| `src/pages/Sales/CampaignBudgets.tsx:31` | Same mixed pattern |
| `src/pages/Sales/TeamPerformance.tsx:18` | Same mixed pattern |
| `src/pages/HR/Employees.tsx:49–52` | Direct role string comparisons |
| `src/pages/Common/Tasks.tsx:81–84` | Direct role checks |

### Non-English Comments
| File | Lines | Issue |
|------|-------|-------|
| `src/hooks/useProjects.ts` | 5, 20 | Hindi-language comments in production code |

### Dead / Unreachable Files
| File | Status |
|------|--------|
| `src/components/form/form-elements/DefaultInputs.tsx` | Never imported in App.tsx |
| `src/layout/SidebarWidget.tsx` | Never imported in App.tsx |
| `src/pages/AuthPages/SignUp.tsx` | Route redirected to `/login` |
| `src/pages/AuthPages/ResetPassword.tsx` | Route redirected to `/login` |

### No Test Coverage
- **Zero** `.test.ts` / `.spec.ts` / `.test.tsx` files in the project
- No Jest, Vitest, or Testing Library configuration
- RBAC permission matrix — the most critical business logic — is entirely untested

---

## 8. Missing / Incomplete Features

| Feature | Status | Location | Priority |
|---------|--------|----------|----------|
| Password Reset | ⚠️ Stub — shows `alert()` | `AuthPages/ResetPassword.tsx:10` | High |
| Reports Module | ❌ Placeholder across all 5 domains | `Common/Reports.tsx` | High |
| Email Sending (SMTP) | ❌ No transport | `emailService.ts` | High |
| Stripe Integration | ⚠️ Form only — mock key | `Settings.tsx` | Medium |
| Email Analytics | ⚠️ Mock charts — no real stats | `Admin/Email/Analytics.tsx` | Medium |
| Email Audience Builder | ⚠️ Stub form | `Admin/Email/Audience.tsx` | Medium |
| Leave Approval in HR Panel | ⚠️ View only — approve only in SuperAdmin | `HRPanel.tsx` | Medium |
| Sign Up / Registration | ❌ Disabled | `App.tsx:78` redirects to `/login` | Low |
| Social Click Tracking Storage | ⚠️ Type defined, not persisted | `SocialClickEvent`, `SocialTracking.tsx` | Low |
| Attendance Tracking | ⚠️ Type defined, UI incomplete | `HRPanel.tsx` | Low |
| Two-Factor Auth | ❌ Not present | — | Low |
| Real-Time Notifications | ⚠️ Mock SSE only | `useSSE.ts` | Low |
| Audit Log Detail View | ⚠️ List only, no drill-down | `AuditLogs.tsx` | Low |
| Multi-Tenancy | ❌ Single org | — | Future |

---

## 9. Strengths

### 1. Solid RBAC Architecture
Centralised `RBAC_MATRIX` in `src/utils/rbac.ts` with role→domain→action mappings. `hasPermissionScoped()` prevents horizontal escalation. Super-admin bypass is explicit and documented — not hidden in component logic.

### 2. Complete Mock Data Ecosystem
18 localStorage keys, 131+ seeded items. Data relationships are realistic (invoices reference projects, projects reference clients, deliverables have full approval chains). Synchronous `devSeed.ts` seeding means panels never render empty on first load.

### 3. Immediate Data Availability
All state in SuperAdminPanel is now pre-seeded from localStorage in `useState` initializers — data is visible before any async fetch resolves. No blank screens on load.

### 4. Service + Hook Abstraction
13 service classes behind 17 custom hooks. Every domain has its own `useDomain()` hook with loading + error states. Swapping the mock server for a real backend requires only changing service layer internals.

### 5. Domain-Scoped Routing
Paths are cleanly namespaced (`/sales/*`, `/hr/*`, `/production/*`). Protected routes guard by role. Super-admin accesses all 16 role panels via control center quick-links.

### 6. Responsive Dark-Mode UI
Tailwind CSS 4 with consistent dark mode classes. `PageMeta` on every page. ApexCharts with matching color themes. Grid and flex layouts are mobile-responsive.

### 7. TypeScript Coverage
All 40+ domain types in `src/types/index.ts`. No PropTypes. Generic API client (`api.get<T>()`) ensures type-safe responses. TypeScript compiles with zero errors.

### 8. SuperAdminPanel — Comprehensive Control Center
12 tabs: Overview, Users, Projects, Clients, Departments, Tasks, Invoices, Transactions, Campaigns, Deliverables, Email, Leave Requests. Shows all 131+ mock items across all keys.

---

## 10. Recommendations (Prioritized)

### CRITICAL — Fix Before Demo

#### 1. Replace all `window.confirm` / `alert` with Toast + Modal
**Files:** `SalesTasks.tsx:111`, `CampaignBudgets.tsx:93`, `HR/Employees.tsx:141`, `Admin/Files.tsx:38`, `ResetPassword.tsx:10`  
**Action:** Create a reusable `<ConfirmDialog onConfirm onCancel message>` component. Replace all 5 blocking calls.  
**Effort:** 2 hours

#### 2. Remove/guard `console.log` in `useSSE.ts`
**Action:** Wrap in `if (import.meta.env.DEV)` or delete.  
**Effort:** 15 minutes

### HIGH — Fix Before Release

#### 3. Standardize admin permission checks
**Problem:** `checkPermission("domain", "APPROVE") || user?.role === "management"` duplicated in 4 sales pages.  
**Action:** Add `isAdminOrManager(role, domain)` helper to `src/utils/rbac.ts`. Replace all instances.  
**Effort:** 2 hours

#### 4. Wire Leave Approval to HR Panel
**Problem:** Approve/Reject only available in SuperAdminPanel. HR users can't approve from their own dashboard.  
**Action:** Add approve/reject buttons to `HRPanel.tsx` leave table using the same `handleLeaveAction` pattern.  
**Effort:** 1 hour

#### 5. Complete Email/Analytics with real data
**Problem:** Charts use placeholder data instead of computing from `email_campaigns` stats.  
**Action:** Read `email_campaigns` from localStorage, compute open-rate, click-rate, total-sent, render actual values.  
**Effort:** 2 hours

#### 6. Reports Module — implement at least Sales
**Problem:** All 5 Reports pages show "Coming soon".  
**Action:** Implement Sales Reports first (most data available): monthly revenue from `mock_payments`, top clients by invoiced amount from `mock_invoices`, campaign ROI from `sales_campaigns`.  
**Effort:** 4 hours

### MEDIUM — Code Quality

#### 7. Add unit tests for RBAC matrix
**Action:** Create `src/__tests__/utils/rbac.test.ts`. Test every role×domain×action boundary case (e.g., `hr_admin` accessing `billing`, `sales_member` accessing `hr`).  
**Effort:** 4 hours

#### 8. Replace Hindi comments in `useProjects.ts:5,20`
**Action:** Translate to English or remove.  
**Effort:** 5 minutes

#### 9. Delete confirmed dead files
**Files:** `DefaultInputs.tsx`, `SidebarWidget.tsx`  
**Action:** Confirm no imports exist (`grep -r "DefaultInputs"`, `grep -r "SidebarWidget"`), then delete. Reduces bundle.  
**Effort:** 30 minutes

#### 10. Wire Social Click Tracking to persistence
**Problem:** `trackClick()` in `useSocialTracking.ts` defined but events not written to `social_clicks`.  
**Action:** Call `api.post("/saas/v1/social-links/track", event)` inside `trackClick()`. The mock server already handles this endpoint.  
**Effort:** 30 minutes

### LOW — Polish

#### 11. Loading skeletons instead of spinners
Replace spinner `div` elements with shimmer skeleton rows in all tables.

#### 12. Breadcrumb navigation consistency
Some pages lack `<PageBreadcrumb>`. Add to Clients, Projects, Deliverables, Billing pages.

#### 13. Empty-state illustrations
Replace plain "No data found." text with an SVG illustration + CTA action button.

#### 14. Document mock API
Create `docs/API.md` listing all 18 `/saas/v1/*` endpoints with request/response shapes — reference doc for when replacing mock with real backend.

---

## 11. Summary Scorecard

| Area | Score | Notes |
|------|-------|-------|
| **RBAC / Auth** | 9/10 | Solid matrix. Minor: inconsistent check patterns in sales pages. |
| **Mock Data** | 9/10 | 18 keys, 131+ items, all relationships intact. Synchronously seeded. |
| **Routing** | 10/10 | All 40+ routes exist and resolve. No dead links. |
| **UI / UX** | 7/10 | Dark mode, responsive. Deducted for 6 native dialogs. |
| **Type Safety** | 8/10 | 40+ types defined. Minor `any` casts in a few panel interfaces. |
| **Code Quality** | 6/10 | Native dialogs, console.logs, Hindi comments, dead files present. |
| **Test Coverage** | 0/10 | Zero tests. Critical business logic (RBAC) fully untested. |
| **Feature Completeness** | 6/10 | 8 stub/placeholder pages (Reports ×5, Email Analytics, Audience, Password Reset). |
| **Service Architecture** | 9/10 | Clean service+hook abstraction. Easy to swap backend. |
| **Overall** | **71 / 100** | Demo-ready. Production needs 2–3 weeks for testing + stub completion. |

---

### Development Status: 75% Complete

**Ready for demo:**
Auth, RBAC, all core CRUD (clients, projects, invoices, employees, deliverables, tasks, email, social tracking), SuperAdminPanel (12 tabs, all 131+ mock items), all role-scoped dashboards.

**Not demo-ready:**
Reports module (5 domains all stubbed), Email sending/SMTP, Password reset, Social click analytics persistence, Attendance tracking UI.

**Estimated time to production-ready:** 2–3 weeks  
(testing infrastructure + stub feature completion + backend integration)
