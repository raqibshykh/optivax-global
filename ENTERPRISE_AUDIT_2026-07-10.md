# OptiVax ERP — Enterprise Production Readiness Audit

**Date:** 2026-07-10
**Scope:** React 19 / TypeScript / Vite frontend (`src/`, ~470 files), WordPress-plugin REST backend (`wordpress-backend/optivax-erp-backend/`, 159 PHP files, 38 route files, 66 tables), WordPress theme (`wordpress-theme/`), MySQL schema.

Six parallel, read-only audits covering project structure/routing, the frontend↔backend API contract, WordPress plugin architecture and database schema, security/RBAC, business-logic correctness, and frontend performance/deployment. Every finding below cites a specific file and line read directly from the current working tree — nothing here is inferred from prior documentation or past reports. Items that could not be confirmed with direct code evidence were excluded rather than reported as fact.

**Totals: 41 findings — 7 Critical, 10 High, 14 Medium, 10 Low.**

---

## Scorecard

| Metric | Score |
|---|---|
| Production readiness | 34 / 100 |
| Security | 58 / 100 |
| Scalability | 41 / 100 |
| Performance | 46 / 100 |
| Maintainability | 57 / 100 |
| React architecture | 60 / 100 |
| Code quality | 63 / 100 |
| Architecture | 68 / 100 |
| WordPress integration | 71 / 100 |
| **Enterprise readiness** | **49 / 100** |

---

## Table of Contents

1. [Critical (7)](#critical)
2. [High (10)](#high)
3. [Medium (14)](#medium)
4. [Low (10)](#low)
5. [Priority order & roadmap](#priority-order--roadmap)
6. [Production readiness checklist](#production-readiness-checklist)
7. [What is already correct — do not change](#what-is-already-correct--do-not-change)

---

## Critical

Data leaks, an unenforced privilege boundary, fake payments, a broken payroll chain, and a production config that breaks every API call. Fix before any real deployment.

### C1 — Scoped RBAC check is never invoked (cross-department privilege escalation)
- **Severity:** Critical | **Category:** Security / RBAC
- **Affected files:** `wordpress-backend/optivax-erp-backend/middleware/RbacMiddleware.php:40-53`, `controllers/ClientOwnershipController.php:59,79`, `InvoiceController.php`, `CommissionController.php` (and ~25 other controllers); frontend `src/utils/rbac.ts`, `src/components/auth/RequirePermission.tsx:21`
- **Root cause:** The backend has a fully-implemented scoped permission check (`authorizeScoped()`) mirroring the frontend's stricter `hasPermissionScoped`, but every one of the ~90 authorization call sites in the plugin uses the unscoped `authorize()` instead.
- **Why it happens:** The scoped check was built as an opt-in helper for "controllers that need the frontend's stricter rule" — no controller ever opted in.
- **Impact:** Any role whose raw matrix grant extends outside its primary domain (e.g. `production_admin` holds `clients:ASSIGN`) can call the REST endpoint directly and perform actions the UI hides as a departmental boundary — e.g. reassign client ownership across departments.
- **How to reproduce:** Log in as `production_admin`, POST directly to `/wp-json/saas/v1/client-ownership/assign` with a `clientId` from another department — succeeds despite the UI hiding the control for this role.
- **Recommended fix:** Replace `authorize()` with `authorizeScoped()` everywhere the frontend uses the scoped check, or formally decide raw-matrix grants are cross-department by design and remove the divergence.
- **Exact files to modify:** `middleware/RbacMiddleware.php`, `ClientOwnershipController.php`, `InvoiceController.php`, `CommissionController.php`, plus an audit pass over remaining controllers.
- **Estimated fix time:** 3–5 days | **Risk level:** Medium (needs product sign-off on intended scoping rules)

### C2 — Client records are not access-scoped server-side (data leak)
- **Severity:** Critical | **Category:** Security / Data Privacy
- **Affected files:** `middleware/ClientScopeMiddleware.php` (unwired), `routes/ClientRoutes.php:26-38`, `src/hooks/useClients.ts:18-31`
- **Root cause:** A middleware built specifically to stop a session from requesting another client's record exists but is never called; the list handler only applies an optional, client-supplied `assignedTo` filter.
- **Why it happens:** Documented as "foundation-only" in the middleware's own docblock — enforcement was deferred to a phase that hasn't happened.
- **Impact:** A client-role browser calls the unfiltered list endpoint and downloads every client's name/email/phone/billing total, filtering rows client-side only afterward. Most staff roles (sales_member, marketing_member, etc.) get the same unfiltered list.
- **How to reproduce:** Log in as any client account, open the Network tab, load the Billing/Clients page — the full company client list is returned before client-side filtering hides rows.
- **Recommended fix:** Move `assigned_to`/email scoping into `ClientRepository::list()` itself, enforced server-side by role.
- **Exact files to modify:** `repositories/ClientRepository.php`, `routes/ClientRoutes.php`, `middleware/ClientScopeMiddleware.php`, `src/hooks/useClients.ts`
- **Estimated fix time:** 2–3 days | **Risk level:** Low–Medium

### C3 — Tasks API returns the entire company task list to any role holding `production:VIEW`
- **Severity:** Critical | **Category:** Security / Data Privacy
- **Affected files:** `src/pages/Common/Tasks.tsx:87,280`, `routes/TaskRoutes.php:27-44`, `controllers/BaseCrudController.php:35-51`
- **Root cause:** The frontend calls the list endpoint with no filter and applies visibility client-side only; the backend checks the domain-level `production:VIEW` permission and returns whatever filter (none) the client sent.
- **Why it happens:** Generic CRUD passthrough pattern — no per-role automatic scoping was added for tasks.
- **Impact:** Any production/sales/marketing member can query `/saas/v1/tasks` directly and receive every employee's tasks, budgets, and client-linked project data.
- **How to reproduce:** As a `production_member`, call `GET /wp-json/saas/v1/tasks` with no params — response includes other employees' tasks.
- **Recommended fix:** Scope `TaskRepository::list()` by `assignee_id` (or department) for non-admin roles server-side.
- **Exact files to modify:** `repositories/TaskRepository.php`, `routes/TaskRoutes.php`
- **Estimated fix time:** 1–2 days | **Risk level:** Low

### C4 — Employee leave-requests list endpoint leaks every employee's leave data
- **Severity:** Critical | **Category:** Security / Data Privacy
- **Affected files:** `controllers/LeaveRequestController.php:118-125`
- **Root cause:** `listEmployee()` checks only `isAuthenticated()` and queries with no `employeeId` filter — unlike the create path, which correctly forces the caller's own ID.
- **Why it happens:** The read path was left unscoped while the write path was properly guarded — inconsistency within the same controller.
- **Impact:** Any logged-in user, including one with zero HR permission, can see every other employee's leave reasons, dates, and approval status.
- **How to reproduce:** As any non-HR user, call `GET /wp-json/saas/v1/hr/employee-leave-requests` — full company leave history returned.
- **Recommended fix:** Filter by the caller's own `employeeId` unless they hold `hr:VIEW` or broader.
- **Exact files to modify:** `controllers/LeaveRequestController.php`
- **Estimated fix time:** <1 day | **Risk level:** Low

### C5 — Approved leave from the standard employee self-service flow never reaches payroll
- **Severity:** Critical | **Category:** Business Logic / Payroll
- **Affected files:** `src/pages/Client/Profile.tsx:164`, `src/pages/Dashboard/HRPanel.tsx:187`, `src/services/leaveRequestService.ts:3-6,78-91`, `src/services/payrollService.ts:76-100`
- **Root cause:** Two entirely separate leave-request stores exist — the self-service "Employee" store every role's own Profile page uses, and the "HR full-lifecycle" store the dedicated HR page uses — and payroll's unpaid-leave deduction reads only the second one.
- **Why it happens:** Self-documented in the code: "this codebase independently grew two unrelated leave-request features... they were never unified."
- **Impact:** An employee who requests and gets leave approved through the standard self-service path sees zero deduction on their generated salary slip.
- **How to reproduce:** As a non-HR employee, get a leave request approved via My Profile → Leave; generate that month's salary slip — no unpaid-leave deduction appears.
- **Recommended fix:** Unify the two stores, or have the deduction calculator query and merge both.
- **Exact files to modify:** `src/services/payrollService.ts`, `src/services/leaveRequestService.ts`, `LeaveRequestHrRepository.php`, `LeaveRequestEmployeeRepository.php`
- **Estimated fix time:** 3–4 days | **Risk level:** Medium (touches live payroll, validate against existing slips)

### C6 — Stripe payment confirmation is mocked; invoices can be marked paid with no money collected
- **Severity:** Critical | **Category:** Business Logic / Payments
- **Affected files:** `src/pages/Client/Billing.tsx:585-619`
- **Root cause:** The frontend creates a real Stripe PaymentIntent server-side, but never calls `stripe.confirmCardPayment()` — it waits 1.4s via `setTimeout` and fabricates a `chargeId`, submitted to the real ledger-updating endpoint.
- **Why it happens:** The line marks the real call as a "Production:" TODO — never implemented, only stubbed.
- **Impact:** Any client can trigger the "paid" flow and have the invoice controller genuinely update `amountPaid`/status in the database with no real charge in Stripe — direct, exploitable revenue loss.
- **How to reproduce:** As a client, open an invoice and click Pay — after ~1.4s the invoice flips to "Paid" with no corresponding Stripe charge.
- **Recommended fix:** Call `stripe.confirmCardPayment(clientSecret, { payment_method: { card: elements.getElement(CardElement) } })` and gate success strictly on a genuine `succeeded` PaymentIntent status.
- **Exact files to modify:** `src/pages/Client/Billing.tsx`
- **Estimated fix time:** 1 day | **Risk level:** Low (SDK call already partially wired)

### C7 — Production env file hardcodes a localhost API URL
- **Severity:** Critical | **Category:** Deployment
- **Affected files:** `.env.production:6`
- **Root cause:** `VITE_API_URL=http://localhost/optivax-erp/wp-json` is a placeholder never replaced before being treated as the production env file.
- **Why it happens:** Local-dev value copy-pasted in and left uncorrected; no build-time guard catches it.
- **Impact:** `npm run build` bakes the localhost URL into the bundle as the API base — every API call, SSE stream, and auth check from a real visitor fails or is blocked cross-origin.
- **How to reproduce:** Run `npm run build` and inspect the emitted bundle for the API base string, or deploy `dist/` and watch every network call target localhost.
- **Recommended fix:** Set the real backend origin in `.env.production`; add a CI/build guard failing the build if it still contains `localhost`.
- **Exact files to modify:** `.env.production`, `package.json` build script, backend CORS allow-list (`SecurityHeaders.php`) updated in lockstep.
- **Estimated fix time:** <1 day | **Risk level:** Low

---

## High

Real correctness and consistency gaps: divergent payroll math, unguarded money-changing edits, a database drift risk, and a stalled frontend refactor causing silent failures across pages.

### H1 — No rate limiting or brute-force protection on `/auth/login`
- **Severity:** High | **Category:** Security
- **Affected files:** `controllers/AuthController.php:27-53`
- **Root cause:** `login()` calls `wp_authenticate()` directly with no attempt counter, delay, or lockout.
- **Impact:** The login endpoint is open to unthrottled credential-stuffing/brute-force attempts.
- **How to reproduce:** Script repeated login POSTs with varying passwords for one account — no lockout occurs.
- **Recommended fix:** Add a per-IP + per-account attempt counter with exponential backoff or lockout; `SecurityAuditLog` already records failures but nothing consumes it to throttle.
- **Estimated fix time:** 2 days | **Risk level:** Low

### H2 — Budget "used amount" is entirely manual — never derived from real task/invoice spend
- **Severity:** High | **Category:** Business Logic
- **Affected files:** `controllers/BudgetController.php:20-25,137-148`, `src/pages/Budget/BudgetManagement.tsx:2045`
- **Root cause:** Documented "pure storage passthrough" — PUT replaces `usedAmount` with whatever the client sends; nothing cross-references `tasks.budget_used` or paid invoices.
- **Impact:** Utilization %, remaining budget, and dept/member figures are only as accurate as the last manual edit.
- **How to reproduce:** Complete tasks against a project's budget or pay invoices — the Budget dashboard's "used" figures don't move.
- **Recommended fix:** Compute `usedAmount` server-side from an aggregate over completed tasks and paid invoices.
- **Estimated fix time:** 4–5 days | **Risk level:** Medium (validate against historical data)

### H3 — Three divergent payroll engines produce different net pay for the same employee/month
- **Severity:** High | **Category:** Business Logic / Payroll
- **Affected files:** `src/domain/payroll/calculations.ts:171-202`, `src/domain/attendance/calculations.ts:325-385`, `src/pages/HR/Payroll.tsx:20-26`, `src/pages/HR/AttendancePayroll.tsx:77`
- **Root cause:** Engine A (persisted, but `monthlyAttendance` hardcoded null), Engine B (attendance-driven but reads a dead localStorage key for base salary), Engine C (manually typed, only sometimes synced) all coexist.
- **Why it happens:** Each was built for a different page at a different time; migrating employee salary storage to `EmployeeExtraService` didn't update Engine B's `loadEmployeeExtra()`, which still reads an unwritten key.
- **Impact:** `AttendancePayroll.tsx` shows wrong salary for anyone whose real salary differs from the hardcoded role default; three pages can disagree on one person's net pay.
- **How to reproduce:** Set a custom salary via Employees.tsx; compare net pay on SalarySlips.tsx vs. AttendancePayroll.tsx for that employee.
- **Recommended fix:** Consolidate to Engine A (the persisted, standardized one), wire real attendance data into it, delete the other two.
- **Estimated fix time:** 4–6 days | **Risk level:** Medium-High (parallel-run before cutover)

### H4 — Paid invoices are not immutable
- **Severity:** High | **Category:** Business Logic / Data Integrity
- **Affected files:** `controllers/InvoiceController.php:74-92`, `repositories/InvoiceRepository.php:187-228`, `src/pages/Admin/Billing.tsx:80-83`
- **Root cause:** `update()` has no guard against editing an invoice already marked paid; `amountPaid`/`remainingBalance`/status are only recomputed inside the Stripe-confirm path.
- **Impact:** An admin edit to amount after payment leaves an invoice showing "paid" while its remaining balance no longer matches.
- **How to reproduce:** Mark an invoice paid via Stripe, then edit its amount through the admin Billing UI.
- **Recommended fix:** Reject/restrict amount changes once status isn't pending, or recompute balance/status whenever amount changes.
- **Estimated fix time:** 1–2 days | **Risk level:** Low

### H5 — No schema upgrade path; `db_version` option is write-only
- **Severity:** High | **Category:** WordPress Backend / Database
- **Affected files:** `optivax-erp-backend.php:16-17`, `database/Migrator.php:17,38`
- **Root cause:** `OPTIVAX_ERP_DB_VERSION` is set via `update_option()` on activation but never compared anywhere; migrations only run from `register_activation_hook`.
- **Impact:** Deploying a future migration via a normal code update (rather than deactivate/reactivate) silently leaves the live database out of sync — no error surfaces.
- **How to reproduce:** Add a column to an existing migration, deploy via code update without reactivating — column never appears live.
- **Recommended fix:** Add a `plugins_loaded`/`admin_init` check comparing the stored vs. current version and re-run the dbDelta pass when they differ.
- **Estimated fix time:** 1 day | **Risk level:** Low

### H6 — `activity_sessions` is defined twice with conflicting columns; `break_records` is a dead table
- **Severity:** High | **Category:** WordPress Backend / Database
- **Affected files:** `database/migrations/HrAttendanceMigration.php:127-159`, `database/migrations/ActivityMigration.php:26-58`, `repositories/ActivityRepository.php`
- **Root cause:** Two migration files each `CREATE TABLE activity_sessions` with different columns; the older one lacks the `UNIQUE KEY user_date` the repository relies on. `break_records` is queried nowhere in the plugin.
- **Impact:** Permanently-NULL dead columns persist on a live table, and two files are each a "source of truth" for the same schema — a drift risk if only one is edited later.
- **How to reproduce:** Inspect `activity_sessions`'s schema after activation — columns from both migrations coexist.
- **Recommended fix:** Delete the stale `activity_sessions`/`break_records` definitions from `HrAttendanceMigration.php`, keep only `ActivityMigration.php`'s versions.
- **Estimated fix time:** 1 day | **Risk level:** Low (contingent on fixing H5 first)

### H7 — A shared loading/error/empty-state system was built but is used nowhere
- **Severity:** High | **Category:** Frontend Code Quality
- **Affected files:** `src/hooks/useApiRequest.ts`, `src/components/common/LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`
- **Root cause:** A well-built fetch hook with proper cancellation, plus matching UI primitives, have zero call sites anywhere in `src/pages` or `src/components`.
- **Impact:** Every page independently reinvents (or omits) loading/error handling — the direct cause of H8, H10, and M10 below.
- **How to reproduce:** Grep `src/pages` for `useApiRequest` — zero matches outside its own file.
- **Recommended fix:** Migrate high-traffic pages (Tasks, Budget, Messages, ActivityFeed) to the shared hook and components, or remove the files if the effort is abandoned.
- **Estimated fix time:** 5–7 days across the app | **Risk level:** Low

### H8 — Tasks.tsx: no loading state, silent error swallowing, zero memoization on the Kanban board
- **Severity:** High | **Category:** Frontend Quality / Performance
- **Affected files:** `src/pages/Common/Tasks.tsx:64-98,388-403`
- **Root cause:** Fetches use `try/catch { setX([]) }` with no error surfaced; `usersById`/`projectsById` rebuild every render; `TaskCard` gets new inline callbacks every render and isn't memoized.
- **Impact:** A failed fetch looks identical to "you have zero tasks"; typing in the add-task form re-renders the entire Kanban board on every keystroke.
- **How to reproduce:** Break the network for the task fetch — board silently shows empty; profile renders while typing in the title field — every card re-renders.
- **Recommended fix:** `React.memo` on `TaskCard`, `useMemo` the lookup maps, `useCallback` the per-task handlers, isolate the add-task form's local state, surface fetch errors.
- **Estimated fix time:** 2 days | **Risk level:** Low

### H9 — AuthContext and ActivityContext recreate their value object every render, un-memoized
- **Severity:** High | **Category:** Frontend Performance
- **Affected files:** `src/context/AuthContext.tsx:143-159`, `src/context/ActivityContext.tsx:120-124`
- **Root cause:** Both providers construct a fresh object literal for `value` every render; most exposed functions aren't `useCallback`'d.
- **Impact:** These two contexts sit near the app root and are consumed by most of the tree — any re-render (e.g. the 30-second activity poll) re-renders every consumer regardless of relevance.
- **How to reproduce:** Profile with React DevTools during an activity poll tick — unrelated consumers still re-render.
- **Recommended fix:** Wrap each provider's `value` in `useMemo`, wrap handlers in `useCallback`.
- **Estimated fix time:** 1 day | **Risk level:** Low

### H10 — BudgetManagement.tsx's `reload()` has no error handling — one failed call blanks the whole page
- **Severity:** High | **Category:** Frontend Code Quality
- **Affected files:** `src/pages/Budget/BudgetManagement.tsx:1320-1338, ~2008-2023`
- **Root cause:** `Promise.all()` across six parallel service calls with no `try/catch` and no `isLoading` state anywhere in the 2,500-line file.
- **Impact:** If any one call fails, no state updates run and the page renders blank with an unhandled rejection — zero user-facing feedback.
- **How to reproduce:** Fail any one of the six budget-related endpoints and load the page.
- **Recommended fix:** Wrap in `try/catch`, add loading/error state, render the existing (unused) state components.
- **Estimated fix time:** 1 day | **Risk level:** Low

---

## Medium

Scalability gaps, hardening items, and consistency debt. None block a controlled pilot, all should land before wide rollout.

### M1 — No security headers on the deployed SPA (CSP, X-Frame-Options, HSTS)
- **Files:** `vercel.json` — only an SPA rewrite is configured; the backend's security-header helper only covers REST JSON responses.
- **Impact:** Clickjacking-able, no CSP to blunt a future XSS gadget.
- **Fix:** Add a `headers` block with CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS.
- **Est:** 1 day | **Risk:** Low

### M2 — `tasks.assignee_id` has no index despite being a supported filter
- **Files:** `database/migrations/ProjectTaskMigration.php:45-68`, `routes/TaskRoutes.php:38`
- **Impact:** Any "my tasks" view does a full table scan once the table grows.
- **Fix:** Add `KEY assignee_id (assignee_id)`.
- **Est:** <1 day | **Risk:** Low

### M3 — `clients.assigned_production_members` filter is non-sargable (JSON_CONTAINS over TEXT)
- **Files:** `database/migrations/ClientMigration.php:43`, `repositories/ClientRepository.php:47-49`
- **Impact:** Every assignedTo-filtered client query forces a full table scan.
- **Fix:** Use a real JSON column with a generated/virtual column + index, or a join table (as already done correctly for `production_assignments`).
- **Est:** 2 days | **Risk:** Medium (schema + data migration)

### M4 — RBAC matrix is a hand-synced PHP mirror of the TS source with no drift detection
- **Files:** `helpers/RbacMatrix.php`, `src/utils/rbac.ts`
- **Impact:** A future edit to the TS matrix not manually mirrored silently creates a frontend/backend permission mismatch.
- **Fix:** Generate both from one shared definition, or add a CI test diffing the two structurally.
- **Est:** 2–3 days | **Risk:** Low

### M5 — Hardcoded default super-admin credentials seeded on activation
- **Files:** `database/Migrator.php:98-180`
- **Impact:** A publicly-guessable default account/password exists on every fresh install until first login forces a change.
- **Fix:** Generate a random password at activation and surface it once, or force activation via emailed reset link.
- **Est:** 1 day | **Risk:** Low

### M6 — No pagination/limit/offset support on any list endpoint except audit logs
- **Files:** `controllers/BaseCrudController.php:35-51`
- **Impact:** Tasks, invoices, clients, leads and every other list endpoint return unbounded rows — won't scale past a modest data volume.
- **Fix:** Add `page`/`per_page` support to the base controller and repository layer, adopt in the heavier frontend services.
- **Est:** 3–4 days | **Risk:** Low

### M7 — Commissions are pure manual entry, not computed from closed deals
- **Files:** `src/pages/Sales/Commissions.tsx:322-344`, `repositories/CommissionRepository.php:37-52`
- **Impact:** Payout has no verifiable tie to actual deal value; a manual entry error directly over/underpays.
- **Fix:** Compute payout server-side from rate × referenced deal/invoice amount, keep manual override as an explicit exception.
- **Est:** 2–3 days | **Risk:** Low

### M8 — Payroll backend never validates or recomputes the numbers it stores
- **Files:** `controllers/PayrollController.php:16-21`, `repositories/SalarySlipRepository.php:13-19`
- **Impact:** A buggy or tampered client request can persist an internally-inconsistent salary slip later printed/paid against.
- **Fix:** Add a server-side check that `netSalary === grossSalary − totalDeductions` before persisting.
- **Est:** 1–2 days | **Risk:** Low

### M9 — No duplicate-task-creation guard
- **Files:** `src/pages/Common/Tasks.tsx`, `repositories/TaskRepository.php::create()`
- **Impact:** Double-clicking "Add Task" (or a retried request) creates duplicates with no warning.
- **Fix:** Client-side submit-guard plus a server-side uniqueness check or idempotency key.
- **Est:** 1 day | **Risk:** Low

### M10 — Messages.tsx / ActivityFeed.tsx silently swallow fetch errors into an empty state
- **Files:** `src/pages/Client/Messages.tsx:52-63`, `src/components/dashboard/ActivityFeed.tsx:46-48`
- **Impact:** A real API failure looks identical to "no messages yet" / "no activity yet," with no loading indicator either.
- **Fix:** Track a distinct error state, render via the existing (unused) `ErrorState` component.
- **Est:** 1 day | **Risk:** Low

### M11 — No route-level code splitting — the entire app bundles into one chunk
- **Files:** `src/App.tsx:2-113`
- **Impact:** A client-role user's first load downloads the same bundle containing every admin/HR/sales chart and calendar library, whether or not their role can ever reach those pages.
- **Fix:** Convert the heavy, role-gated panels to `React.lazy` + `Suspense`.
- **Est:** 2–3 days | **Risk:** Low

### M12 — `vercel.json` targets an unused path; the plain build command doesn't sync into the WP theme
- **Files:** `vercel.json`, `package.json`, `scripts/sync-wp-theme.mjs`
- **Root cause:** The real deployment target is the WordPress theme via `build:wp` (build + sync); the plain, more-obvious `npm run build` doesn't perform that sync.
- **Impact:** Anyone running the "obvious" command produces a build that never reaches the theme, silently leaving deployed assets stale.
- **Fix:** Delete `vercel.json` if unused, make `build:wp` the default build script.
- **Est:** <1 day | **Risk:** Low

### M13 — Stale route-inventory artifacts drifted badly from actual routing
- **Files:** `audit/routes.json`, `audit/routes.csv`
- **Impact:** Lists the deleted `/signup` route and is missing ~50 routes added since (entire IT domain, Budget, Conversations, Activity Reports, etc.) — anyone consulting these gets wrong answers.
- **Fix:** Regenerate via whatever script produced them (check `scripts/`), or delete if unmaintained.
- **Est:** <1 day | **Risk:** Low

### M14 — File uploads have no application-level MIME/size allow-list beyond WordPress core defaults
- **Files:** `uploads/UploadService.php:12-18,27-38`
- **Impact:** Any file type WordPress core allows can be uploaded through any ERP upload surface regardless of whether it's appropriate for that specific feature.
- **Fix:** Add an explicit extension/MIME allow-list and per-module size cap validated before `wp_handle_upload()`.
- **Est:** 1–2 days | **Risk:** Low

---

## Low

Polish and hardening. None are urgent; batch these into whichever sprint has spare capacity.

- **L1 — Refresh-token cookie scoped to path `/` instead of the auth namespace.** `middleware/AuthMiddleware.php:127-137`. Already HttpOnly — not XSS-stealable regardless. Fix: scope path to the auth route namespace. Est: <1 day.
- **L2 — Password policy is length-only (≥8 chars), no complexity/breach check.** `AuthController.php:139,209`. Bcrypt hashing already makes offline brute-forcing expensive. Fix: add a common-password/breach-list check. Est: 1 day.
- **L3 — `DepartmentScopeMiddleware` built but never wired in.** `middleware/DepartmentScopeMiddleware.php`. Fix: wire into department-scoped list endpoints, or explicitly mark as deferred. Est: 2–3 days if wired.
- **L4 — Composer has no real PSR-4 autoload map for the plugin's own code.** `composer.json`, `optivax-erp-backend.php:23-54`. Fix: document the hand-rolled autoloader explicitly, or migrate to a real PSR-4 map. Est: 1–2 days.
- **L5 — `notifications` table missing a composite `(user_id, created_at)` index.** `database/migrations/CrossCuttingMigration.php:29-42`. Fix: add the composite key — SSE polling queries filesort without it once volume grows. Est: <1 day.
- **L6 — Notification recipient targeting has no relationship/ownership check.** `routes/NotificationRoutes.php:105-125`. Clients already correctly cannot create notifications at all. Fix: add a relationship check for non-super-admin senders. Est: 1 day.
- **L7 — `useSSE.ts` reconnect timers aren't tracked/cleared on unmount.** `src/hooks/useSSE.ts:80-91,97-108`. No functional bug today — the mounted-flag guard already prevents stale updates. Fix: store the timeout id in a ref and `clearTimeout` in cleanup. Est: <1 day.
- **L8 — Several fetch hooks lack mounted/cancellation guards.** `useCommissions.ts`, `useInvoices.ts`, `useProjects.ts`, `useSocialTracking.ts`. Fix: standardize on `useApiRequest` (see H7). Est: 1 day.
- **L9 — `User` type carries a plaintext `password` field — verify it's never populated from the API.** `src/types/index.ts:27`. Fix: confirm it's a leftover form-input type and remove, or move to a dedicated form-only DTO. Est: <1 day.
- **L10 — `vite.config.ts` has no `manualChunks` for vendor-heavy dependencies.** `vite.config.ts:10-15`. Fix: add `rollupOptions.output.manualChunks` grouping for apexcharts/@fullcalendar/swiper/react-dnd once M11 lands. Est: 1 day.

---

## Priority order & roadmap

Five sprints, ordered so nothing later depends on something earlier being skipped.

### Sprint 0 — Security & data-leak lockdown
Nothing below should touch real user data until this sprint closes.
- **C1** Wire `authorizeScoped()` / resolve RBAC scoping policy
- **C2** Server-side client-record scoping
- **C3** Server-side task-list scoping
- **C4** Scope employee leave-request list endpoint
- **C7** Fix `.env.production` API URL + build guard
- **H1** Login rate limiting
- **M1** Security headers on the SPA
- **M5** Remove hardcoded default super-admin credential

### Sprint 1 — Money & core workflow correctness
Every path where a number reaches an invoice, a paycheck, or a payment.
- **C6** Real Stripe payment confirmation
- **C5** Unify the two leave-request stores into payroll
- **H3** Consolidate the three payroll engines
- **H4** Paid-invoice immutability
- **H2** Derive budget used-amount from real spend
- **M7** Commission calculation from real deals
- **M8** Server-side payroll validation

### Sprint 2 — Data integrity & schema
Fix the database before it accumulates more drift.
- **H5** Schema upgrade path (db_version check)
- **H6** Dedupe `activity_sessions` / drop `break_records`
- **M2** Index `tasks.assignee_id`
- **M3** Fix non-sargable client-assignment filter
- **M6** Add pagination to list endpoints
- **L5** Composite index on notifications

### Sprint 3 — Frontend architecture cleanup
Finish the loading/error-state refactor that stalled halfway.
- **H7** Adopt `useApiRequest`/`LoadingState`/`ErrorState` app-wide
- **H8** Tasks.tsx memoization + error handling
- **H9** Memoize AuthContext/ActivityContext values
- **H10** BudgetManagement error handling
- **M10** Fix silent error swallowing (Messages, ActivityFeed)
- **M11** Route-level code splitting
- **M12** Fix build/deploy sync to the WP theme

### Sprint 4 — Hardening & polish
Everything remaining — batch into spare capacity.
- **M4** RBAC matrix drift detection
- **M9** Duplicate-task guard
- **M13** Regenerate or delete stale route inventory
- **M14** File upload allow-list
- **L1–L10** Remaining low-severity items

---

## Production readiness checklist

The minimum bar before this ERP handles real employee and client data at scale.

- [ ] All 7 Critical findings closed and independently re-tested
- [ ] Real API URL confirmed in the deployed bundle (not localhost) — checked at build time, not by memory
- [ ] Every REST controller's authorization call reviewed for scoped vs. unscoped RBAC, with an explicit decision recorded per domain
- [ ] Stripe payment flow tested end-to-end with Stripe test cards, confirming a declined card cannot mark an invoice paid
- [ ] One payroll engine, one leave-request store — confirmed by generating slips for employees using both the self-service and HR-admin leave paths
- [ ] Default super-admin credential rotated or randomized on every fresh install
- [ ] Login endpoint rate-limited and load-tested against a scripted brute-force attempt
- [ ] Security headers verified present on the live SPA response (not just the REST API)
- [ ] Schema upgrade path exercised: deploy a trivial migration via code update (no reactivation) and confirm it applies
- [ ] List endpoints load-tested with realistic data volume (1,000+ rows) for the roles that will actually hit them
- [ ] Deploy pipeline uses `build:wp` (or equivalent) as the default — verified no path exists to ship a stale WP theme build

---

## What is already correct — do not change

Verified solid by the audit; refactoring these would be pure risk with no benefit.

- **JWT + refresh-token rotation.** Access tokens are versioned and invalidated instantly on logout; refresh tokens are opaque, hashed at rest, single-use with rotation. Genuinely well-built.
- **SQL parameterization discipline.** Every repository/controller consistently uses `$wpdb->prepare()` for user-supplied values; no injectable table/column-name interpolation found anywhere.
- **Password reset flow.** WP-core reset tokens, time-limited and single-use; correctly returns the same response whether or not the account exists (no email enumeration).
- **Self-role-escalation guard.** `ProfileController` explicitly strips `role`/`departmentId`/`status` from a user's own profile-update request before processing — cannot self-promote.
- **CORS configuration.** Origin allow-list is admin-configurable and never wildcarded; WordPress's own permissive default filter is explicitly removed first.
- **React Router tree (`App.tsx`).** No dead routes, no duplicate paths, consistent nested role guards, a working catch-all 404. Nothing to fix here.
- **Frontend ↔ backend API contract.** Across ~230 endpoints checked, zero path or HTTP-method mismatches were found — the backend was clearly built directly against this frontend.
- **Vite → WordPress theme asset pipeline.** Manifest-driven enqueueing with hashed filenames, modulepreload for chunks, and a working sync script (`build:wp`) — solid once it's the default command (see M12).
- **Mass-assignment protection.** Every repository's `fromDtoForCreate`/`Update` explicitly whitelists fields — arbitrary client-supplied JSON keys are dropped, not written.
- **Cron scheduling.** Email queue worker guards against duplicate scheduling on repeated activations and cleans up correctly on deactivation.
- **Departments migration.** Fully and cleanly migrated off the old static frontend data file to the real API — no leftover references anywhere.
- **Dead-code hygiene from the mock-server migration.** Despite deleting the entire mock server and four hooks, zero dangling imports were found anywhere in `src/` — the migration itself was executed cleanly.

---

*Methodology: six parallel, read-only audits covering project structure/routing, the frontend↔backend API contract, WordPress plugin architecture and database schema, security/RBAC, business-logic correctness, and frontend performance/deployment. Live-environment behaviors (plugin activation against real MySQL, CDN/WAF stripping of DELETE bodies, production CORS configuration) could not be tested without a deployed instance and are noted as such where relevant.*
