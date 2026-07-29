# OptiVax Global — Admin Dashboard

A full-featured SaaS admin dashboard built with React 19, TypeScript, Vite, and Tailwind CSS v4. Covers a complete multi-role workflow from sales lead creation through production delivery and client self-service.

---

## Quick Start

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173
npx tsc --noEmit  # Type-check (must pass with zero errors)
```

Set `VITE_API_URL` in `.env` to your backend's origin (see `.env.example`). The frontend has no built-in backend — every request goes out over HTTP through the Service layer (`src/services/`) to whatever `VITE_API_URL` points at.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, `@theme` block) |
| Routing | React Router v6 — HashRouter (`/#/path`) |
| Dark mode | Class-based (`dark:` prefix), persisted to `localStorage` |
| State | React hooks; no client-side data persistence beyond the Service layer's HTTP calls |
| Auth | Cookie-based session via `AuthService` (`src/services/authService.ts`); `AuthContext` holds the in-memory user |
| API | `src/lib/client.ts` — timeout, retry, and error classification (`ApiError`/`ApiErrorKind`) over `fetch` |

---

## Roles & Access

12 roles are supported. Every role gets a scoped sidebar and protected routes.

| Role | Home route | Description |
|---|---|---|
| `super_admin` | `/super-admin/dashboard` | Full access to all data and admin panels |
| `management` | `/management/dashboard` | Cross-department visibility, reports, audit logs |
| `sales_admin` | `/sales/dashboard` | Manages sales team, creates clients and leads |
| `sales_member` | `/sales/dashboard` | Views clients and tasks; no admin actions |
| `production_admin` | `/production/dashboard` | Assigns clients to production members, manages deliverables |
| `production_member` | `/production/dashboard` | Sees only their assigned clients and tasks |
| `marketing_admin` | `/marketing/dashboard` | Manages campaigns, audience, email flows |
| `marketing_member` | `/marketing/dashboard` | Views tasks and content |
| `hr_admin` | `/hr/dashboard` | Manages employees and payroll |
| `hr_member` | `/hr/dashboard` | Self-service profile and notifications |
| `client` | `/client/dashboard` | Self-service portal — projects, billing, files, revisions |

### Accounts

There is no seeded demo data and no hardcoded credentials in the frontend. Every user (starting with the first super-admin account) is provisioned directly against the real backend once it exists. Every other user is created from inside the ERP (Admin → Users, or the Sales "Create Client" flow) via `UserService`/`AuthService` — never by editing frontend code.

Session state is held in `AuthContext` and restored on load via `AuthService.getSession()` (a cookie-backed session on the real backend, not `localStorage`).

---

## Core Workflows

### Sales → Client creation
1. `sales_admin` or `sales_member` opens the Sales Dashboard and fills the **Create Client** form.
2. `UserService.create()` provisions a login profile, then `ClientService.create()` writes the unified client record (IDs are matched so `client.id === profile.id`).
3. Notifications are sent to `production_admin`, `management`, and `super_admin`.
4. The new client appears immediately in the Sales panel and in all admin-facing client lists.

### Production → Assignment
1. `production_admin` opens the Production Dashboard and assigns a production member to a client.
2. The assignment is persisted via `ProductionAssignmentService.save()` and mirrored onto the client record's `assignedProductionMembers` field via `ClientService.update()`.
3. When the assigned `production_member` logs in, `useClients` queries `?assignedTo=memberId` and returns only their clients.

### Deliverables → Client notification
1. `production_admin` or `management` advances a deliverable to **Approved** in the Deliverables page.
2. A notification is created for the client (`userId = clientId`) via `NotificationService`.
3. The client sees the notification in their **Notifications** tab on next view.

### Client portal
Clients have a fully self-contained portal at `/client/*`:

| Page | What it shows |
|---|---|
| Dashboard | Summary of projects, invoices, recent notifications |
| My Projects | Projects scoped to this client; submit revision requests inline |
| Billing | Client-scoped invoices; pay via Stripe; payment history |
| Files | Files uploaded by production staff for this client |
| Revisions | All revision requests submitted for this client's projects |
| Notifications | System notifications + direct messages from the production team |
| Profile | Edit contact info, company details |

---

## Architecture

### Service layer

Every domain has a thin `src/services/<domain>Service.ts` — a static class wrapping `api.get/post/put/patch/delete` from `src/lib/client.ts`, with zero business logic. Components never call `api.*` directly; they call a Service method. Pure calculation logic that used to live alongside demo data (payroll math, budget variance, attendance/activity report aggregation) was relocated verbatim into `src/domain/<name>/calculations.ts` modules, unchanged, and the Service classes call into them.

There is intentionally no separate Repository layer underneath the Services — with exactly one data source (the backend REST API), a Repository would just be `XRepository.getAll()` calling `api.get(...)` and `XService.getAll()` calling `XRepository.getAll()`, with no behavior added.

### `src/lib/client.ts`

The single `api` object (`get/post/put/patch/delete`) used by every Service. Adds an AbortController-based 15s timeout, bounded retry (max 2, GET-only, network/timeout/server errors), `ApiError`/`ApiErrorKind` classification, and a single `setUnauthorizedHandler(fn)` extension point wired from `AuthContext` to clear the session on a 401.

### RBAC (`src/utils/rbac.ts`)

Permissions are declared in `RBAC_MATRIX` — a map of `role → domain → actions[]`. Helper functions (`hasPermission`, `canView`, `canCreate`, `canEdit`, `canDelete`, `canExport`, `canApprove`, `canAssign`) are used in `AuthContext` and across the UI. Route-level protection is enforced by `ProtectedRoute` in `src/App.tsx`.

---

## Key Source Files

| File | Purpose |
|---|---|
| `src/lib/client.ts` | `api` helper — timeout, retry, error classification, unauthorized-handler hook |
| `src/lib/apiError.ts` | `ApiError` class + `ApiErrorKind` union |
| `src/config/environment.ts` | Single source of truth for `VITE_API_URL`/`VITE_SSE_PATH`/Stripe key |
| `src/context/AuthContext.tsx` | Auth state, login/logout, RBAC helpers |
| `src/services/authService.ts` | Login, session restore, logout, password reset |
| `src/utils/rbac.ts` | `RBAC_MATRIX` + permission helpers |
| `src/config/menuConfig.ts` | Sidebar nav — single source of truth per role |
| `src/App.tsx` | All routes + `ProtectedRoute` guards |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/services/` | Thin API-wrapper Service classes, one per domain |
| `src/domain/*/calculations.ts` | Pure business-logic calculations (payroll, budget, attendance, activity) |
| `src/hooks/` | Data hooks (`useClients`, `useProjects`, `useInvoices`, `useFiles`, `useNotifications`) |
| `src/pages/Dashboard/SalesPanel.tsx` | Sales workflow — create clients, toggle status |
| `src/pages/Dashboard/ProductionPanel.tsx` | Production workflow — assign members, send messages |
| `src/pages/Dashboard/ManagementPanel.tsx` | Cross-department overview |
| `src/pages/Production/Deliverables.tsx` | Deliverable lifecycle + client notifications |
| `src/pages/Client/` | Full client self-service portal |
| `src/pages/Admin/` | Super-admin CRUD panels |

---

## Stripe

The Billing page uses Stripe Elements for the payment form (`GET /saas/v1/config/stripe`, `POST /saas/v1/create-payment-intent`, `stripe.confirmCardPayment()`). These calls go to the real backend once it exists; there is no in-frontend Stripe simulation beyond the one client-side network delay in the confirmation step (`src/pages/Client/Billing.tsx`), which stands in for the real webhook round-trip until the backend is wired up.

---

## Notifications & Realtime

- `useNotifications` fetches from `GET /saas/v1/notifications/list?userId=<id>` on mount and polls via `BroadcastChannel` for cross-tab sync.
- `useSSE` connects to `/notifications/stream` when available; it is a no-op if no SSE-capable backend is present.

---

## Remaining Work

Items not yet addressed, in priority order:

### P1 — Backend required

Every item below needs the real REST API (Phase 2) before it can be verified end-to-end; the frontend is architecturally ready and will fail with network/connection errors until then.

### P2 — Functional gaps

**1. `RequirePermission` uses unscoped `hasPermission`**
- File: [src/components/auth/RequirePermission.tsx](src/components/auth/RequirePermission.tsx)
- `hasPermission(user, domain, action)` is used for inline render guards. `AuthContext` exposes `canView`/`canEdit` etc. which call dedicated scoped helpers. Both currently agree on outcomes, but the architectural mismatch means a future RBAC change in one place won't automatically apply to the other.
- Fix: Replace `hasPermission` in `RequirePermission` with the same scoped helper used by `AuthContext.checkPermission`.

**2. Deliverables have no `projectId` FK**
- File: [src/pages/Production/Deliverables.tsx](src/pages/Production/Deliverables.tsx)
- The deliverable form has a free-text `projectName` field. Deliverable records carry no `projectId` that links to the Project domain, so there is no referential integrity.
- Fix: Replace the free-text project field with a dropdown populated by `useProjects()`. Store `projectId` on the record.

**3. Payroll's leave/attendance cross-domain wiring is a documented stopgap**
- Files: `src/pages/HR/SalarySlips.tsx`, `src/pages/HR/BulkSalarySlips.tsx`, `src/services/payrollService.ts`
- `computeStrictDeductions()`'s `monthlyAttendance` parameter is passed as `null` — absent/half-day/late-arrival deductions are 0 until this is wired to `AttendanceService`'s yearly report data.
- Fix: Fetch the relevant month's `AttendanceService.getYearData()` entry and pass it through.

**4. Two small dashboard-widget features remain on `localStorage`**
- Files: `src/pages/Dashboard/HRPanel.tsx` (key `optivax_attendance`), `src/pages/Dashboard/ManagementPanel.tsx` (key `mock_attendance`)
- A per-day admin "mark Present/Absent/Late" widget, distinct from both the HR self-check-in log and the yearly attendance reports (both already fully migrated to `AttendanceService`). Note the two files reference different literal keys for what looks like the same feature — that mismatch predates this migration and hasn't been investigated.
- Fix: Design a real `/saas/v1/attendance/daily-marks` endpoint, add methods to `AttendanceService`, and repoint both files — reconciling the key mismatch as part of that work.

### P3 — Cosmetic / low impact

**5. Icon key naming mismatches in AppSidebar**
- File: [src/layout/AppSidebar.tsx](src/layout/AppSidebar.tsx)
- `"bell"` resolves to `<EnvelopeIcon />` and `"settings"` resolves to `<BoltIcon />`. Icons render correctly but the key names are semantically misleading.
- Fix: Rename the icon keys in `menuConfig.ts` to `"envelope"` and `"bolt"`, or swap the icon components to `BellIcon` and `CogIcon`.

### UI stabilization (deferred)

- Audit remaining `bg-blue-600` / `text-blue-600` hardcoded colours and replace with `bg-brand-500` / `text-brand-500` tokens
- Responsive layout fixes for dashboard panels on narrow viewports
- Client portal pages on mobile (Billing table, Files grid, Revision list)
