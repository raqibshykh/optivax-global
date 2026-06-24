# FULL PROJECT ANALYSIS — OptiVax Global Admin Dashboard
**Last Updated:** 2026-06-25  
**Version:** 2.3.0  
**Framework:** React 19 + TypeScript 5.7 + Vite 6 + Tailwind CSS v4

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Directory Structure](#3-directory-structure)
4. [Authentication & Session Flow](#4-authentication--session-flow)
5. [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
6. [Routing Architecture](#6-routing-architecture)
7. [Navigation / Sidebar System](#7-navigation--sidebar-system)
8. [Layout System](#8-layout-system)
9. [Context Providers](#9-context-providers)
10. [Mock Backend & Data Layer](#10-mock-backend--data-layer)
11. [Module-by-Module Breakdown](#11-module-by-module-breakdown)
    - [11.1 Super Admin](#111-super-admin)
    - [11.2 Admin Panel](#112-admin-panel)
    - [11.3 Management](#113-management)
    - [11.4 Sales](#114-sales)
    - [11.5 Production](#115-production)
    - [11.6 Marketing](#116-marketing)
    - [11.7 HR](#117-hr)
    - [11.8 IT Support](#118-it-support)
    - [11.9 Client Portal](#119-client-portal)
    - [11.10 Budget Management](#1110-budget-management)
    - [11.11 Payroll & Salary Slips](#1111-payroll--salary-slips)
    - [11.12 Advance Salary](#1112-advance-salary)
    - [11.13 Conversations / Messaging](#1113-conversations--messaging)
    - [11.14 IT Tickets (Cross-Dept)](#1114-it-tickets-cross-dept)
12. [Attendance Module (Full Detail)](#12-attendance-module-full-detail)
13. [Services Layer](#13-services-layer)
14. [Hooks Catalogue](#14-hooks-catalogue)
15. [Component Library](#15-component-library)
16. [Data Flow Diagram](#16-data-flow-diagram)
17. [LocalStorage Keys Reference](#17-localstorage-keys-reference)
18. [Permission Matrix (Full)](#18-permission-matrix-full)
19. [Known Limitations & Production Notes](#19-known-limitations--production-notes)

---

## 1. PROJECT OVERVIEW

**OptiVax Global** is a multi-role enterprise admin dashboard built for a pharmaceutical/biologics company. It provides a unified workspace for 13 distinct user roles spanning sales, production, marketing, HR, IT support, management, clients, and super admin.

**Business Scope:**
- Client lifecycle management (leads → projects → billing → revisions)
- Employee management across 5 departments
- Attendance tracking with calendar, analytics, and payroll impact
- Payroll + salary slip generation
- Budget management per department
- Email marketing (campaigns, audiences, automation)
- IT support ticket system + biometric device management
- Real-time notifications via SSE (simulated)
- Audit logging for all critical operations

**Key Design Principles:**
- All data stored in `localStorage` (mock backend — no real server required)
- Deterministic pseudo-random data generation for attendance/sales history
- Role-scoped data visibility (each role sees only what they're allowed to see)
- No overtime — payroll deduction-only model
- Dark mode supported across all pages via `ThemeContext`

---

## 2. TECH STACK & DEPENDENCIES

### Core
| Package | Version | Purpose |
|---|---|---|
| react | ^19.2.6 | UI framework |
| react-dom | ^19.2.6 | DOM rendering |
| typescript | ~5.7.2 | Type safety |
| vite | ^6.1.0 | Build tool & dev server |
| tailwindcss | ^4.0.8 | Utility CSS (v4 — no config file) |
| react-router-dom | ^7.17.0 | SPA routing (HashRouter) |

### Data & Charts
| Package | Version | Purpose |
|---|---|---|
| apexcharts | ^4.1.0 | Chart engine |
| react-apexcharts | ^1.7.0 | React wrapper for ApexCharts |
| @fullcalendar/* | ^6.1.15 | Calendar library (available but attendance uses custom built calendar) |

### UI Utilities
| Package | Version | Purpose |
|---|---|---|
| clsx | ^2.1.1 | Conditional class merging |
| tailwind-merge | ^3.0.1 | Tailwind class deduplication |
| flatpickr | ^4.6.13 | Date picker |
| swiper | ^12.1.4 | Carousel/slider |
| react-dropzone | ^14.3.5 | File upload drag-and-drop |
| react-dnd | ^16.0.1 | Drag-and-drop (tasks) |
| react-helmet-async | ^2.0.5 | `<head>` meta tags |
| @react-jvectormap/world | ^1.1.2 | World map visualization |
| @stripe/react-stripe-js | ^6.4.0 | Stripe payment UI |

### Dev Tools
| Package | Version | Purpose |
|---|---|---|
| @vitejs/plugin-react | ^4.3.4 | React Fast Refresh |
| vite-plugin-svgr | ^4.3.0 | SVG as React components |
| eslint | ^9.19.0 | Linting |
| typescript-eslint | ^8.22.0 | TypeScript-aware ESLint rules |

---

## 3. DIRECTORY STRUCTURE

```
src/
├── App.tsx                    # Root router — all routes defined here
├── main.tsx                   # React 19 createRoot entry point
├── index.css                  # Tailwind v4 base + custom CSS variables
│
├── types/
│   ├── index.ts               # Core types: User, UserRole, PermissionDomain, etc.
│   ├── models.ts              # Entity models: Project, Lead, Invoice, etc.
│   └── role.ts                # Legacy role type alias
│
├── context/
│   ├── AuthContext.tsx        # Authentication state + RBAC helpers
│   ├── SidebarContext.tsx     # Sidebar open/close state
│   ├── ThemeContext.tsx       # Dark/light mode toggle
│   └── ToastContext.tsx       # Global toast notifications
│
├── lib/
│   ├── client.ts              # Mock API client + fetch override
│   ├── devSeed.ts             # Seed all mock localStorage data on app start
│   ├── roles.ts               # ROLE_HOME map: role → default dashboard path
│   └── storage.ts             # Generic localStorage helpers
│
├── utils/
│   └── rbac.ts                # RBAC_MATRIX, hasPermission, canView/Create/Edit/...
│
├── config/
│   ├── menuConfig.ts          # MENU_CONFIG: role → sidebar items (single source of truth)
│   └── roleMenu.ts            # Legacy role menu reference
│
├── data/
│   └── departments.ts         # Department definitions (d1–d5)
│
├── mock/
│   ├── users.ts               # mockUsers array — 20+ seeded accounts
│   ├── attendanceData.ts      # Attendance types, generator, calculators, payroll engine
│   ├── payrollData.ts         # SalarySlip + AdvanceSalaryRequest types + seed data
│   ├── budgetData.ts          # Budget categories, line items, audit log seed data
│   ├── salesData.ts           # Leads, targets, commission, team performance data
│   ├── itSupportData.ts       # IT tickets, biometric devices, attendance exceptions
│   ├── conversationsData.ts   # Client conversations seed data
│   └── server.ts              # In-browser mock fetch interceptor (SaaS API routes)
│
├── services/
│   ├── initialization.ts      # InitializationService (stub — data seeded via devSeed)
│   ├── auditLogService.ts     # Audit log CRUD to localStorage
│   ├── clientService.ts       # Client entity CRUD
│   ├── companySettingsService.ts # Company profile read/write
│   ├── emailService.ts        # Email campaign management
│   ├── eventService.ts        # Event/notification dispatch
│   ├── fileService.ts         # File entity management
│   ├── invoiceService.ts      # Invoice CRUD
│   ├── leadService.ts         # Lead pipeline management
│   ├── notificationService.ts # Notification fan-out
│   ├── notificationHelpers.ts # Role-to-recipient mapping
│   ├── paymentService.ts      # Payment record management
│   ├── projectService.ts      # Project CRUD + task assignment
│   └── userService.ts         # User profile + employee management
│
├── hooks/
│   ├── useAutomation.ts       # Email automation trigger logic
│   ├── useBilling.ts          # Invoice + payment state
│   ├── useClients.ts          # Client list + CRUD
│   ├── useCommissions.ts      # Sales commissions state
│   ├── useEmailMarketing.ts   # Campaign/template/audience state
│   ├── useEvents.ts           # Event subscription
│   ├── useFiles.ts            # File list + upload
│   ├── useGoBack.ts           # Browser history navigation
│   ├── useInvoices.ts         # Invoice list + state
│   ├── useLeads.ts            # Lead pipeline state
│   ├── useModal.ts            # Generic open/close modal state
│   ├── useNotifications.ts    # Notification badge + list
│   ├── useProjects.ts         # Project list + CRUD
│   ├── useSSE.ts              # Server-Sent Events simulation (polling localStorage)
│   ├── useSocialTracking.ts   # Social media metrics state
│   ├── useTasks.ts            # Task board state (with DnD)
│   └── useUserRole.ts         # Quick role-check helper
│
├── layout/
│   ├── AppLayout.tsx          # Protected wrapper: Sidebar + Header + <Outlet>
│   ├── AppHeader.tsx          # Top bar: notifications, theme toggle, user dropdown
│   ├── AppSidebar.tsx         # Role-aware sidebar rendered from MENU_CONFIG
│   └── Backdrop.tsx           # Mobile sidebar backdrop overlay
│
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx # allowedRoles + allowedDomain guard
│   │   ├── PublicRoute.tsx    # Redirect authenticated users away from /login
│   │   ├── RequirePermission.tsx # Inline permission gate component
│   │   ├── SignInForm.tsx     # Email/password login form
│   │   └── SignUpForm.tsx     # Registration form
│   ├── common/               # PageMeta, PageBreadCrumb, Placeholder, etc.
│   ├── dashboard/            # MetricCard, ActivityFeed, EmployeeHierarchy
│   ├── charts/               # BarChartOne, LineChartOne wrappers
│   ├── form/                 # Input, Select, Checkbox, Radio, MultiSelect, etc.
│   ├── header/               # NotificationDropdown, UserDropdown
│   ├── tables/               # BasicTableOne
│   ├── ui/                   # Alert, Avatar, Badge, Button, Dropdown, Modal, Table
│   ├── UserProfile/          # UserInfoCard, UserMetaCard, UserAddressCard
│   ├── ErrorBoundary.tsx     # Catches render errors
│   └── RequireRole.tsx       # Legacy role guard wrapper
│
└── pages/
    ├── AuthPages/             # SignIn, SignUp, ResetPassword, AuthPageLayout
    ├── Dashboard/             # 9 dashboard panels (one per role cluster)
    ├── Admin/                 # Admin & Super Admin pages
    ├── Sales/                 # Sales dept pages
    ├── Production/            # Production dept pages
    ├── Marketing/             # Marketing dept pages
    ├── HR/                    # HR pages (including full Attendance module)
    ├── ITSupport/             # IT Support pages
    ├── Client/                # Client portal pages
    ├── Conversations/         # Client messaging (staff side)
    ├── Budget/                # Budget management
    ├── Employee/              # Employee self-service (salary slips, advance)
    ├── Common/                # Shared pages (Reports, Tasks)
    └── OtherPage/             # NotFound (404)
```

---

## 4. AUTHENTICATION & SESSION FLOW

### Flow
```
User visits /
  → Navigate to /login

/login renders SignIn
  → submitForm(email, password)
  → mockLogin(email, password)         [src/lib/client.ts]
      → finds user in mockUsers array
      → writes session to localStorage["mock_session"]
      → returns MockUserSession object
  → sessionToUser(session) converts to User shape
  → setUser(user) in AuthContext
  → getRoleHome(user.role) → redirect to dashboard

Every subsequent request:
  → buildHeaders() reads localStorage["mock_session"]
  → injects X-Mock-UserId and X-Mock-UserRole headers
  → mock server intercepts fetch("/saas/v1/...") by pathname

Logout:
  → api.post("/saas/v1/auth/logout")
  → clearMockSession() removes localStorage["mock_session"]
  → setUser(null) → redirects to /login
```

### Session Shape
```typescript
MockUserSession {
  id: string;
  email: string;
  user_metadata: {
    full_name: string;
    role: UserRole;
    avatar_url?: string;
    company?: string;
  }
}
```

### Test Accounts
| Role | Email | Password |
|---|---|---|
| super_admin | superadmin@example.com | password123 |
| management | manager@example.com | password123 |
| sales_admin | sales.admin@example.com | password123 |
| sales_member | sales.member@example.com | password123 |
| production_admin | production.admin@example.com | password123 |
| production_member | production.member@example.com | password123 |
| marketing_admin | marketing.admin@example.com | password123 |
| marketing_member | marketing.member@example.com | password123 |
| hr_admin | hr.admin@example.com | password123 |
| hr_member | hr.member@example.com | password123 |
| it_admin | it.admin@example.com | password123 |
| it_member | it.member@example.com | password123 |
| client | client@example.com | password123 |

---

## 5. ROLE-BASED ACCESS CONTROL (RBAC)

### Role Hierarchy
```
super_admin         → Full access to everything, all departments
management          → Cross-department read + approve/assign in billing & budget
sales_admin         → Full control of sales domain
sales_member        → Limited view/edit in sales
production_admin    → Full control of production domain
production_member   → Limited view/edit in production
marketing_admin     → Full control of marketing domain
marketing_member    → Limited view/edit in marketing
hr_admin            → Full control of HR, payroll, salary slips
hr_member           → Limited HR view/edit; no payroll
it_admin            → Full IT support, device management, attendance exceptions
it_member           → Limited IT support view/edit
client              → Own projects, billing, files, messages only
```

### Permission Actions
`VIEW | CREATE | EDIT | DELETE | EXPORT | APPROVE | ASSIGN`

### Permission Domains
`sales | production | marketing | hr | it_support | clients | system | billing | reports | files | notifications | revisions | conversations | budget | payroll | salary_slips | advance_salary`

### Key Rules
- `super_admin` bypasses all checks — always returns `true`
- `management` is cross-domain — can VIEW/EXPORT all dept data
- Dept roles (e.g. `sales_admin`) cannot perform write actions outside their primary domain
- Cross-cutting domains (`files`, `notifications`, `reports`, `revisions`, `conversations`, `budget`, `salary_slips`, `advance_salary`) bypass primary-domain scope restriction
- `it_admin`/`it_member` have **no access** to billing, payroll, or salary data
- `client` role is scoped only to client portal resources

### ProtectedRoute
```tsx
<Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "hr_member"]} />}>
  {/* Children only render if user.role is in allowedRoles */}
  {/* super_admin automatically bypasses the check */}
</Route>
```

### AuthContext helpers
```typescript
canView("hr")       // hasPermission(user, "hr", "VIEW")
canCreate("hr")     // hasPermission(user, "hr", "CREATE")
canEdit("hr")       // etc.
canDelete("hr")
canExport("hr")
canApprove("hr")
canAssign("hr")
```

### Department-Scoped RBAC (Attendance Module)
```typescript
// getAccessibleDepts(role) returns string[] | "all"
// "all" → super_admin, management, hr_admin
// string[] → dept_admin sees own dept only
// [] → member roles see only their own record

const accessibleDepts = getAccessibleDepts(user.role);
const canSeeDeptFilter = isAdmin && accessibleDepts === "all";
```

DEPT_IDS: `dept-sales | dept-production | dept-marketing | dept-hr | dept-it-support`

---

## 6. ROUTING ARCHITECTURE

All routing uses `HashRouter` (no server-side routing needed). Routes live entirely in `src/App.tsx`.

### Route Groups

| Group | Base Path | Roles | Key Pages |
|---|---|---|---|
| Public | /login, /signup, /reset-password | unauthenticated | Auth forms |
| Super Admin | /super-admin/* | super_admin | SA dashboard, departments |
| Admin Panel | /admin/* | super_admin | Full admin suite |
| Sales | /sales/* | sales_admin, sales_member | Dashboard, leads, targets, commissions |
| Production | /production/* | production_admin, production_member | Dashboard, projects, deliverables |
| Marketing | /marketing/* | marketing_admin, marketing_member | Dashboard, leads, social, email |
| HR | /hr/* | hr_admin, hr_member | Dashboard, employees, attendance, payroll |
| Management | /management/* | management | Dashboard, cross-dept views |
| IT Support | /it/* | it_admin, it_member | Dashboard, devices, exceptions, reports |
| Client | /client/* | client | Dashboard, projects, billing, messages |
| Cross-dept | /budget, /conversations, /it/tickets | varies | Shared features |
| Employee Self | /salary-slips, /advance-salary, /my-budget | all internal staff | Personal finance |

### Nested Protected Routes (Sub-Permission)
```
/hr/*                              → hr_admin OR hr_member
  /hr/users                        → additionally: hr_admin OR management
  /hr/salary-slips                 → additionally: super_admin OR management OR hr_admin
  /hr/bulk-salary-slips            → additionally: super_admin OR hr_admin
  /hr/advance-salary               → additionally: super_admin OR management OR hr_admin
  /hr/attendance/*                 → hr_admin OR hr_member
    /hr/attendance/payroll         → additionally: hr_admin OR management
    /hr/attendance/corrections     → additionally: hr_admin OR management
```

---

## 7. NAVIGATION / SIDEBAR SYSTEM

### Source of Truth
`src/config/menuConfig.ts` — single file, `MENU_CONFIG: Record<UserRole, MenuItem[]>`

### MenuItem Shape
```typescript
interface MenuItem {
  key: string;
  label: string;
  icon: "grid"|"users"|"task"|"dollar"|"file"|"mail"|"user-circle"|"settings"|"bell"|"folder"|"shield"|"chart";
  path?: string;        // flat link
  subItems?: SubMenuItem[];  // expandable group
}
```

### How AppSidebar Renders
1. Reads `user.role` from `AuthContext`
2. Looks up `MENU_CONFIG[user.role]`
3. Renders each `MenuItem` — flat links with icon, or collapsible group with sub-items
4. Active state set by comparing `window.location.hash` to item path

### Sidebar Per Role Summary

**super_admin** — Full cross-dept megamenu: SA panel, Admin Panel, All Employees, Departments, Clients, Projects, Billing, Commissions, Files, Email Marketing, Reports, Notifications, Revisions, Client Messages, Budget, Salary Slips, Advance Salary, Audit Logs, Settings + sub-groups for SA-Sales, SA-Production, SA-Marketing, SA-HR (with full 7-item Attendance suite), SA-IT Support

**hr_admin** — Dashboard, Employees, Payroll, Leave Requests, Attendance (7 sub-items: Daily/Monthly/Yearly/Analytics/Calendar/Payroll Impact/Corrections), Tasks, Files, Reports, IT Tickets, Budget, Salary Slips, Bulk Salary Slips, Advance Salary, Notifications, Settings, Profile

**hr_member** — Dashboard, My Leaves, Attendance (5 sub-items: Daily/Monthly/Yearly/Analytics/Calendar), Tasks, Files, IT Tickets, My Budget, My Salary Slip, Advance Salary

**sales_admin** — Dashboard, Leads, Clients, Tasks, Sales Targets, Campaigns, Team Performance, Commissions, Reports, Files, Billing, Notifications, Settings, Profile

**sales_member** — Dashboard, Leads, Clients, Tasks, Files, Notifications, My Salary Slip, Advance Salary

**production_admin** — Dashboard, Projects, Tasks, Deliverables, Files, Reports, Revisions, Notifications, Settings, Profile

**production_member** — Dashboard, Projects, Tasks, Deliverables, Files, Notifications

**marketing_admin** — Dashboard, Leads, Tasks, Social Tracking, Reports, Files, Email Marketing (Campaigns/Templates/Audience/Analytics/Automation), Notifications, Settings, Profile

**marketing_member** — Dashboard, Leads, Tasks, Social Tracking, Files, Notifications, Email Marketing (Campaigns/Templates/Audience only)

**management** — Dashboard, Projects, Clients, Billing, Reports, Tasks, Notifications, Audit Logs, Deliverables, Revisions, Files, Profile

**it_admin** — Dashboard, Attendance Overview, IT Tickets, Biometric Devices, Sync Logs, Attendance Exceptions, Reports, Notifications, Profile

**it_member** — Dashboard, IT Tickets, Attendance, Devices, Sync Logs, Exceptions, My Salary Slip, Advance Salary

**client** — Dashboard, My Projects, Billing, Files, Notifications, Messages, Revisions, Profile

---

## 8. LAYOUT SYSTEM

### AppLayout
```
AppLayout (root authenticated wrapper)
├── SidebarContext.Provider
├── AppSidebar        ← role-aware nav
├── Backdrop          ← mobile overlay
└── main
    ├── AppHeader     ← top bar
    └── <Outlet />    ← page content
```

### AppHeader
- Company logo / hamburger menu toggle (mobile)
- `ThemeToggleButton` — dark/light mode
- `NotificationDropdown` — unread count badge + dropdown list
- `UserDropdown` — avatar, name, role, Profile link, Logout button

### AppSidebar
- Reads `MENU_CONFIG[user.role]`
- Collapsible sub-groups with arrow animation
- Active route highlighting via pathname match
- Scrollable with sticky header on mobile
- Width: `w-[290px]`

---

## 9. CONTEXT PROVIDERS

### AuthContext (`src/context/AuthContext.tsx`)
**State:** `user: User | null`, `isLoading: boolean`  
**Provides:** `login()`, `logout()`, `register()`, `updateProfile()`, `canView()`, `canCreate()`, `canEdit()`, `canDelete()`, `canExport()`, `canApprove()`, `canAssign()`  
**Also starts:** `useSSE()` hook when user is authenticated

### SidebarContext (`src/context/SidebarContext.tsx`)
**State:** `isOpen: boolean`, `toggleSidebar()`, `closeSidebar()`  
Used by AppHeader (hamburger), AppSidebar, and Backdrop.

### ThemeContext (`src/context/ThemeContext.tsx`)
**State:** `theme: "light" | "dark"`  
Persists to `localStorage["theme"]`. Sets `class="dark"` on `<html>`.

### ToastContext (`src/context/ToastContext.tsx`)
**Provides:** `showToast(message, type)` — renders floating toast with auto-dismiss  
Types: `"success" | "error" | "warning" | "info"`

---

## 10. MOCK BACKEND & DATA LAYER

### Architecture
The app runs entirely in the browser. There is no real backend. Two mechanisms provide fake server behaviour:

**1. Mock Server (`src/mock/server.ts`)**  
Overrides `window.fetch`. Intercepts requests to `/saas/v1/*` pathnames. Routes include:
- `POST /saas/v1/auth/login` → validates against mockUsers, writes `localStorage["mock_session"]`
- `POST /saas/v1/auth/logout` → clears session
- `GET /saas/v1/auth/session` → reads current session
- `GET /saas/v1/users` → returns filtered user list
- `PUT /saas/v1/profiles/update` → updates user metadata
- Various entity routes for projects, clients, invoices, notifications, etc.

**2. Direct localStorage access (most modules)**  
Attendance, payroll, budget, IT support, corrections, and audit data are read/written directly to localStorage without going through the mock server. Each module has its own key.

### Seed Data (`src/lib/devSeed.ts`)
Called once on app start (`seedAllMockData()`). Writes initial data for all modules if keys don't already exist.

### Mock Data Files

| File | Contains |
|---|---|
| `mock/users.ts` | 20+ user accounts across all roles |
| `mock/attendanceData.ts` | Attendance types, deterministic generator, calculators |
| `mock/payrollData.ts` | SalarySlip + AdvanceSalaryRequest types + 6 seed slips |
| `mock/budgetData.ts` | Budget categories, line items, audit entries |
| `mock/salesData.ts` | Leads, targets, commission rates, team performance |
| `mock/itSupportData.ts` | IT tickets, biometric devices, attendance exceptions (4 types) |
| `mock/conversationsData.ts` | Client-staff conversation threads |

---

## 11. MODULE-BY-MODULE BREAKDOWN

---

### 11.1 Super Admin

**Route base:** `/super-admin/*`  
**Roles:** `super_admin` only  
**Dashboard:** `SuperAdminPanel.tsx`

**Pages:**
| Page | Path | Description |
|---|---|---|
| Super Admin Dashboard | /super-admin/dashboard | KPI overview of all departments |
| Departments | /super-admin/departments | Create/edit/view org departments |

**Capabilities:**
- Full access to every route in the system (all /admin/*, /sales/*, /hr/*, etc.)
- Can access any department's view via SA-section sub-menus
- Manages all employees, clients, projects, billing, email marketing
- Sees all attendance, payroll, salary slips, advance salary data
- Access to full audit logs

---

### 11.2 Admin Panel

**Route base:** `/admin/*`  
**Roles:** `super_admin`  

| Page | Path | Description |
|---|---|---|
| Admin Dashboard | /admin/dashboard | Key business metrics |
| Clients | /admin/clients | Full client directory + modal |
| Projects | /admin/projects | All projects + assignment |
| Billing | /admin/billing | Invoices, payments, Stripe UI |
| Files | /admin/files | Company file repository |
| Notifications | /admin/notifications | Create + broadcast notifications |
| Revisions | /admin/revisions | Client revision requests |
| Settings | /admin/settings | Company settings |
| Reports | /admin/reports | Cross-company reports |
| Audit Logs | /admin/audit-logs | All system action logs |
| Commissions | /admin/commissions | Sales commission records |
| Email Marketing | /admin/email/* | Campaigns, Templates, Audience, Analytics, Automation |
| All Users | /admin/users | Employees page for all staff |

---

### 11.3 Management

**Route base:** `/management/*`  
**Roles:** `management`  
**Dashboard:** `ManagementPanel.tsx`

| Page | Path | Description |
|---|---|---|
| Management Dashboard | /management/dashboard | Executive KPIs |
| Projects | /management/projects | Cross-dept project view |
| Clients | /management/clients | Client roster |
| Billing | /management/billing | Invoice approval |
| Reports | /management/reports | Cross-company reports |
| Tasks | /management/tasks | Task overview |
| Notifications | /management/notifications | Notification management |
| Audit Logs | /management/audit-logs | Action history |
| Deliverables | /management/deliverables | Production deliverables |
| Revisions | /management/revisions | Client revision overview |
| Files | /management/files | File access |
| All Users | /management/users | Employee directory |
| Profile | /management/profile | Profile page |

**Special access via shared routes:**
- `/budget` — full budget management
- `/conversations` — client messaging
- `/hr/salary-slips` — salary slip review
- `/hr/advance-salary` — advance salary approvals
- `/hr/attendance/payroll` — attendance payroll review
- `/hr/attendance/corrections` — attendance correction approvals

---

### 11.4 Sales

**Route base:** `/sales/*`  
**Roles:** `sales_admin`, `sales_member`  
**Dashboard:** `SalesPanel.tsx`

| Page | Path | Access |
|---|---|---|
| Dashboard | /sales/dashboard | Both |
| Leads | /sales/leads | Both |
| Clients | /sales/clients | Both |
| Tasks | /sales/tasks | Both |
| Sales Targets | /sales/targets | Both |
| Campaign Budgets | /sales/campaigns | Both |
| Team Performance | /sales/team-performance | Both |
| Commissions | /sales/commissions | Both |
| Reports | /sales/reports | Both |
| Files | /sales/files | Both |
| Billing | /sales/billing | sales_admin only |
| Notifications | /sales/notifications | Both |
| Settings | /sales/settings | Both |
| Profile | /sales/profile | Both |
| Employees | /sales/users | sales_admin + hr_admin + management |

**Key Data (`salesData.ts`):**
- Leads: pipeline stages (new/contacted/qualified/proposal/negotiation/closed-won/closed-lost)
- Targets: monthly/quarterly revenue targets per rep
- Commissions: percentage-based on closed deals
- Team Performance: win rate, deal count, revenue per rep

---

### 11.5 Production

**Route base:** `/production/*`  
**Roles:** `production_admin`, `production_member`  
**Dashboard:** `ProductionPanel.tsx`

| Page | Path | Access |
|---|---|---|
| Dashboard | /production/dashboard | Both |
| Projects | /production/projects | Both |
| Tasks | /production/tasks | Both |
| Deliverables | /production/deliverables | Both |
| Files | /production/files | Both |
| Reports | /production/reports | Both |
| Revisions | /production/revisions | Both |
| Notifications | /production/notifications | Both |
| Settings | /production/settings | Both |
| Profile | /production/profile | Both |
| Employees | /production/users | production_admin + hr_admin + management |

**Features:**
- Deliverables: status tracking (pending/in-progress/review/approved/delivered)
- Revision management: client-requested changes with status workflow
- DnD task board via `react-dnd`

---

### 11.6 Marketing

**Route base:** `/marketing/*`  
**Roles:** `marketing_admin`, `marketing_member`  
**Dashboard:** `MarketingPanel.tsx`

| Page | Path | Access |
|---|---|---|
| Dashboard | /marketing/dashboard | Both |
| Leads | /marketing/leads | Both (attribution view) |
| Tasks | /marketing/tasks | Both |
| Social Tracking | /marketing/social | Both |
| Reports | /marketing/reports | Both |
| Files | /marketing/files | Both |
| Email Campaigns | /marketing/email/campaigns | Both |
| Email Templates | /marketing/email/templates | Both |
| Audience | /marketing/email/audience | Both |
| Email Analytics | /marketing/email/analytics | marketing_admin only |
| Automation | /marketing/email/automation | marketing_admin only |
| Notifications | /marketing/notifications | Both |
| Settings | /marketing/settings | Both |
| Profile | /marketing/profile | Both |
| Employees | /marketing/users | marketing_admin + hr_admin + management |

**Features:**
- Social Tracking: platform metrics (Facebook, Instagram, LinkedIn, Twitter)
- Email Marketing: full campaign lifecycle with audience segments and automation rules
- Lead attribution: links marketing campaigns to sales leads

---

### 11.7 HR

**Route base:** `/hr/*`  
**Roles:** `hr_admin`, `hr_member`  
**Dashboard:** `HRPanel.tsx`

| Page | Path | Access |
|---|---|---|
| Dashboard | /hr/dashboard | Both |
| Employees | /hr/users | hr_admin + management |
| Payroll | /hr/payroll | Both (write: hr_admin only) |
| Leave Requests | /hr/leave | Both |
| Daily Attendance | /hr/attendance | Both |
| Monthly Report | /hr/attendance/monthly | Both |
| Yearly Report | /hr/attendance/yearly | Both |
| Analytics | /hr/attendance/analytics | Both |
| Calendar View | /hr/attendance/calendar | Both |
| Payroll Impact | /hr/attendance/payroll | hr_admin + management |
| Corrections | /hr/attendance/corrections | hr_admin + management |
| Salary Slips | /hr/salary-slips | super_admin + management + hr_admin |
| Bulk Salary Slips | /hr/bulk-salary-slips | super_admin + hr_admin |
| Advance Salary | /hr/advance-salary | super_admin + management + hr_admin |
| Tasks | /hr/tasks | Both |
| Files | /hr/files | Both |
| Reports | /hr/reports | Both |
| Notifications | /hr/notifications | Both |
| Settings | /hr/settings | Both |
| Profile | /hr/profile | Both |

**Employee Management (`Employees.tsx`):**
- Full employee directory with search, filter by role/department
- Add/Edit/Delete employee records
- Fields: name, email, phone, role, department, designation, salary, work mode, status
- Salary stored to `optivax_employee_extra` localStorage key (shared with payroll calc)

**Leave Requests (`LeaveRequests.tsx`):**
- Employees submit leave (Annual/Sick/Emergency/Unpaid/Maternity/Paternity)
- HR Admin: Approve / Reject with notes
- Status: pending → approved/rejected
- Leave balance tracking per employee

---

### 11.8 IT Support

**Route base:** `/it/*`  
**Roles:** `it_admin`, `it_member`  
**Dashboard:** `ITSupportPanel.tsx`

| Page | Path | Description |
|---|---|---|
| Dashboard | /it/dashboard | KPI cards: open tickets, unresolved exceptions, device health |
| Attendance Overview | /it/attendance | `AttendanceDashboard.tsx` — daily attendance overview |
| IT Tickets | /it/tickets | Ticket CRUD (priority: low/medium/high/critical) |
| Biometric Devices | /it/devices | Device list, sync status, health |
| Device Sync Logs | /it/device-logs | Per-device sync history |
| Attendance Exceptions | /it/exceptions | Missing punch, late arrival, early departure, no-record |
| Reports | /it/reports | `AttendanceReports.tsx` — exception summary charts |
| Notifications | /it/notifications | IT-scoped notifications |
| Profile | /it/profile | Profile page |

**Exception Types (`itSupportData.ts`):**
`"missing-punch" | "late-arrival" | "early-departure" | "no-record"`

**Biometric Devices:**
- ZKTeco devices tracked: name, serial number, IP, port, branch, status, last sync, firmware
- Device statuses: `online | offline | error | syncing`
- Sync frequencies: `every-hour | every-6h | every-12h | daily`
- 5 seed devices: Main Office Entrance, Main Office Exit, Branch B, Warehouse Gate, Server Room

**Ticket Fields:**
- Subject, description, category, priority, status (open/in-progress/resolved/closed/escalated)
- Categories: `hardware | software | device | system | network | other`
- Assigned to: it_admin or it_member
- Requestor: any internal employee
- SLA deadline tracking

---

### 11.9 Client Portal

**Route base:** `/client/*`  
**Roles:** `client`  
**Dashboard:** `ClientPanel.tsx`

| Page | Path | Description |
|---|---|---|
| Dashboard | /client/dashboard | Project/invoice summary |
| My Projects | /client/projects | Projects assigned to this client |
| Billing | /client/billing | Invoices + payment status |
| Files | /client/files | Files shared with this client |
| Notifications | /client/notifications | Notifications for this client |
| Messages | /client/messages | Direct messages with staff |
| Revisions | /client/revisions | Revision request submission + status |
| Profile | /client/profile | Profile editing |

**Data isolation:** Client can only see data where `clientId === user.id`

---

### 11.10 Budget Management

**Route:** `/budget`  
**Roles:** `super_admin`, `management`, `sales_admin`, `production_admin`, `marketing_admin`, `hr_admin`, `it_admin`  
**Personal view:** `/my-budget` for member roles

**Page:** `BudgetManagement.tsx`

**Features:**
- Budget categories (Marketing, Operations, IT, HR, Training, etc.)
- Line items per category with allocated vs. spent tracking
- Budget vs. actual variance reporting
- Audit trail of all budget adjustments
- Approval workflow for over-budget requests

**Data source:** `budgetData.ts` → `localStorage["mock_budget_*"]` keys

---

### 11.11 Payroll & Salary Slips

**Routes:**
- `/hr/salary-slips` — admin generation view (`SalarySlips.tsx`)
- `/hr/bulk-salary-slips` — bulk generation (`BulkSalarySlips.tsx`)
- `/salary-slips` — employee self-view (`MySalarySlips.tsx`)

**SalarySlip fields:**
```typescript
interface SalarySlip {
  id, employeeId, employeeName, employeeEmail,
  department, designation, salaryMonth,
  basicSalary,
  allowances: PayrollItem[],      // HRA, Transport, Medical, etc.
  bonuses: PayrollItem[],         // Performance, Project Completion, etc.
  deductions: PayrollItem[],      // custom deductions
  advanceSalaryDeduction,         // auto-detected from advance salary requests
  grossSalary,                    // basic + allowances + bonuses
  totalDeductions,                // sum of deductions
  netSalary,                      // grossSalary - totalDeductions
  generatedAt, generatedById, generatedByName, generatedByRole,
  notes?
}
```

**Salary Calculation Policy:**
- `grossSalary = basicSalary + allowances + bonuses`
- `advanceSalaryDeduction` auto-applies (recovery from previous advance)
- No overtime component — deduction-only model
- Net breakdown: Basic(50%) + HRA(20%) + Transport(15%) + Medical(15%)

**Bulk Generation:** Creates slips for all employees in one batch, using template from previous month if available.

**Storage:** `localStorage["mock_salary_slips"]`

---

### 11.12 Advance Salary

**Routes:**
- `/hr/advance-salary` — admin management (`AdvanceSalary.tsx`)
- `/advance-salary` — employee request form (`AdvanceSalaryRequest.tsx`)

**Workflow:**
```
Employee submits request (amount + reason)
  → status: "pending"
  → HR Admin or Management reviews
  → Approve: status → "approved"
  → Reject: status → "rejected" (with reason)
  → Pay: status → "paid" (triggers auto-deduction in next salary slip)
```

**Storage:** `localStorage["mock_advance_requests"]`

---

### 11.13 Conversations / Messaging

**Route:** `/conversations` (staff), `/client/messages` (client)  
**Roles:** super_admin, management, sales_admin/member, marketing_admin/member, production_admin/member

**Features:**
- Threaded conversation per client
- Staff can reply to client messages
- Client sees own conversation only
- Unread count shown in header badge

---

### 11.14 IT Tickets (Cross-Dept)

**Route:** `/it/tickets`  
**Roles:** All internal staff (all non-client roles)

Any employee can submit an IT support ticket. IT admin/member can manage and resolve them.

**Ticket Priority:** `low | medium | high | critical`  
**Ticket Status:** `open | in-progress | resolved | closed | escalated`

---

## 12. ATTENDANCE MODULE (FULL DETAIL)

The attendance module is the most complex in the system. It lives entirely in `src/pages/HR/` and `src/mock/attendanceData.ts`.

---

### 12.1 Daily Attendance (`/hr/attendance`)

**File:** `Attendance.tsx`  
**Access:** hr_admin, hr_member  
**Nav bar:** 7 tabs — Daily | Monthly | Yearly | Analytics | Calendar | Payroll Impact* | Corrections*  
(*shown only to `canViewAll` roles: hr_admin/management/super_admin)

**Features:**
- Date selector → loads all attendance records for that date
- Employee self check-in/check-out (button-based)
- KPI summary cards: Present Today, Absent, On Leave, Total Present %
- Attendance log table: Employee, Status, Check-in, Check-out, Hours
- Edit modal: HR can change any record's status, check-in, check-out, notes
- Filter by status (optgroup: Present / Late / Remote / Half-Day / Leaves / Absent / Off)

**Attendance Statuses:**
```typescript
type AttendanceStatus =
  | "present" | "absent" | "late" | "half-day" | "remote"
  | "sick-leave" | "casual-leave" | "approved-leave"
  | "unapproved-leave" | "weekly-off" | "holiday"
```

---

### 12.2 Monthly Report (`/hr/attendance/monthly`)

**File:** `AttendanceMonthly.tsx`  
**Access:** hr_admin, hr_member

**17 Metrics per Employee:**
| Column | Description |
|---|---|
| Employee | Name + role |
| Total Days | Days in the selected month |
| Working Days | Total days − weekends − holidays |
| Present | present + late + remote statuses |
| Absent | absent + unapproved-leave |
| Approved Leave | sick + casual + approved-leave |
| Unapproved Leave | unapproved-leave only |
| Sick Leave | sick-leave only |
| Casual Leave | casual-leave only |
| Half Days | half-day count |
| Late Arrivals | check-in after 09:30 |
| Early Checkouts | check-out before 17:00 |
| WFH Days | remote status count |
| Weekly Offs | Saturday + Sunday count |
| Holidays | company holiday count |
| Work Hours | sum of (checkout − checkin) per worked day |
| Attendance % | effectivePresent / totalWorkingDays × 100 |

**Filters:** Month, Year, Department (hr_admin/management only), Employee, Search  
**Exports:** CSV (Excel) + PDF (print)  
**Features:** Sortable columns, KPI cards (Employees / Avg Present / Avg Attendance %), totals footer row

**RBAC Scoping:**
- `hr_admin`/`management`/`super_admin` → see all employees with department filter
- `hr_member` → sees only their department (no department dropdown, auto-scoped)
- Employee role → sees only own record (no employee filter)

---

### 12.3 Yearly Report (`/hr/attendance/yearly`)

**File:** `AttendanceYearly.tsx`  
**Access:** hr_admin, hr_member

**11 Metrics per Employee (YTD-aware):**
Working Days, Present Days, Absent Days, Approved Leaves, Unapproved Leaves, Sick Leaves, Casual Leaves, Half Days, Late Arrivals, Annual Attendance %

**Filters:** Year (2025/2026), Department, Employee, Search  
**Exports:** CSV + PDF  
**Features:** Percentage progress bar badge, 5 KPI cards (Employees / Avg Present / Total Sick / Total Casual / Avg Annual %), totals/avg footer

---

### 12.4 Analytics Dashboard (`/hr/attendance/analytics`)

**File:** `AttendanceAnalytics.tsx`  
**Access:** hr_admin, hr_member  
**Charts:** ApexCharts via `react-apexcharts`

**KPI Cards (3):**
- Avg Attendance % (focus month)
- Total Late Arrivals (focus month)
- Total Absent Days (focus month)

**Charts (4):**
| Chart | Type | Data |
|---|---|---|
| Monthly Attendance Trend | Area (3 series) | Present% / Leave% / Absent% per month |
| Department Attendance % | Horizontal Bar | Avg attendance by department (focus month) |
| Leave Distribution | Donut | Sick / Casual / Approved / Unapproved totals |
| Late Arrival Trend | Area | Monthly late arrival counts |

**Leaderboards (2):**
- Most Present Employees (top 8)
- Most Absent Employees (top 8)

**Filters:** Year, Focus Month, Department  
**RBAC:** Department filter only shown to roles with `accessibleDepts === "all"`

---

### 12.5 Calendar View (`/hr/attendance/calendar`)

**File:** `AttendanceCalendar.tsx`  
**Access:** hr_admin, hr_member

**Features:**
- Month/Year navigation arrows
- Employee selector (HR roles see all; members see own dept)
- Grid: status dot per day (single employee) or stacked dots (all employees overview)
- Hover tooltip: date, status, check-in/out times
- Sidebar: Monthly Summary stats + Color Legend + Department breakdown
- Color-coded status dots for all 10 statuses

---

### 12.6 Payroll Impact (`/hr/attendance/payroll`)

**File:** `AttendancePayroll.tsx`  
**Access:** hr_admin, management (NOT hr_member)

**Calculation Rules (deduction-only model):**
```
Absent Deduction       = absentDays × (baseSalary / totalWorkingDays)
Half Day Deduction     = halfDays × dailyRate × 0.5
Unpaid Leave Deduction = unapprovedLeaveDays × dailyRate
Late Penalty           = lateArrivals × ₹100
Total Deductions       = absent + halfDay + unpaidLeave + latePenalty
Net Payable            = max(0, baseSalary − totalDeductions)
```

**Approved/Sick/Casual leaves do NOT reduce pay.**

**Salary source priority:** `optivax_employee_extra[userId].salary` → `ROLE_BASE_SALARY[role]` → ₹60,000 default

**KPI Cards (4):** Total Payroll / Absent Deductions / Late Penalties / Net Payable  
**Breakdown Cards (3):** Half Day Ded. / Unpaid Leave Ded. / Total Deductions  
**Table Columns (9):** Employee / Base Salary / Daily Rate / Absent Ded. / Half Day Ded. / Unpaid Leave Ded. / Late Penalty / Total Deductions / Net Payable  
**Exports:** CSV + PDF  
**Pagination:** 15 records per page (PAGE_SIZE=15)

---

### 12.7 Correction Requests (`/hr/attendance/corrections`)

**File:** `AttendanceCorrections.tsx`  
**Access:** hr_admin, management

**Two-Tab Layout:**
1. **Correction Requests** — pending correction submissions from employees
2. **Audit Log** — all changes to attendance records

**Correction Workflow:**
```
Employee submits correction:
  - Original status/check-in/check-out
  - Requested status/check-in/check-out
  - Reason text
  - Status: "pending"

HR Admin reviews:
  - Approve → status → "approved", updates daily record
  - Reject → status → "rejected", stores rejection notes

AuditEntry created on every review action.
```

**KPI Cards:** Total Requests / Pending / Approved / Rejected  
**Filters:** Status (All/Pending/Approved/Rejected) + Search  
**Storage:** `localStorage["mock_attendance_corrections"]` + `localStorage["mock_attendance_audit"]`

---

### 12.8 Data Generator

**File:** `attendanceData.ts` — `generateYearData(year)`

Generates records per employee × 365 days deterministically:
```typescript
const seed = strHash(userId + dateStr);   // unique per user+date
const r    = seededRand(seed);            // [0, 1)
```

**Status distribution:**
| Range | Status |
|---|---|
| r < 0.50 | present (with early checkout ~15%) |
| 0.50–0.60 | late |
| 0.60–0.68 | remote (WFH) |
| 0.68–0.73 | half-day |
| 0.73–0.78 | sick-leave |
| 0.78–0.83 | casual-leave |
| 0.83–0.87 | approved-leave |
| 0.87–0.94 | absent |
| 0.94–1.00 | unapproved-leave |

Weekends → `weekly-off`; company holidays → `holiday`

**Storage:** `localStorage["mock_att_year_2025"]` and `localStorage["mock_att_year_2026"]`

**Staff covered:** All `STAFF_USERS` — excludes `client` and `super_admin` roles

---

## 13. SERVICES LAYER

All services in `src/services/` use localStorage as the database.

| Service | Key Responsibility |
|---|---|
| `auditLogService.ts` | Write structured audit entries with user context |
| `clientService.ts` | CRUD for Client entities |
| `companySettingsService.ts` | Read/write company name, logo, tagline, contact |
| `emailService.ts` | Campaign state machine (draft→scheduled→sending→sent) |
| `eventService.ts` | Dispatch events (lead created, invoice sent, etc.) |
| `fileService.ts` | File metadata CRUD (not actual file storage) |
| `invoiceService.ts` | Invoice CRUD + payment recording |
| `leadService.ts` | Lead pipeline CRUD + stage transitions |
| `notificationService.ts` | Create + deliver notifications to recipients |
| `notificationHelpers.ts` | Map event types to recipient roles |
| `paymentService.ts` | Payment record + Stripe mock |
| `projectService.ts` | Project CRUD + task assignment + status workflow |
| `userService.ts` | Employee profile management |

---

## 14. HOOKS CATALOGUE

| Hook | State Managed | Notes |
|---|---|---|
| `useAuth` | From AuthContext | Login, logout, permissions |
| `useAutomation` | Email automation rules | CRUD + trigger logic |
| `useBilling` | Invoices + payments | Full billing state |
| `useClients` | Client list | Search, filter, CRUD |
| `useCommissions` | Commission records | Sales-specific |
| `useEmailMarketing` | Campaigns, templates, audience | Marketing module |
| `useEvents` | Event subscriptions | Cross-module events |
| `useFiles` | File entities | Upload, delete |
| `useGoBack` | Navigation | `router.back()` wrapper |
| `useInvoices` | Invoice list | Billing module |
| `useLeads` | Lead pipeline | Stage transitions |
| `useModal` | `{ isOpen, open, close }` | Generic modal control |
| `useNotifications` | Notification list + badge count | Header badge |
| `useProjects` | Project + task list | DnD task board |
| `useSSE` | Simulated real-time updates | Polls localStorage every 30s |
| `useSocialTracking` | Social platform metrics | Marketing module |
| `useTasks` | Task board with DnD | react-dnd integration |
| `useUserRole` | Quick `user.role` check | Thin wrapper |

---

## 15. COMPONENT LIBRARY

### Auth Components
- `ProtectedRoute` — role + domain guard, renders `<Outlet>` or redirects
- `PublicRoute` — redirects authenticated users to their dashboard
- `SignInForm` — email/password form with error display
- `SignUpForm` — registration form

### Common Components
- `PageMeta` — sets document `<title>` + meta via react-helmet-async
- `PageBreadCrumb` — breadcrumb navigation bar
- `Placeholder` — loading skeleton placeholder
- `ScrollToTop` — resets scroll on route change
- `ThemeToggleButton` — sun/moon icon toggle

### Dashboard Components
- `MetricCard` — KPI card with icon, value, label, trend
- `ActivityFeed` — timeline of recent actions
- `EmployeeHierarchy` — org chart node component

### Chart Components
- `BarChartOne` — ApexCharts bar chart wrapper
- `LineChartOne` — ApexCharts line chart wrapper
- All attendance charts use ApexCharts directly via `react-apexcharts`

### Form Components
- `InputField`, `TextArea`, `Select`, `MultiSelect`
- `Checkbox`, `Radio`, `RadioSm`, `Switch`
- `FileInput`, `DropZone`
- `PhoneInput`, date picker (flatpickr)
- `Label`, `Form` wrappers
- `ItemList` (used in SalarySlips for allowances/bonuses rows)

### UI Components
- `Alert` — dismissible alerts (success/error/warning/info)
- `Avatar` — user avatar with fallback initials
- `Badge` — colored label badge
- `Button` — variants: primary, secondary, ghost, danger
- `Dropdown`, `DropdownItem`
- `Modal` — portal-based modal with backdrop
- `Table`, `BasicTableOne`

### Header Components
- `NotificationDropdown` — badge + dropdown panel with unread list
- `UserDropdown` — profile menu with logout

---

## 16. DATA FLOW DIAGRAM

```
User Action (click / form submit)
  │
  ▼
React Component (pages/)
  │
  ├─► useHook (hooks/) ──────────────────────────► Service (services/)
  │       │                                              │
  │       │                                         localStorage
  │       │                                              │
  │       └──────────────────────────────────────────────┘
  │
  ├─► Direct localStorage read/write
  │   (attendance, payroll, IT, corrections, budget)
  │       │
  │       └─► attendanceData.ts / itSupportData.ts
  │           payrollData.ts / budgetData.ts
  │
  └─► api.get / api.post / api.put (lib/client.ts)
          │
          ▼
      Mock Server (mock/server.ts) ← overrides window.fetch
          │
          └─► localStorage (seeded by devSeed.ts at startup)

AuthContext
  ├─► mockLogin() → localStorage["mock_session"]
  └─► RBAC_MATRIX → hasPermission() → canView/Create/Edit...
         │
         ▼
   ProtectedRoute → render <Outlet> or redirect to /login
```

---

## 17. LOCALSTORAGE KEYS REFERENCE

| Key | Module | Content |
|---|---|---|
| `mock_session` | Auth | Current user session JSON |
| `mock_users` | Auth/Users | User account array |
| `mock_projects` | Projects | Project records |
| `mock_tasks` | Tasks | Task board items |
| `mock_clients` | Clients | Client records |
| `mock_invoices` | Billing | Invoice records |
| `mock_notifications` | Notifications | Notification records |
| `mock_files` | Files | File metadata |
| `mock_revisions` | Revisions | Revision requests |
| `mock_leads` | Leads | Sales + marketing leads |
| `mock_conversations` | Conversations | Message threads |
| `mock_salary_slips` | Payroll | Salary slip records |
| `mock_advance_requests` | Advance Salary | Advance salary requests |
| `mock_audit_log` | Audit | System audit entries |
| `mock_budget_*` | Budget | Budget categories + items |
| `mock_it_tickets` | IT Support | IT ticket records |
| `mock_biometric_devices` | IT Support | Biometric device records |
| `mock_device_sync_logs` | IT Support | Device sync logs |
| `mock_attendance_exceptions` | IT Support | Attendance exceptions |
| `mock_att_year_2025` | Attendance | All records for 2025 |
| `mock_att_year_2026` | Attendance | All records for 2026 |
| `mock_attendance_corrections` | Attendance | Correction requests |
| `mock_attendance_audit` | Attendance | Attendance change log |
| `optivax_employee_extra` | Employees | Salary + extra fields per userId |
| `mock_email_campaigns` | Email Marketing | Campaign records |
| `mock_email_templates` | Email Marketing | Template records |
| `mock_email_audience` | Email Marketing | Audience segments |
| `mock_sales_targets` | Sales | Monthly/quarterly targets |
| `mock_commissions` | Sales | Commission records |
| `theme` | UI | "light" or "dark" |
| `company_settings` | Settings | Company name, logo, etc. |

---

## 18. PERMISSION MATRIX (FULL)

| Domain | super_admin | management | sales_admin | sales_member | prod_admin | prod_member | mktg_admin | mktg_member | hr_admin | hr_member | it_admin | it_member | client |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| sales | ALL | V/EX | ALL | V/E | — | — | V | V | — | — | — | — | — |
| production | ALL | V/EX | — | — | ALL | V/E | — | — | — | — | — | — | V |
| marketing | ALL | V/EX | — | — | — | — | ALL | V/E | — | — | — | — | — |
| hr | ALL | V/EX | — | — | — | — | — | — | ALL | V/E | — | — | — |
| it_support | ALL | — | — | — | — | — | — | — | — | — | ALL | V/E | — |
| clients | ALL | V/EX | ALL | V/E | V | — | — | — | — | — | — | — | V/E |
| system | ALL | — | — | — | — | — | — | — | — | — | V/E | — | — |
| billing | ALL | V/C/E/EX/AP/AS | V/C/E/AP/AS | — | — | — | — | — | — | — | — | — | V |
| reports | ALL | V/EX | V/EX | — | V/EX | — | V/EX | — | V/EX | — | V/EX | — | — |
| files | ALL | ALL | V/C/E/D | V/C | ALL | V/C | ALL | V/C | ALL | V/C | — | — | V |
| notifications | ALL | V/EX | V/C | V | V/C | V | V/C | V | V/C | V | V/C | V | V |
| revisions | ALL | V/E | — | — | V/C/E/D | V | — | — | — | — | — | — | — |
| conversations | ALL | ALL | V/C/E | V/C | V/C/E | V/C | V/C/E | V/C | — | — | — | — | — |
| budget | ALL | ALL | V/C/E/AP/AS | — | V/EX | — | V/EX | — | V/EX | — | — | — | — |
| payroll | ALL | ALL | — | — | — | — | — | — | ALL | — | — | — | — |
| salary_slips | ALL | ALL | V | V | V | V | V | V | ALL | V | V | V | — |
| advance_salary | ALL | ALL | V/C | V/C | V/C | V/C | V/C | V/C | V/AP/E | V/C | — | — | — |

**Key:** V=VIEW, C=CREATE, E=EDIT, D=DELETE, EX=EXPORT, AP=APPROVE, AS=ASSIGN, ALL=all 7 actions

---

## 19. KNOWN LIMITATIONS & PRODUCTION NOTES

### Data Persistence
- All data is in `localStorage` — cleared when browser data is cleared
- No multi-tab sync (each tab has its own state snapshot)
- No actual file storage — `mock_files` stores only metadata
- `localStorage` has a ~5–10MB limit; large attendance datasets may exceed it for multi-year data

### Authentication
- Mock login: credentials validated client-side against `mockUsers` array — not secure
- No JWT or real session tokens
- `X-Mock-UserId` / `X-Mock-UserRole` headers are trusted without validation by the mock server
- Real backend would need: JWT auth, refresh tokens, server-side RBAC validation

### Attendance Data Generation
- Deterministic seed ensures same data across page reloads (no server state needed)
- Data generated for all `STAFF_USERS` (excludes `client` and `super_admin`)
- Year data cached in localStorage after first generation; stale data not auto-refreshed
- To reset attendance data: delete `mock_att_year_2025` / `mock_att_year_2026` from localStorage

### Payroll Policy
- Salary source priority: `optivax_employee_extra[userId].salary` → `ROLE_BASE_SALARY[role]` → ₹60,000 default
- No overtime component — deduction-only model by design
- Payroll figures are estimates only — not legally binding calculations
- Indian Rupee formatting via `n.toLocaleString("en-IN")`

### SSE / Real-Time
- `useSSE()` simulates real-time by polling localStorage every 30 seconds
- No actual WebSocket or SSE connection
- Notification delivery is synchronous within the same browser tab

### IT Support
- IT admin/member have **zero access** to billing, payroll, salary, or financial data (by design)
- Biometric device sync is simulated — no real hardware integration
- 5 seed devices: Main Office Entrance + Exit, Branch B (offline), Warehouse Gate, Server Room (error)

### Email Marketing
- No actual emails sent — all campaign data stored locally
- Stripe integration is UI-only — no real payment processing

### Production Readiness Checklist
When moving to production, replace:
- [ ] `localStorage` → real database (PostgreSQL/MongoDB)
- [ ] Mock server interceptor → real REST/GraphQL API with proper auth middleware
- [ ] Mock login → real auth (JWT + refresh tokens + bcrypt)
- [ ] `useSSE` polling → real WebSocket or SSE endpoint
- [ ] Static mock users → real user management with admin invitation flow
- [ ] File metadata → real file storage (S3/GCS) with pre-signed URLs
- [ ] Stripe mock UI → real Stripe integration with webhook handling
- [ ] `optivax_employee_extra` localStorage → employee HR database table
- [ ] Attendance seed data → real biometric device integration (ZKTeco SDK/API)
- [ ] All `mock_*` keys → real API endpoints with server-side RBAC enforcement

---

*Report generated: 2026-06-25 | OptiVax Global Admin Dashboard v2.3.0*
