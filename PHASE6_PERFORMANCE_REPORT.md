# Phase 6 — Performance Audit Report

**Scope:** frontend (React bundle, render performance, assets, dependencies) and backend (WordPress REST API, database queries, caching) — slow APIs, large queries, large components, re-rendering, bundle size, unused dependencies, large images, duplicate/waterfall requests, missing memoization, missing pagination, blocking/waterfall requests. No UI redesign, no UX changes, no data-loss risk — every fix is either invisible under normal operation (memoization, code/CSS/dep pruning, caching, indexes) or a safety net that only engages once a table outgrows realistic today-sized data.

**Method:** two parallel read-only audits (frontend React, WordPress backend/DB) followed by direct verification of every finding against current source before touching anything — several agent-reported findings turned out to reference already-dead code once traced to their actual (non-)consumers, which changed the fix. Every frontend change was verified via a clean `npm run build` (TypeScript project build + Vite production build). Every backend change was verified via `php -l`.

---

## Before / after

| Metric | Before | After | Change |
|---|---|---|---|
| `dist/` total (production build output) | 11 MB | 3.3 MB | **‑70%** |
| `dist/images` (static assets shipped) | 8.1 MB | 772 KB | **‑90%** |
| CSS shipped globally (`index.css` + `swiper` CSS) | 184 KB | 120 KB | **‑35%** |
| `package.json` `dependencies` | 24 | 12 | **‑50%** |
| `node_modules` on disk | 155 MB | 136 MB | ‑12% |
| Dead source files removed | — | 22 files | — |
| JS chunk count / largest chunks | 109 chunks, same as after | 109 chunks | unchanged (see note below) |

**Why the JS bundle size itself didn't move:** all the removed dependencies (`@fullcalendar/*`, `@react-jvectormap/*`, `swiper`, `flatpickr`, `react-dnd`, `react-dnd-html5-backend`) were already unreachable from any routed page, so Rollup's tree-shaking had never included them in a JS chunk in the first place — `vite.config.ts`'s `manualChunks` rules for `vendor-calendar`/`vendor-swiper`/`vendor-dnd` were configuring chunks that held nothing. Their real cost wasn't the JS bundle; it was (1) two CSS files (`swiper-bundle.css`, `flatpickr.css`) imported unconditionally in `main.tsx` and shipped on **every single page load** regardless of role, (2) ~370 lines of matching dead CSS rules inside `index.css` itself, (3) 7.3 MB of demo images in `public/images/` that only the now-deleted demo components referenced, and (4) 12 extra entries in the dependency tree (slower installs, more supply-chain surface, more `npm audit` noise).

---

## Frontend fixes

### 1. Dead TailAdmin template code — 22 files, 7.3 MB of images, 4 dependencies' worth of CSS
- **Root cause:** this project started from the TailAdmin React template. Several demo showcase components were never wired into any actual route but were never deleted either: `src/components/ecommerce/*` (7 files — fake "MacBook Pro" order tables, a customer-demographic world map), `src/components/tables/BasicTables/*`, `src/components/ui/images/*` (image-grid demos), `src/components/form/form-elements/*` (10 files — checkbox/radio/dropzone/date-picker showcase components) and `src/components/form/date-picker.tsx`.
- **Verification method:** for each candidate, grepped every `.tsx`/`.ts` file in `src/` for the component's name; confirmed zero matches outside the dead file's own directory before deleting. Chased the dependency chain one level further than the raw grep results required — e.g. `@react-jvectormap` looked "used" by `CountryMap.tsx`, but `CountryMap.tsx`'s only consumer was the also-dead `DemographicCard.tsx`, so the whole chain was dead.
- **Fix:** deleted all 22 files. Deleted the 10 now-fully-orphaned `public/images/` subdirectories they referenced (`brand`, `cards`, `carousel`, `chat`, `country`, `grid-image`, `icons`, `product`, `task`, `video-thumb` — 7.3 MB), keeping the 4 subdirectories with real consumers (`error`, `logo`, `shape`, `user`).
- **Files removed:** `src/components/ecommerce/` (whole dir), `src/components/tables/BasicTables/` (whole dir), `src/components/ui/images/` (whole dir), `src/components/form/form-elements/` (whole dir), `src/components/form/date-picker.tsx`.

### 2. Two CSS files loaded globally on every page, unconditionally, for zero live usage
- **Root cause:** `src/main.tsx` imported `swiper/swiper-bundle.css` and `flatpickr/dist/flatpickr.css` at the top level — these load on the very first paint of every route for every role, before React even decides what page to render. Neither `Swiper`/`SwiperSlide` nor `<DatePicker>` (flatpickr) is instantiated anywhere in the live app (their only consumers were the dead demo components removed in fix #1).
- **Fix:** removed both imports from `main.tsx`. Removed the matching dead CSS rule blocks from `src/index.css` (flatpickr calendar styling, jvectormap styling, FullCalendar `.fc-*` styling, swiper carousel-button styling — ~370 lines) after tracing each selector back to confirm no live component renders that class name.
- **Files modified:** `src/main.tsx`, `src/index.css`.

### 3. `package.json` / `vite.config.ts` cleanup matching the dead-code removal
- **Fix:** removed `@fullcalendar/core|daygrid|interaction|list|react|timegrid`, `@react-jvectormap/core|world`, `swiper`, `flatpickr`, `react-dnd`, `react-dnd-html5-backend` from `dependencies` (24 → 12), removed their now-dangling `overrides` entries, removed their `manualChunks` rules from `vite.config.ts`, and ran `npm install` to sync `package-lock.json` (24 packages removed cleanly, 0 vulnerabilities).
- **Files modified:** `package.json`, `package-lock.json`, `vite.config.ts`.

### 4. Missing memoization on hot list/filter pages
- **`src/pages/Admin/Clients.tsx`**: the search-filtered + paginated client list was recomputed from scratch on every render (any unrelated state change — opening the add/edit modal, toggling a delete-confirm). Wrapped in `useMemo`.
- **`src/pages/HR/Payroll.tsx`**: had zero `useMemo`/`useCallback` in the file. The search/status-filtered employee list and the 4 dashboard summary stats (`totalPayroll`, `totalDeductions`, `paidCount`, `unpaidCount`) each ran a fresh `.map`/`.filter`/`.reduce` pass over every employee on every render, including every keystroke in the search box. Wrapped both in `useMemo`.
- **`src/pages/Admin/Files.tsx`**: also had zero `useMemo`/`useCallback`. The 4-step upload modal's derived lists (`clientProjects`, `selectedClient`, `selectedProject`, `pickableUsers`, `filteredUsers`) recomputed on every render regardless of which step was active or whether the modal was even open. Wrapped in `useMemo`.
- **`src/pages/Budget/BudgetManagement.tsx`**: the company-wide "All Budget Requests" table (`SuperAdminView`) re-sorted the entire company's historical request list inline in JSX on every render (`[...allRequests].sort(...)`) — the single largest un-memoized, company-wide (not per-department) computation found in this 2,541-line file. Extracted to a `sortedAllRequests` `useMemo`. (Note: the file already had 3 memoized derivations before this pass; the remaining un-memoized chains are all per-department/small-cardinality modal-local state and were left as-is — see "Not fixed" below.)

### 5. Sequential-await waterfall
- **`src/pages/HR/BulkSalarySlips.tsx`**: the initial load `await`ed `UserService.getAll()` then `EmployeeExtraService.getAll()` sequentially even though neither depends on the other's result (the file's own `SalarySlips.tsx` sibling and a later effect in the same file already use `Promise.all` correctly for the same pattern). Changed to `Promise.all`.

**Verified via a clean `npm run build`** (`tsc -b && vite build`) after every frontend change in this phase — zero type errors.

---

## Backend (WordPress) fixes

### 1. Unbounded `SELECT *` on every list endpoint that doesn't opt into pagination
- **Root cause:** `AbstractRepository::list()` — the base `list()` used by ~10 repositories (tasks, clients, projects, audit logs, security audit logs, client ownership, sales campaigns, and others) — issued `SELECT * FROM {table}` with **no LIMIT at all** unless the caller explicitly passed a `$pagination` array. Nearly every existing call site doesn't, so every one of those tables is fetched in full, every column, on every request, with no ceiling as the table grows.
- **Fix:** added a `defaultSafetyLimit` (default 1000, overridable per-repository) applied only when no explicit pagination is requested. This is deliberately generous — it changes nothing for any table at today's realistic row counts — it only stops a naturally-growing table from one day materializing every row in one response. Documented in the class doc comment that a query without an explicit `ORDER BY` won't get a *meaningful* "most recent N" guarantee from this cap alone — callers relying on recency should also pass an order.
- **Files modified:** `wordpress-backend/optivax-erp-backend/repositories/AbstractRepository.php`.

### 2. Audit log — append-only table, explicitly unbounded
- **Root cause:** `AuditLogRepository` is bespoke (not `AbstractRepository`-based) — its `list()` only applied a `LIMIT` if the caller passed one, and `search()` had no limit clause at all, ever. This is the one table in the schema guaranteed to only grow.
- **Fix:** both methods now always apply a `LIMIT` (caller-specified value if given, else a 1000-row default), safe because both already `ORDER BY timestamp DESC` — the cap now consistently returns "most recent N," never an arbitrary/unordered slice.
- **Files modified:** `wordpress-backend/optivax-erp-backend/repositories/AuditLogRepository.php`.

### 3. Attendance "self" listing — every employee, every day, forever, in one response
- **Root cause:** `AttendanceRepository::getSelf()` runs `SELECT * ... ORDER BY date DESC` with **no LIMIT and no date filter**, unlike its sibling `getYear()` (naturally bounded to ≤366 rows by its `YEAR()` filter). It's used by `HR/Attendance.tsx` for both an employee's own check-in state and, for `super_admin`, the full manage/edit/delete table.
- **Fix:** added a defensive `LIMIT 2000` (order is already `date DESC`, so this returns the most recent rows first). Documented that if admin tooling ever legitimately needs older history than this, it should call the already-existing `getYear()` endpoint instead of widening this one.
- **Files modified:** `wordpress-backend/optivax-erp-backend/repositories/AttendanceRepository.php`.

### 4. N+1 query — activity sessions (new finding, not flagged by either prior database audit)
- **Root cause:** `ActivityRepository::listSessions()` — the cross-user, date-ranged endpoint behind `LiveActivityDashboard.tsx` and `ActivityReports.tsx` — mapped its session rows through `toSessionDto()`, and `toSessionDto()` independently calls `listBreaks($sessionId)`, issuing its own query. For N sessions in the requested range, that's 1 query for the sessions plus N queries for their breaks — the exact class of bug Phase 3 already fixed for `InvoiceRepository`/`ConversationRepository`, just not caught there because this repository is hand-written rather than `AbstractRepository`-based.
- **Fix:** `listSessions()` now batch-fetches every returned session's breaks in one `WHERE session_id IN (...)` query, groups them in PHP by `session_id`, and passes each session's slice into `toSessionDto()` via a new optional `$breaksOverride` parameter. The four single-session call sites (`login`/`logout`/`startBreak`/`endBreak`) are untouched — they still call `toSessionDto()` without the override and keep their original single-query behavior, which was never the problem.
- **Files modified:** `wordpress-backend/optivax-erp-backend/repositories/ActivityRepository.php`.

### 5. Missing caching on two read-heavy, rarely-changing endpoints
- **`CompanySettingsRepository::get()`**: a singleton row (branding/company info) re-queried on effectively every settings/branding page load, with zero caching anywhere in the codebase (confirmed via a full-tree search — no `wp_cache_*`/`get_transient` usage existed before this phase). Added a 5-minute object-cache entry, invalidated on `put()`.
- **`SocialTrackingRepository::getAnalytics()`**: recomputed 2 `GROUP BY` aggregate scans plus a full unbounded `SELECT * ... ORDER BY occurred_at DESC` (every raw click, every column, embedded in the response) on every call. Added a 1-minute object-cache entry, and capped the embedded `clicks` array at the 500 most recent (the `totalClicks`/`byPlatform`/`byLink` aggregates already cover full history — the raw array doesn't need to).
- **Files modified:** `wordpress-backend/optivax-erp-backend/repositories/CompanySettingsRepository.php`, `repositories/SocialTrackingRepository.php`.

### 6. Duplicate per-request DB lookup — client scope resolution
- **Root cause:** `ClientScopeMiddleware::resolveOwnClientId()` ran a fresh `SELECT id FROM clients WHERE email = %s` on every call with no in-request cache. Not yet duplicated within any single request today, but it's called from 5+ different controllers/routes, and any future code path that calls both `effectiveClientId()` and `forcedFilter()` for the same request would silently double the query.
- **Fix:** added a static per-request memo keyed by email.
- **Files modified:** `wordpress-backend/optivax-erp-backend/middleware/ClientScopeMiddleware.php`.

### 7. Missing index
- **`files.uploaded_by_id`**: filtered by `FileRoutes` but had no index (only `project_id`/`client_id` were indexed). Added `KEY uploaded_by_id (uploaded_by_id)` to the migration and bumped `OPTIVAX_ERP_DB_VERSION` (1.1.0 → 1.2.0) so `Migrator::maybeUpgrade()` — the schema-upgrade path Phase 3 built — actually applies it to already-deployed sites, not just fresh installs.
- **Files modified:** `wordpress-backend/optivax-erp-backend/database/migrations/FileMigration.php`, `wordpress-backend/optivax-erp-backend/optivax-erp-backend.php`.

**Verified via `php -l` on every modified file** — all clean. No live WP+MySQL instance was available in this environment (same constraint noted in the Phase 3 report), so these changes have not been exercised against real data — recommend staging-first deployment for the schema/index change in particular.

---

## Reviewed, deliberately not changed

- **`StripeController.php` — synchronous `wp_remote_post()` to Stripe during PaymentIntent creation.** This blocks the HTTP response the browser is waiting on, but that's inherent to the Stripe integration pattern — the frontend needs the `client_secret` back in the same response to proceed with the card element. Deferring this to a queue would break the payment flow, not speed it up. Not a bug.
- **`UserProfileRepository::create()` — synchronous welcome email via `MailService::sendNow()`.** `MailService` already has a `queue()` method built specifically for "bulk/non-critical notification mail" (used correctly elsewhere), and switching this call site to it would remove the blocking SMTP round-trip from every new-employee/new-client creation request. Left unchanged because `sendNow()`'s own doc comment explicitly groups this call alongside password-reset as "auth-critical mail" — that looks like a deliberate original decision (e.g., so SMTP failures surface immediately to the admin rather than silently queuing), not an oversight, and reversing it changes behavior on a credentials-delivery path without being certain that's wanted. Flagging for a product decision rather than unilaterally changing it.
- **`SalesWidgetRepository`'s three unbounded `SELECT *` queries.** The class's own doc comment describes these as "small 'at a glance' widget tables," explicitly separate from the full CRM tables — the author already scoped these as intentionally small. No cap added.
- **Company/department-scoped derived values inside `BudgetManagement.tsx`** (e.g. `DEPTS`, `totalAllocatedOthers`, `memberAllocTotal`/`usedTotal`) — bounded by department/team count (realistically under a few dozen rows), not user-scale data. Left un-memoized; the cost of adding `useMemo` here would exceed the render cost it saves.

---

## Not independently re-verified this phase (carried forward, still open)

These were flagged by the frontend audit agent but are lower-priority/higher-effort than what's fixed above, and weren't touched:
- No frontend list page passes `limit`/`page` to `clientService`/`invoiceService`/`projectService`/`notificationService` — Phase 2 added server-side support, Phase 4 explicitly deferred the UI work as a visible UX change, and this phase treated the backend safety-limit (fix #1 above) as the appropriate non-UX-visible mitigation instead of reworking every page's fetch+pagination UI.
- `src/pages/Budget/BudgetManagement.tsx` (2,541 lines) and a handful of other single-file monoliths (`SuperAdminPanel.tsx`, `ContentCalendar.tsx`, `Client/Billing.tsx`) remain large, mixed-concern files — a structural refactor, not a performance bug per se, and out of scope for a fix-in-place performance pass.
- `useNotifications.ts` polling potentially overlapping with `useSSE.ts` — flagged but not confirmed to cause duplicate fetches in practice; would need runtime tracing to verify before changing.
