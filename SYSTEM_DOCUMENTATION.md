# OptiVax Global — SaaS ERP Platform
## Complete System Architecture & Documentation

**Version:** 2.1
**Date:** 2026-07-17
**Classification:** Internal Technical Reference
**Status:** Real WordPress REST backend + React SPA. Post-Phase-8 production audit (Final Score 61/100 as of 2026-07-11 — see Section 13) plus a subsequent Bridge-Ready biometric-device architecture refactor and a device API-key management feature (both 2026-07-17, not yet covered by a numbered phase report — documented directly in this revision, see Sections 6.4, 12.8, 15.1).

> **This is a full rewrite, not an edit of the 2026-06-20 v1.0 document.** That version described an in-browser mock backend (`src/mock/`, `localStorage`-keyed storage) that has been **completely removed**. Every page, hook, and service now calls a real WordPress REST API (`wordpress-backend/optivax-erp-backend/`) backed by MySQL. Nothing in this document describes mock/simulated behavior — where a feature is real vs. still incomplete, it's called out explicitly (see Section 13, "Known Gaps").
>
> This document is the 9th artifact in a documented audit series, refreshed here for the first time since Phase 8 against the live codebase (all counts/claims in this revision were re-verified directly against source on 2026-07-17, not carried forward from the phase reports unchanged). For full findings/fix detail on any topic, the authoritative source is the phase report named in that section, all at the project root: `PHASE1_SECURITY_RBAC_REPORT.md`, `PHASE2_API_AUDIT_REPORT.md`, `PHASE3_DATABASE_AUDIT_REPORT.md`, `PHASE4_FRONTEND_AUDIT_REPORT.md`, `PHASE5_BUSINESS_LOGIC_AUDIT_REPORT.md`, `PHASE6_PERFORMANCE_REPORT.md`, `PHASE7_SECURITY_REPORT.md`, `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md`. No phase report exists yet for the Bridge-Ready/device-key work — it is documented only in this file.

---

## TABLE OF CONTENTS

1. [Project Overview](#section-1)
2. [Role Architecture](#section-2)
3. [RBAC Permission Matrix](#section-3)
4. [Route Map](#section-4)
5. [Page Inventory](#section-5)
6. [Backend Architecture (WordPress Plugin)](#section-6)
7. [Database Schema](#section-7)
8. [REST API Reference](#section-8)
9. [State Management (Frontend)](#section-9)
10. [Workflow Documentation](#section-10)
11. [File Management System](#section-11)
12. [Security Model](#section-12)
13. [Known Gaps & Production Readiness](#section-13)
14. [Build, Performance & Deployment](#section-14)
15. [Audit History](#section-15)
16. [Final Summary](#section-16)

---

<a name="section-1"></a>
## SECTION 1 — PROJECT OVERVIEW

### 1.1 Platform Identity

**OptiVax Global** is a multi-role SaaS ERP platform managing the full commercial lifecycle of a digital services agency — lead acquisition through client delivery, billing, payroll, and HR/attendance operations. Five internal departments (Sales, Production, Marketing, HR, IT Support) plus Management/Super Admin and a client-facing portal share one authenticated application.

### 1.2 Departments Supported

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         OptiVax Global Platform                          │
├───────────┬────────────┬────────────┬────────────┬───────────────────────┤
│  SALES    │ PRODUCTION │ MARKETING  │     HR      │      IT SUPPORT       │
│           │            │            │             │                       │
│ Leads     │ Deliverabl.│ Campaigns  │ Employees   │ Tickets                │
│ Clients   │ Projects   │ Email Mktg │ Payroll     │ Devices / device logs  │
│ Targets   │ Client     │ Social     │ Leave       │ Attendance dashboard/  │
│ Commiss.  │  ownership │  tracking  │ Attendance  │  exceptions/reports    │
│ Camp. bud │ Tasks      │ Content    │ Advance     │                       │
│           │ Files      │  calendar  │  salary     │                       │
└───────────┴────────────┴────────────┴─────────────┴───────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   CROSS-CUTTING   │
                    │ Super Admin Panel │
                    │ Management Panel  │
                    │ Budget Management │
                    │ Billing/Invoices  │
                    │ Files/Documents   │
                    │ Notifications     │
                    │ Audit Logs (2)    │
                    │ Client Conversat. │
                    │ Reports (mock)    │
                    │ Client Portal     │
                    └───────────────────┘
```

### 1.3 SaaS Architecture Summary

```
Browser
  │
  ├── React 19 SPA (Vite 6, TypeScript 5.7 strict)
  │     ├── React Router 7 (HashRouter, ProtectedRoute/PublicRoute guards)
  │     ├── Tailwind CSS 4
  │     ├── Context API (Auth, Activity, Toast, Theme, Sidebar — no Redux/Zustand)
  │     └── Route-level code-splitting (React.lazy + Suspense, all ~92 pages)
  │
  ├── HTTPS (fetch, credentials:"include", double-submit CSRF header)
  │
  └── WordPress REST API — wordpress-backend/optivax-erp-backend/
        ├── Custom REST namespace saas/v1 (38 route files, ~25 controllers)
        ├── JWT access token in an HttpOnly cookie (not Authorization header)
        ├── Random refresh token (hashed, DB-stored, rotated on use)
        ├── MySQL via $wpdb — 67 tables across 15 migration files
        ├── CSRF middleware, rate limiter, upload MIME/size validation (Phase 7)
        └── External: Stripe API (real PaymentIntent flow), SMTP via wp_mail (queued + immediate paths)
```

**Stack:**

| Layer | Technology |
|---|---|
| Frontend framework | React 19 |
| Language | TypeScript 5.7 (strict) |
| Build tool | Vite 6 |
| Routing | React Router 7 (HashRouter) |
| Styling | Tailwind CSS 4 |
| Frontend state | Context API only |
| Backend | WordPress plugin (`optivax-erp-backend`, custom REST controllers — not WP core CRUD) |
| Backend language | PHP 8+ |
| Database | MySQL via `$wpdb` (WordPress's DB abstraction) |
| Auth | JWT (HS256) in an HttpOnly, Secure, SameSite=None cookie; separate hashed refresh token |
| CSRF | Double-submit cookie (`optivax_csrf` cookie + `X-CSRF-Token` header) |
| Payments | Stripe — real PaymentIntent creation/confirmation, server-verified |
| Email | `wp_mail` via SMTP — synchronous (`MailService::sendNow`, auth-critical mail) or queued (`MailService::queue` + `EmailQueueWorker` cron, retry/backoff) |
| Real-time | Server-Sent Events (`/saas/v1/notifications/stream`) |
| Deployment | Vite build → either a standalone Vercel SPA (`vercel.json`), or synced into a WP theme (`npm run build:wp`) |

---

<a name="section-2"></a>
## SECTION 2 — ROLE ARCHITECTURE

**13 roles**, defined in `src/types/index.ts`'s `UserRole` union — one more tier than the original design (IT Support was added later):

```
TIER 1 — GLOBAL
├── super_admin     (unrestricted, all 17 permission domains)
└── management      (cross-department VIEW/EXPORT + full billing/budget/payroll/salary_slips/advance_salary)

TIER 2 — DEPARTMENTAL (admin + member per department)
├── SALES:       sales_admin, sales_member
├── PRODUCTION:  production_admin, production_member
├── MARKETING:   marketing_admin, marketing_member
├── HR:          hr_admin, hr_member
└── IT SUPPORT:  it_admin, it_member

TIER 3 — EXTERNAL
└── client
```

Each departmental role's **home dashboard** is `/{domain}/dashboard` (e.g. `/sales/dashboard`, `/it/dashboard`). Sidebar menus are role-specific, defined per-role in `src/config/menuConfig.ts` (not derived from the RBAC matrix — a menu item and a permission grant are two independent things; a route can exist and be permission-guarded without being linked from every eligible role's menu — see Section 13 for one confirmed instance of this gap).

**IT Support scope (added after the original 11-role design):** ticket management, device inventory/logs, and a dedicated attendance sub-suite (dashboard, exceptions, reports) — explicitly walled off from HR/payroll/billing/client-financial data (`it_admin`'s RBAC comment in `rbac.ts` states this directly).

---

<a name="section-3"></a>
## SECTION 3 — RBAC PERMISSION MATRIX

### 3.1 Domain Definitions (17 domains — up from the original 11)

`sales`, `production`, `marketing`, `hr`, `it_support`, `clients`, `system`, `billing`, `reports`, `files`, `notifications`, `revisions`, `conversations`, `budget`, `payroll`, `salary_slips`, `advance_salary`.

### 3.2 Full Permission Matrix (verbatim from `src/utils/rbac.ts`)

Legend: `ALL`=all 7 actions (VIEW/CREATE/EDIT/DELETE/EXPORT/APPROVE/ASSIGN), `V`=VIEW, `C`=CREATE, `E`=EDIT, `D`=DELETE, `X`=EXPORT, `A`=APPROVE, `S`=ASSIGN, `—`=no access.

| Domain | super_admin | management | sales_admin | sales_member | production_admin | production_member | marketing_admin | marketing_member | hr_admin | hr_member | it_admin | it_member | client |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sales | ALL | V,X | ALL | V,E | — | — | V | V | — | — | — | — | — |
| production | ALL | V,X | — | — | ALL | V,E | — | — | — | — | — | — | V |
| marketing | ALL | V,X | — | — | — | — | ALL | V,E | — | — | — | — | — |
| hr | ALL | V,X | — | — | — | — | — | — | ALL | V | — | — | — |
| it_support | ALL | — | — | — | — | — | — | — | — | — | ALL | V,E | — |
| clients | ALL | V,X | ALL | V,E | V,S | — | — | — | — | — | — | — | V,E |
| system | ALL | — | — | — | — | — | — | — | — | — | V,E | — | — |
| billing | ALL | V,C,E,X,A,S | V,C,E,A,S | — | — | — | — | — | — | — | — | — | V |
| reports | ALL | V,X | V,X | — | V,X | — | V,X | — | V,X | — | V,X | — | — |
| files | ALL | V,C,E,D,X | V,C,E,D | V,C | ALL | V,C | ALL | V,C | ALL | V,C | — | — | V |
| notifications | ALL | V,X | V,C | V | V,C | V | V,C | V | V,C | V | V,C | V | V |
| revisions | ALL | V,E | — | — | V,C,E,D | V | — | — | — | — | — | — | — |
| conversations | ALL | ALL | — | — | V,C,E | V,C | V,C,E | V,C | — | — | — | — | — |
| budget | ALL | ALL | V,C,E,A,S | — | V,X | — | V,X | — | V,X | — | — | — | — |
| payroll | ALL | ALL | — | — | — | — | — | — | ALL | — | — | — | — |
| salary_slips | ALL | ALL | V | V | V | V | V | V | ALL | V | — | — | — |
| advance_salary | ALL | ALL | V,C | V,C | V,C | V,C | V,C | V,C | V,A,E | V,C | — | — | — |

### 3.3 Scope Enforcement — two independent layers, and where they diverge

**Frontend (`hasPermissionScoped` in `rbac.ts`):**
```
super_admin              → always true
management                → hasPermission (no scope restriction)
dept role, cross-cutting  → hasPermission (files/notifications/reports/revisions/
  domain (files, etc.)      conversations/budget/salary_slips/advance_salary are
                             exempt from scope restriction — every role has an
                             explicit matrix grant for them)
dept role, primary domain → hasPermission
dept role, other domain,  → hasPermission (VIEW is always allowed cross-domain)
  action === VIEW
dept role, other domain,  → false (blocked client-side)
  action !== VIEW
```

**Backend — this is where it diverges, and it's the report's C3 finding (Section 13).** `middleware/RbacMiddleware.php` defines an equivalent `authorizeScoped()`, but **re-confirmed 2026-07-17: it has zero call sites anywhere in the codebase** (`grep -rn "authorizeScoped"` across every `.php` file returns only the method's own definition and one doc-comment reference — no controller invokes it, `BudgetController.php` included). Every controller uses the unscoped `authorize()` (permission-only, no ownership/department check) as its RBAC gate.

Two controllers compensate with their own hand-rolled ownership check on top of that unscoped gate: `BudgetController.php` (`ownDepartmentOrNull()`) and, **as of this re-verification, also `CommissionController.php`** (`ensureSameDepartment()`, `controllers/CommissionController.php:151-167`) — its own doc comment (`:140-149`) explains the deliberate choice not to use `authorizeScoped()`: that method would block any non-VIEW action outside a role's *primary* domain entirely, which would stop `sales_admin` from managing their own team's commissions (`billing` is a granted-but-non-primary domain for that role). This narrows the original finding: **the specific "Commission editing" cross-department exposure the Phase 1/8 reports cited is not reproducible as described** — a same-department check is now in place there. The broader architectural gap stands unchanged, though: `authorizeScoped()` itself is dead code, and department/ownership scoping exists only where a specific controller author added it by hand — not systematically. Controllers beyond Budget and Commission were not re-audited in this pass, so an equivalent gap elsewhere cannot be ruled out.

---

<a name="section-4"></a>
## SECTION 4 — ROUTE MAP

### 4.1 Route Architecture

Defined in `src/App.tsx`. Structure:
1. `<ErrorBoundary>` — top-level crash isolation, plus a second, narrower one around `<Outlet/>` inside `<AppLayout>` so one page crashing doesn't take down the sidebar/header.
2. `<Suspense fallback={<RouteFallback/>}>` wraps the whole `<Routes>` tree — every page is `React.lazy()`-imported (Phase 4/6).
3. `<PublicRoute>` — wraps `/login`, `/reset-password`; redirects an already-authenticated user away.
4. `<ProtectedRoute allowedDomain="X" allowedRoles={[...]}/>` — wraps every other route; unauthenticated → redirect to login, wrong role → redirect to the user's own home.

### 4.2 Route Inventory by Section

| Section | Path prefix | Roles | Notable pages |
|---|---|---|---|
| Auth (public) | `/login`, `/reset-password`, `/change-password` | anyone / anyone authenticated | `change-password` reachable even while `must_change_password` is blocking every other route |
| Super Admin | `/super-admin/*` | super_admin | dashboard, `/super-admin/departments` |
| Admin (shared with Super Admin) | `/admin/*` | super_admin | dashboard, clients, projects, billing, files, notifications, revisions, settings, reports, audit-logs, security-audit-logs, commissions, `email/{campaigns,templates,audience,analytics,automation}`, users |
| Sales | `/sales/*` | sales_admin, sales_member | dashboard, leads, clients, tasks, targets, `campaigns`/`team-performance` (sales_admin only, nested guard), commissions, reports, files, billing (sales_admin only), notifications, settings, profile, users (shared w/ hr_admin/management) |
| Production | `/production/*` | production_admin, production_member | dashboard, content-requests, projects, tasks, deliverables, files, reports, revisions, notifications, settings, profile, my-clients, users |
| Client Ownership | `/production/client-ownership` | super_admin, management, production_admin | separate guard block from the rest of `/production/*` |
| Marketing | `/marketing/*` | marketing_admin, marketing_member | dashboard, leads, content-calendar, tasks, social, reports, files, notifications, `email/{campaigns,templates,audience}`, `email/{analytics,automation}` (marketing_admin only), settings, profile, users |
| HR | `/hr/*` | hr_admin, hr_member | dashboard, users (hr_admin+management), payroll (hr_admin+super_admin), leave, `attendance` + 6 sub-pages (monthly/yearly/analytics/calendar/payroll/corrections — several role-narrowed further), tasks, files, settings+reports (hr_admin+super_admin), notifications, profile |
| Management | `/management/*` | management | dashboard, projects, clients, billing, reports, tasks, notifications, audit-logs, deliverables, revisions, files, profile, users |
| Client Conversations | `/conversations` | super_admin, management, marketing_admin, marketing_member, production_admin, production_member | **sales roles explicitly excluded** — documented in-line in `App.tsx` as intentional |
| Budget Management | `/budget` | super_admin, management, sales_admin, production_admin, marketing_admin, hr_admin, it_admin | shared cross-department page |
| My Budget | `/my-budget` | every `*_member` role | member-level personal view |
| Payroll/Salary (admin) | `/hr/salary-slips`, `/hr/advance-salary` | super_admin, management, hr_admin | |
| Advance Salary Audit | `/hr/advance-salary/audit` | super_admin, hr_admin | |
| Bulk Salary Slips | `/hr/bulk-salary-slips` | super_admin, hr_admin | |
| Salary Slips + Advance (self) | `/salary-slips`, `/advance-salary` | every internal role incl. IT | |
| IT Tickets | `/it/tickets` | every internal (non-client) role | anyone can submit |
| Activity Reports | `/activity/reports` | super_admin, management, hr_admin, and all `*_admin` roles | server-scoped to own dept for dept admins |
| Live Activity Dashboard | `/activity/live` | every internal role | members see only themselves, server-scoped |
| IT Support | `/it/*` | it_admin, it_member | dashboard, attendance, devices, device-logs, exceptions, reports, notifications, profile — **no billing/payroll/salary routes exposed here**, by design |
| Client Portal | `/client/*` | client | dashboard, projects, billing, files, notifications, messages, revisions, profile |
| Fallback | `*` | anyone | `NotFound` (404) |

**Route/menu consistency (verified Phase 8):** every route resolves to a real lazy-imported file; zero duplicate path registrations; every menu link resolves to a real route. One confirmed gap: `it_member`'s sidebar has no link to `/it/reports` even though the route exists and is correctly guarded for that role (only `it_admin`'s menu links it) — reachable only by typing the URL.

---

<a name="section-5"></a>
## SECTION 5 — PAGE INVENTORY

**83** `.tsx` files under `src/pages/` (re-counted 2026-07-17; the prior "~92" figure was stale) — **79** are actual routable pages; the other 4 (`Admin/ClientModal.tsx`, `Admin/InvoiceModal.tsx`, `Admin/NotificationModal.tsx`, `Admin/ProjectModal.tsx`) are modal sub-components colocated in `Admin/` and never imported by `src/App.tsx` directly. `src/App.tsx` itself lazy-imports 74 distinct page components (fewer than 79, since several — e.g. `Admin/Clients.tsx`, `Common/Tasks.tsx`, `HR/Employees.tsx` — are reused across multiple role-specific routes). Rather than one entry per page (see `PHASE4_FRONTEND_AUDIT_REPORT.md` and `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md` for exhaustive per-page findings), this section maps each functional area to its backing controller and current status:

| Area | Frontend pages | Backend controller(s) | Status |
|---|---|---|---|
| Dashboards | `Dashboard/{SuperAdminPanel,AdminPanel,SalesPanel,ProductionPanel,MarketingPanel,HRPanel,ManagementPanel,ITSupportPanel,ClientPanel}.tsx` | aggregated reads across multiple repos | Real, read-only aggregation |
| Clients | `Admin/Clients.tsx` + `ClientModal.tsx` | `ClientRoutes.php` → `ClientRepository` | Real CRUD, client-scoped for `client` role |
| Projects | `Admin/Projects.tsx` + `ProjectModal.tsx` | `ProjectRoutes.php` → `ProjectRepository` | Real CRUD |
| Tasks | `Common/Tasks.tsx`, `Sales/SalesTasks.tsx` | `TaskRoutes.php` → `TaskRepository` | Real CRUD, Kanban board memoized (Phase 4) |
| Deliverables | `Production/Deliverables.tsx` | `DeliverableRoutes.php` | Real CRUD, but **no loading/error state — Phase 8 Critical C4** |
| Client Ownership | `Production/ClientOwnership.tsx`, `MyClients.tsx` | `ClientOwnershipRoutes.php` | Real, RBAC + audit-logged (2026-07-02 module) |
| Files | `Admin/Files.tsx`, `Client/Files.tsx` | `FileRoutes.php` → `UploadService`/`FileRepository` | Real upload (MIME allow-list + size cap + magic-byte check, Phase 7), but **visibility rules stored, never enforced on read — Phase 8 High H5** |
| Billing/Invoices | `Admin/Billing.tsx`, `Client/Billing.tsx`, `InvoiceModal.tsx` | `InvoiceRoutes.php`, `PaymentRoutes.php`, `StripeRoutes.php` | Real, including a genuine Stripe PaymentIntent flow (server-verified) |
| Revisions | `Admin/Revisions.tsx`, `Client/MyRevisions.tsx` | `RevisionRoutes.php` | Real CRUD |
| Notifications | `Admin/Notifications.tsx`, `Client/Notifications.tsx` | `NotificationRoutes.php`, `NotificationStreamController.php` (SSE) | Real delivery (SSE + cross-tab sync), but **creation is client-triggered only — no server-side business-event triggers exist yet** |
| Audit Logs | `Admin/AuditLogs.tsx`, `Admin/SecurityAuditLogs.tsx` | `AuditLogRoutes.php`, `SecurityAuditLogRoutes.php` | Two separate logs: `SecurityAuditLog` (auth events, thoroughly server-triggered) vs. general `AuditLog` (**client-triggered only** — a real integrity gap, Phase 7/8) |
| Employees / HR | `HR/Employees.tsx`, `Payroll.tsx`, `SalarySlips.tsx`, `BulkSalarySlips.tsx`, `LeaveRequests.tsx`, `Attendance*.tsx` (7 sub-pages), `AdvanceSalary*.tsx` | `ProfileRoutes.php`, `PayrollRoutes.php`, `LeaveRequestRoutes.php`, `AttendanceRoutes.php`, `EmployeeExtraRoutes.php` | Payroll calculation is real and consistent (single source of truth, server invariant enforced); **employee↔department assignment is broken — Phase 8 Critical C2** |
| IT Support | `ITSupport/{Tickets,Devices,DeviceLogs,AttendanceDashboard,AttendanceExceptions,AttendanceReports}.tsx` | `ItSupportRoutes.php`, `BiometricAttendanceRoutes.php`, `ActivityRoutes.php` | Real CRUD. `Devices.tsx` (2026-07-17) also drives a full device API-key lifecycle — masked `••••••••1234` display, confirm-then-generate/rotate flow, one-time plaintext reveal with copy — restricted server-side to `super_admin`/`it_admin` (see Section 12.8). Punch ingestion is now Bridge-push-only by default; the legacy direct-TCP "Test Connection"/"Sync Now" buttons still exist but are disabled server-side unless an operator opts into legacy LAN sync (Section 6.4). |
| Marketing | `Marketing/{ContentCalendar,Leads,SocialTracking}.tsx`, `Admin/Email/*.tsx` | `MarketingCampaignRoutes.php`, `ContentCalendarRoutes.php`, `SocialTrackingRoutes.php`, `EmailMarketingRoutes.php` | Content calendar/social tracking real; **email campaigns cannot actually send — Phase 8 High H3** (compose/template UI works, "Send Now" only flips a status field); **automation is a UI-only toggle, zero enforcement — Phase 8 Medium M2** |
| Sales | `Sales/{Leads,SalesTargets,CampaignBudgets,TeamPerformance,Commissions}.tsx` | `LeadRoutes.php`, `SalesOpsRoutes.php`, `SalesWidgetRoutes.php`, `CommissionRoutes.php` | Leads/targets/campaigns real; **commission amounts are 100% manually entered, no auto-calc from closed deals — Phase 8 Medium M1** |
| Budget | `Budget/BudgetManagement.tsx`, `Employee/MyBudget.tsx` | `BudgetRoutes.php` → `BudgetController` (hand-rolled department scoping) | Allocation/request/approval workflow real; **`usedAmount` is permanently frozen — never derived from real spend — Phase 8 High H4** |
| Reports | `Common/Reports.tsx` | **none** | **100% hardcoded mock data, zero backend — Phase 8 Critical C5** (newly discovered, not in any prior phase) |
| Conversations | `Conversations/ClientConversations.tsx`, `Client/Messages.tsx` | `ConversationRoutes.php` | Real, sales roles explicitly excluded by design |
| Company Settings | `Admin/Settings.tsx` | `CompanySettingsRoutes.php` | Real, singleton row, object-cached (Phase 6) |
| Departments | `Admin/Departments.tsx` | `DepartmentRoutes.php` → `DepartmentRepository` | Real CRUD, **but disconnected from the employee-department field — see C2** |

---

<a name="section-6"></a>
## SECTION 6 — BACKEND ARCHITECTURE (WordPress Plugin)

**Location:** `wordpress-backend/optivax-erp-backend/`. A custom WordPress plugin — not WP core post types/CRUD, its own REST namespace (`saas/v1`) and its own MySQL tables (prefixed, not `wp_posts`).

### 6.1 Directory Structure

Counts re-verified 2026-07-17 directly against source (superseding the original Phase 2A-era figures below, which had drifted):

```
optivax-erp-backend/
├── optivax-erp-backend.php   Plugin bootstrap — defines OPTIVAX_ERP_DB_VERSION (1.7.0),
│                              autoloader, registers all hooks/middleware/routes/cron.
│                              NOTE: the file's own docblock header still reads
│                              "Version: 2.0.0-phase2a" — not bumped alongside
│                              OPTIVAX_ERP_VERSION ("2.6.0-bridge-ready"); cosmetic drift,
│                              see Section 13 Minor.
├── controllers/               26 files — one per resource, or BaseCrudController for generic CRUD
├── routes/                    39 files — register_rest_route() calls, one per resource,
│                              all explicitly listed (not globbed) in routeFiles()
├── repositories/               55 files — DB access layer, most extend AbstractRepository
│                              (shared list/find/create/update/delete + pagination/search/safety-limit)
├── middleware/                 8 files: AuthMiddleware, CsrfMiddleware, RbacMiddleware,
│                              ClientScopeMiddleware, DepartmentScopeMiddleware,
│                              ErrorBoundaryMiddleware, PasswordGateMiddleware, and
│                              DeviceApiKeyMiddleware (2026-07-17 — see Section 6.4/12.8)
├── helpers/                    17 files: Jwt, RateLimiter, PasswordPolicy, Sanitize, Validator,
│                              ApiResponse, SecurityHeaders, SecurityAuditLog, DepartmentMapper,
│                              RbacMatrix, UserHierarchy, DeviceKeyHasher (2026-07-17), ...
├── services/                   3 files: AuthService (session/token lifecycle),
│                              BiometricAttendanceService, DeviceSyncService (Section 6.4)
├── connectors/zkteco/          4 files — legacy direct-TCP ZKTeco protocol client
│                              (ZKTecoConnector, ZKProtocol, AttendanceDownloader,
│                              AttendanceParser), all @deprecated as of 2026-07-17 (Section 6.4)
├── notifications/              NotificationService
├── mail/                       MailService + templates/*.php (5 templates, all output-escaped)
├── uploads/                    UploadService (MIME allow-list, size cap, magic-byte check — Phase 7)
├── database/migrations/        17 files on disk — 16 applied through Migrator::migrations(),
│                              plus ForeignKeyMigration applied separately (dbDelta can't parse
│                              FK clauses reliably — see Section 7.2)
└── cron/                       6 files/schedules — EmailQueueWorker (every minute), AutomationCronWorker
                               (hourly), BiometricAttendanceCronWorker (hourly), DeviceSyncCron (every
                               5 min, @deprecated no-op by default — Section 6.4), ActivitySessionCronWorker
                               (hourly, 8h force-logout cap), ActivityHeartbeatCronWorker (every minute,
                               online/offline presence)
```

### 6.2 Request Lifecycle

```
Request → WordPress core → rest_api_init
  │
  ├─ SecurityHeaders::applyBaselineHeaders()   (X-Content-Type-Options, X-Frame-Options,
  │                                              CSP, Referrer-Policy, Permissions-Policy, HSTS)
  ├─ SecurityHeaders::applyCorsHeaders()       (origin allow-list echo, never "*")
  ├─ AuthMiddleware::restAuthenticationErrors  (decodes JWT cookie once per request,
  │                                              wp_set_current_user() if valid)
  ├─ PasswordGateMiddleware::enforce           (blocks all but /change-password if
  │                                              must_change_password is set)
  ├─ CsrfMiddleware::check   [priority 5]      (state-changing methods + authenticated
  │                                              cookie → require matching X-CSRF-Token)
  ├─ ErrorBoundaryMiddleware::wrap [priority 10] (catches any \Throwable, logs internally,
  │                                              returns generic 500 — never leaks trace/message)
  │
  └─ Controller method
        ├─ AuthMiddleware::currentClaims()/currentUserId()/currentRole()
        ├─ RbacMiddleware::authorize($domain, $action)   ← unscoped everywhere except
        │                                                   BudgetController's hand-rolled scoping
        ├─ Validator::check() / Sanitize::*()
        ├─ Repository call ($wpdb, always parameterized via $wpdb->prepare())
        └─ ApiResponse::ok()/error()/validationError()/forbidden()/unauthorized()
              → {success, data, error, meta?, details?} — every response, always this shape
```

### 6.3 Autoloading & Bootstrap

`optivax-erp-backend.php` defines a lightweight PSR-4-ish autoloader (`OptivaxERP\Controllers\X` → `controllers/X.php`) and, in its constructor, wires every hook in one place: route registration (`rest_api_init`), the JWT auth filter (`rest_authentication_errors`), the password gate (`rest_pre_dispatch`), CSRF + error-boundary middleware (`rest_dispatch_request`), SMTP config (`phpmailer_init`), security headers (`rest_api_init`), and all 6 cron schedules. `Migrator::maybeUpgrade()` runs unconditionally on every request (cheap — a single `get_option()` check) so a schema bump reaches an already-deployed site on its next request, not just on plugin reactivation.

### 6.4 Biometric Device Integration — Bridge-Ready Architecture (added 2026-07-17)

**Why this exists:** the ERP is hosted on shared hosting (Hostinger). A ZKTeco K40 biometric device sits inside an office LAN, which shared hosting cannot open a TCP socket into — there is no network path from the public internet to a private office LAN without a VPN/port-forward the hosting provider doesn't provide. The original biometric pipeline (built Phase 2A/2B, documented in earlier revisions of this document and in memory as "biometric-system-analysis") assumed the ERP itself would dial the device directly over TCP (port 4370, ZKTeco standalone protocol). That assumption doesn't hold for this deployment target, so the backend was refactored into a **Bridge-Ready** architecture: the ERP is now a pure REST API server that only ever *receives* punches over HTTPS; a separate **Local Bridge Application** (not built as part of this work — explicitly out of scope) runs inside the office LAN, talks to the device itself, and pushes punches to the ERP.

```
Physical Device (ZKTeco K40, office LAN)
        │  TCP, port 4370 (LAN-local only)
        ▼
Local Bridge Application  (NOT part of this codebase — a future, separate app)
        │  HTTPS POST, X-Device-Key header
        ▼
POST /it/devices/{deviceId}/punches/import   ← the ONLY supported path into the ERP
        │
        ▼
BiometricAttendanceService::ingestBatch()   ← UNCHANGED — same chunked ingest,
        │                                      dedup, aggregation pipeline as before
        ▼
it_biometric_punches → attendance_records (same aggregation AttendanceController's
                        manual self-check-in already used — HR/Payroll/Reports need
                        zero changes to reflect Bridge-sourced data)
```

**What changed vs. the original design:**
- **Legacy direct-TCP path deprecated, not deleted.** `DeviceSyncService.php`, `connectors/zkteco/{ZKTecoConnector,ZKProtocol,AttendanceDownloader,AttendanceParser}.php`, and the `DeviceSyncCron` 5-minute tick are all still present and functional, but gated behind a WP option (`optivax_erp_enable_lan_device_sync`, a checkbox under Settings → OptiVax ERP, **off by default**). With it off, `DeviceSyncService::testConnection()`/`syncDevice()` throw a clear `\RuntimeException` explaining why, and the cron tick silently no-ops. This flag exists only for the edge case of an on-premise/LAN-hosted deployment of this same ERP; it must stay off on Hostinger.
- **`POST /it/devices/{deviceId}/punches/import` hardened** as the primary/production endpoint (`BiometricAttendanceController::importPunches()`): request caps (5,000 punches / 8MB body → `413`), dual per-device + per-IP rate limiting (`RateLimiter` helper, previously only used by login), an `Idempotency-Key` header (new `it_device_import_requests` table, 14-day retention) so a Bridge can safely retry an upload after a timeout without double-counting — on top of, not instead of, the pre-existing exact-punch `UNIQUE KEY` dedup and the 120-second near-duplicate window `BiometricAttendanceService` already had. Future-timestamped punches (>5 min clock skew) are now rejected; old/offline punches (yesterday, last week, last month) are unaffected — offline-catch-up support was an explicit requirement.
- **Response envelope gained** `processingTimeMs`, `deviceTime` (echoed from an optional request field), `serverTime` — lets a Bridge detect its own clock drift.
- **Device status is now Bridge-reported, not TCP-polled.** New `it_devices` columns (`bridge_id`, `bridge_version`, `bridge_hostname`, `bridge_ip`, `bridge_os`, `bridge_last_seen`, `bridge_latency_ms`, `last_upload_duration_ms`, `last_upload_count`, `last_failed_upload`) are populated from an optional `bridge: {...}` object in the import request body, updated on every call (success or failure) via `ItDeviceRepository::recordBridgeStatus()`.
- **`it_device_logs` gained richer per-upload audit fields**: `rejected_count`, `unmapped_count`, `punch_count`, `source_ip`, `bridge_id`, `idempotency_key` — alongside the existing full request/response body logging (`Logger`, channel `device-sync-http`, file-based).
- **Device authentication hardened** — see Section 12.8; this is also where the 2026-07-17 Generate/Rotate API Key UI (Section 5, IT Support row) plugs in.

**Everything downstream of ingestion is explicitly unchanged**, per the original task's hard constraint: `BiometricAttendanceService::aggregateDay()`, the attendance-exception sweep, payroll/reports/dashboard consumption of `attendance_records` — none of it was touched. This was verified by tool-call record each time (not just diff), since the whole `wordpress-backend/` tree is untracked in this repo's current git state (Section 14 build note).

New migration: `DeviceBridgeMigration.php` (the `it_device_import_requests` idempotency-cache table — see Section 7.2). `OPTIVAX_ERP_DB_VERSION` bumped `1.6.0` → `1.7.0`; a one-time, idempotent backfill (`Migrator::backfillDeviceApiKeyHashes()`, runs on every activation/upgrade pass) hashes any pre-existing plaintext `api_key` into the new `api_key_hash` column so already-configured devices are never locked out by the auth-hardening change.

---

<a name="section-7"></a>
## SECTION 7 — DATABASE SCHEMA

### 7.1 Overview

MySQL via `$wpdb`. **69 tables** (recounted 2026-07-17 via a fresh `CREATE TABLE` grep — up from 67) across **17 migration files on disk**, **16 of which run through** `Migrator::migrations()` (`database/Migrator.php`) via `dbDelta()` for the additive schema (safe to re-run, never drops columns); the 17th, `ForeignKeyMigration.php`, is applied separately (`ForeignKeyMigration::apply()`) for real FK constraints, since `dbDelta()` can't reliably parse `FOREIGN KEY` clauses — checked against `information_schema` first, applied defensively (a failed constraint on live data is logged and skipped, not forced). Current `OPTIVAX_ERP_DB_VERSION`: **1.7.0** (up from 1.2.0 — Phase 3's schema-upgrade fix, soft-delete/audit columns, and the 2026-07-17 biometric Bridge-hardening columns/table all landed as version bumps since the last count).

### 7.2 Migration Files → Domain

| Migration | Covers |
|---|---|
| `IdentityOrgMigration.php` | Users mapping (role/department/status/token_version), refresh tokens, organizations |
| `AuthMigration.php` | Auth-adjacent tables (JWT secret option is a `wp_options` row, not a table) |
| `ClientMigration.php` | Clients, client ownership |
| `ProjectTaskMigration.php` | Projects, tasks |
| `BillingMigration.php` | Invoices, invoice line items, payments |
| `PayrollMigration.php` | Payroll, salary slips, advance salary + audit log |
| `HrAttendanceMigration.php` | Leave requests, legacy attendance tables (note: `activity_sessions`/`break_records` were duplicated here vs. `ActivityMigration.php` — the stale duplicates were removed in Phase 3, real tables live in `ActivityMigration.php`) |
| `ActivityMigration.php` | Activity sessions, activity breaks (login/break tracking — real tables) |
| `BudgetMigration.php` | Company budget, department allocations, member allocations, budget requests/returns, budget audit log |
| `MarketingMigration.php` | Email templates/campaigns/automations, content calendar, social links/clicks/account metrics |
| `SalesMigration.php` | Leads, sales widget tables (leads/deals/commissions — "at a glance" small tables), commissions, sales targets |
| `ItSupportMigration.php` | Tickets, devices (`it_devices` — now also carries the hashed-key/rotation/expiry/revocation columns and the Bridge-status columns, Section 6.4), device logs (`it_device_logs` — now also carries per-upload accepted/rejected/unmapped/source-IP/bridge-id/idempotency-key columns), attendance exceptions |
| `BiometricAttendanceMigration.php` | `it_biometric_punches` (raw ledger, dedupe `UNIQUE KEY (device_id, biometric_user_id, punch_type, punch_time_utc)`), `it_biometric_employee_map` (device↔employee linkage) |
| `DeviceBridgeMigration.php` **(new, 2026-07-17)** | `it_device_import_requests` — the `Idempotency-Key` replay cache for the punch-import endpoint (Section 6.4), 14-day retention, swept opportunistically |
| `FileMigration.php` | Files table (`uploaded_by_id` indexed as of Phase 6) |
| `CrossCuttingMigration.php` | Notifications, email queue, audit logs, security audit logs, conversations, company settings, departments |
| `ForeignKeyMigration.php` | Real `ALTER TABLE ... ADD CONSTRAINT` FK pass — 10 genuine parent-child relationships (invoice_items→invoices CASCADE, tasks.project_id→projects SET NULL, etc.), applied after all `dbDelta` migrations. Not part of `Migrator::migrations()`'s array — invoked directly, see 7.1. |

### 7.3 Cross-Cutting Schema Conventions

- **Soft delete:** opt-in via `AbstractRepository::$softDeletes = true`, applied to `clients`, `projects`, `tasks`, `invoices` (the 4 highest-value tables). `delete()` stamps `deleted_at`/`deleted_by` instead of a real `DELETE` for these; every other table is still a hard delete.
- **Audit columns:** `created_by`/`updated_by` added where missing (Phase 3) — always server-stamped from the authenticated caller, never trusted from the request body.
- **Indexes:** added incrementally across Phases 3, 6, 8 wherever a repository filters/sorts by an un-indexed column (`tasks.assignee_id`, `budget_audit.department`, `commissions.invoice_id`/`project_id`, `notifications.(user_id, created_at)`, `audit_logs.department`, `deleted_at` on the 4 soft-delete tables, `files.uploaded_by_id`).
- **No multi-tenancy:** confirmed genuinely single-tenant — no `organization_id` in JWT claims, `CompanySettingsRepository` is a hardcoded singleton row. `OrganizationRoutes.php`/`SubscriptionRoutes.php` exist as unscoped listings (not a gap, a deliberate scope boundary — this app runs one company, not many tenants).
- **Runaway-query safety net (Phase 6):** `AbstractRepository::list()` applies a generous default `LIMIT` (1000, overridable) whenever a caller doesn't opt into real pagination — protects `tasks`, `clients`, `projects`, `audit_logs`, and others from ever fully materializing as tables grow, without changing behavior at today's realistic row counts.
- **Hashed-secret-at-rest pattern (2026-07-17):** `it_devices.api_key_hash` (SHA-256, via `helpers/DeviceKeyHasher.php`) is the first table in the schema to store only a hash of a shared secret rather than the plaintext — the legacy `it_devices.api_key` plaintext column is kept (additive-only migrations never drop a column) but is no longer written or read by application code. Precedent for any future device/API-key/webhook-secret table.

### 7.4 Known Schema-Level Gap

`users_mapping.department_id` stores a fixed 6-value slug string (`dept-sales`, `dept-marketing`, etc. — see `helpers/DepartmentMapper.php`), **not a foreign key into the real `departments` table** (UUID-keyed, `repositories/DepartmentRepository.php`, managed via `Admin/Departments.tsx`). These are two disconnected systems — see Section 13, C2.

---

<a name="section-8"></a>
## SECTION 8 — REST API REFERENCE

### 8.1 Response Envelope (every endpoint, always)

```typescript
interface SaasApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;   // present only when pagination was requested
  details?: unknown;                 // present only on validation errors (422)
}
```

Status codes used consistently: 200/201 success, 401 unauthenticated, 403 forbidden, 404 not found, 422 validation error, 429 rate-limited (Phase 7), 500 uncaught exception (message always generic — `ErrorBoundaryMiddleware` logs the real detail server-side only).

### 8.2 Pagination / Sort / Search (opt-in, Phase 2)

Any `list()` call can accept `?page=&perPage=&sortBy=&sortDir=&q=`. `sortBy` is whitelisted against a per-resource server-defined filter-column map (never raw client input reaching `ORDER BY` — this is also why the codebase has zero dynamic-SQL-injection findings on sort columns, verified fresh in Phase 8). When pagination isn't requested, the response is unpaginated (backward-compatible) but still capped by the Section 7.3 safety-net limit.

### 8.3 Route Files → Frontend Service Map

39 route files register all endpoints under `/wp-json/saas/v1/*`. Selected high-traffic mappings:

| Route file | Frontend service | Resource |
|---|---|---|
| `AuthRoutes.php` | `authService.ts` | login, session, logout, logout-all, refresh, change-password, request-reset, confirm-reset |
| `ProfileRoutes.php` | `userService.ts` | employee/user CRUD |
| `ClientRoutes.php` | `clientService.ts` | client CRUD, client-role self-scoping via `ClientScopeMiddleware` |
| `ProjectRoutes.php` | `projectService.ts` | project CRUD |
| `TaskRoutes.php` | `taskService.ts` | task CRUD |
| `InvoiceRoutes.php`, `PaymentRoutes.php`, `StripeRoutes.php` | `invoiceService.ts`, Stripe Elements | billing + real Stripe PaymentIntent flow |
| `FileRoutes.php` | `fileService.ts` | file list/create/delete — dual-path create (real multipart upload via `UploadService`, or JSON-metadata-only for the current frontend contract) |
| `NotificationRoutes.php` + `NotificationStreamController.php` | `notificationService.ts`, `useSSE.ts` | CRUD + SSE stream |
| `AuditLogRoutes.php`, `SecurityAuditLogRoutes.php` | `auditLogService.ts` | two independent logs (see Section 5) |
| `PayrollRoutes.php`, `EmployeeExtraRoutes.php` | `payrollService.ts` | payroll/salary slip/advance-salary |
| `LeaveRequestRoutes.php`, `AttendanceRoutes.php`, `ActivityRoutes.php` | HR/attendance services | leave, attendance, login/break session tracking |
| `BudgetRoutes.php` | `budgetService.ts` | company/department/member budget + requests |
| `EmailMarketingRoutes.php` | `useEmailMarketing.ts` | templates/campaigns/audience CRUD only — **no send endpoint exists** |
| `LeadRoutes.php`, `SalesOpsRoutes.php`, `SalesWidgetRoutes.php`, `CommissionRoutes.php` | Sales services | leads, targets/tasks, small "at-a-glance" widgets, commissions (manual entry) |
| `ItSupportRoutes.php` | `itSupportService.ts` (`DeviceService`, `ITTicketService`, etc.) | tickets, devices, device logs, attendance exceptions, `POST /it/devices/{id}/generate-api-key` (super_admin/it_admin only — Section 12.8), `.../rotate-key`, `.../revoke-key` |
| `BiometricAttendanceRoutes.php` **(2026-07-17)** | `itSupportService.ts` (`DeviceService`) | `POST /it/devices/{id}/punches/import` — device-key auth, the primary Bridge-push ingestion endpoint (Section 6.4); `.../punches/reprocess` (RBAC, re-aggregate without touching hardware); legacy `.../test-connection` + `.../live-sync` (RBAC, real TCP — disabled unless LAN-sync opt-in is on); `/it/punches/list`, `/it/biometric-mapping/*` |
| `ConversationRoutes.php` | `conversationService.ts` | client messaging (sales roles excluded) |
| `DepartmentRoutes.php`, `CompanySettingsRoutes.php` | `departmentService.ts`, `companySettingsService.ts` | org config |

---

<a name="section-9"></a>
## SECTION 9 — STATE MANAGEMENT (FRONTEND)

React Context API exclusively — no Redux/Zustand.

Composed in `src/main.tsx` (not inside `App.tsx` itself — `<App/>` is the innermost element the provider chain wraps; `<Router>`/`<AppLayout>` are composed inside `App.tsx`, re-verified 2026-07-17):

```
main.tsx:
  <ToastProvider>
    └── <AuthProvider>
          └── <ActivityProvider>
                └── <ThemeProvider>
                      └── <AppWrapper>       (react-helmet-async)
                            └── <App/>
                                  ├── <Router>
                                  │     └── <AppLayout>
                                  │           └── [page components]
                                  └── (SidebarContext's provider lives lower, inside AppLayout — not part of this top-level chain)
```

All 5 contexts (`AuthContext`, `ActivityContext`, `ToastContext`, `ThemeContext`, `SidebarContext`) memoize their `value` object and handler functions (`useMemo`/`useCallback`) as of Phase 4 — an unrelated re-render (e.g. the activity poll) no longer cascades through every consumer.

**AuthContext** — holds `user: User | null` (restored via `AuthService.getSession()` against the HttpOnly cookie, never `localStorage`), exposes `login/logout/register/updateProfile` plus the RBAC shorthand methods (`canView/canCreate/canEdit/canDelete/canExport/canApprove/canAssign`, all backed by `hasPermissionScoped`).

**Real-time notifications:** `useSSE.ts` connects to `/saas/v1/notifications/stream`, dispatches a `saas:notification` DOM event on receipt, reconnects with exponential backoff (timer properly tracked/cleared as of Phase 4's memory-leak fixes). Cross-tab sync via `BroadcastChannel` + a `storage` event fallback.

---

<a name="section-10"></a>
## SECTION 10 — WORKFLOW DOCUMENTATION

### 10.1 Lead → Client → Project → Invoice → Payment (real, verified end-to-end)

Lead capture/progression (Sales) → conversion to client (duplicate-email checked server-side) → project creation (client-scoped) → team assignment → task creation (department-scoped assignee picker) → deliverable submission (5-stage: Pending → In Progress → Review [member ceiling] → Approved → Delivered [admin only]) → invoice generation (auto-numbered) → **real Stripe payment** (PaymentIntent created + verified server-side against outstanding balance, wrapped in a DB transaction; re-confirmed genuinely fixed in Phase 8, no trace of the old client-side fake-confirm bug) → client views invoice (scoped to own `clientId`).

### 10.2 Employee → Attendance → Leave → Payroll (real, consistent)

Onboarding (`ProfileController::create()`) → daily attendance / login-break session tracking (`ActivityRepository`, server-enforced daily break limits) → leave request/review → **payroll calculation**, single source of truth in `src/domain/payroll/calculations.ts` (net = basic − deductions, no allowances/bonuses per the 2026-07-02 standardization), imported consistently by every payroll-touching page, with a matching server-side invariant (`netSalary ≤ basicSalary`, never negative) rejecting any forged/buggy slip.

**Known break in this chain:** employee↔department assignment (Section 13, C2) — an admin creating an employee cannot reliably place them in the department the admin actually manages.

### 10.3 Files → Revisions → Client Portal

4-step upload modal (client → project+description → visibility → file) → `UploadService::handleUpload()` (MIME allow-list + 25MB cap + magic-byte content-sniff, Phase 7) → visibility enum stored (`private`/`department`/`specific`/`project-team`/`client`) → client submits/tracks revision requests → production reviews (own assigned projects only, for members) → management oversight (all revisions).

**Known break:** the visibility enum is stored but never enforced on read (Section 13, H5) — every internal role with `files:VIEW` sees every file today regardless of the selected visibility.

### 10.4 What's NOT a real workflow yet (see Section 13 for full detail)

Budget "used" tracking, sales commission calculation, email campaign sending, and the automation-rules feature are all present in the UI but do not perform the real business action their name implies — each is documented individually in Section 13 rather than described here as if functioning.

---

<a name="section-11"></a>
## SECTION 11 — FILE MANAGEMENT SYSTEM

### 11.1 Upload Path

`FileRoutes.php`'s `POST /files/create` handles two shapes: a real `multipart/form-data` upload (routed through `UploadService::handleUpload()`, backed by a real WP Media Library attachment) or the current frontend's JSON-metadata-only contract (`src/hooks/useFiles.ts` — no real file bytes leave the browser today, just a client-side `blob:` URL + metadata, routed through `FileRepository::create()` directly). Both paths exist in the same endpoint; only the multipart one has real server-side file storage behind it.

### 11.2 Upload Hardening (Phase 7)

- 25MB application-level size cap, checked before `wp_handle_upload()`.
- Explicit MIME allow-list (`UploadService::ALLOWED_MIMES`) — images, PDF, Office docs, csv/txt, zip. Deliberately excludes `.svg` (script-injection risk) and everything else WP core's broader default allow-list would otherwise permit.
- Independent post-upload content sniff (`finfo_open(FILEINFO_MIME_TYPE)` against the actual bytes on disk) — rejects and deletes the file if its real content doesn't match the claimed/allowed type, catching what `wp_handle_upload()`'s own check might miss.
- Filename sanitization via WP core's `sanitize_file_name(basename(...))` — adequate against path traversal, verified in Phase 7.

### 11.3 Visibility Model (designed, not enforced — see C13/H5)

| Level | Intended audience |
|---|---|
| `private` | uploader only |
| `department` | all members of `uploaderDept` |
| `specific` | explicit `visibleTo[]` user-ID list |
| `project-team` | all `project.assignedTo[]` members |
| `client` | the matching client (`clientId === user.id`) |

`FileRoutes.php`'s list endpoint only enforces `client_id` scoping for the `client` role — no code path filters by `visibility`/`visibleTo` for any internal role. This is a documented, unfixed gap (Phase 8 H5), not a design choice.

---

<a name="section-12"></a>
## SECTION 12 — SECURITY MODEL

Full detail in `PHASE7_SECURITY_REPORT.md`; summary of current state:

### 12.1 Authentication

- **JWT** (HS256, `firebase/php-jwt`) in an **HttpOnly, Secure, SameSite=None** cookie (`optivax_at`) — never an `Authorization` header, never `localStorage`. 15-minute access-token TTL. Secret: random, generated once, persisted in `wp_options` (no rotation mechanism — a documented, accepted limitation).
- **Refresh token:** a random string, only its SHA-256 hash stored server-side (`refresh_tokens` table), rotated on every use. **Reuse detection** (Phase 7): presenting an already-rotated token is now distinguished from an unknown/expired one and treated as a theft signal — revokes every session for that user, not just the one request.
- **Session revocation on logout is real** — `token_version` is bumped server-side, immediately invalidating every previously-issued access token (not just client-side cookie deletion).
- **Self-role-escalation guard:** `ProfileController.php`'s self-update path unconditionally strips `role`/`departmentId`/`status` from the request body before any DB write when a user updates their own profile.
- **Password policy** (Phase 7): minimum 8 characters, must contain a letter and a number, rejected against a common-password blocklist. Applies to both change-password and reset-confirm.

### 12.2 CSRF (Phase 7 — closed a real Critical gap)

Double-submit-cookie pattern: a non-HttpOnly `optivax_csrf` cookie is issued alongside the access-token cookie; every state-changing (`POST`/`PUT`/`PATCH`/`DELETE`) request to an authenticated cookie session must carry a matching `X-CSRF-Token` header (`middleware/CsrfMiddleware.php`, hooked before the error boundary). The frontend's single shared `api` object (`src/lib/client.ts`) attaches this automatically on every mutating call — coverage is comprehensive by construction, since `fetch()` is called nowhere else in `src/`.

### 12.3 Rate Limiting / Brute Force (Phase 7)

Transient-backed dual limiter (`helpers/RateLimiter.php`) on login (5 failed/IP+account/15min, 20 failed/IP/15min) and password-reset-request (3/IP+account/hour, 10/IP/hour). Both return `429` with a `retryAfterSeconds` detail.

### 12.4 CORS & Headers

Real origin allow-list (never `*`), read from a WP admin setting (`optivax_erp_allowed_origins`) — correctly paired with `Access-Control-Allow-Credentials: true` only inside the matched-origin branch. API responses carry `X-Content-Type-Options`, `X-Frame-Options: DENY`, a strict `default-src 'none'` CSP, `Referrer-Policy`, `Permissions-Policy`, and conditional HSTS. The deployed SPA (`vercel.json`) separately carries its own header set + CSP (`script-src 'self'` with no `unsafe-inline` — the one inline script `index.html` used to have was moved to `public/theme-init.js` specifically to keep this strict).

### 12.5 RBAC

See Section 3.3 — the mechanism (`authorizeScoped()`) is real and correctly designed, but is **not actually used** by most controllers (Phase 1 hand-fixed 9 specific ownership gaps; Phase 8 confirmed the general mechanism itself remains unwired everywhere else). This is the single largest open security-adjacent finding as of this document's date.

### 12.6 Injection / XSS / Path Traversal — verified clean (re-confirmed fresh, Phase 7 and 8)

Zero SQL injection found across every repository spot-checked in both phases (all queries parameterized via `$wpdb->prepare()`; the one client-influenced `ORDER BY` path is column-whitelisted). Zero `dangerouslySetInnerHTML` in the frontend; all 5 mail templates escape every interpolated variable. No endpoint accepts a client-supplied filesystem path.

### 12.7 Audit Logging — two systems, different maturity

`SecurityAuditLog` (auth-domain events — login/logout/password-change/reset/user-lifecycle/role-department-changes, plus Phase 7's new `login_rate_limited`/`csrf_check_failed`/`refresh_token_reuse_detected`) is thoroughly, correctly server-triggered. The general `AuditLog` (business actions — client/project/invoice/etc. changes) is **entirely client-triggered** (`AuditLogService.add()` called from the frontend as a side effect) — a malicious or simply-buggy client can skip logging entirely; confirmed in Phase 8 that zero export/download actions anywhere actually call it despite being RBAC-gated as sensitive.

### 12.8 Device / Bridge Authentication (added 2026-07-17)

The one headless, non-browser endpoint in this plugin — a biometric device's Local Bridge Application posting punches — has no cookie session and no CSRF token to present, so it uses a separate, webhook-style shared-secret scheme instead of the JWT/RBAC model above:

- **Hashed at rest, never plaintext.** `DeviceApiKeyMiddleware` compares `hash('sha256', $providedKey)` (`helpers/DeviceKeyHasher.php`) against `it_devices.api_key_hash` via `hash_equals()` (timing-safe). The legacy plaintext `api_key` column still exists (additive-only schema) but is no longer written or read.
- **One-time reveal.** A key's plaintext value exists in an HTTP response exactly once — at generation (`POST /it/devices/{id}/generate-api-key`) or rotation (`.../rotate-key`) — and is never recoverable from any `GET`/list endpoint afterward (`ItDeviceRepository::toDto()` always returns `apiKey: null`; only `create()`/`rotateApiKey()` overlay the real value onto that one response).
- **Cryptographically secure, ≥64 characters.** `random_bytes(40)` → 80 hex characters (`DeviceKeyHasher::generate()`), comfortably clearing the 64-character minimum.
- **Expiry + revocation enforced.** `api_key_expires_at`/`api_key_revoked_at` are checked on every authenticated request; a Bridge presenting an expired or revoked key gets a `403` with an explicit remediation message, not a generic auth failure.
- **Every auth failure is audit-logged and rate-limited** — unknown device, wrong key, revoked, expired: all write a `device_key_auth_failed` row to `SecurityAuditLog` (previously this endpoint had zero audit trail on failure) and count against a dual per-device + per-IP `RateLimiter` bucket.
- **RBAC for key management is narrower than the general `it_support` domain.** The generic `/rotate-key`/`/revoke-key` routes are gated by the normal `it_support` EDIT permission (which includes `it_member`); the newer, UI-facing `/generate-api-key` route (backing the Devices.tsx "Generate/Rotate API Key" buttons) hand-checks the caller's role directly against `['super_admin', 'it_admin']` — `it_member` cannot issue or rotate a device credential, only view its masked last-4 characters. This is a deliberate exception to the domain/action RBAC matrix (Section 3), since that matrix has no way to express a narrower-than-domain role restriction for one specific action.
- **Backward-compatible by construction.** A one-time migration backfill (`Migrator::backfillDeviceApiKeyHashes()`, Section 6.4) hashes every pre-existing plaintext key on the first deploy after this change, so no already-configured device/Bridge is locked out.

---

<a name="section-13"></a>
## SECTION 13 — KNOWN GAPS & PRODUCTION READINESS

**Final Score (Phase 8, 2026-07-11): 61/100 — not recomputed as of this revision (2026-07-17).** The work since Phase 8 (Sections 6.4, 12.8) was additive security/architecture hardening on the biometric subsystem, not a fix pass against the Phase 8 checklist, so the score is carried forward unchanged rather than re-derived without doing the full audit again. Full original detail, risk table, and remediation guidance in `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md`. Summary of open items, with two re-verified 2026-07-17:

### Critical (block production deploy)
- **C1 — Deployment zips are stale**, predate the Phase 7 security fixes entirely (not re-checked this pass — status unknown, assume still stale until re-verified). Must be regenerated before any deploy (commands in the Phase 8 report).
- **C2 — Employee↔department assignment is broken**: two disconnected department systems (Section 7.4). Confirmed live as of Phase 8, matches a user-reported bug; not re-checked this pass.
- **C3 — RBAC's `authorizeScoped()` mechanism is unused** (Section 3.3/12.5) — **re-verified 2026-07-17: still true, `authorizeScoped()` has zero call sites anywhere.** The specific example this finding originally cited (`CommissionController.php` cross-department editing) is **no longer reproducible as described** — that controller now has its own hand-rolled `ensureSameDepartment()` ownership check (Section 3.3). The underlying architectural gap (no systematic scoping mechanism, ad hoc per-controller instead) is unchanged; controllers beyond Budget/Commission were not re-audited, so equivalent exposure elsewhere is plausible but unconfirmed either way.
- **C4 — `Production/Deliverables.tsx`** has no loading state and no error handling at all — a failed fetch is indistinguishable from an empty list. Not re-checked this pass.
- **C5 — `Common/Reports.tsx` is 100% mock data**, no backend exists for it at all. Not re-checked this pass.

### High
- 5 more pages with the same silent-empty-on-error pattern as C4 (Sales/SalesTargets, Sales/TeamPerformance, ITSupport/Devices, ITSupport/AttendanceReports, ITSupport/AttendanceDashboard) — not re-checked this pass; ITSupport/Devices.tsx did gain real loading/error handling for its new API-key flows specifically (toasts on failure), but its original fetch-list error path was not re-audited. `Production/MyClients.tsx` has an infinite-spinner bug on fetch failure (not re-checked); email campaigns cannot send (H3, not re-checked); **Budget `usedAmount` is permanently frozen at zero (H4) — re-confirmed 2026-07-17**, still a straight client-supplied delete+reinsert (`BudgetMemberRepository::replaceAll()`), nothing queries real invoices/payments to derive it; file visibility is unenforced (H5, Section 11.3, not re-checked).

### Medium
- Commission auto-calculation missing (manual-only); automation feature is a UI-only toggle with zero backend enforcement; notifications aren't server-triggered by real business events; one payroll write endpoint (`bulkSaveAdvanceRequests`) has no scoping (likely intentional, needs confirmation); ~15 dead frontend files Phase 6's sweep missed; 16 ESLint errors (individually triaged — mostly benign defensive empty-catch blocks + unused imports); 2 unused dependencies (`react-dropzone`, `@types/deno`, **re-confirmed absent from package.json 2026-07-17**); a stray scratch file in the plugin source tree. (All not re-checked this pass except where noted.)

### Minor
- Cosmetic ESLint findings, 8 missing-hook-dependency warnings, one menu-link gap (it_member → `/it/reports`), a few unnecessary `as any` casts, two self-documented intentional stubs (`LeadController::convert()`, notification business-event triggers explicitly deferred).
- **New (2026-07-17):** the plugin bootstrap file's own docblock header still reads `Version: 2.0.0-phase2a` while the `OPTIVAX_ERP_VERSION` constant two lines below it reads `2.6.0-bridge-ready` — cosmetic version-string drift, no functional effect (Section 6.1).

### Verified solid (do not re-flag without new evidence)
Stripe payment flow, payroll calculation consistency, Projects/Tasks/Clients/Attendance core CRUD, REST API structural integrity (zero duplicate routes, all callbacks resolve), database schema/migration integrity, `npm audit` (0 vulnerabilities), TypeScript build (clean). **Added 2026-07-17:** device/Bridge API-key hashing (never plaintext at rest, one-time reveal, expiry/revocation enforced, audit-logged failures — Section 12.8); `tsc -b` and `php -l` both clean across all files touched by the Bridge-Ready refactor and the Generate/Rotate API Key feature; verified by direct tool-call record (not just diff) that the refactor touched nothing in the attendance-aggregation/payroll/reports consumption path (Section 6.4).

---

<a name="section-14"></a>
## SECTION 14 — BUILD, PERFORMANCE & DEPLOYMENT

### 14.1 Build

```bash
npm ci
npm run build      # tsc -b && vite build → dist/
npm run build:wp   # build + sync dist/ → wordpress-theme/optivax-react-theme/build/
```

Production `dist/` is **3.3MB** (down from 11MB pre-Phase-6 — 7.3MB of unused TailAdmin template demo images and 12 unused npm dependencies were removed; see `PHASE6_PERFORMANCE_REPORT.md`). Route-level code-splitting means every page ships its own chunk; `vendor-charts` (apexcharts) and `vendor-react` are the only manually-grouped vendor chunks.

### 14.2 Deployment Paths

Either (a) a standalone SPA deploy (Vercel — `vercel.json` has the SPA rewrite + full security-header/CSP config), or (b) synced into the WordPress theme (`npm run build:wp`) for a theme-embedded deploy. The WordPress plugin (`wordpress-backend/optivax-erp-backend/`) is packaged and deployed separately (zip → WP Admin/WP-CLI install).

### 14.3 Environment Configuration

`VITE_API_URL` must be set to the real backend origin before any production build — `.env.production` is deliberately left empty (safe default) rather than pointing at a placeholder, and `src/config/environment.ts` logs a loud console error if a production build ever resolves to `localhost`. The WP admin's `optivax_erp_allowed_origins` setting must list the real frontend origin(s) for CORS to function (a runtime DB option, not visible from source — verify in the live admin).

### 14.4 Verification Gap (standing, called out explicitly in Phase 8)

No phase to date has run any backend PHP change against a live WordPress+MySQL instance — every backend change across all 8 audit phases, plus the 2026-07-17 Bridge-Ready/device-key work, has been `php -l` syntax-checked only (frontend changes were additionally `tsc -b` type-checked). Staging verification is a hard prerequisite before any production deploy, called out in the Phase 8 Deployment Checklist — this now also specifically includes a real Local Bridge Application round-trip against `POST /it/devices/{deviceId}/punches/import` and the Settings → OptiVax ERP checkbox save behavior (Section 6.4), neither of which has been exercised against a live instance either.

### 14.5 Frontend Deployment Ambiguity (open question, 2026-07-17)

Two deployment paths coexist in this repo (14.2) and it is **not established in this document which one the live production site actually uses** — `vercel.json` (with a full SPA/CSP header config) suggests a standalone Vercel deployment, and a prior security audit referred to it as "the deployed SPA," but `wordpress-theme/optivax-react-theme/` + `npm run build:wp` also exist as a working alternative (build synced into a WP theme, same-origin with the backend). Whichever is true changes where a frontend-only change (like the Devices.tsx API-key UI) needs to be deployed. Confirm against the live site before assuming either.

---

<a name="section-15"></a>
## SECTION 15 — AUDIT HISTORY

| Phase | Date | Focus | Report |
|---|---|---|---|
| 1 | 2026-07-10 | Security/RBAC hardening — 9 ownership-check gaps fixed | `PHASE1_SECURITY_RBAC_REPORT.md` |
| 2 | 2026-07-10 | REST API audit — pagination/sort/search + global error boundary added | `PHASE2_API_AUDIT_REPORT.md` |
| 3 | 2026-07-10 | Database audit — schema-upgrade path, FK constraints, soft-delete, 2 N+1 fixes | `PHASE3_DATABASE_AUDIT_REPORT.md` |
| 4 | 2026-07-10 | Frontend audit — code-splitting, loading states, memoization, memory leaks | `PHASE4_FRONTEND_AUDIT_REPORT.md` |
| 5 | 2026-07-10 | Business logic audit — 8 workflow bugs fixed, 5 feature gaps documented | `PHASE5_BUSINESS_LOGIC_AUDIT_REPORT.md` |
| 6 | 2026-07-10 | Performance audit — dead code/deps removed (11MB→3.3MB dist), 3rd N+1 fixed | `PHASE6_PERFORMANCE_REPORT.md` |
| 7 | 2026-07-11 | Production security audit — CSRF (Critical), rate limiting, upload hardening | `PHASE7_SECURITY_REPORT.md` |
| 8 | 2026-07-11 | Final production audit — Score 61/100, 5 Critical/5 High/9 Medium/5 Minor findings | `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md` |

Earlier module-specific work (pre-dating the numbered phase series): Payroll Standardization, Client Ownership Module, Activity Tracking Module (all 2026-07-02/03) — still accurate, referenced above where relevant.

### 15.1 Post-Phase-8 Feature Work (not numbered phase audits — no standalone report file)

| Date | Work | Where documented |
|---|---|---|
| 2026-07-17 | **Bridge-Ready biometric architecture refactor** — deprecated direct ERP→device TCP sync (opt-in-only now, off by default), hardened the Bridge-push punch-import endpoint (rate limiting, payload caps, idempotency keys, future-timestamp rejection, richer response/audit fields) | Section 6.4 of this document |
| 2026-07-17 | **Device API-key hardening + Generate/Rotate API Key UI** — SHA-256 hashing at rest (was plaintext), ≥64-char cryptographically secure generation, one-time reveal, expiry/revocation, dedicated super_admin/it_admin-only endpoint, IT Support → Devices page UI (confirm dialog → one-time reveal dialog with copy) | Sections 5, 12.8 of this document |
| 2026-07-17 | **This document's own refresh** — every count/claim in Sections 3.3, 5, 6, 7, 8, 9, 13 re-verified directly against source (not carried forward from Phase 8 unchanged); several stale figures corrected (page count, file/table counts, DB version, the `authorizeScoped()`/CommissionController finding) | This revision, throughout |

---

<a name="section-16"></a>
## SECTION 16 — FINAL SUMMARY

OptiVax Global has moved from a fully-mocked, in-browser prototype (v1.0 of this document) to a real WordPress+MySQL backend with a genuinely hardened security posture (Phase 7 closed a real Critical CSRF gap; brute-force, upload, and header hardening are all real and verified) and a lean, optimized frontend build (Phase 6). Core CRUD across Projects/Tasks/Clients/Attendance/Payroll is solid and consistently implemented. Real Stripe payments work end-to-end.

Since Phase 8, the biometric-attendance subsystem was re-architected for the platform's actual hosting reality: shared hosting cannot reach a device on an office LAN, so the ERP no longer tries — it's now a pure REST receiver, with device credentials hashed at rest for the first time anywhere in this schema (Section 6.4, 12.8). This work also served as this document's first post-Phase-8 fact-check: several figures had drifted (page/file/table counts, DB version) and one Critical finding (C3) needed a real correction rather than a blind carry-forward — the specific Commission cross-department example it cited turned out to already be mitigated, though the general RBAC-scoping gap it points at is still real and unaddressed.

What remains before a clean production deploy: regenerating stale deployment artifacts, resolving the employee-department data-integrity bug, generalizing the RBAC scoping mechanism that today only protects the endpoints Phase 1 and this revision's Commission/Budget spot-checks specifically visited, confirming which of the two frontend deployment paths (Section 14.5) is actually live, and being honest with users about which features are fully real (most of them) versus still cosmetic (Reports, Budget utilization tracking, commission auto-calc, email campaign sending, automation rules). None of these require a re-architecture — they're bounded, well-understood pieces of work, detailed with file:line precision in `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md` and, for the newer subsystem, in Section 6.4 of this document.
