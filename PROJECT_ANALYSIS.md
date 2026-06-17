# OptiVax Global Admin Dashboard — Full Project Analysis

> **Project**: OptiVax Global Admin Dashboard  
> **Stack**: React 19 · TypeScript · Vite · Tailwind CSS · React Router v7 (HashRouter)  
> **Data Layer**: Mock API client + localStorage (no live backend required)  
> **Last Updated**: 2026-06-17

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Folder Structure](#2-folder-structure)
3. [Authentication Flow](#3-authentication-flow)
4. [Role System](#4-role-system)
5. [RBAC Permission Matrix](#5-rbac-permission-matrix)
6. [Route Architecture](#6-route-architecture)
7. [Sidebar Menu Configuration](#7-sidebar-menu-configuration)
8. [Data Layer](#8-data-layer)
9. [Dashboard Panels](#9-dashboard-panels)
10. [HR Module](#10-hr-module)
11. [Leave Request System](#11-leave-request-system)
12. [Task Management System](#12-task-management-system)
13. [Marketing Campaign System](#13-marketing-campaign-system)
14. [Production Client Access Control](#14-production-client-access-control)
15. [Sales Module](#15-sales-module)
16. [Email Marketing Module](#16-email-marketing-module)
17. [Common Pages](#17-common-pages)
18. [Client Portal](#18-client-portal)
19. [Notification System](#19-notification-system)
20. [UI Layout & Components](#20-ui-layout--components)
21. [Environment Configuration](#21-environment-configuration)
22. [localStorage Keys Reference](#22-localstorage-keys-reference)
23. [Key Architectural Decisions](#23-key-architectural-decisions)
24. [Department Scoping Pattern](#24-department-scoping-pattern)

---

## 1. Tech Stack

| Category | Library / Tool | Version |
|---|---|---|
| UI Framework | React | 19.2.6 |
| Language | TypeScript | 5.7.2 |
| Build Tool | Vite | 6.1.0 |
| Routing | React Router DOM | 7.17.0 |
| Styling | Tailwind CSS | 4.0.8 |
| Charts | ApexCharts + react-apexcharts | 4.1.0 / 1.7.0 |
| Calendar | FullCalendar (core + react) | 6.1.15 |
| Drag & Drop | react-dnd + html5-backend | 16.0.1 |
| File Upload | react-dropzone | 14.3.5 |
| Payments | @stripe/react-stripe-js + stripe-js | 6.4.0 / 9.6.0 |
| Carousel | Swiper | 12.1.4 |
| Date Picker | Flatpickr | 4.6.13 |
| SEO | react-helmet-async | 2.0.5 |
| Class Merging | clsx + tailwind-merge | 2.1.1 / 3.0.1 |
| CSS Processing | PostCSS + @tailwindcss/postcss | 8.5.2 / 4.0.8 |
| SVG | vite-plugin-svgr | 4.3.0 |
| Linting | ESLint 9 + typescript-eslint | 9.19.0 / 8.22.0 |

**Config files**: `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`

---

## 2. Folder Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx          # Login form with validation
│   │   ├── SignUpForm.tsx          # Registration form
│   │   ├── PublicRoute.tsx         # Redirect logged-in users away from /login
│   │   └── ProtectedRoute.tsx      # Role/domain auth guard
│   ├── charts/
│   │   ├── bar/BarChartOne.tsx
│   │   └── line/LineChartOne.tsx
│   ├── common/
│   │   ├── ChartTab.tsx
│   │   ├── PageMeta.tsx
│   │   └── ScrollToTop.tsx
│   └── ui/                        # Reusable UI primitives (Button, Modal, Badge…)
├── config/
│   └── menuConfig.ts              # Role → sidebar menu items mapping
├── context/
│   └── AuthContext.tsx            # Auth state, user object, permission helpers
├── hooks/
│   ├── useFiles.ts                # File CRUD hook (filters by clientId for client role)
│   ├── useNotifications.ts        # Notification CRUD hook with client email-lookup
│   └── useSSE.ts                  # Server-Sent Events for real-time notifications
├── layout/
│   ├── AppLayout.tsx              # Root layout: sidebar + header + <Outlet>
│   ├── AppSidebar.tsx             # Dynamic sidebar from menuConfig
│   └── AppHeader.tsx              # Top bar with user menu, dark mode, notifications
├── lib/
│   ├── client.ts                  # Mock API client (intercepts all api.* calls)
│   └── storage.ts                 # safeParse() helper for JSON localStorage reads
├── pages/
│   ├── Admin/
│   │   ├── Billing.tsx
│   │   ├── Clients.tsx
│   │   ├── Files.tsx
│   │   ├── Notifications.tsx
│   │   ├── Projects.tsx
│   │   ├── Reports.tsx (in Common/)
│   │   ├── Revisions.tsx
│   │   ├── Settings.tsx           # Stripe key config, API settings
│   │   └── Email/
│   │       ├── Campaigns.tsx
│   │       ├── Templates.tsx
│   │       ├── Audience.tsx
│   │       ├── Analytics.tsx
│   │       └── Automation.tsx
│   ├── AuthPages/
│   │   ├── AuthPageLayout.tsx
│   │   ├── SignIn.tsx
│   │   ├── SignUp.tsx
│   │   └── ResetPassword.tsx
│   ├── Client/
│   │   ├── Billing.tsx            # Stripe-integrated invoice payment
│   │   ├── Files.tsx              # Real files via useFiles() hook
│   │   ├── MyProjects.tsx         # Client projects + revision request modal
│   │   ├── MyRevisions.tsx        # Revision request history
│   │   ├── Notifications.tsx      # Real notifications + Messages from Team tab
│   │   └── Profile.tsx            # Dual: client company profile OR employee leave request
│   ├── Common/
│   │   ├── Reports.tsx
│   │   └── Tasks.tsx              # Universal kanban (all departments)
│   ├── Dashboard/
│   │   ├── AdminPanel.tsx
│   │   ├── ClientPanel.tsx        # Client overview: projects, invoices, progress
│   │   ├── HRPanel.tsx            # HR overview: employees, leave requests, attendance
│   │   ├── ManagementPanel.tsx
│   │   ├── MarketingPanel.tsx
│   │   ├── ProductionPanel.tsx    # Production: client assignments, messaging
│   │   ├── SalesPanel.tsx
│   │   └── SuperAdminPanel.tsx
│   ├── HR/
│   │   ├── Employees.tsx          # Employee management with salary gating
│   │   └── Payroll.tsx            # Payroll editor (hr_admin only)
│   ├── OtherPage/
│   │   └── NotFound.tsx
│   └── Sales/
│       ├── CampaignBudgets.tsx
│       ├── SalesTargets.tsx
│       ├── SalesTasks.tsx
│       └── TeamPerformance.tsx
├── services/
│   ├── fileService.ts             # FileRecord CRUD against mock API
│   ├── notificationService.ts
│   └── userService.ts
├── types/
│   └── index.ts                   # UserRole union, User interface, FileRecord, Notification, shared types
├── utils/
│   └── rbac.ts                    # Permission matrix + checkPermission function
├── App.tsx                        # Route tree (HashRouter)
└── main.tsx                       # Entry point, AuthProvider wrapper
```

---

## 3. Authentication Flow

### Entry Point

```
/ → redirect to /login
```

All routes use **HashRouter** — URLs take the form `http://host/#/login`, `http://host/#/marketing/dashboard`, etc.

### Login Flow

1. User visits `/#/login` → rendered by `PublicRoute` guard (redirects authenticated users to their home dashboard).
2. `SignIn.tsx` renders `SignInForm.tsx`.
3. On submit → `AuthContext.login(email, password)` → calls mock API client → returns `User` object with `role`.
4. `AuthContext` stores the user in React state and persists to localStorage.
5. After login, user is redirected to their role-specific home route (see table in §4).

### Auth Context (`src/context/AuthContext.tsx`)

```typescript
interface User {
  id: string;
  email: string;
  password: string;   // stored in mock only — would not exist in production
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  company?: string;
  companyName?: string;
  bio?: string;
  joinDate: string;
  lastLogin?: string;
  departmentId?: string;  // e.g. "dept-marketing", "dept-sales"
}
```

### Permission Helper Methods (on AuthContext)

| Method | Signature | Description |
|---|---|---|
| `checkPermission` | `(domain, action) => boolean` | Core permission check via RBAC matrix |
| `canView` | `(domain) => boolean` | Shorthand for VIEW action |
| `canCreate` | `(domain) => boolean` | Shorthand for CREATE action |
| `canEdit` | `(domain) => boolean` | Shorthand for EDIT action |
| `canDelete` | `(domain) => boolean` | Shorthand for DELETE action |
| `canExport` | `(domain) => boolean` | Shorthand for EXPORT action |
| `canApprove` | `(domain) => boolean` | Shorthand for APPROVE action |
| `canAssign` | `(domain) => boolean` | Shorthand for ASSIGN action |

### Route Guards

**`PublicRoute`** — wraps `/login`, `/signup`, `/reset-password`. If user is already authenticated, redirects to their home dashboard based on role.

**`ProtectedRoute`** — accepts `allowedDomain` and `allowedRoles[]`. If user is not authenticated → redirects to `/login`. If user's role is not in `allowedRoles` → redirects to their home dashboard.

---

## 4. Role System

The platform has **11 roles** across 4 categories.

### Global Roles

| Role | Description | Home Route |
|---|---|---|
| `super_admin` | Full platform access, manages departments & users | `/#/super-admin/dashboard` |
| `management` | Cross-department oversight, all employees & projects | `/#/management/dashboard` |

### Department Roles

| Role | Department | Can Assign Tasks | Home Route |
|---|---|---|---|
| `sales_admin` | Sales | Yes (to own dept) | `/#/sales/dashboard` |
| `sales_member` | Sales | No | `/#/sales/dashboard` |
| `production_admin` | Production | Yes (to own dept) | `/#/production/dashboard` |
| `production_member` | Production | No | `/#/production/dashboard` |
| `marketing_admin` | Marketing | Yes (to own dept) | `/#/marketing/dashboard` |
| `marketing_member` | Marketing | No | `/#/marketing/dashboard` |
| `hr_admin` | HR | **No** (restricted) | `/#/hr/dashboard` |
| `hr_member` | HR | No | `/#/hr/dashboard` |

### External Role

| Role | Description | Home Route |
|---|---|---|
| `client` | External clients — own projects, billing, files, team messages | `/#/client/dashboard` |

### Department-Name Derivation

The system derives a user's department name from their role string:

```typescript
const viewerDept = viewerRole
  ?.replace("_admin", "")
  .replace("_member", "");
// "marketing_admin" → "marketing"
// "sales_member"    → "sales"
```

---

## 5. RBAC Permission Matrix

Defined in `src/utils/rbac.ts`.

**Domains**: `sales`, `production`, `marketing`, `hr`, `clients`, `system`, `billing`, `reports`, `files`, `notifications`

**Actions**: `VIEW` (V), `CREATE` (C), `EDIT` (E), `DELETE` (D), `EXPORT` (X), `APPROVE` (A), `ASSIGN` (S)

| Role | sales | production | marketing | hr | clients | billing | reports | files | notifications | system |
|---|---|---|---|---|---|---|---|---|---|---|
| `super_admin` | ALL | ALL | ALL | ALL | ALL | ALL | ALL | ALL | ALL | ALL |
| `management` | V,E | V,E | V,E | V,E | V,E | V,E | V,E | V,E | V,E | V,E |
| `sales_admin` | ALL | — | — | — | ALL | V,C | V,E | V,C,E,D | V,C | — |
| `sales_member` | V,E | — | — | — | V,E | — | — | V,C | V | — |
| `production_admin` | — | ALL | — | — | V | — | V,E | ALL | V,C | — |
| `production_member` | — | V,E | — | — | — | — | — | V,C | V | — |
| `marketing_admin` | — | — | ALL | — | — | — | V,E | ALL | V,C | — |
| `marketing_member` | — | — | V,E | — | — | — | — | V,C | V | — |
| `hr_admin` | — | — | — | ALL | — | — | V,E | ALL | V,C | — |
| `hr_member` | — | — | — | V,E | — | — | — | V,C | V | — |
| `client` | — | V | — | — | V,E | V | — | V | V | — |

### RequirePermission Component

Used to gate UI sections declaratively:

```tsx
<RequirePermission domain="marketing" action="CREATE" fallback={<LockedUI />}>
  <UnlockedContent />
</RequirePermission>
```

---

## 6. Route Architecture

All routes use HashRouter (`/#/path`). Protected routes are wrapped with `<ProtectedRoute allowedDomain="X" allowedRoles={[...]} />`.

### Public Routes

| Path | Component | Guard |
|---|---|---|
| `/login` | `SignIn` | `PublicRoute` |
| `/signup` | `SignUp` | `PublicRoute` |
| `/reset-password` | `ResetPassword` | `PublicRoute` |

### Super Admin Routes — `allowedRoles: ["super_admin"]`

| Path | Component |
|---|---|
| `/super-admin/dashboard` | `SuperAdminPanel` |
| `/super-admin/departments` | `SuperAdminPanel` |
| `/admin/dashboard` | `AdminPanel` |
| `/admin/clients` | `Clients` |
| `/admin/projects` | `Projects` |
| `/admin/billing` | `AdminBilling` |
| `/admin/files` | `AdminFiles` |
| `/admin/notifications` | `AdminNotifications` |
| `/admin/revisions` | `AdminRevisions` |
| `/admin/settings` | `Settings` |
| `/admin/reports` | `Reports` |
| `/admin/email/campaigns` | `Campaigns` |
| `/admin/email/templates` | `Templates` |
| `/admin/email/audience` | `Audience` |
| `/admin/email/analytics` | `Analytics` |
| `/admin/email/automation` | `Automation` |
| `/admin/users` | `Employees` |

### Sales Routes — `allowedRoles: ["sales_admin", "sales_member"]`

| Path | Component | Notes |
|---|---|---|
| `/sales/dashboard` | `SalesPanel` | |
| `/sales/leads` | `SalesPanel` | |
| `/sales/clients` | `Clients` | |
| `/sales/tasks` | `SalesTasks` | Sales-specific task page |
| `/sales/targets` | `SalesTargets` | |
| `/sales/campaigns` | `CampaignBudgets` | |
| `/sales/budgets` | `CampaignBudgets` | Alias |
| `/sales/team-performance` | `TeamPerformance` | |
| `/sales/reports` | `Reports` | |
| `/sales/billing` | `AdminBilling` | |
| `/sales/files` | `AdminFiles` | |
| `/sales/notifications` | `AdminNotifications` | |
| `/sales/settings` | `Settings` | |
| `/sales/profile` | `Profile` | Employee leave request form |
| `/sales/users` | `Employees` | `sales_admin`, `hr_admin`, `management` only |

### Production Routes — `allowedRoles: ["production_admin", "production_member"]`

| Path | Component | Notes |
|---|---|---|
| `/production/dashboard` | `ProductionPanel` | Client assignments + messaging |
| `/production/projects` | `Projects` | |
| `/production/tasks` | `Tasks` | Universal kanban |
| `/production/files` | `AdminFiles` | |
| `/production/reports` | `Reports` | |
| `/production/notifications` | `AdminNotifications` | |
| `/production/settings` | `Settings` | |
| `/production/profile` | `Profile` | Employee leave request form |
| `/production/users` | `Employees` | `production_admin`, `hr_admin`, `management` only |

### Marketing Routes — `allowedRoles: ["marketing_admin", "marketing_member"]`

| Path | Component | Notes |
|---|---|---|
| `/marketing/dashboard` | `MarketingPanel` | Tasks, campaigns, budget tracking |
| `/marketing/leads` | `MarketingPanel` | |
| `/marketing/tasks` | `Tasks` | Universal kanban with budget fields |
| `/marketing/reports` | `Reports` | |
| `/marketing/files` | `AdminFiles` | |
| `/marketing/notifications` | `AdminNotifications` | |
| `/marketing/email/campaigns` | `Campaigns` | |
| `/marketing/email/templates` | `Templates` | |
| `/marketing/email/audience` | `Audience` | |
| `/marketing/email/analytics` | `Analytics` | |
| `/marketing/email/automation` | `Automation` | |
| `/marketing/settings` | `Settings` | |
| `/marketing/profile` | `Profile` | Employee leave request form |
| `/marketing/users` | `Employees` | `marketing_admin`, `hr_admin`, `management` only |

### HR Routes — `allowedRoles: ["hr_admin", "hr_member"]`

| Path | Component | Notes |
|---|---|---|
| `/hr/dashboard` | `HRPanel` | Leave requests, attendance, full employee directory |
| `/hr/users` | `Employees` | `hr_admin`, `management` only |
| `/hr/payroll` | `Payroll` | Salary editor |
| `/hr/tasks` | `Tasks` | HR sees only own assigned tasks |
| `/hr/departments` | `HRPanel` | |
| `/hr/reports` | `Reports` | |
| `/hr/notifications` | `AdminNotifications` | |
| `/hr/profile` | `Profile` | Employee leave request form |

### Management Routes — `allowedRoles: ["management"]`

| Path | Component | Notes |
|---|---|---|
| `/management/dashboard` | `ManagementPanel` | |
| `/management/projects` | `Projects` | |
| `/management/clients` | `Clients` | |
| `/management/billing` | `AdminBilling` | |
| `/management/reports` | `Reports` | |
| `/management/tasks` | `Tasks` | Full visibility over all tasks |
| `/management/notifications` | `AdminNotifications` | |
| `/management/profile` | `Profile` | |
| `/management/users` | `Employees` | `management`, `hr_admin` only |

### Client Routes — `allowedRoles: ["client"]`

| Path | Component |
|---|---|
| `/client/dashboard` | `ClientPanel` |
| `/client/projects` | `MyProjects` |
| `/client/billing` | `ClientBilling` |
| `/client/files` | `ClientFiles` |
| `/client/notifications` | `ClientNotifications` |
| `/client/revisions` | `MyRevisions` |
| `/client/profile` | `Profile` (company profile branch) |

---

## 7. Sidebar Menu Configuration

Defined in `src/config/menuConfig.ts`. Each role maps to an explicit ordered array of `MenuItem` objects. `AppSidebar` reads this config directly.

```typescript
interface MenuItem {
  key: string;
  label: string;
  icon: "grid" | "users" | "task" | "dollar" | "file" | "mail"
      | "user-circle" | "settings" | "bell" | "folder" | "shield" | "chart";
  path?: string;           // omit when item has subItems
  subItems?: SubMenuItem[];
}
```

### Per-Role Menu Summary

| Role | Menu Items |
|---|---|
| `super_admin` | Super Admin, Admin Panel, Clients, Projects, Billing, Files, Email Marketing (5 sub), Notifications, Revisions, Settings, Employees, Departments |
| `management` | Dashboard, Projects, Employees, Clients, Billing, Reports, Tasks, Notifications, Profile |
| `sales_admin` | Dashboard, Leads, Clients, Campaigns & Budgets, Sales Targets, Tasks, Team Performance, Employees, Reports, Billing, Files, Notifications, Settings, Profile |
| `sales_member` | Dashboard, Leads, Clients, My Tasks, My Targets, Files, Notifications, Profile |
| `production_admin` | Dashboard, Projects, Employees, Tasks, Files, Reports, Notifications, Settings, Profile |
| `production_member` | Dashboard, Projects, Tasks, Files, Notifications, Profile |
| `marketing_admin` | Dashboard, Email Marketing (5 sub), Leads, Tasks, Reports, Files, Employees, Notifications, Settings, Profile |
| `marketing_member` | Dashboard, Email (3 sub: Campaigns/Templates/Audience), Leads, Files, Notifications, Profile |
| `hr_admin` | Dashboard, Employees, Payroll, Tasks, Reports, Notifications, Profile |
| `hr_member` | Dashboard, Notifications, Profile |
| `client` | Dashboard, My Projects, Billing, Files, Revisions, Notifications, Profile |

---

## 8. Data Layer

### Mock API Client (`src/lib/client.ts`)

Intercepts all `api.get()`, `api.post()`, `api.put()`, `api.delete()` calls and returns mock data. In production, replace this file with real HTTP calls.

```typescript
const api = {
  get:    (path: string) => mockGet(path),
  post:   (path: string, body: unknown) => mockPost(path, body),
  put:    (path: string, body: unknown) => mockPut(path, body),
  delete: (path: string) => mockDelete(path),
};
```

### UserService (`src/services/userService.ts`)

```typescript
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  departmentId?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
}

UserService.getAll()                 // → Promise<UserProfile[]>
UserService.create(profile)          // → Promise<UserProfile>
UserService.update(id, partial)      // → Promise<UserProfile>
UserService.delete(id)               // → Promise<void>
```

### FileService (`src/services/fileService.ts`)

```typescript
FileService.getAll()                       // → Promise<FileRecord[]>
FileService.getByProjectId(projectId)      // → Promise<FileRecord[]>
FileService.create(record)                 // → Promise<FileRecord>
FileService.delete(id)                     // → Promise<void>
```

### useFiles Hook (`src/hooks/useFiles.ts`)

```typescript
const { files, isLoading, error, uploadFile, deleteFile, refreshFiles } = useFiles(projectId?)
```

When called without `projectId`, fetches all files. For `client` role, automatically filters to `f.clientId === user.id`.

### NotificationService (`src/services/notificationService.ts`)

```typescript
NotificationService.create({
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
})
```

Called when tasks are moved to "done" — notifies super_admin, management, hr_admin, and the task's dept admin.

### useNotifications Hook (`src/hooks/useNotifications.ts`)

```typescript
const {
  notifications, unreadCount, isLoading, error,
  markAsRead, markAllAsRead, deleteNotification,
  addNotification, refreshNotifications
} = useNotifications()
```

For `client` role: performs an email-based lookup via `api.get("/saas/v1/clients/list?email=...")` to resolve the correct `clientId` before fetching notifications.

Syncs across tabs via `BroadcastChannel("saas_notifications")` and `storage` event listener.

### Storage Utility (`src/lib/storage.ts`)

```typescript
function safeParse<T>(jsonStr: string | null, fallback: T): T
```

Safe JSON read from localStorage that returns `fallback` on parse errors. Used throughout the codebase for all localStorage reads.

---

## 9. Dashboard Panels

### SuperAdminPanel (`/#/super-admin/dashboard`)

**Audience**: `super_admin` only

**KPI Cards** (6-card, 3-column grid):
- Total Employees — `users.filter(u => u.role !== "client").length` (live from API)
- Organizations — mock count
- Active Subscriptions — mock count
- Total Revenue — mock value
- Active Departments — mock count
- Total Users — `users.length`

**Sections**:
- Revenue trend chart (ApexCharts area chart, last 7 days mock data)
- Admin Users table (all `*_admin` roles except super_admin)
- Departments & Employees management — full CRUD (add/edit/delete departments, add employees to dept)
- Recent Payments table
- Client Subscription & Billing Status table

---

### AdminPanel (`/#/admin/dashboard`)

**Audience**: `super_admin` only

**KPI Cards**: Total Clients, Active Projects, Pending Payments, Completed Projects

---

### ManagementPanel (`/#/management/dashboard`)

**Audience**: `management` only

**KPI Cards** (4):
- Total Employees — fetched from `UserService.getAll()`, filters out clients; falls back to mock count
- Active Teams
- Active Departments
- Ongoing Projects

**Tabs**: Overview | Directory | Workflow | Communication

- **Directory**: Department list, teams list, employee directory table (search + filter)
- **Workflow**: Assign workflow form (requires `production` ASSIGN permission), project progress monitor
- **Communication**: Compose message form to department heads

---

### HRPanel (`/#/hr/dashboard`)

**Audience**: `hr_admin`, `hr_member`

**KPI Cards** (4):
- **Total Employees** — live headcount from `UserService.getAll()` (non-client users); falls back to `employees.length`
- Active Departments — mock count
- **Pending Leave Requests** — live count from `optivax_leave_requests` localStorage where `status === "Pending"`
- **Absent Today** — live count: employees whose attendance for today's date is `"Absent"` in `optivax_attendance`

**Tabs**: Directory | Leave Requests | Attendance

#### Directory Tab

- Loads all non-client users from `UserService.getAll()`
- Loads `optivax_employee_extra` localStorage; seeds missing entries with defaults
- Search bar filters by name / email / role across all employees
- Employees grouped by department (`departmentId` or `role.split("_")[0]`)
- Columns: Employee (name + email), Role badge, Leaves (Taken / Remaining), Salary (Rs.), Deduction (Rs.), Salary Status badge, Work Mode badge
- Deduction formula: `leavesTaken > 10 ? (leavesTaken − 10) × (salary / 30) : 0`
- `+ Add Employee` button gated by `RequirePermission domain="hr" action="CREATE"` → links to `/#/hr/users`
- Listens to `storage` events on `optivax_employee_extra` for live Payroll sync

#### Leave Requests Tab

- Loads `optivax_leave_requests` from localStorage on mount
- Filter bar: All / Pending / Approved / Rejected
- Tab label shows live pending count badge
- `hr_admin` can approve or reject each request (requires `hr APPROVE` permission)
- Status changes written back to localStorage and broadcast via `storage` event
- Cross-tab sync: `window.addEventListener("storage", onStorage)` re-reads on changes

#### Attendance Tab

- Date picker (max = today) to browse historical attendance
- Summary bar shows Present / Absent / Late counts for selected date
- Full table: Employee / Role / Department / Work Mode / Status / Mark columns
- Mark column: segmented Present / Late / Absent toggle buttons; green / orange / red when active
- Gated by `RequirePermission domain="hr" action="EDIT"`
- Persisted as `Record<date-string, Record<userId, AttendanceStatus>>` in `optivax_attendance`

---

### SalesPanel (`/#/sales/dashboard`)

**Audience**: `sales_admin`, `sales_member`

Sales KPIs (revenue, leads, conversion rate, etc.), leads management, client list, task summary tabs.

---

### ProductionPanel (`/#/production/dashboard`)

**Audience**: `production_admin`, `production_member`

Full detail in §14 — Production Client Access Control.

**KPI Cards**:
- `production_admin`: "All Clients" count
- `production_member`: "My Clients" count (assigned clients only)

**Tabs**: Clients | Communications Log (admin) · My Clients (member)

---

### MarketingPanel (`/#/marketing/dashboard`)

**Audience**: `marketing_admin`, `marketing_member`

See full detail in §13 — Marketing Campaign System.

**KPI Cards** — role-specific:

| Role | Card 1 | Card 2 | Card 3 | Card 4 |
|---|---|---|---|---|
| `marketing_admin` | Total Ad Budget | Total Spent | Active Campaigns | Assigned Tasks |
| `marketing_member` | My Assigned Tasks | Task Budget Allocated | Budget Used | Budget Remaining |

**Tabs**:
- Member default order: Tasks → My Campaigns → Content → Analytics
- Admin default order: Campaigns → Tasks → Content → Analytics

---

### ClientPanel (`/#/client/dashboard`)

**Audience**: `client` only

Real data from `useProjects()` and `useInvoices()` hooks.

**KPI Cards** (4):
- Active Project — first in-progress project name
- Completion — average progress % of active projects
- Pending Invoice — sum of pending + overdue invoice amounts
- Available Files — total file count across all projects

**Sections**:
- Project Progress — progress bars per active project
- Recent Invoices — last 3 invoices with download PDF links (if `invoice_url` available)

---

## 10. HR Module

### Employees Page (`src/pages/HR/Employees.tsx`)

Shared across departments — the route prefix determines which employees are shown:

| Route | Shows |
|---|---|
| `/admin/users` | All users |
| `/sales/users` | `role.startsWith("sales")` users |
| `/production/users` | `role.startsWith("production")` users |
| `/marketing/users` | `role.startsWith("marketing")` users |
| `/hr/users` | `role.startsWith("hr")` users |
| `/management/users` | All non-client users |

**Viewer role flags**:

```typescript
const isSuper    = viewerRole === "super_admin";
const isManager  = viewerRole === "management";
const isHRAdmin  = viewerRole === "hr_admin";
const isDeptAdmin = viewerRole?.endsWith("_admin") && !isHRAdmin && !isSuper && !isManager;

const canSeeSalary = isSuper || isManager || isHRAdmin;
const canAdd       = isSuper || isHRAdmin;
```

**Column visibility**:

| Column | All viewers | canSeeSalary only |
|---|---|---|
| Employee (name/email/role) | ✓ | |
| Leave Status (taken/remaining) | ✓ | |
| Work Mode (Onsite/Remote) | ✓ | |
| Actions | ✓ | |
| Salary (Rs.) | | ✓ |
| Deduction (Rs.) | | ✓ |
| Salary Status (Paid/Unpaid) | | ✓ |

**Employee Extra Data** (stored in `optivax_employee_extra` localStorage):

```typescript
interface EmployeeExtraData {
  userId: string;
  leavesTaken: number;          // max 24 per year
  salary: number;               // default Rs. 45,000
  salaryStatus: "Paid" | "Unpaid";
  workMode: "Onsite" | "Remote";
}
```

**Deduction Formula**:
```
deduction = leavesTaken > 10 ? (leavesTaken - 10) × (salary / 30) : 0
```

**Add Employee Modal** — payroll & leave settings section is gated by `canSeeSalary`:

```tsx
{!editingEmployee && canSeeSalary && (
  // Salary, Leave Quota, Work Mode, Salary Status fields
)}
```

---

### Payroll Page (`src/pages/HR/Payroll.tsx`)

**Access**: `/hr/payroll` — `hr_admin` and `hr_member`

**Purpose**: Edit salary, leave balances, work mode, and payment status for all employees.

**Persistence**: Reads and writes `optivax_employee_extra` localStorage key. Publishes `storage` event so HRPanel Directory tab updates live.

**Default salary**: Rs. 45,000

---

## 11. Leave Request System

All department employees (non-client, non-HR-admin roles) can request leave from their Profile page. HR admin reviews and approves or rejects.

### Flow

```
Employee visits /#/<dept>/profile
  → Profile.tsx detects user.role !== "client" → shows employee branch
  → Employee fills leave request form
  → On submit → LeaveRequest written to optivax_leave_requests localStorage

HR admin visits /#/hr/dashboard → Leave Requests tab
  → HRPanel reads optivax_leave_requests
  → Approves or rejects → status updated in localStorage
  → Pending count KPI card reflects live state
```

### LeaveRequest Interface (exported from `src/pages/Client/Profile.tsx`)

```typescript
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  type: "Annual" | "Sick" | "Personal" | "Emergency";
  startDate: string;       // ISO date
  endDate: string;         // ISO date
  days: number;            // auto-calculated from date range
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;     // ISO timestamp
}
```

**Persistence key**: `optivax_leave_requests` (imported as `LEAVE_REQUESTS_KEY` from `Profile.tsx`)

### Profile.tsx — Dual-Mode Behavior

| User Role | Branch Shown |
|---|---|
| `client` | Company profile form + billing address form |
| Any employee role | Employee info card + Request Leave form + My Leave History table |

**Employee branch fields**:
- Leave Type: Annual / Sick / Personal / Emergency
- Start Date and End Date (end date min = start date; days auto-calculated)
- Reason (textarea, max 500 chars)
- Submit writes to `optivax_leave_requests`, bumps version state to re-render leave history table

### HRPanel Leave Requests Tab

- Filter bar: All / Pending / Approved / Rejected
- Tab label shows live pending count
- Approve / Reject buttons gated by `RequirePermission domain="hr" action="APPROVE"`
- Cross-tab sync via `window.addEventListener("storage", ...)` — HR sees new requests appear without page refresh

### Attendance System

```typescript
const ATTENDANCE_KEY = "optivax_attendance";
type AttendanceStatus = "Present" | "Absent" | "Late";

// Storage structure:
type AttendanceStore = Record<string,      // date "YYYY-MM-DD"
                       Record<string,      // userId
                       AttendanceStatus>>;
```

- Date picker defaults to today; browsing historical dates does not modify today's KPI
- "Absent Today" KPI reads `optivax_attendance[todayStr][employeeId]` for each employee
- Mark buttons gated by `RequirePermission domain="hr" action="EDIT"` — HR members can view but not edit

---

## 12. Task Management System

### MockTask Interface (`src/pages/Common/Tasks.tsx`)

```typescript
export interface MockTask {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  priority: "low" | "medium" | "high";
  assignee: string;        // display name
  assigneeId?: string;     // User.id reference
  dueDate: string;         // ISO date string
  budget?: number;         // Rs. — set by marketing admin for campaign tasks
  budgetUsed?: number;     // Rs. — updated by assigned employee
  category?: "general" | "campaign" | "content" | "analytics";
}
```

**Persistence**: `mock_tasks` localStorage key

---

### Role Flags in Tasks.tsx

```typescript
const isMember    = viewerRole?.endsWith("_member");
const isHRAdmin   = viewerRole === "hr_admin" || viewerRole?.startsWith("hr");
const isManager   = viewerRole === "management";
const isSuper     = viewerRole === "super_admin";
const isDeptAdmin = viewerRole?.endsWith("_admin") && !isHRAdmin && !isSuper && !isManager;
const viewerDept  = viewerRole?.replace("_admin", "").replace("_member", "");

// Marketing context detection
const isMarketingRoute    = location.pathname.startsWith("/marketing");
const isMarketingAdmin    = viewerRole === "marketing_admin";
const showBudgetFields    = isMarketingRoute && (isMarketingAdmin || isDeptAdmin);
```

---

### Task Assignment Rules

| Role | Can Create/Assign | Assign To | Can See | Can Move |
|---|---|---|---|---|
| `super_admin` | Yes | Anyone | All tasks | Any task |
| `management` | Yes | Anyone (all depts, all roles) | All tasks | Any task |
| `sales_admin` | Yes | Sales dept employees | Sales dept tasks | Sales dept tasks |
| `production_admin` | Yes | Production dept employees | Production dept tasks | Production dept tasks |
| `marketing_admin` | Yes | Marketing dept employees | Marketing dept tasks | Marketing dept tasks |
| `hr_admin` | **No** | Cannot assign | Own assigned tasks only | Own tasks only |
| `*_member` | No | — | Own assigned tasks | Own tasks only |

```typescript
// canAddTask excludes HR admin:
const canAddTask = isSuper || isManager || isDeptAdmin;
```

---

### visibleTasks Filter

```typescript
const visibleTasks = tasks.filter((t) => {
  if (!user) return false;
  if (isMember || isHRAdmin) return t.assigneeId === user.id;
  if (isSuper || isManager) return true;
  if (isDeptAdmin) {
    const assignee    = t.assigneeId ? usersById[t.assigneeId] : undefined;
    const assigneeDept = assignee?.departmentId;
    return (
      assigneeDept === `dept-${viewerDept}` ||
      (assignee?.role && assignee.role.startsWith(viewerDept ?? ""))
    );
  }
  return false;
});
```

---

### Assignee Dropdown (Add Task Form)

```tsx
{(isSuper || isManager || isDeptAdmin) && ( // HR excluded
  <select>
    {users
      .filter((u) => {
        if (u.role === "client") return false;
        if (isSuper || isManager) return true;
        return (
          u.role?.startsWith(viewerDept ?? "") ||
          u.departmentId === `dept-${viewerDept}`
        );
      })
      .map((u) => (
        <option key={u.id} value={u.id}>
          {u.full_name || u.email} ({u.role})
        </option>
      ))}
  </select>
)}
```

---

### Kanban Board Layout

Four columns rendered in order:

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   To Do      │  In Progress │    Done      │   Blocked    │
│              │              │              │              │
│  [TaskCard]  │  [TaskCard]  │  [TaskCard]  │  [TaskCard]  │
│  [TaskCard]  │              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

Each `TaskCard` shows: title, priority badge, category badge, description, assignee, due date, and budget panel (if applicable).

### Budget Panel in TaskCard

Displayed when `task.budget !== undefined && task.budget > 0`:

```
┌─────────────────────────────────────┐
│  Budget                             │
│  Allocated:  Rs. 50,000             │
│  Used:       Rs. 32,000   (64%)     │
│  Remaining:  Rs. 18,000             │
│  [████████░░░░░░░░] 64%             │
│                                     │
│  [Update my spending]  ← members   │
└─────────────────────────────────────┘
```

Color coding: Green `< 70%` · Amber `70–89%` · Red `≥ 90%`

---

### Task Completion Notification

When any task is moved to `"done"`, `NotificationService.create()` is called for:
- All `super_admin` users
- All `management` users
- All `hr_admin` users
- Dept admins whose `departmentId` matches the task assignee's department

---

### Management Tracking Panel

Visible below the kanban board only for `management` role:
- Groups tasks by assignee role
- Role filter + status filter dropdowns
- Clicking a task navigates to the assignee's employees page

---

## 13. Marketing Campaign System

### Campaign Permission Flow

```
marketing_admin  ──→ Always can create campaigns
                                │
marketing_member ──→ Check mock_tasks localStorage:
                       Does the member have any task where:
                         task.category === "campaign"
                         OR task.title.toLowerCase().includes("campaign")
                       AND task.assigneeId === user.id
                                │
                     YES ──→ Show campaign creation form
                               (budget auto-filled from linked task)
                     NO  ──→ Show locked UI with padlock + explanation
```

### Campaign Interface

```typescript
interface MarketingCampaign {
  id: string;
  name: string;
  platform: "Facebook" | "Google Ads" | "LinkedIn" | "Twitter" | "Instagram";
  status: "Active" | "Draft" | "Completed";
  budget: number;          // Rs.
  spent: number;           // Rs.
  createdBy?: string;      // user.id of creator
  linkedTaskId?: string;   // task that authorized this campaign creation
}
```

**Persistence**: `marketing_campaigns` localStorage key

**Visibility**:
- `marketing_admin`: sees all campaigns
- `marketing_member`: sees only campaigns where `createdBy === user.id`

---

### MarketingPanel Tabs

#### Tasks Tab
- Shows tasks from `mock_tasks` localStorage
- Member: filtered to `assigneeId === user.id`
- Admin: sees all marketing dept tasks
- Each `TaskRow` shows full budget breakdown with "Update my spending" for members

#### Campaigns Tab
- Campaign CRUD with platform, status, budget, spent
- Member: locked padlock if no campaign task assigned
- Member: campaign creation pre-fills budget from linked task's `budget` field

#### Content Tab
- Lists tasks with `category === "content"` or content-related keywords
- Members can update task status inline

#### Analytics Tab
- Campaign spend rate cards
- Progress bars showing budget utilization per campaign

---

## 14. Production Client Access Control

The production team has a two-tier client visibility model: admins see all clients, members see only the clients explicitly assigned to them.

### Access Model

| Role | Clients Visible | Can Message Clients |
|---|---|---|
| `production_admin` | All clients | No (admin manages, doesn't message) |
| `production_member` | Only assigned clients | Yes — can message linked clients directly |

### Data Structures

```typescript
// src/pages/Dashboard/ProductionPanel.tsx

const PROD_ASSIGNMENTS_KEY = "production_client_assignments";
const PROD_MESSAGES_KEY    = "optivax_client_messages";

// Assignment map: memberId → array of clientIds
type AssignmentStore = Record<string, string[]>;

interface ClientMessage {
  id: string;
  fromId: string;         // production_member user.id
  fromName: string;       // production_member display name
  toClientId: string;     // MOCK_CLIENTS entry id (e.g. "c1")
  toClientName: string;   // MOCK_CLIENTS entry name
  message: string;
  sentAt: string;         // ISO timestamp
}
```

### Production Admin View

- **Clients tab**: table of all MOCK_CLIENTS with inline checkboxes per member
- Checking a checkbox calls `toggleAssignment(clientId, memberId)` which updates `production_client_assignments`
- Each client row shows comma-joined list of assigned members
- **Communications Log tab**: full history of all messages sent to clients

### Production Member View

```typescript
const myClients = isAdmin
  ? MOCK_CLIENTS
  : MOCK_CLIENTS.filter((c) =>
      (assignments[user.id] ?? []).includes(c.id)
    );
```

- Card grid of assigned clients (company name, project status, contact)
- "Locked" placeholder card if member has no assigned clients
- **Message Client** button per card → opens compose modal

### Message Modal Flow

```
Member clicks "Message Client"
  → Modal opens with client name pre-filled
  → Member types message → Submit
  → ClientMessage object saved to optivax_client_messages localStorage
  → Client sees message in Notifications page → "Messages from Team" tab
```

### MOCK_CLIENTS

Defined locally in `ProductionPanel.tsx` — 4 clients with fields: `id`, `name`, `company`, `email`, `phone`, `status`, `projectCount`.

Projects linked to clients via `clientId` field on `MOCK_PROJECTS` entries.

---

## 15. Sales Module

All sales pages are at `src/pages/Sales/`.

### SalesTasks (`/sales/tasks`)

Sales-specific task list (separate from universal Tasks kanban). Shows pipeline tasks, calls-to-action, deal progression. `sales_admin` can create and assign; `sales_member` sees own tasks.

### SalesTargets (`/sales/targets`)

Individual and team sales targets. Shows quota vs. achieved with progress tracking.

### CampaignBudgets (`/sales/campaigns`)

Sales campaign budget allocation and spend tracking. Different from marketing campaigns — focused on sales outreach budget distribution.

### TeamPerformance (`/sales/team-performance`)

Sales team metrics: individual rankings, call volumes, deal close rates, revenue per rep.

---

## 16. Email Marketing Module

Pages are at `src/pages/Admin/Email/`. Available to both `super_admin` and `marketing_admin`/`marketing_member` (under different URL prefixes).

### Campaigns (`/*/email/campaigns`)

Create and manage email campaign sends. Integrates with `useEmailMarketing` hook (mock data).

### Templates (`/*/email/templates`)

HTML email template library. Create, preview, edit templates.

### Audience (`/*/email/audience`)

Contact list management. Segmentation, import/export contacts.

### Analytics (`/*/email/analytics`)

Email campaign performance: open rates, click rates, unsubscribes, delivery stats.

### Automation (`/*/email/automation`)

Drip sequence builder. Trigger-based email flows (e.g., onboarding, follow-up sequences).

---

## 17. Common Pages

Shared pages reused across multiple department contexts. The route prefix (`/sales/`, `/production/`, etc.) scopes what data they show.

| Page | Path Pattern | Description |
|---|---|---|
| `Reports` | `/*/reports` | Analytics charts and data export |
| `Tasks` | `/*/tasks` | Universal kanban board (see §12) |
| `Clients` | `/*/clients` | Client CRM list |
| `Projects` | `/*/projects` | Project tracker |
| `AdminBilling` | `/*/billing` | Invoice and payment management |
| `AdminFiles` | `/*/files` | File manager with drag-and-drop upload |
| `AdminNotifications` | `/*/notifications` | Notification inbox |
| `AdminRevisions` | `/admin/revisions` | Client revision request tracker |
| `Settings` | `/*/settings` | Stripe configuration, API settings |
| `Profile` | `/*/profile` | Dual: client company profile OR employee leave request form |

---

## 18. Client Portal

Isolated section at `/#/client/*`. Clients can only see their own data. All pages use real hooks — no hardcoded content.

| Page | Path | Description |
|---|---|---|
| `ClientPanel` | `/client/dashboard` | Live overview: active projects, avg progress, pending invoices, file count |
| `MyProjects` | `/client/projects` | Real projects list + revision request modal via `api.post` |
| `ClientBilling` | `/client/billing` | Real invoices from `useInvoices()` + Stripe payment integration |
| `ClientFiles` | `/client/files` | Real files from `useFiles()` filtered by `clientId === user.id` |
| `MyRevisions` | `/client/revisions` | Revision history from `api.get("/saas/v1/revisions/list")` |
| `ClientNotifications` | `/client/notifications` | Real notifications + "Messages from Team" tab |
| `Profile` | `/client/profile` | Company profile + billing address (client branch of Profile.tsx) |

### ClientFiles (`src/pages/Client/Files.tsx`)

- Uses `useFiles()` hook — auto-filters to `f.clientId === user.id` for client role
- Loading spinner, error state, contextual empty state
- Search bar filtering by file name or MIME type
- File size formatted (B / KB / MB / GB), upload date formatted
- Download button uses `file.url`; disabled state if no URL available
- Grid layout: 1 column on mobile, 2 columns on tablet+

### ClientNotifications (`src/pages/Client/Notifications.tsx`)

Two-tab layout:

#### Notifications Tab
- Uses `useNotifications()` hook (with client-specific email-based ID lookup)
- Click notification to mark as read (blue highlight for unread)
- Dismiss (✕) button per notification
- "Mark all as read" button in header when unread count > 0
- `actionUrl` / `actionLabel` rendered as clickable link when present
- Relative timestamps via `timeAgo()` helper

#### Messages from Team Tab
- Reads `optivax_client_messages` from localStorage
- Tries to match `toClientName === user.name` (case-insensitive)
- Falls back to showing all messages if no name-match (demo safety net)
- Messages shown newest-first
- Each message shows sender avatar initial, name, "Production Team" label, relative timestamp

---

## 19. Notification System

### SSE Hook (`src/hooks/useSSE.ts`)

Connects to the backend Server-Sent Events endpoint for real-time notification delivery.

**URL construction**:
```typescript
const buildSseUrl = (): string => {
  const apiBase = import.meta.env.VITE_API_BASE?.replace(/\/$/, "");
  const ssePath = import.meta.env.VITE_SSE_PATH ?? "/notifications/stream";
  if (apiBase) return `${apiBase}${ssePath}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api${ssePath}`;
  }
  return `/api${ssePath}`;
};
```

**Features**:
- Exponential backoff with jitter on reconnect
- Fires `saas:notification` custom DOM event on receive
- Persists `saas:lastNotificationId` to localStorage to avoid duplicate toasts

### useNotifications Hook (`src/hooks/useNotifications.ts`)

Provides full notification management:

```typescript
{
  notifications,         // Notification[]
  unreadCount,           // number
  isLoading,             // boolean
  error,                 // string | null
  markAsRead,            // (id) => Promise<void>
  markAllAsRead,         // () => Promise<void>
  deleteNotification,    // (id) => Promise<void>
  addNotification,       // (data) => Promise<Notification>
  refreshNotifications,  // () => void
}
```

Cross-tab sync via `BroadcastChannel("saas_notifications")` and `storage` event listener.

For `client` role: email-based lookup resolves correct clientId before fetching.

### Task Completion Notifications

When a task is moved to `status: "done"`:
```typescript
NotificationService.create({
  userId: adminId,
  title: "Task Completed",
  message: `"${task.title}" has been marked as done by ${assigneeName}`,
  type: "success",
});
```

Recipients: `super_admin`, `management`, `hr_admin`, and the department admin whose dept matches the task's assignee.

---

## 20. UI Layout & Components

### AppLayout (`src/layout/AppLayout.tsx`)

Root wrapper for all authenticated pages:

```
┌─────────────────────────────────────────────┐
│  AppHeader (top bar)                         │
├──────────────┬──────────────────────────────┤
│              │                              │
│  AppSidebar  │   <Outlet />                 │
│  (left nav)  │   (page content)             │
│              │                              │
└──────────────┴──────────────────────────────┘
```

### AppSidebar (`src/layout/AppSidebar.tsx`)

- Reads `MENU_CONFIG[user.role]` from `src/config/menuConfig.ts`
- Renders icons via inline SVG icon map
- Supports collapsible sub-menus (e.g., Email Marketing)
- Logo URL from `VITE_LOGO_URL` env var, falls back to `/logo-icon.png`
- Highlights active route

### AppHeader (`src/layout/AppHeader.tsx`)

- Dark mode toggle
- Notification bell with unread count badge
- User avatar dropdown (profile link, logout)
- Responsive mobile hamburger

---

## 21. Environment Configuration

All environment variables use the `VITE_` prefix (Vite convention — only these are exposed to browser code).

| Variable | Default / Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api` | Base URL for API requests |
| `VITE_API_BASE` | `http://localhost:8000/api` | Also used for SSE URL construction |
| `VITE_SSE_PATH` | `/notifications/stream` | Path appended to VITE_API_BASE for SSE |
| `VITE_LOGO_URL` | _(empty — use local asset)_ | Override sidebar/auth logo URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | _(set in production)_ | Stripe.js publishable key |

Configure by copying `.env.example` to `.env` and filling in values. The mock API client ignores `VITE_API_URL` for data — it intercepts all calls locally.

---

## 22. localStorage Keys Reference

| Key | Value Type | Written By | Read By | Purpose |
|---|---|---|---|---|
| `mock_tasks` | `MockTask[]` | `Tasks.tsx` | `Tasks.tsx`, `MarketingPanel.tsx` | All tasks across all departments |
| `marketing_campaigns` | `MarketingCampaign[]` | `MarketingPanel.tsx` | `MarketingPanel.tsx` | Marketing campaigns with ownership + linked tasks |
| `optivax_employee_extra` | `Record<userId, EmployeeExtraData>` | `Employees.tsx`, `Payroll.tsx` | `HRPanel.tsx`, `Employees.tsx` | Salary, leaves, work mode, pay status per employee |
| `optivax_leave_requests` | `LeaveRequest[]` | `Profile.tsx` (employee branch) | `HRPanel.tsx` | Leave requests submitted by all department employees |
| `optivax_attendance` | `Record<date, Record<userId, AttendanceStatus>>` | `HRPanel.tsx` | `HRPanel.tsx` | Daily attendance records per employee |
| `production_client_assignments` | `Record<memberId, clientId[]>` | `ProductionPanel.tsx` (admin) | `ProductionPanel.tsx` (member) | Which clients each production member can access |
| `optivax_client_messages` | `ClientMessage[]` | `ProductionPanel.tsx` (member) | `ClientNotifications.tsx` | Messages from production members to their linked clients |
| `saas:lastNotificationId` | `string` | `useSSE.ts` | `useSSE.ts` | Tracks last received SSE notification to avoid re-toasting |
| _(auth user)_ | `User` | `AuthContext.tsx` | `AuthContext.tsx` | Logged-in user session |

---

## 23. Key Architectural Decisions

### 1. No Live Backend

All API calls are intercepted by `src/lib/client.ts` and return mock data. This makes the dashboard fully runnable offline. In production, replace the mock client with real HTTP calls — all services and components call through the same `api.*` interface so the swap is isolated.

### 2. HashRouter

All routes use `/#/path`. This avoids server-side routing configuration — the app can be served from any static file host. The tradeoff is that server-rendered paths (e.g., sharing a direct URL) require the host to serve `index.html` for all routes.

### 3. Single Tasks Component for All Departments

`src/pages/Common/Tasks.tsx` is mounted at `/production/tasks`, `/marketing/tasks`, `/hr/tasks`, and `/management/tasks`. Route-context detection via `useLocation().pathname.startsWith("/marketing")` enables marketing-specific features (budget fields, category dropdown) without separate page files.

### 4. Salary Gated Client-Side

`canSeeSalary = isSuper || isManager || isHRAdmin` controls all three salary columns and the payroll section of the Add Employee form. In production this must also be enforced server-side — the client-side gate is UI-only.

### 5. Campaign Permission Derived from Task Data

A marketing member's right to create campaigns is computed dynamically from their assigned tasks in localStorage. This "task-unlocks-feature" pattern means features can be granted without changing role permissions — just assign the right task category.

### 6. Department Isolation

Dept admins see only users/tasks in their own department. Enforced in two places:
- **Assignee dropdown**: filtered by `role.startsWith(viewerDept)` or `departmentId === "dept-${viewerDept}"`
- **visibleTasks**: filtered by assignee's department

### 7. HR Admin is Operationally Restricted

`hr_admin` cannot create or assign tasks (same as a member for task purposes). This prevents HR from having operational control over other departments' work streams while still giving them full access to employee and payroll data.

### 8. RBAC Supplemented by Imperative Role Checks

The formal `rbac.ts` permission matrix handles domain-level access (e.g., can this role view the marketing domain?). But finer-grained rules (e.g., HR admin cannot assign tasks even though they have hr domain CREATE permission) are handled with explicit role boolean flags (`isHRAdmin`, `isDeptAdmin`, etc.) at the component level. This is an intentional trade-off for clarity — the RBAC matrix stays simple while special cases are visible in code.

### 9. Leave Request Cross-Tab Sync

Both `Profile.tsx` (writer) and `HRPanel.tsx` (reader) run in the same browser but potentially in different tabs. `HRPanel.tsx` listens to `window.storage` events on `optivax_leave_requests` so new submissions appear without page refresh. The same pattern is used for `optivax_employee_extra` between `Payroll.tsx` and `HRPanel.tsx`.

### 10. Production Client Isolation via Assignment Map

Rather than embedding client access in the RBAC matrix, production member ↔ client access is stored as a separate `Record<memberId, clientId[]>` in localStorage. The admin can change assignments without touching roles or permissions. `myClients` is derived at render time from this map.

### 11. Dual-Mode Profile Page

`Profile.tsx` serves two completely different experiences from one file — a company profile form for `client` role and an employee leave request system for all staff roles. The branch is decided by `user.role !== "client"`. This avoids route duplication since `/*/profile` is already registered for every department.

### 12. Client Notification Message Matching

Messages sent by production members reference mock client IDs (`c1`, `c2`, etc.) which differ from logged-in client user IDs. The `ClientNotifications` page matches by `toClientName === user.name` (case-insensitive) and falls back to showing all messages if no match is found, ensuring the demo always shows something.

---

## 24. Department Scoping Pattern

The pattern used throughout the codebase to scope data to a department:

```typescript
// 1. Derive department from role
const viewerDept = viewerRole
  ?.replace("_admin", "")
  .replace("_member", "");
// "marketing_admin" → "marketing"
// "sales_member"    → "sales"

// 2. Match users to that department
const isDeptUser = (u: UserProfile) =>
  u.role?.startsWith(viewerDept ?? "") ||
  u.departmentId === `dept-${viewerDept}`;

// 3. Match tasks to that department (via assignee lookup)
const isDeptTask = (t: MockTask) => {
  const assignee = usersById[t.assigneeId ?? ""];
  return (
    assignee?.departmentId === `dept-${viewerDept}` ||
    assignee?.role?.startsWith(viewerDept ?? "")
  );
};
```

Used in: `Tasks.tsx` (visibleTasks, assignee dropdown), `Employees.tsx` (row filter), `MarketingPanel.tsx` (task filter), `HRPanel.tsx` (employee grouping).

---

## Summary Flow Diagram

```
User visits /#/
     ↓
PublicRoute guard
  → if authenticated → redirect to role home
  → else → /login
     ↓ (after login)
AuthContext.login()
  → mock API → returns User{role}
  → stores in state + localStorage
  → redirect to /<role-home>/dashboard
     ↓
AppLayout renders
  → AppSidebar reads MENU_CONFIG[role]
  → AppHeader shows user info + notification bell
  → <Outlet> renders the page
     ↓
ProtectedRoute wraps every section
  → checks role + domain permission
  → unauthorized → redirect to role home
     ↓
Page renders using:
  → useAuth() for current user + permissions
  → RequirePermission for UI gating
  → api.* calls → mock client → mock data
  → localStorage for tasks, campaigns, employee extras,
    leave requests, attendance, client assignments, messages
     ↓
Leave Request Flow:
  → Employee: Profile.tsx → writes optivax_leave_requests
  → HR Admin: HRPanel.tsx → reads + approves/rejects
  → Cross-tab sync via storage event
     ↓
Production Client Flow:
  → Admin: ProductionPanel → assigns clients to members (production_client_assignments)
  → Member: ProductionPanel → sees only assigned clients → messages them (optivax_client_messages)
  → Client: ClientNotifications → "Messages from Team" tab reads optivax_client_messages
     ↓
Notifications:
  → useSSE connects to VITE_API_BASE + VITE_SSE_PATH
  → fires saas:notification DOM event on receive
  → useNotifications hook reads/writes notification state
  → task completion → NotificationService.create() for admins
  → client-role lookup resolves clientId via email API call
```
