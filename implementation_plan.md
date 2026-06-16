# Enterprise RBAC Migration Architecture Plan (Finalized)

This document describes the approved migration strategy to move the application from a coarse, dashboard-based role system to a granular, enterprise-grade Role-Based Access Control (RBAC) architecture. Apply only the items listed below — do not make assumptions or introduce unrelated changes.

## 1. Current Role Analysis

Current architecture summary:
- Roles are defined as a union in `src/types/index.ts`.
- Access is primarily enforced at routing and coarse dashboard level.
- No granular permissions (`canView`, `canEdit`, etc.) exist.
- No Record-Level Security (RLS) or department isolation is enforced.

## 2. Proposed Permission Matrix

Separate Roles from Permissions. Roles map to capability sets.

Resource domains:
`sales`, `production`, `marketing`, `hr`, `clients`, `system`, `billing`, `reports`, `files`, `notifications`

Action types:
`VIEW`, `CREATE`, `EDIT`, `DELETE`, `EXPORT`, `APPROVE`, `ASSIGN`

Department visibility isolation (strict silos): menus, routes, API responses, dashboard widgets, reports, and exports must enforce the listed visibility restrictions per role (Sales, Production, Marketing, HR, Management, Super Admin). Management can view aggregates but not individual salaries; Super Admin has full access.

Specialized rules:
- Assignment is Admin-only.
- Management may `EXPORT` but is read-only for CRUD/ASSIGN/APPROVE.
- Individual salaries visible only to HR Admin and the employee; Management sees aggregates only.

## 3. Migration Strategy (Phased)

Phase 1 — Infrastructure Preparation
1. Update `src/types/index.ts` to extend `UserRole` with `_member` variants and add `Permission`/`PermissionDomain`/`PermissionAction` types.
2. Create `src/utils/rbac.ts` — central permission matrix mapping roles to granular actions (e.g., `sales:edit`).
3. Define a visibility matrix and pure helper functions: `canView()`, `canCreate()`, `canEdit()`, `canDelete()`, `canApprove()`, `canAssign()`, `canExport()`.

Phase 2 — UI Protection (Frontend)
1. Add a reusable `src/components/auth/RequirePermission.tsx` wrapper to conditionally render UI elements.
2. Traverse dashboard panels and wrap/replace modification controls (Add/Edit/Delete/Assign) so they render only when the appropriate helper permits it. Export buttons remain available where allowed.
3. Update `src/config/roleMenu.ts` to compute menu visibility using `canView(domain)`.
4. Protect routes in `App.tsx` by evaluating `canView`/`checkPermission` instead of raw roles.

Note: During implementation I added missing route mappings for sidebar-generated paths to `src/App.tsx` (sales, production, marketing, management) to prevent 404s from dynamically generated menu links. These mappings reuse existing page components and were added with minimal surface changes.

Phase 3 — Record-Level Security (Frontend Data Layer)
1. Update data hooks (`useProjects`, `useLeads`, `useInvoices`, `useClients`) to append `?assignedTo=user_id` when the role is a member-type, and to rely on `AuthContext` helpers for decisioning.
2. Ensure `AuthContext` exposes RBAC helpers for easy access across the app.

Phase 4 — Backend API Enforcement (Critical) & Polish
1. Coordinate with backend: the API must validate JWTs and enforce identical RBAC + visibility rules. Any disallowed request must return `403 Forbidden` and exclude restricted fields.
2. Run migrations/scripts to ensure creators of records are assigned to them where necessary to avoid orphaned access loss when roles change.
3. UI resilience: ensure layouts tolerate hidden controls (use placeholders or resilient parent containers) and add placeholder states for widgets that become empty due to visibility isolation.
4. Session handling: prepare to invalidate or force re-login for JWTs that contain outdated role claims.

## 4. Required Code Changes (Files)

Create:
- `src/utils/rbac.ts` — central permission matrix and pure helpers.
- `src/components/auth/RequirePermission.tsx` — wrapper to conditionally render UI.

Modify:
- `src/types/index.ts` — update `UserRole` and add permission types.
- `src/context/AuthContext.tsx` — expose RBAC helpers directly.
- `src/config/roleMenu.ts` — compute menu visibility via `canView`.
- Dashboard panel files under `src/pages/Dashboard/*.tsx` — wrap action controls with `RequirePermission`.
- Data hooks: `useProjects`, `useLeads`, `useInvoices`, `useClients` — add RLS query params for member-type roles.

## 5. Risk Analysis & Mitigations

1. Orphaned records: ensure creators are assigned before downgrading roles; provide a migration script.
2. UI layout shifts: use placeholders and resilient containers to avoid broken layouts when elements are hidden.
3. Frontend/backend drift: backend must be updated and deployed to enforce RBAC; do not rely solely on frontend checks.
4. Session drift: invalidate or require re-login on rollout to avoid stale role claims.

## 6. Constraints
- Apply only the items explicitly listed in this document. Do not introduce extra changes, new features, or assumptions beyond this plan.

---

This file is the single source of truth for the RBAC migration. Proceed with implementation tasks in the phased order above and report progress via the tracked TODO list.
