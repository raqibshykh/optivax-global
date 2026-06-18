# OptiVax Global — Admin Dashboard

A full-featured SaaS admin dashboard built with React 19, TypeScript, Vite, and Tailwind CSS v4. Covers a complete multi-role workflow from sales lead creation through production delivery and client self-service.

---

## Quick Start

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173
npx tsc --noEmit  # Type-check (must pass with zero errors)
```

All backend calls are intercepted by an in-browser mock server — no external API or database is needed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, `@theme` block) |
| Routing | React Router v6 — HashRouter (`/#/path`) |
| Dark mode | Class-based (`dark:` prefix) |
| State | React hooks + localStorage |
| Auth | Mock session (localStorage `mock_session`) |
| API | In-browser fetch interceptor (`src/mock/server.ts`) |

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

### Mock login credentials

All mock users share the password `password123`.

| Email | Role |
|---|---|
| `superadmin@example.com` | super_admin |
| `manager@example.com` | management |
| `sales.admin@example.com` | sales_admin |
| `sales.member@example.com` | sales_member |
| `production.admin@example.com` | production_admin |
| `production.member@example.com` | production_member |
| `marketing.admin@example.com` | marketing_admin |
| `marketing.member@example.com` | marketing_member |
| `hr.admin@example.com` | hr_admin |
| `hr.member@example.com` | hr_member |
| `client1@example.com` | client (Alice Johnson / Acme Corp) |
| `client2@example.com` | client (Bob Williams / Globex Corp) |

Session is persisted to localStorage (`mock_session`) so page reloads do not log the user out.

---

## Core Workflows

### Sales → Client creation
1. `sales_admin` or `sales_member` opens the Sales Dashboard and fills the **Create Client** form.
2. A user profile is created in `mock_profiles` and a client record is written to `optivax_clients` (IDs are matched so `client.id === profile.id`).
3. Notifications are sent to `production_admin`, `management`, and `super_admin`.
4. The new client appears immediately in the Sales panel and in all admin-facing client lists.

### Production → Assignment
1. `production_admin` opens the Production Dashboard and assigns a production member to a client.
2. The assignment writes `assignedProductionMembers` on the client record via `ClientService.update()`.
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
| Billing | Client-scoped invoices; pay via Stripe (mock); payment history |
| Files | Files uploaded by production staff for this client |
| Revisions | All revision requests submitted for this client's projects |
| Notifications | System notifications + direct messages from the production team |
| Profile | Edit contact info, company details |

---

## Architecture

### Single client data store

All client records live in one localStorage key: `optivax_clients`. Every record is normalized by `normalizeClient()` in `src/mock/server.ts` so both field sets are always present:

```
name / contactName
company / companyName
joinDate / createdAt
address, city, totalProjects, totalBilled
assignedProductionMembers, createdBy, createdByName, status
```

### Mock server (`src/mock/server.ts`)

Intercepts `window.fetch` in dev mode. All `/saas/v1/*` endpoints are handled:

| Prefix | Endpoints |
|---|---|
| `/saas/v1/clients` | list, create, update, delete |
| `/saas/v1/projects` | list, create, update, delete |
| `/saas/v1/invoices` | list, generate, update, mark-paid, delete |
| `/saas/v1/files` | list (by projectId or clientId), create, delete |
| `/saas/v1/payments` | list, create |
| `/saas/v1/revisions` | list (by clientId or projectId), create, update |
| `/saas/v1/profiles` | list, create, update, delete |
| `/saas/v1/notifications` | list, create, mark-all-read, update, delete, delete-all |
| `/saas/v1/config/stripe` | returns mock publishableKey |
| `/saas/v1/create-payment-intent` | returns mock clientSecret |

Seed data (two clients, three projects, three invoices, two files) is populated eagerly at startup so data is always available before any fetch fires.

### RBAC (`src/utils/rbac.ts`)

Permissions are declared in `RBAC_MATRIX` — a map of `role → domain → actions[]`. Helper functions (`hasPermission`, `canView`, `canCreate`, `canEdit`, `canDelete`, `canExport`, `canApprove`, `canAssign`) are used in `AuthContext` and across the UI. Route-level protection is enforced by `ProtectedRoute` in `src/App.tsx`.

---

## localStorage Keys Reference

| Key | Contents | Reset to clear |
|---|---|---|
| `mock_session` | Persisted login session | Logs user out on next load |
| `mock_profiles` | Dynamically-created user profiles | Removes dynamic users |
| `mock_passwords` | Passwords for dynamic users | - |
| `optivax_clients` | All client records (unified store) | Removes all clients |
| `mock_projects` | All project records | - |
| `mock_invoices` | All invoice records | - |
| `mock_files` | All file metadata records | - |
| `mock_payments` | All payment records | - |
| `mock_revisions` | All revision requests | - |
| `mock_notifications` | All notification records | - |
| `mock_tasks` | Kanban task records | - |
| `optivax_deliverables` | Deliverable records | - |
| `optivax_audit_logs` | Audit log entries | - |
| `optivax_client_messages` | Direct messages from production to clients | - |
| `production_client_assignments` | Production panel local assignment state | - |

Reset all mock data (browser console):

```js
[
  'mock_session','mock_profiles','mock_passwords',
  'optivax_clients','mock_projects','mock_invoices',
  'mock_files','mock_payments','mock_revisions',
  'mock_notifications','mock_tasks','optivax_deliverables',
  'optivax_audit_logs','optivax_client_messages',
  'production_client_assignments'
].forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## Key Source Files

| File | Purpose |
|---|---|
| `src/mock/server.ts` | In-browser fetch interceptor + seed data |
| `src/mock/users.ts` | Static mock users (all roles) |
| `src/lib/client.ts` | `api` helper, `mockLogin`, `fetchSession`, session persistence |
| `src/context/AuthContext.tsx` | Auth state, login/logout, RBAC helpers |
| `src/utils/rbac.ts` | `RBAC_MATRIX` + permission helpers |
| `src/config/menuConfig.ts` | Sidebar nav — single source of truth per role |
| `src/App.tsx` | All routes + `ProtectedRoute` guards |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/services/` | Typed API wrappers (ClientService, ProjectService, etc.) |
| `src/hooks/` | Data hooks (`useClients`, `useProjects`, `useInvoices`, `useFiles`, `useNotifications`) |
| `src/pages/Dashboard/SalesPanel.tsx` | Sales workflow — create clients, toggle status |
| `src/pages/Dashboard/ProductionPanel.tsx` | Production workflow — assign members, send messages |
| `src/pages/Dashboard/ManagementPanel.tsx` | Cross-department overview |
| `src/pages/Production/Deliverables.tsx` | Deliverable lifecycle + client notifications |
| `src/pages/Client/` | Full client self-service portal |
| `src/pages/Admin/` | Super-admin CRUD panels |

---

## Stripe (mock)

The Billing page uses Stripe Elements for the payment form. In dev mode:

- `GET /saas/v1/config/stripe` returns `{ publishableKey: "pk_test_mock_optivax_dev" }`.
- `POST /saas/v1/create-payment-intent` returns a mock `clientSecret`.
- `stripe.confirmCardPayment()` will fail with the mock secret (expected) — the error is surfaced as a toast. The form renders and the full UX flow is testable up to card confirmation.

When wiring to a real Stripe account, replace the two mock handlers in `src/mock/server.ts` with real API calls and set `VITE_STRIPE_KEY` in your `.env`.

---

## Notifications & Realtime

- `useNotifications` fetches from `GET /saas/v1/notifications/list?userId=<id>` on mount and polls via `BroadcastChannel` + `storage` events for cross-tab sync.
- The mock server dispatches `window.dispatchEvent(new CustomEvent("saas:notification", ...))` on every notification create — but `useNotifications` does not listen to this custom event (it uses BroadcastChannel). Same-tab notification delivery relies on the next fetch cycle or navigation.
- `useSSE` connects to `/notifications/stream` when available. In dev mode no SSE server exists so the hook is a no-op.

---

## Health Score

Current audit score: **88 / 100**

---

## Remaining Work

Items not yet addressed, in priority order:

### P2 — Functional gaps

**1. `RequirePermission` uses unscoped `hasPermission`**
- File: [src/components/auth/RequirePermission.tsx](src/components/auth/RequirePermission.tsx)
- `hasPermission(user, domain, action)` is used for inline render guards. `AuthContext` exposes `canView`/`canEdit` etc. which call dedicated scoped helpers. Both currently agree on outcomes, but the architectural mismatch means a future RBAC change in one place won't automatically apply to the other.
- Fix: Replace `hasPermission` in `RequirePermission` with the same scoped helper used by `AuthContext.checkPermission`.

**2. Production assignment dual-tracking**
- File: [src/pages/Dashboard/ProductionPanel.tsx](src/pages/Dashboard/ProductionPanel.tsx)
- `toggleAssignment` writes to both `production_client_assignments` localStorage (panel UI state) and `client.assignedProductionMembers` via `ClientService.update()` (API state). If the API call fails, the two stores diverge — the panel shows the assignment but `useClients(production_member)` won't return the client.
- Fix: On `ProductionPanel` mount, initialise `assignments` from the client records' `assignedProductionMembers` field instead of from the separate `production_client_assignments` key. Remove the separate key.

**3. Deliverables have no `projectId` FK**
- File: [src/pages/Production/Deliverables.tsx](src/pages/Production/Deliverables.tsx)
- The deliverable form has a free-text `projectName` field. Deliverable records carry no `projectId` that links to `mock_projects`, so there is no referential integrity.
- Fix: Replace the free-text project field with a dropdown populated by `useProjects()`. Store `projectId` on the record.

### P3 — Cosmetic / low impact

**4. Icon key naming mismatches in AppSidebar**
- File: [src/layout/AppSidebar.tsx](src/layout/AppSidebar.tsx)
- `"bell"` resolves to `<EnvelopeIcon />` and `"settings"` resolves to `<BoltIcon />`. Icons render correctly but the key names are semantically misleading.
- Fix: Rename the icon keys in `menuConfig.ts` to `"envelope"` and `"bolt"`, or swap the icon components to `BellIcon` and `CogIcon`.

**5. Same-tab notification delivery latency**
- File: [src/hooks/useNotifications.ts](src/hooks/useNotifications.ts)
- Notifications created in the same browser tab appear after the next navigation or manual refresh because `useNotifications` listens to `BroadcastChannel` and `storage` events (both cross-tab only). The mock server fires a `saas:notification` CustomEvent but the hook doesn't subscribe to it.
- Fix: Add `window.addEventListener("saas:notification", handleRefresh)` inside `useNotifications`.

**6. `fetchSession` does not validate against live profile store**
- File: [src/lib/client.ts](src/lib/client.ts)
- The persisted session is trusted as-is. A deleted or role-changed profile will still restore the old session until the user manually logs out.
- Fix: After reading `mock_session`, cross-check the session `id` against `mock_profiles` / `mockUsers` and clear it if the profile no longer exists or the role changed.

### UI stabilization (deferred)

The following UI work was explicitly deferred until data architecture was stable (now complete):
- Audit remaining `bg-blue-600` / `text-blue-600` hardcoded colours and replace with `bg-brand-500` / `text-brand-500` tokens
- Responsive layout fixes for dashboard panels on narrow viewports
- Client portal pages on mobile (Billing table, Files grid, Revision list)
