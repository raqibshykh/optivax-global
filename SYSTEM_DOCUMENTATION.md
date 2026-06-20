# OptiVax Global — SaaS CRM Platform
## Complete System Architecture & Documentation

**Version:** 1.0  
**Date:** 2026-06-20  
**Classification:** Internal Technical Reference  
**Author:** Solution Architecture Team  

---

## TABLE OF CONTENTS

1. [Project Overview](#section-1)
2. [Role Architecture](#section-2)
3. [RBAC Permission Matrix](#section-3)
4. [Route Map](#section-4)
5. [Page Inventory](#section-5)
6. [Data Architecture](#section-6)
7. [Workflow Documentation](#section-7)
8. [Service Layer](#section-8)
9. [Database Model (ERD)](#section-9)
10. [State Management](#section-10)
11. [File Management System](#section-11)
12. [Project Management System](#section-12)
13. [Billing System](#section-13)
14. [Reporting System](#section-14)
15. [Security Model](#section-15)
16. [Current Limitations](#section-16)
17. [Production Readiness](#section-17)
18. [Final Summary](#section-18)

---

<a name="section-1"></a>
## SECTION 1 — PROJECT OVERVIEW

### 1.1 Platform Identity

**OptiVax Global** is a multi-tenant, role-based SaaS CRM platform built to manage the complete commercial lifecycle of a digital services agency — from lead acquisition through client delivery, billing, and employee operations. The platform unifies four internal departments (Sales, Production, Marketing, HR) and a client-facing portal under a single authenticated surface.

### 1.2 Main Purpose

The platform serves three categories of user:

| Category | Description |
|---|---|
| **Internal Staff** | Employees across Sales, Production, Marketing, and HR departments operating within role-specific workspaces |
| **Management / Admin** | Senior leadership with cross-department visibility, audit access, and approval authority |
| **Clients** | External clients accessing a read-only portal for projects, invoices, files, and revision requests |

### 1.3 Departments Supported

```
┌─────────────────────────────────────────────────────────────┐
│                    OptiVax Global Platform                  │
├─────────────┬──────────────┬──────────────┬────────────────┤
│    SALES    │  PRODUCTION  │  MARKETING   │      HR        │
│             │              │              │                │
│ Lead mgmt   │ Deliverables │ Campaigns    │ Employees      │
│ Clients     │ Projects     │ Email Mktg   │ Payroll        │
│ Targets     │ Revisions    │ Social Track │ Leave          │
│ Commissions │ Files        │ Lead Attrib  │ Attendance     │
│ Pipeline    │ Tasks        │ Automation   │ Tasks          │
└─────────────┴──────────────┴──────────────┴────────────────┘
                         │
              ┌──────────┴──────────┐
              │   CROSS-CUTTING     │
              │ Super Admin Panel   │
              │ Management Panel    │
              │ Billing & Invoices  │
              │ Files & Documents   │
              │ Notifications       │
              │ Audit Logs          │
              │ Reports             │
              │ Client Portal       │
              └─────────────────────┘
```

### 1.4 Business Workflows Supported

| Workflow | Description |
|---|---|
| **Lead → Client Pipeline** | Sales captures leads, converts to clients with duplicate prevention |
| **Project Lifecycle** | Clients linked to projects, assigned to production teams, tracked through completion |
| **Deliverable Tracking** | Production creates and advances deliverables through a 5-stage approval flow |
| **Invoice & Payment** | Billing generates invoices against projects, marks payment, notifies clients |
| **File Management** | Role-scoped file upload with 5 visibility levels and audit trail |
| **Revision Requests** | Clients submit revision requests; production team manages status transitions |
| **HR Operations** | Leave requests, attendance logging, payroll calculation, employee management |
| **Email Marketing** | Template authoring, campaign management, audience segmentation, automation |
| **Social Tracking** | Platform link tracking with click analytics |
| **Reporting** | Cross-department KPI dashboards and exportable data |

### 1.5 SaaS Architecture Summary

```
Browser
  │
  ├── React 19 (Vite 6 build, TypeScript 5.7)
  │     ├── React Router 7 (HashRouter, protected routes)
  │     ├── Tailwind CSS 4 (utility-first styling)
  │     └── Context API (auth, toast, no external state lib)
  │
  ├── In-Browser Mock API Server
  │     ├── Intercepts window.fetch for /saas/v1/* routes
  │     ├── All data persisted in localStorage (14 keys)
  │     ├── Simulates REST semantics (GET/POST/PUT/DELETE)
  │     ├── Role-scoped filtering at the handler level
  │     └── SSE simulation for real-time notifications
  │
  └── External Dependencies
        ├── Stripe (payment intent creation — mock key in dev)
        └── No backend, no database, no network calls in dev
```

**Stack:**

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.7 (strict mode) |
| Build Tool | Vite 6 |
| Routing | React Router 7 (Hash-based) |
| Styling | Tailwind CSS 4 |
| State | Context API + localStorage |
| API Layer | In-browser mock server (fetch interception) |
| Persistence | localStorage (14 namespaced keys) |
| Auth | Mock session with role-based token |
| Payments | Stripe (mock publishable key) |
| Real-time | Server-Sent Events (SSE) simulation |

---

<a name="section-2"></a>
## SECTION 2 — ROLE ARCHITECTURE

The platform defines **11 distinct roles** organized into three tiers: Global Administrators, Departmental Users, and External Clients.

```
TIER 1 — GLOBAL
├── super_admin     (unrestricted, all domains)
└── management      (cross-department read + billing approval)

TIER 2 — DEPARTMENTAL
├── SALES
│   ├── sales_admin
│   └── sales_member
├── PRODUCTION
│   ├── production_admin
│   └── production_member
├── MARKETING
│   ├── marketing_admin
│   └── marketing_member
└── HR
    ├── hr_admin
    └── hr_member

TIER 3 — EXTERNAL
└── client
```

---

### 2.1 Super Admin

**Purpose:** Platform owner. Unrestricted access to all data, all departments, all operations.

**Accessible Pages:**
- `/super-admin/dashboard` — SuperAdminPanel (platform-wide metrics)
- `/admin/dashboard` — AdminPanel
- `/admin/clients` — All clients, full CRUD
- `/admin/projects` — All projects, full CRUD
- `/admin/billing` — All invoices and payments
- `/admin/files` — All files, all visibility levels
- `/admin/revisions` — All revision requests
- `/admin/notifications` — All notifications
- `/admin/reports` — All reports
- `/admin/audit-logs` — Full audit history
- `/admin/leave` — All leave requests
- `/admin/attendance` — All attendance records
- `/admin/commissions` — All commission records
- `/admin/email/*` — Full email marketing suite
- `/admin/users` — All employees
- `/super-admin/departments` — Department management

**Permissions:** ALL actions on ALL domains (VIEW, CREATE, EDIT, DELETE, EXPORT, APPROVE, ASSIGN).

**Restrictions:** None. Can self-assign any role via signup (server enforces that public signups cannot select privileged roles, but super_admin is pre-seeded).

**Data Visibility:** Sees all records across all clients, departments, and users. File visibility enforcement is bypassed. Revision list is unfiltered.

---

### 2.2 Management

**Purpose:** Senior leadership with cross-department read access and billing authority.

**Accessible Pages:**
- `/management/dashboard` — ManagementPanel (cross-dept KPIs, HR summary, rejected leaves)
- `/management/projects` — All projects (view)
- `/management/clients` — All clients (view)
- `/management/billing` — Full billing operations (create, edit, approve)
- `/management/reports` — All reports
- `/management/tasks` — All tasks (view)
- `/management/audit-logs` — Full audit history
- `/management/deliverables` — All deliverables (view)
- `/management/revisions` — All revisions (view + update status)
- `/management/files` — All files (upload, edit, delete)
- `/management/notifications` — Own notifications
- `/management/profile` — Profile

**Permissions:**
- `billing`: VIEW, CREATE, EDIT, EXPORT, APPROVE, ASSIGN
- `files`: VIEW, CREATE, EDIT, DELETE, EXPORT
- `revisions`: VIEW, EDIT
- All other domains: VIEW, EXPORT only

**Restrictions:** Cannot create/edit HR records, sales records, or production records. Cannot assign projects or tasks (that authority sits with dept admins).

**Data Visibility:** Sees all data across departments. File visibility enforcement is bypassed (same as super_admin).

---

### 2.3 Sales Admin

**Purpose:** Department head for sales. Manages leads, clients, billing pipeline, team performance.

**Accessible Pages:**
- `/sales/dashboard` — SalesPanel
- `/sales/leads` — All leads, full CRUD
- `/sales/clients` — All clients, full CRUD
- `/sales/campaigns` — Campaign budgets, full CRUD
- `/sales/targets` — Sales targets, full CRUD
- `/sales/commissions` — Commission management
- `/sales/tasks` — Sales tasks (SalesTasks), full CRUD
- `/sales/team-performance` — Team performance view
- `/sales/billing` — Invoices (create, edit, approve)
- `/sales/files` — Files (upload, edit, delete)
- `/sales/users` — Employee list (read-only)
- `/sales/reports` — Reports
- `/sales/notifications` — Notifications
- `/sales/settings` — Settings
- `/sales/profile` — Profile

**Permissions:**
- `sales`: ALL actions
- `clients`: ALL actions
- `billing`: VIEW, CREATE, EDIT, APPROVE, ASSIGN
- `files`: VIEW, CREATE, EDIT, DELETE
- `reports`: VIEW, EXPORT
- `notifications`: VIEW, CREATE

**Restrictions:** Cannot access HR, Production, or Marketing domains. Cannot approve their own invoices without management countersignature (by convention — not enforced in UI).

**Data Visibility:** Sees all clients and leads. Sees billing for all clients. Files visible to all non-clients.

---

### 2.4 Sales Member

**Purpose:** Individual sales contributor. Manages own leads and tasks, views clients and targets.

**Accessible Pages:**
- `/sales/dashboard` — SalesPanel
- `/sales/leads` — Leads (filtered to own assigned leads)
- `/sales/clients` — Clients (view + edit)
- `/sales/tasks` — Sales tasks (own tasks)
- `/sales/targets` — Own sales targets
- `/sales/commissions` — Own commission records
- `/sales/files` — Files (upload + view)
- `/sales/notifications` — Own notifications
- `/sales/profile` — Profile

**Permissions:**
- `sales`: VIEW, EDIT
- `clients`: VIEW, EDIT
- `files`: VIEW, CREATE
- `notifications`: VIEW

**Restrictions:** Cannot delete clients, delete leads, or access billing. Cannot see other members' commission data unless sales_admin exposes it. Cannot create campaigns or targets.

**Data Visibility:** Leads filtered to `assignedTo: user.id`. Sees all clients. Files scoped by visibility rules.

---

### 2.5 Production Admin

**Purpose:** Production department head. Manages deliverables, projects, revisions, team files.

**Accessible Pages:**
- `/production/dashboard` — ProductionPanel
- `/production/deliverables` — Deliverables, full CRUD + approval
- `/production/projects` — Projects (view, assign team members)
- `/production/tasks` — Tasks (create, assign within dept)
- `/production/files` — Files, full CRUD
- `/production/revisions` — Revisions (view all, create, edit, delete)
- `/production/users` — Employee list (read-only)
- `/production/reports` — Reports
- `/production/notifications` — Notifications
- `/production/settings` — Settings
- `/production/profile` — Profile

**Permissions:**
- `production`: ALL actions
- `clients`: VIEW
- `files`: ALL actions
- `reports`: VIEW, EXPORT
- `notifications`: VIEW, CREATE
- `revisions`: VIEW, CREATE, EDIT, DELETE

**Restrictions:** Cannot access Sales, Marketing, or HR domains. Cannot create/approve invoices.

**Data Visibility:** Revisions are unfiltered within department. Files visible to all non-clients per visibility rules.

---

### 2.6 Production Member

**Purpose:** Individual production contributor. Works on assigned projects and tasks.

**Accessible Pages:**
- `/production/dashboard` — ProductionPanel
- `/production/deliverables` — Own deliverables (advance status Pending → In Progress → Review)
- `/production/tasks` — Own assigned tasks
- `/production/files` — Files (upload + view own/dept/project-team files)
- `/production/revisions` — Revisions for own assigned projects only
- `/production/notifications` — Own notifications
- `/production/profile` — Profile

**Permissions:**
- `production`: VIEW, EDIT
- `files`: VIEW, CREATE
- `notifications`: VIEW
- `revisions`: VIEW

**Restrictions:** Cannot delete deliverables. Cannot approve revisions. Can only advance deliverables they personally uploaded (and only up to "Review" status). Revisions filtered to projects they are assigned to.

**Data Visibility:** Deliverables scoped to `uploadedBy === user.id`. Revisions scoped to `project.assignedTo includes user.id`. Files scoped by visibility.

---

### 2.7 Marketing Admin

**Purpose:** Marketing department head. Manages email campaigns, social tracking, lead attribution.

**Accessible Pages:**
- `/marketing/dashboard` — MarketingPanel
- `/marketing/leads` — Lead attribution (view)
- `/marketing/email/campaigns` — Campaigns, full CRUD
- `/marketing/email/templates` — Templates, full CRUD
- `/marketing/email/audience` — Audience management
- `/marketing/email/analytics` — Campaign analytics
- `/marketing/email/automation` — Automation rules
- `/marketing/social` — Social tracking, full CRUD
- `/marketing/tasks` — Tasks (create, assign within dept)
- `/marketing/files` — Files, full CRUD
- `/marketing/users` — Employee list (read-only)
- `/marketing/reports` — Reports
- `/marketing/notifications` — Notifications
- `/marketing/settings` — Settings
- `/marketing/profile` — Profile

**Permissions:**
- `marketing`: ALL actions
- `sales`: VIEW (lead source data for attribution)
- `files`: ALL actions
- `reports`: VIEW, EXPORT
- `notifications`: VIEW, CREATE

**Restrictions:** Cannot create or convert leads. Cannot access billing, HR, or production domains directly.

**Data Visibility:** Lead data is read-only for attribution purposes. Sees all marketing campaigns and social links.

---

### 2.8 Marketing Member

**Purpose:** Individual marketing contributor. Executes campaigns, manages social content.

**Accessible Pages:**
- `/marketing/dashboard` — MarketingPanel
- `/marketing/tasks` — Own tasks
- `/marketing/social` — Social tracking (view + edit)
- `/marketing/email/campaigns` — Campaigns (view + edit)
- `/marketing/email/templates` — Templates (view + edit)
- `/marketing/email/audience` — Audience (view)
- `/marketing/files` — Files (upload + view)
- `/marketing/notifications` — Own notifications
- `/marketing/profile` — Profile

**Permissions:**
- `marketing`: VIEW, EDIT
- `sales`: VIEW
- `files`: VIEW, CREATE
- `notifications`: VIEW

**Restrictions:** Cannot delete campaigns or templates. Cannot create automations. Cannot access HR, production, billing.

**Data Visibility:** Sees own tasks. Sees all marketing campaigns, templates, and social links.

---

### 2.9 HR Admin

**Purpose:** HR department head. Manages all employee records, payroll, leave, attendance.

**Accessible Pages:**
- `/hr/dashboard` — HRPanel
- `/hr/users` — All employees, full CRUD
- `/hr/payroll` — Payroll records
- `/hr/leave` — All leave requests (approve/reject)
- `/hr/attendance` — All attendance records
- `/hr/tasks` — HR tasks
- `/hr/files` — Files, full CRUD
- `/hr/reports` — Reports
- `/hr/notifications` — Notifications
- `/hr/settings` — Settings
- `/hr/profile` — Profile

**Permissions:**
- `hr`: ALL actions
- `files`: ALL actions
- `reports`: VIEW, EXPORT
- `notifications`: VIEW, CREATE

**Restrictions:** Cannot access Sales, Production, Marketing, or Billing domains directly.

**Data Visibility:** Sees all employee records, all leave requests, all attendance entries, all payroll data.

---

### 2.10 HR Member

**Purpose:** Individual HR contributor. Manages own leave and attendance, views HR data.

**Accessible Pages:**
- `/hr/dashboard` — HRPanel
- `/hr/leave` — Own leave requests (submit new)
- `/hr/attendance` — Own attendance records
- `/hr/tasks` — Own tasks
- `/hr/files` — Files (upload + view)
- `/hr/notifications` — Own notifications
- `/hr/profile` — Profile

**Permissions:**
- `hr`: VIEW, EDIT
- `files`: VIEW, CREATE
- `notifications`: VIEW

**Restrictions:** Cannot approve leave requests. Cannot create payroll records. Cannot view other employees' payroll.

**Data Visibility:** Leave requests filtered to own records. Attendance filtered to own records.

---

### 2.11 Client

**Purpose:** External customer accessing a read-only project and billing portal.

**Accessible Pages:**
- `/client/dashboard` — ClientPanel (own project summary, billing summary)
- `/client/projects` — Own projects (view only)
- `/client/billing` — Own invoices (view only)
- `/client/files` — Own files (view only, scoped to `visibility === "client" && clientId === user.id`)
- `/client/revisions` — Own revision requests (submit + view)
- `/client/notifications` — Own notifications
- `/client/profile` — Own profile (edit name, company, avatar)

**Permissions:**
- `production`: VIEW
- `clients`: VIEW, EDIT (own record)
- `billing`: VIEW
- `files`: VIEW
- `notifications`: VIEW

**Restrictions:** Cannot upload files. Cannot create invoices. Cannot view other clients' data. Cannot access any internal department page.

**Data Visibility:** All data is hard-scoped to `clientId === user.id`. Projects filtered by clientId. Invoices filtered by clientId. Files filtered to `visibility === "client"` entries matching their user ID.

---

<a name="section-3"></a>
## SECTION 3 — RBAC PERMISSION MATRIX

### 3.1 Domain Definitions

| Domain | Description |
|---|---|
| `sales` | Leads, targets, commissions, sales tasks, campaign budgets |
| `production` | Deliverables, project tasks, production workflows |
| `marketing` | Email marketing, social tracking, lead attribution |
| `hr` | Employees, payroll, leave, attendance |
| `clients` | Client records, client portal access |
| `system` | Departments, platform configuration, audit logs |
| `billing` | Invoices, payments, payment approval |
| `reports` | Dashboard reports, data exports |
| `files` | File upload, visibility, sharing |
| `notifications` | Notification creation and management |
| `revisions` | Client revision requests, status management |

### 3.2 Full Permission Matrix

Legend: `V`=VIEW `C`=CREATE `E`=EDIT `D`=DELETE `X`=EXPORT `A`=APPROVE `S`=ASSIGN `—`=No access `ALL`=All 7 actions

| Domain | super_admin | management | sales_admin | sales_member | production_admin | production_member | marketing_admin | marketing_member | hr_admin | hr_member | client |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **sales** | ALL | V,X | ALL | V,E | — | — | V | V | — | — | — |
| **production** | ALL | V,X | — | — | ALL | V,E | — | — | — | — | V |
| **marketing** | ALL | V,X | — | — | — | — | ALL | V,E | — | — | — |
| **hr** | ALL | V,X | — | — | — | — | — | — | ALL | V,E | — |
| **clients** | ALL | V,X | ALL | V,E | V | — | — | — | — | — | V,E |
| **system** | ALL | — | — | — | — | — | — | — | — | — | — |
| **billing** | ALL | V,C,E,X,A,S | V,C,E,A,S | — | — | — | — | — | — | — | V |
| **reports** | ALL | V,X | V,X | — | V,X | — | V,X | — | V,X | — | — |
| **files** | ALL | V,C,E,D,X | V,C,E,D | V,C | ALL | V,C | ALL | V,C | ALL | V,C | V |
| **notifications** | ALL | V,X | V,C | V | V,C | V | V,C | V | V,C | V | V |
| **revisions** | ALL | V,E | — | — | V,C,E,D | V | — | — | — | — | — |

### 3.3 Scope Enforcement Rules

The platform applies two layers of permission checking:

**Layer 1 — `hasPermission`:** Direct RBAC matrix lookup. Returns true if the role has the action in the domain.

**Layer 2 — `hasPermissionScoped`:** Adds domain scope restriction for departmental roles:
- Department roles (`sales_*`, `production_*`, `marketing_*`, `hr_*`) cannot perform non-VIEW actions outside their primary domain...
- **Exception:** Cross-cutting infrastructure domains (`files`, `notifications`, `reports`, `revisions`) are exempt from scope restriction — all roles access these via explicit matrix grants.

```
hasPermissionScoped logic:
  super_admin         → always true
  management          → hasPermission (no scope restriction)
  dept_role           → if domain ∈ CROSS_CUTTING_DOMAINS: hasPermission
                        if action == VIEW: hasPermission  
                        if domain != primary: false
                        else: hasPermission
```

---

<a name="section-4"></a>
## SECTION 4 — ROUTE MAP

### 4.1 Route Architecture

All routes are wrapped by:
1. **`<PublicRoute>`** — Redirects authenticated users away from auth pages
2. **`<AppLayout>`** — Applies sidebar, header, scroll restoration
3. **`<ProtectedRoute allowedDomain="X" allowedRoles={[...]}/>`** — Enforces role membership before rendering children

### 4.2 Complete Route Inventory

#### Authentication (Public)

| Path | Component | Auth Required | Purpose |
|---|---|---|---|
| `/` | — | No | Redirects to `/login` |
| `/login` | `SignIn` | No | Email/password authentication |
| `/signup` | `SignUp` | No | New account registration (client role only via public flow) |
| `/reset-password` | `ResetPassword` | No | Password reset flow |

#### Super Admin

| Path | Component | Required Role | Purpose |
|---|---|---|---|
| `/super-admin/dashboard` | `SuperAdminPanel` | super_admin | Platform-wide metrics dashboard |
| `/super-admin/departments` | `Departments` | super_admin | Department create/edit/manage |
| `/admin/dashboard` | `AdminPanel` | super_admin | Admin operations dashboard |
| `/admin/clients` | `Clients` | super_admin | Client management (full CRUD) |
| `/admin/projects` | `Projects` | super_admin | Project management (full CRUD) |
| `/admin/billing` | `AdminBilling` | super_admin | Invoice and payment management |
| `/admin/files` | `AdminFiles` | super_admin | File management (all files visible) |
| `/admin/revisions` | `AdminRevisions` | super_admin | All revision requests |
| `/admin/notifications` | `AdminNotifications` | super_admin | Notification management |
| `/admin/reports` | `Reports` | super_admin | All department reports |
| `/admin/audit-logs` | `AuditLogs` | super_admin | Full audit trail |
| `/admin/leave` | `LeaveRequests` | super_admin | All leave requests |
| `/admin/attendance` | `Attendance` | super_admin | All attendance records |
| `/admin/commissions` | `Commissions` | super_admin | Commission management |
| `/admin/email/campaigns` | `Campaigns` | super_admin | Email campaign management |
| `/admin/email/templates` | `Templates` | super_admin | Email template management |
| `/admin/email/audience` | `Audience` | super_admin | Audience segment management |
| `/admin/email/analytics` | `Analytics` | super_admin | Campaign analytics |
| `/admin/email/automation` | `Automation` | super_admin | Email automation rules |
| `/admin/users` | `Employees` | super_admin | All employee records |
| `/admin/settings` | `Settings` | super_admin | Platform settings |

#### Sales Department

| Path | Component | Required Role | Purpose |
|---|---|---|---|
| `/sales/dashboard` | `SalesPanel` | sales_admin, sales_member | Sales KPIs, pipeline summary |
| `/sales/leads` | `SalesLeads` | sales_admin, sales_member | Lead list, create, convert to client |
| `/sales/clients` | `Clients` | sales_admin, sales_member | Client management |
| `/sales/tasks` | `SalesTasks` | sales_admin, sales_member | Sales-specific tasks |
| `/sales/targets` | `SalesTargets` | sales_admin, sales_member | Target setting and tracking |
| `/sales/campaigns` | `CampaignBudgets` | sales_admin, sales_member | Campaign budget management |
| `/sales/team-performance` | `TeamPerformance` | sales_admin, sales_member | Team performance dashboard |
| `/sales/commissions` | `Commissions` | sales_admin, sales_member | Commission records |
| `/sales/billing` | `AdminBilling` | sales_admin, sales_member | Invoice management |
| `/sales/files` | `AdminFiles` | sales_admin, sales_member | File management |
| `/sales/reports` | `Reports` | sales_admin, sales_member | Sales reports |
| `/sales/notifications` | `AdminNotifications` | sales_admin, sales_member | Notifications |
| `/sales/users` | `Employees` | sales_admin, hr_admin, management | Team employee list |
| `/sales/settings` | `Settings` | sales_admin | Department settings |
| `/sales/profile` | `Profile` | sales_admin, sales_member | Own profile |

#### Production Department

| Path | Component | Required Role | Purpose |
|---|---|---|---|
| `/production/dashboard` | `ProductionPanel` | production_admin, production_member | Production metrics dashboard |
| `/production/deliverables` | `Deliverables` | production_admin, production_member | Deliverable lifecycle management |
| `/production/projects` | `Projects` | production_admin, production_member | Project view and assignment |
| `/production/tasks` | `Tasks` | production_admin, production_member | Task management |
| `/production/files` | `AdminFiles` | production_admin, production_member | File management |
| `/production/revisions` | `AdminRevisions` | production_admin, production_member | Client revision requests |
| `/production/reports` | `Reports` | production_admin, production_member | Production reports |
| `/production/notifications` | `AdminNotifications` | production_admin, production_member | Notifications |
| `/production/users` | `Employees` | production_admin, hr_admin, management | Team employee list |
| `/production/settings` | `Settings` | production_admin | Department settings |
| `/production/profile` | `Profile` | production_admin, production_member | Own profile |

#### Marketing Department

| Path | Component | Required Role | Purpose |
|---|---|---|---|
| `/marketing/dashboard` | `MarketingPanel` | marketing_admin, marketing_member | Marketing metrics dashboard |
| `/marketing/leads` | `MarketingLeads` | marketing_admin, marketing_member | Lead attribution view |
| `/marketing/tasks` | `Tasks` | marketing_admin, marketing_member | Task management |
| `/marketing/social` | `SocialTracking` | marketing_admin, marketing_member | Social link tracking |
| `/marketing/files` | `AdminFiles` | marketing_admin, marketing_member | File management |
| `/marketing/reports` | `Reports` | marketing_admin, marketing_member | Marketing reports |
| `/marketing/notifications` | `AdminNotifications` | marketing_admin, marketing_member | Notifications |
| `/marketing/email/campaigns` | `Campaigns` | marketing_admin, marketing_member | Email campaigns |
| `/marketing/email/templates` | `Templates` | marketing_admin, marketing_member | Email templates |
| `/marketing/email/audience` | `Audience` | marketing_admin, marketing_member | Audience management |
| `/marketing/email/analytics` | `Analytics` | marketing_admin | Campaign analytics |
| `/marketing/email/automation` | `Automation` | marketing_admin | Automation rules |
| `/marketing/users` | `Employees` | marketing_admin, hr_admin, management | Team employee list |
| `/marketing/settings` | `Settings` | marketing_admin | Department settings |
| `/marketing/profile` | `Profile` | marketing_admin, marketing_member | Own profile |

#### HR Department

| Path | Component | Required Role | Purpose |
|---|---|---|---|
| `/hr/dashboard` | `HRPanel` | hr_admin, hr_member | HR metrics dashboard |
| `/hr/users` | `Employees` | hr_admin, management | Employee management |
| `/hr/payroll` | `Payroll` | hr_admin, hr_member | Payroll management |
| `/hr/leave` | `LeaveRequests` | hr_admin, hr_member | Leave request management |
| `/hr/attendance` | `Attendance` | hr_admin, hr_member | Attendance tracking |
| `/hr/tasks` | `Tasks` | hr_admin, hr_member | HR tasks |
| `/hr/files` | `AdminFiles` | hr_admin, hr_member | File management |
| `/hr/reports` | `Reports` | hr_admin | HR reports |
| `/hr/notifications` | `AdminNotifications` | hr_admin, hr_member | Notifications |
| `/hr/settings` | `Settings` | hr_admin | Department settings |
| `/hr/profile` | `Profile` | hr_admin, hr_member | Own profile |

#### Management

| Path | Component | Required Role | Purpose |
|---|---|---|---|
| `/management/dashboard` | `ManagementPanel` | management | Executive dashboard |
| `/management/projects` | `Projects` | management | Cross-department project view |
| `/management/clients` | `Clients` | management | Client overview |
| `/management/billing` | `AdminBilling` | management | Invoice approval and management |
| `/management/reports` | `Reports` | management | Cross-department reports |
| `/management/tasks` | `Tasks` | management | Task overview |
| `/management/deliverables` | `Deliverables` | management | Deliverable status view |
| `/management/revisions` | `AdminRevisions` | management | Revision request management |
| `/management/files` | `AdminFiles` | management | File management |
| `/management/audit-logs` | `AuditLogs` | management | Audit log access |
| `/management/notifications` | `AdminNotifications` | management | Notifications |
| `/management/users` | `Employees` | management, hr_admin | Employee management |
| `/management/profile` | `Profile` | management | Own profile |

#### Client Portal

| Path | Component | Required Role | Purpose |
|---|---|---|---|
| `/client/dashboard` | `ClientPanel` | client | Own project/billing summary |
| `/client/projects` | `MyProjects` | client | Own projects (read-only) |
| `/client/billing` | `ClientBilling` | client | Own invoices (read-only) |
| `/client/files` | `ClientFiles` | client | Files shared with client |
| `/client/revisions` | `MyRevisions` | client | Submit and track revision requests |
| `/client/notifications` | `ClientNotifications` | client | Own notifications |
| `/client/profile` | `Profile` | client | Edit own profile |

#### System

| Path | Component | Purpose |
|---|---|---|
| `*` | `NotFound` | 404 fallback for all unmatched paths |

---

<a name="section-5"></a>
## SECTION 5 — PAGE INVENTORY

### 5.1 Dashboard Pages

#### SuperAdminPanel (`/super-admin/dashboard`)
- **Purpose:** Platform-level operational overview — all departments, all clients, system health
- **Data Source:** Aggregated from `mock_profiles`, `optivax_clients`, `mock_projects`, `mock_invoices`
- **CRUD:** Read-only display
- **Dependencies:** All service layers

#### AdminPanel (`/admin/dashboard`)
- **Purpose:** Admin operations hub for super_admin role — recent activity, quick links
- **Data Source:** Same as SuperAdminPanel
- **CRUD:** Read-only
- **Dependencies:** Cross-service aggregation

#### SalesPanel (`/sales/dashboard`)
- **Purpose:** Sales KPIs — total leads, conversion rate, revenue pipeline, top performers
- **Data Source:** `mock_leads`, `optivax_clients`, `mock_invoices`
- **CRUD:** Read-only
- **Dependencies:** SalesLeads, Clients, Billing

#### ProductionPanel (`/production/dashboard`)
- **Purpose:** Production health — deliverable status counts, project progress, team workload
- **Data Source:** `optivax_deliverables`, `mock_projects`, `mock_tasks`
- **CRUD:** Read-only
- **Dependencies:** Deliverables, Projects, Tasks

#### MarketingPanel (`/marketing/dashboard`)
- **Purpose:** Marketing KPIs — campaign performance, email open rates, social clicks, lead attribution
- **Data Source:** `email_campaigns`, `social_links`, `social_clicks`, `mock_leads`
- **CRUD:** Read-only
- **Dependencies:** Email marketing, Social tracking, Leads

#### HRPanel (`/hr/dashboard`)
- **Purpose:** HR overview — headcount, leave summary, attendance rate, payroll status
- **Data Source:** `mock_profiles`, `optivax_leave_requests`, `mock_attendance`, `optivax_employee_extra`
- **CRUD:** Read-only
- **Dependencies:** Employees, Leave, Attendance, Payroll

#### ManagementPanel (`/management/dashboard`)
- **Purpose:** Executive cross-department view — financial summary, HR analytics (including rejected leave count), project pipeline, department performance tiles
- **Data Source:** All stores aggregated
- **CRUD:** Read-only
- **Dependencies:** All services

#### ClientPanel (`/client/dashboard`)
- **Purpose:** Client-facing summary — active projects, pending invoices, recent files, unread notifications
- **Data Source:** `mock_projects`, `mock_invoices`, `mock_files`, `mock_notifications` filtered by clientId
- **CRUD:** Read-only
- **Dependencies:** Projects, Billing, Files, Notifications

### 5.2 Client Management Pages

#### Clients (`/admin/clients`, `/sales/clients`, etc.)
- **Purpose:** Full client directory with search, filtering, status management
- **Data Source:** `optivax_clients` via `ClientService`
- **CRUD:** Full (super_admin, sales_admin) | VIEW+EDIT (sales_member, management) | VIEW (production_admin)
- **Dependencies:** `useClients`, `ClientModal`, `ProjectService` (for project count display)
- **Special:** Lead-to-client conversion preserves email as unique key; duplicate email prevented at server level

#### ClientModal
- **Purpose:** Create/edit client form within a modal dialog
- **Data Source:** Inline form state → `ClientService.create/update`
- **CRUD:** Create and Edit
- **Dependencies:** `useClients`, `useAuth`

### 5.3 Project Management Pages

#### Projects (`/admin/projects`, `/production/projects`, etc.)
- **Purpose:** Project list with status/priority/progress display and assignment management
- **Data Source:** `mock_projects` via `ProjectService`
- **CRUD:** Full (super_admin, management, sales_admin) | VIEW+Assignment (production_admin) | VIEW (members)
- **Dependencies:** `useProjects`, `ProjectModal`, `useAuth`

#### ProjectModal
- **Purpose:** Create/edit project with 4-panel form: basic info, status/dates, budget, team assignment
- **Data Source:** `mock_projects`, `mock_profiles`, `optivax_clients`
- **CRUD:** Create + Edit
- **Special:** Assignment panel visible to super_admin, management, production_admin, sales_admin. On assignment change: writes revision entry to `mock_revisions` + sends notification to newly added users.
- **Dependencies:** `useClients`, `useAuth`, `safeParse`, `NotificationService`

### 5.4 Task Pages

#### Tasks (`/production/tasks`, `/hr/tasks`, `/marketing/tasks`, `/management/tasks`)
- **Purpose:** Task management with status tracking, priority, assignment, project linking
- **Data Source:** `mock_tasks` via TaskService
- **CRUD:** Full (dept_admin) | Own tasks only (dept_member)
- **Special:** Task assignee picker for dept_admin uses explicit allowlist `[dept_admin, dept_member]` — prevents cross-department assignment. Tasks must link to a projectId.
- **Dependencies:** `useAuth`, `useTasks`, `useProjects`

#### SalesTasks (`/sales/tasks`)
- **Purpose:** Sales-specific task management with estimated deal value, notes, and lead linkage
- **Data Source:** `mock_tasks` (sales-scoped)
- **CRUD:** Full (sales_admin) | Own tasks (sales_member)
- **Dependencies:** `useAuth`

### 5.5 HR Pages

#### Employees (`/hr/users`, `/admin/users`, `/management/users`, etc.)
- **Purpose:** Employee directory with department filter, role display, designation, work mode, status
- **Data Source:** `mock_profiles`, `optivax_employee_extra`
- **CRUD:** Full (hr_admin, super_admin) | VIEW (management, dept_admin)
- **Dependencies:** `useAuth`, UserService, `optivax_employee_extra` for salary/work mode data

#### Payroll (`/hr/payroll`)
- **Purpose:** Monthly payroll calculation display per employee including salary, leaves taken, net pay
- **Data Source:** `mock_profiles`, `optivax_employee_extra`, `optivax_leave_requests`
- **CRUD:** Read-only display
- **Dependencies:** HR service, employee extras

#### LeaveRequests (`/hr/leave`, `/admin/leave`)
- **Purpose:** Leave request submission, approval (hr_admin), rejection, and calendar display
- **Data Source:** `optivax_leave_requests`
- **CRUD:** Full (hr_admin) | Submit own (hr_member)
- **Dependencies:** `useAuth`

#### Attendance (`/hr/attendance`, `/admin/attendance`)
- **Purpose:** Daily attendance logging, status tracking (present/absent/late/on-leave)
- **Data Source:** `mock_attendance`
- **CRUD:** Full (hr_admin) | Own records (hr_member)
- **Dependencies:** `useAuth`

### 5.6 Sales Pages

#### SalesLeads (`/sales/leads`)
- **Purpose:** Lead pipeline management — source tracking, status progression, estimated value, lead-to-client conversion
- **Data Source:** `mock_leads`
- **CRUD:** Full (sales_admin) | Own leads (sales_member)
- **Special:** Convert button checks for duplicate email before creating client record. On conversion: creates client, sends notification, removes converted lead.
- **Dependencies:** `useLeads`, `useClients`, `NotificationService`

#### SalesTargets (`/sales/targets`)
- **Purpose:** Monthly/quarterly/annual target setting and achievement tracking
- **Data Source:** In-component localStorage
- **CRUD:** Full (sales_admin) | VIEW own (sales_member)
- **Dependencies:** `useAuth`

#### CampaignBudgets (`/sales/campaigns`)
- **Purpose:** Marketing campaign budget allocation and spend tracking
- **Data Source:** In-component localStorage
- **CRUD:** Full (sales_admin) | VIEW (sales_member)
- **Dependencies:** `useAuth`

#### TeamPerformance (`/sales/team-performance`)
- **Purpose:** Sales team performance metrics — targets vs achieved, conversion rate per member
- **Data Source:** SalesTargets + mock_leads aggregation
- **CRUD:** Read-only
- **Dependencies:** `useAuth`

#### Commissions (`/sales/commissions`, `/admin/commissions`)
- **Purpose:** Commission calculation and record management
- **Data Source:** In-component localStorage
- **CRUD:** Full (sales_admin, super_admin) | VIEW own (sales_member)
- **Dependencies:** `useAuth`

### 5.7 Production Pages

#### Deliverables (`/production/deliverables`, `/management/deliverables`)
- **Purpose:** Client deliverable tracking through 5 stages: Pending → In Progress → Review → Approved → Delivered
- **Data Source:** `optivax_deliverables`
- **CRUD:** Full lifecycle (production_admin) | Advance own (production_member, up to Review) | VIEW (management, client)
- **Special:** Members can only advance deliverables they personally uploaded. Admin can approve (→ Approved) and mark delivered.
- **Dependencies:** `useAuth`, `useClients`, `useProjects`

### 5.8 Marketing Pages

#### MarketingLeads (`/marketing/leads`)
- **Purpose:** Lead attribution — which leads came from which marketing channel
- **Data Source:** `mock_leads` (read-only view)
- **CRUD:** VIEW only
- **Dependencies:** `useLeads`

#### SocialTracking (`/marketing/social`)
- **Purpose:** Social media link management with click tracking, per-platform analytics, persistent metrics
- **Data Source:** `social_links`, `social_clicks`, `social_account_metrics`
- **CRUD:** Full (marketing_admin) | VIEW+EDIT (marketing_member)
- **Dependencies:** `useSocialTracking`

### 5.9 File Management Pages

#### AdminFiles (`/*/files`)
- **Purpose:** 4-step file upload modal (Client → Project → Visibility → File), file grid display with visibility badges
- **Data Source:** `mock_files` via `FileService`
- **CRUD:** Full (super_admin, management, production_admin, hr_admin, marketing_admin, sales_admin) | Upload+VIEW (all members)
- **Special:** Visibility filter applied server-side per requesting role. After upload: revision entry created + notifications sent for specific/client/project-team visibility.
- **Dependencies:** `useFiles`, `useAuth`, `safeParse` (for client/project/user data)

#### ClientFiles (`/client/files`)
- **Purpose:** Client-facing file view — only files with `visibility === "client"` and matching clientId
- **Data Source:** `mock_files` filtered by server
- **CRUD:** VIEW only
- **Dependencies:** `useFiles`

### 5.10 Billing Pages

#### AdminBilling (`/admin/billing`, `/management/billing`, `/sales/billing`)
- **Purpose:** Invoice list, create/edit invoice, payment marking, overdue detection
- **Data Source:** `mock_invoices`, `mock_payments`
- **CRUD:** Full (super_admin, management, sales_admin) | VIEW (sales_member)
- **Special:** Edit button gated by `canEdit("billing")`. Pay button gated by `canApprove("billing")`. Pending invoices past dueDate auto-flagged "overdue" by server.
- **Dependencies:** `useInvoices`, `useAuth`, `InvoiceModal`

#### ClientBilling (`/client/billing`)
- **Purpose:** Client-facing invoice list — own invoices only, with payment status display
- **Data Source:** `mock_invoices` filtered by clientId
- **CRUD:** VIEW only
- **Dependencies:** `useInvoices`

### 5.11 Other Pages

#### AdminRevisions (`/admin/revisions`, `/production/revisions`, `/management/revisions`)
- **Purpose:** Revision request management — status updates, project/client linkage display
- **Data Source:** `mock_revisions`
- **CRUD:** Full (super_admin, production_admin) | Edit status (management) | VIEW (production_member — own projects only)
- **Special:** Access denied component shown if `!canView("revisions")`. Update Status column only rendered when `canEdit("revisions")`.
- **Dependencies:** `useAuth`, `useClients`, `api`

#### MyRevisions (`/client/revisions`)
- **Purpose:** Client-facing revision request submission and status tracking
- **Data Source:** `mock_revisions` filtered by clientId === user.id
- **CRUD:** Create + VIEW own
- **Dependencies:** `useAuth`, `useProjects`

#### AuditLogs (`/admin/audit-logs`, `/management/audit-logs`)
- **Purpose:** Complete platform action history with search, date filter, entity type filter
- **Data Source:** `optivax_audit_logs` via `AuditLogService`
- **CRUD:** VIEW only
- **Dependencies:** `AuditLogService`

#### Reports (`/*/reports`)
- **Purpose:** Role-filtered report dashboard — KPIs relevant to the requesting department
- **Data Source:** Aggregated across all relevant stores
- **CRUD:** VIEW + EXPORT
- **Dependencies:** All domain services (filtered by role)

#### Settings (`/*/settings`)
- **Purpose:** Department-level settings (notifications, display preferences)
- **Data Source:** User preferences localStorage
- **CRUD:** Edit own preferences
- **Dependencies:** `useAuth`

#### Profile (`/*/profile`)
- **Purpose:** Edit own profile — name, company, avatar, bio, contact info
- **Data Source:** `mock_profiles` via `ProfileService`
- **CRUD:** Edit own record
- **Dependencies:** `useAuth`, `updateProfile`

#### Departments (`/super-admin/departments`)
- **Purpose:** Department create/edit/delete with head assignment
- **Data Source:** In-component localStorage
- **CRUD:** Full (super_admin only)
- **Dependencies:** `useAuth`

#### Email Marketing Suite
- **Campaigns** — Create/send/schedule email campaigns with audience tags and template selection
- **Templates** — Rich-text email template authoring (welcome, newsletter, reminder, custom)
- **Audience** — Contact audience management with tag-based segmentation
- **Analytics** — Campaign open rate, click rate, send volume charts
- **Automation** — Trigger-based automation rules (new_client, invoice_overdue, project_complete)

---

<a name="section-6"></a>
## SECTION 6 — DATA ARCHITECTURE

### 6.1 Storage Architecture

All data is persisted in `localStorage` under 14 namespaced keys:

```
localStorage
├── mock_profiles          (users / employees)
├── mock_tasks             (cross-dept tasks)
├── mock_notifications     (all role notifications)
├── optivax_clients        (client records)
├── mock_projects          (project records)
├── mock_invoices          (invoice records)
├── mock_files             (file metadata)
├── mock_revisions         (revision requests)
├── mock_payments          (payment records)
├── optivax_leave_requests (HR leave data)
├── mock_attendance        (HR attendance)
├── optivax_deliverables   (production deliverables)
├── optivax_audit_logs     (system audit trail)
├── optivax_employee_extra (salary/workmode extras)
├── mock_leads             (sales leads)
├── mock_passwords         (hashed credentials)
├── mock_session           (active session token)
├── social_links           (social platform links)
├── social_clicks          (click event tracking)
├── social_account_metrics (per-account analytics)
├── email_templates        (email template content)
├── email_campaigns        (campaign records)
├── email_automations      (automation rules)
├── mock_organizations     (organization records)
└── mock_subscriptions     (subscription records)
```

### 6.2 User / Profile

**Storage:** `mock_profiles`

```typescript
interface Profile {
  id: string               // "u1", "u2", ... "u33" (seed) | "u{ts}-{rand}" (created)
  email: string
  full_name: string
  avatar_url?: string
  company?: string
  role: UserRole
  departmentId?: string    // "dept-sales" | "dept-production" | "dept-marketing" | "dept-hr"
  created_at?: string
}

interface User extends Profile {
  name: string             // alias for full_name
  password: string
  designation?: string
  phone?: string
  address?: string
  city?: string
  bio?: string
  joinDate: string
  lastLogin?: string
}
```

**Relationships:** User → Client (one-to-many: client accounts are profiles with `role: "client"`). User → Task (one-to-many via `assignedTo`). User → Project (many-to-many via `assignedTo[]`). User → File (one-to-many via `uploadedById`).

**Ownership Rules:** Users can only edit their own profile. HR admin can edit any profile in their department. Super admin can edit all.

### 6.3 Client

**Storage:** `optivax_clients`

```typescript
interface Client {
  id: string               // matches Profile.id for portal-linked clients
  name: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  status: "active" | "inactive"
  joinDate: string
  totalProjects: number    // denormalized count
  totalBilled: number      // denormalized sum
  lastPaymentDate?: string
  tags?: string[]
  contactName?: string
  companyName?: string
  createdAt: string
  createdBy: string        // user ID of creator
  createdByName: string
  assignedProductionMembers: string[]  // user IDs
}
```

**Relationships:** Client → Project (one-to-many via `clientId`). Client → Invoice (one-to-many via `clientId`). Client → File (one-to-many via `clientId`). Client → Revision (one-to-many via `clientId`).

**Ownership Rules:** Clients created by sales_admin or super_admin. `assignedProductionMembers` controls which production members see this client.

### 6.4 Project

**Storage:** `mock_projects`

```typescript
interface Project {
  id: string               // "proj-{timestamp}" | "proj-1" through "proj-10" (seed)
  clientId: string         // FK → Client.id
  name: string
  description: string
  status: "not-started" | "in-progress" | "completed" | "on-hold"
  priority: "low" | "medium" | "high"
  startDate: string        // ISO date string
  deadline: string         // ISO date string
  assignedTo: string[]     // FK[] → Profile.id
  progress: number         // 0-100
  budget: number
  spent: number
  files: string[]          // legacy file IDs
  createdAt: string
  updatedAt: string
}
```

**Relationships:** Project → Client (many-to-one). Project → Task (one-to-many via `projectId`). Project → Deliverable (one-to-many via `projectId`). Project → File (one-to-many via `projectId`). Project → Revision (one-to-many via `projectId`).

**Ownership Rules:** Only super_admin, management, sales_admin, and production_admin can create or edit projects. Assignment changes trigger revision entries and notifications.

### 6.5 Task

**Storage:** `mock_tasks`

```typescript
interface Task {
  id: string               // "t1"-"t12" (seed) | "task-{timestamp}"
  title: string
  description?: string
  status: "todo" | "in-progress" | "done" | "blocked"
  priority: "low" | "medium" | "high"
  assignedTo?: string      // FK → Profile.id
  assigneeId?: string      // same as assignedTo (legacy alias)
  assignee?: string        // display name
  projectId?: string       // FK → Project.id
  dueDate?: string
  assigneeDept?: string    // "dept-sales" | "dept-production" | etc.
  assigneeRole?: UserRole
  budget?: number
  budgetUsed?: number
  category?: string
  createdAt: string
  updatedAt?: string
}
```

**Relationships:** Task → Project (many-to-one). Task → Profile (many-to-one via `assignedTo`).

**Ownership Rules:** Dept admins create and assign tasks within their department. Members can only update status on tasks assigned to them. Assignee picker enforces department scope (`[dept_admin, dept_member]` allowlist).

### 6.6 File

**Storage:** `mock_files`

```typescript
interface FileRecord {
  id: string               // "file-{timestamp}"
  name: string
  size: number             // bytes
  type: string             // MIME type
  uploadedBy: string       // display name of uploader
  uploadedById?: string    // FK → Profile.id
  uploaderDept?: string    // "dept-marketing" | "dept-production" | etc.
  uploadDate: string       // ISO timestamp
  projectId?: string       // FK → Project.id (optional)
  clientId?: string        // FK → Client.id (optional)
  url?: string             // object URL or "#"
  visibility?: FileVisibility
  visibleTo?: string[]     // FK[] → Profile.id (for "specific" visibility)
  description?: string
  projectName?: string     // denormalized
}

type FileVisibility = "private" | "department" | "specific" | "project-team" | "client"
```

**Relationships:** File → Project (many-to-one, optional). File → Client (many-to-one, optional). File → Profile (many-to-one via `uploadedById`). File → Revision (implied: upload creates revision entry).

**Ownership Rules:** Private files: only uploader. Department: all members of `uploaderDept`. Specific: only listed `visibleTo` IDs. Project-team: all `project.assignedTo` members. Client: only the matching client user.

### 6.7 Deliverable

**Storage:** `optivax_deliverables`

```typescript
interface Deliverable {
  id: string               // "del-{timestamp}"
  clientId: string         // FK → Client.id
  clientName: string       // denormalized
  projectId?: string       // FK → Project.id
  projectName?: string     // denormalized
  title: string
  description: string
  status: "Pending" | "In Progress" | "Review" | "Approved" | "Delivered"
  dueDate: string
  uploadedBy: string       // FK → Profile.id
  uploadedByName: string   // denormalized
  uploadedAt: string
  reviewedBy?: string      // FK → Profile.id
  reviewedByName?: string
  reviewedAt?: string
  approvedBy?: string      // FK → Profile.id
  approvedByName?: string
  approvedAt?: string
  fileUrl?: string
  notes?: string
}
```

**Relationships:** Deliverable → Client (many-to-one). Deliverable → Project (many-to-one, optional). Deliverable → Profile (many-to-one via `uploadedBy`, `reviewedBy`, `approvedBy`).

**Ownership Rules:** Members can only advance deliverables where `uploadedBy === user.id`, limited to Pending→In Progress→Review. Admins can transition to Approved and Delivered.

### 6.8 Invoice

**Storage:** `mock_invoices`

```typescript
interface Invoice {
  id: string               // "inv-{timestamp}" | "inv-1" through "inv-13" (seed)
  number: string           // "INV-YYYY-{padded}"
  clientId: string         // FK → Client.id
  projectId?: string       // FK → Project.id
  description: string
  amount: number
  status: "paid" | "pending" | "overdue"
  issueDate: string
  dueDate: string
  paidDate?: string
  items: InvoiceItem[]
  notes?: string
  invoice_url?: string
}

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}
```

**Relationships:** Invoice → Client (many-to-one). Invoice → Project (many-to-one, optional). Invoice → Payment (one-to-many).

**Ownership Rules:** Only management, sales_admin, and super_admin can create/edit invoices. Only management and super_admin can approve (mark paid). Server auto-marks pending invoices as overdue if `dueDate < today`.

### 6.9 Payment

**Storage:** `mock_payments`

```typescript
interface Payment {
  id: string               // "pay-{timestamp}" | "pay-1" through "pay-10" (seed)
  invoiceId: string        // FK → Invoice.id
  amount: number
  date: string
  method: "credit-card" | "bank-transfer" | "check" | "cash"
  transactionId: string
  notes?: string
  checkImageUrl?: string
  stripePaymentIntentId?: string
  status?: string
  created_at?: string
}
```

**Relationships:** Payment → Invoice (many-to-one).

**Ownership Rules:** Created automatically when invoice is marked paid. Amount must match invoice amount.

### 6.10 Leave Request

**Storage:** `optivax_leave_requests`

```typescript
interface LeaveRequest {
  id: string
  employeeId: string       // FK → Profile.id
  employeeName: string     // denormalized
  role: UserRole
  department: string
  type: "Annual" | "Sick" | "Personal" | "Unpaid" | "Maternity" | "Paternity"
  startDate: string
  endDate: string
  days: number
  reason: string
  status: "Pending" | "Approved" | "Rejected"
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
}
```

**Relationships:** LeaveRequest → Profile (many-to-one via `employeeId`).

**Ownership Rules:** Employees submit own leave. HR admin approves/rejects all. Management can view all. Rejected count displayed in ManagementPanel dashboard.

### 6.11 Attendance

**Storage:** `mock_attendance`

```typescript
interface AttendanceRecord {
  id: string
  employeeId: string       // FK → Profile.id
  employeeName: string
  date: string
  checkIn?: string         // HH:MM
  checkOut?: string        // HH:MM
  status: "present" | "absent" | "late" | "on-leave"
  notes?: string
}
```

**Relationships:** Attendance → Profile (many-to-one via `employeeId`).

**Ownership Rules:** HR admin logs/edits all attendance. HR member views own records.

### 6.12 Payroll / Employee Extras

**Storage:** `optivax_employee_extra`

```typescript
interface EmployeeExtra {
  userId: string           // FK → Profile.id
  salary: number
  salaryStatus: "Paid" | "Pending"
  workMode: "Onsite" | "Remote" | "Hybrid"
  leavesTaken: number
}
```

**Relationships:** EmployeeExtra → Profile (one-to-one via `userId`).

**Ownership Rules:** HR admin manages. Combined with leave data for net payroll calculation.

### 6.13 Notification

**Storage:** `mock_notifications`

```typescript
interface Notification {
  id: string
  userId: string           // FK → Profile.id (recipient)
  type: "invoice" | "project" | "payment" | "system" | "profile" | "file"
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
  actionLabel?: string
}
```

**Relationships:** Notification → Profile (many-to-one via `userId`).

**Ownership Rules:** Each user sees only own notifications (by userId). Super_admin sees all. Created automatically by: payment events, file share events, assignment changes, lead conversion, revision status changes.

### 6.14 Audit Log

**Storage:** `optivax_audit_logs`

```typescript
interface AuditLog {
  id: string
  action: string           // "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "EXPORT"
  entityType: string       // "client" | "project" | "invoice" | "file" | etc.
  entityId: string
  entityName: string
  performedBy: string      // FK → Profile.id
  performedByName: string
  performedByRole: UserRole
  timestamp: string
  description: string
  department?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
}
```

**Relationships:** AuditLog → Profile (many-to-one via `performedBy`).

**Ownership Rules:** Append-only. Maximum 2000 entries (oldest pruned). Searchable by entity type, action, role, date range, full-text.

### 6.15 Revision

**Storage:** `mock_revisions`

```typescript
interface Revision {
  id: string               // "rev-{timestamp}" | "rev-file-{timestamp}"
  projectId: string        // FK → Project.id
  clientId: string         // FK → Client.id
  comment: string
  status: "pending" | "in-progress" | "completed"
  type?: "file_upload" | "assignment_change" | (client-submitted)
  updatedBy?: string       // FK → Profile.id
  created_at: string
}
```

**Relationships:** Revision → Project (many-to-one). Revision → Client (many-to-one). Revision → Profile (many-to-one via `updatedBy`).

**Ownership Rules:** Created by: client (manual request via portal), system (file upload audit), system (project assignment change). Production_member sees only revisions for projects they are assigned to.

---

<a name="section-7"></a>
## SECTION 7 — WORKFLOW DOCUMENTATION

### 7.1 Lead → Client → Project → Invoice → Payment

```
SALES FUNNEL WORKFLOW
─────────────────────

1. LEAD CAPTURE
   Actor: sales_admin | sales_member
   Page: /sales/leads
   Action: Create lead with name, email, phone, company, source, estimated value
   Storage: mock_leads
   Notes: Leads are assignable to specific members

2. LEAD PROGRESSION
   Actor: sales_admin | sales_member (own leads)
   Page: /sales/leads
   Action: Update status (New → Contacted → Qualified → Proposal → Won/Lost)
   Storage: mock_leads (status update)

3. LEAD CONVERSION → CLIENT
   Actor: sales_admin
   Page: /sales/leads (Convert button)
   Action: Validate no duplicate email exists in optivax_clients
   On Success:
     → Create client record in optivax_clients
     → Send notification to sales_admin
     → Lead may be removed or marked converted
   On Duplicate: Error toast, no client created

4. CLIENT MANAGEMENT
   Actor: sales_admin | management | super_admin
   Page: /sales/clients | /management/clients
   Action: Assign production members, set status, edit contact details

5. PROJECT CREATION
   Actor: super_admin | management | sales_admin | production_admin
   Page: /admin/projects | /management/projects | /production/projects
   Action: Create project linked to client, set budget, deadline, priority
   Storage: mock_projects
   Auto-generated: id, createdAt, updatedAt, files[], assignedTo[]

6. TEAM ASSIGNMENT
   Actor: super_admin | management | production_admin | sales_admin
   Page: ProjectModal (assignment panel)
   Action: Select team members from checklist, save
   Side effects:
     → Revision entry created in mock_revisions (type: assignment_change)
     → Notification sent to each newly assigned member

7. TASK CREATION
   Actor: dept_admin (within dept scope)
   Page: /*/tasks
   Action: Create task linked to projectId, assign to dept member
   Storage: mock_tasks
   Notes: assigneeDept and assigneeRole stored for scope enforcement

8. DELIVERABLE SUBMISSION
   Actor: production_member | production_admin
   Page: /production/deliverables
   Action: Create deliverable linked to client and project
   Status flow: Pending → In Progress → Review (member max)
             → Approved → Delivered (admin only)
   Storage: optivax_deliverables

9. INVOICE GENERATION
   Actor: sales_admin | management | super_admin
   Page: /*/billing → New Invoice
   Action: Create invoice with line items, link to client and project
   Storage: mock_invoices
   Auto-generated: invoice number (INV-YYYY-NNN), id, issueDate
   Server: auto-flags overdue if dueDate < today on every GET

10. PAYMENT PROCESSING
    Actor: management | super_admin
    Page: /*/billing → Mark Paid button (requires canApprove("billing"))
    Action: POST /saas/v1/invoices/mark-paid
    Side effects:
      → Invoice status: "paid", paidDate: today
      → Project.spent += invoice.amount (auto-update)
      → Payment notification sent to client userId
    Storage: mock_invoices (updated), mock_notifications

11. CLIENT VIEWS INVOICE
    Actor: client
    Page: /client/billing
    Data: Filtered to own clientId, read-only display
```

### 7.2 Employee → Attendance → Leave → Payroll

```
HR OPERATIONS WORKFLOW
──────────────────────

1. EMPLOYEE ONBOARDING
   Actor: hr_admin | super_admin
   Page: /hr/users
   Action: Create employee profile with role, department, designation, salary
   Storage: mock_profiles + optivax_employee_extra

2. DAILY ATTENDANCE
   Actor: hr_admin (logs for others) | hr_member (owns records)
   Page: /hr/attendance
   Action: Log check-in/check-out, set status (present/absent/late/on-leave)
   Storage: mock_attendance

3. LEAVE REQUEST
   Actor: Any employee (hr_member, sales_member, etc.)
   Page: /hr/leave (own department route)
   Action: Submit leave request with type, dates, reason
   Storage: optivax_leave_requests (status: "Pending")

4. LEAVE REVIEW
   Actor: hr_admin
   Page: /hr/leave
   Action: Approve or Reject leave request
   Storage: optivax_leave_requests (status: "Approved" | "Rejected")
   Notes: Rejected count surfaced in ManagementPanel HR tile

5. PAYROLL CALCULATION
   Actor: hr_admin (view)
   Page: /hr/payroll
   Data sources:
     - optivax_employee_extra (base salary)
     - optivax_leave_requests (leavesTaken count)
   Calculation: Net pay = salary − (unpaid leave deductions)
   Storage: Read-only display, optivax_employee_extra for status

6. MANAGEMENT REVIEW
   Actor: management
   Page: /management/dashboard
   Data: HR Analytics tile shows headcount, active employees, pending leaves,
         approved leaves, rejected leaves, attendance rate
```

### 7.3 Files → Revisions → Deliverables → Client Portal

```
DOCUMENT & REVISION WORKFLOW
─────────────────────────────

1. FILE UPLOAD (4-Step Modal)
   Actor: Any authenticated employee (canCreate("files") = true)
   Page: /*/files → Upload File button

   Step 1 — Client Selection (optional)
     Select client from optivax_clients or skip

   Step 2 — Project + Description (optional)
     Select project (filtered to selected client if chosen)
     Add description text

   Step 3 — Visibility Selection
     Private     → only uploader can see
     Department  → all members of uploaderDept
     Specific    → choose specific users from multi-picker
     Project Team → all users in project.assignedTo[]
     Client      → client with matching clientId

   Step 4 — File Upload
     Select local file, triggers upload on change

   Server actions on POST /saas/v1/files/create:
     → Save file record to mock_files
     → Create revision entry (type: file_upload, status: completed)
     → Send notifications if visibility is:
         "specific"     → each user in visibleTo[]
         "client"       → the client (notification → /client/files)
         "project-team" → each project.assignedTo[] member

2. FILE VISIBILITY ENFORCEMENT (GET /saas/v1/files/list)
   super_admin, management: see ALL files
   All other roles:
     no visibility field → visible to all staff (legacy)
     "private"      → uploadedById === userId
     "department"   → uploaderDept === userDept
     "specific"     → visibleTo.includes(userId)
     "project-team" → project.assignedTo.includes(userId)
     "client"       → role === "client" && clientId === userId

3. CLIENT REVISION REQUEST
   Actor: client
   Page: /client/revisions → Submit Revision
   Action: Submit revision comment linked to a project
   Storage: mock_revisions (status: "pending")

4. PRODUCTION REVIEWS REVISION
   Actor: production_admin | production_member (own projects)
   Page: /production/revisions
   Action: View revisions, update status (pending → in-progress → completed)
   Notes: production_member only sees revisions for assigned projects

5. MANAGEMENT OVERSIGHT
   Actor: management
   Page: /management/revisions
   Action: View all revisions, update status
   Notes: Sees all revisions across clients

6. CLIENT TRACKS STATUS
   Actor: client
   Page: /client/revisions
   Action: View own revision requests and their current status
```

---

<a name="section-8"></a>
## SECTION 8 — SERVICE LAYER

### 8.1 Architecture Overview

```
React Component
      │
      ▼
   Hook (useX.ts)
      │  manages: state, loading, error, cache
      │
      ▼
  Service (xService.ts)
      │  manages: endpoint construction, type marshaling
      │
      ▼
   api client (lib/client.ts)
      │  manages: headers, auth token injection, fetch
      │
      ▼
  Mock Server (mock/server.ts)
      │  manages: routing, RBAC filtering, storage R/W
      │
      ▼
  localStorage
```

### 8.2 API Client (`src/lib/client.ts`)

The `api` object wraps `window.fetch` with:
- Automatic `Content-Type: application/json` header
- `X-Mock-UserId: {user.id}` header injection
- `X-Mock-UserRole: {user.role}` header injection
- Response deserialization and error propagation
- `fetchSession()` — reads active session from localStorage

```typescript
api.get<T>(url: string): Promise<T>
api.post<T>(url: string, body: unknown): Promise<T>
api.put<T>(url: string, body: unknown): Promise<T>
api.delete<T>(url: string, body: unknown): Promise<T>
```

### 8.3 Complete Endpoint Registry

#### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/saas/v1/auth/signup` | Register new account |
| POST | `/saas/v1/auth/login` | Authenticate user |
| GET | `/saas/v1/auth/session` | Get current session |
| POST | `/saas/v1/auth/logout` | Clear session |

#### Profiles
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/profiles/list` | Get profiles (filterable by id, email) |
| POST | `/saas/v1/profiles/create` | Create profile |
| PUT | `/saas/v1/profiles/update` | Update profile |
| DELETE | `/saas/v1/profiles/delete` | Delete profile |

#### Clients
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/clients/list` | Get clients (filterable by id, email, assignedTo) |
| POST | `/saas/v1/clients/create` | Create client |
| PUT | `/saas/v1/clients/update` | Update client |
| DELETE | `/saas/v1/clients/delete` | Delete client |

#### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/projects/list` | Get projects (filterable by id, clientId, assignedTo) |
| POST | `/saas/v1/projects/create` | Create project |
| PUT | `/saas/v1/projects/update` | Update project |
| DELETE | `/saas/v1/projects/delete` | Delete project |

#### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/tasks/list` | Get tasks (filterable by assignedTo, projectId) |
| POST | `/saas/v1/tasks/create` | Create task |
| PUT | `/saas/v1/tasks/update` | Update task |
| DELETE | `/saas/v1/tasks/delete` | Delete task |

#### Invoices
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/invoices/list` | Get invoices (auto-overdue detection) |
| POST | `/saas/v1/invoices/generate` | Create invoice (auto-number) |
| PUT | `/saas/v1/invoices/update` | Update invoice |
| POST | `/saas/v1/invoices/mark-paid` | Mark paid + notify client |
| DELETE | `/saas/v1/invoices/delete` | Delete invoice |

#### Files
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/files/list` | Get files (visibility-filtered by role) |
| POST | `/saas/v1/files/create` | Upload file + create revision + send notifications |
| DELETE | `/saas/v1/files/delete` | Delete file |

#### Payments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/payments/list` | Get payments |
| POST | `/saas/v1/payments/create` | Create payment record |

#### Revisions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/revisions/list` | Get revisions (role-scoped) |
| POST | `/saas/v1/revisions/create` | Create revision |
| PUT | `/saas/v1/revisions/update` | Update revision status |

#### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/notifications/list` | Get notifications (userId-filtered) |
| POST | `/saas/v1/notifications/create` | Create notification |
| PUT | `/saas/v1/notifications/update` | Update notification (mark read) |
| PUT | `/saas/v1/notifications/mark-all-read` | Mark all read for user |
| DELETE | `/saas/v1/notifications/delete` | Delete single notification |
| DELETE | `/saas/v1/notifications/delete-all` | Delete all for user |

#### Leads
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/leads/list` | Get leads (member-scoped to own) |
| POST | `/saas/v1/leads/create` | Create lead |
| PUT | `/saas/v1/leads/update` | Update lead |
| DELETE | `/saas/v1/leads/delete` | Delete lead |
| POST | `/saas/v1/leads/convert` | Convert lead to client (duplicate check) |

#### Email Marketing
| Method | Endpoint | Description |
|---|---|---|
| GET/POST/PUT/DELETE | `/saas/v1/email/templates` | Template CRUD |
| GET/POST/PUT/DELETE | `/saas/v1/email/campaigns` | Campaign CRUD |
| GET/POST/PUT | `/saas/v1/email/automations` | Automation CRUD |

#### Stripe / Payments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/config/stripe` | Get Stripe publishable key |
| POST | `/saas/v1/create-payment-intent` | Create payment intent |
| POST | `/saas/v1/settings/stripe` | Save Stripe settings |

#### SSE
| Method | Endpoint | Description |
|---|---|---|
| GET | `/saas/v1/sse/notifications` | Server-Sent Events stream for real-time notifications |

### 8.4 Page → Hook → Service → Endpoint → Storage Map

| Page | Hook | Service | Endpoint | Storage Key |
|---|---|---|---|---|
| Files | `useFiles` | `FileService` | GET /files/list, POST /files/create | `mock_files` |
| Clients | `useClients` | `ClientService` | GET /clients/list | `optivax_clients` |
| Projects | `useProjects` | `ProjectService` | GET /projects/list | `mock_projects` |
| Tasks | — | — | GET /tasks/list | `mock_tasks` |
| Billing | `useInvoices` | `InvoiceService` | GET /invoices/list | `mock_invoices` |
| Notifications | `useNotifications` | `NotificationService` | GET /notifications/list | `mock_notifications` |
| Leads | `useLeads` | `LeadService` | GET /leads/list | `mock_leads` |
| Revisions | — | — | GET /revisions/list | `mock_revisions` |
| Audit Logs | — | `AuditLogService` | localStorage direct | `optivax_audit_logs` |
| Employees | — | `UserService` | GET /profiles/list | `mock_profiles` |
| Payroll | — | — | localStorage direct | `optivax_employee_extra` |
| Leave | — | — | localStorage direct | `optivax_leave_requests` |
| Attendance | — | — | localStorage direct | `mock_attendance` |
| Deliverables | — | — | localStorage direct | `optivax_deliverables` |
| Email Marketing | `useCampaigns` / `useTemplates` / `useAutomations` | `EmailService` | GET/POST/PUT/DELETE /email/* | `email_*` |
| Social Tracking | `useSocialTracking` | — | localStorage direct | `social_links`, `social_clicks`, `social_account_metrics` |

---

<a name="section-9"></a>
## SECTION 9 — DATABASE MODEL (ERD)

### 9.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OPTIVAX DATA MODEL                              │
└─────────────────────────────────────────────────────────────────────────┘

[Profile/User]
  id PK
  email UNIQUE
  full_name
  role FK→UserRole
  departmentId
  ──────────────────┐
  │                 │
  │                 │
  ▼                 ▼
[Client]        [EmployeeExtra]
  id PK           userId FK→Profile.id (1:1)
  email UNIQUE    salary
  clientId FK     salaryStatus
    →Profile.id   workMode
  companyName     leavesTaken
  totalProjects ◄─────────────────┐
  totalBilled ◄──────────────┐    │
  assignedProductionMembers[] │    │
       FK[]→Profile.id       │    │
  │                          │    │
  ├──────────────────────────┼────┼──────────────────────┐
  │                          │    │                      │
  ▼                          │    │                      ▼
[Project]                    │    │              [Invoice]
  id PK                      │    │                id PK
  clientId FK→Client.id      │    │                clientId FK→Client.id
  assignedTo[] FK[]           │    │                projectId FK→Project.id
    →Profile.id               │    │                amount
  budget                     │    │                status (paid/pending/overdue)
  spent ◄────────────────────┘    │                items[]
  progress                        │                │
  │                               │                ▼
  ├──────────────────────────┐    │            [Payment]
  │                          │    │              id PK
  ▼                          │    │              invoiceId FK→Invoice.id
[Task]                    [Deliverable]           amount
  id PK                    id PK                  method
  projectId FK→Project.id  projectId FK→Project.id
  assignedTo FK→Profile.id clientId FK→Client.id
  assigneeDept             uploadedBy FK→Profile.id
  assigneeRole             status (5-stage)
                           reviewedBy FK→Profile.id
                           approvedBy FK→Profile.id

[File]
  id PK
  projectId FK→Project.id (opt)
  clientId FK→Client.id (opt)
  uploadedById FK→Profile.id
  uploaderDept
  visibility (private/dept/specific/project-team/client)
  visibleTo[] FK[]→Profile.id

[Revision]
  id PK
  projectId FK→Project.id
  clientId FK→Client.id
  updatedBy FK→Profile.id
  type (file_upload/assignment_change/client-request)
  status (pending/in-progress/completed)

[Notification]
  id PK
  userId FK→Profile.id
  type
  read

[LeaveRequest]
  id PK
  employeeId FK→Profile.id
  status (Pending/Approved/Rejected)

[Attendance]
  id PK
  employeeId FK→Profile.id
  date
  status

[AuditLog]
  id PK
  performedBy FK→Profile.id
  entityType
  entityId (polymorphic FK)
  action
```

### 9.2 Foreign Key Summary

| Child Table | FK Field | References |
|---|---|---|
| Client | `id` (portal-linked) | Profile.id |
| Project | `clientId` | Client.id |
| Project | `assignedTo[]` | Profile.id[] |
| Task | `projectId` | Project.id |
| Task | `assignedTo` | Profile.id |
| Invoice | `clientId` | Client.id |
| Invoice | `projectId` | Project.id |
| Payment | `invoiceId` | Invoice.id |
| File | `projectId` | Project.id |
| File | `clientId` | Client.id |
| File | `uploadedById` | Profile.id |
| File | `visibleTo[]` | Profile.id[] |
| Deliverable | `clientId` | Client.id |
| Deliverable | `projectId` | Project.id |
| Deliverable | `uploadedBy` | Profile.id |
| Deliverable | `reviewedBy` | Profile.id |
| Deliverable | `approvedBy` | Profile.id |
| Revision | `projectId` | Project.id |
| Revision | `clientId` | Client.id |
| Revision | `updatedBy` | Profile.id |
| Notification | `userId` | Profile.id |
| LeaveRequest | `employeeId` | Profile.id |
| Attendance | `employeeId` | Profile.id |
| EmployeeExtra | `userId` | Profile.id |
| AuditLog | `performedBy` | Profile.id |

---

<a name="section-10"></a>
## SECTION 10 — STATE MANAGEMENT

### 10.1 Context Architecture

The platform uses React Context API exclusively — no Redux, no Zustand, no external state library.

```
<App>
  └── <AuthProvider>          (src/context/AuthContext.tsx)
        └── <ToastProvider>   (src/context/ToastContext.tsx)
              └── <Router>
                    └── <AppLayout>
                          └── [page components]
```

### 10.2 AuthContext

**State Managed:**
- `user: User | null` — currently authenticated user with all profile fields
- `isLoading: boolean` — true during session initialization on mount

**Initialization:**
```
App mount
  → fetchSession() reads mock_session from localStorage
  → converts MockUserSession → User object
  → sets user state
  → useSSE(!!user) activates SSE connection when user exists
```

**Exposed Methods:**
| Method | Description |
|---|---|
| `login(email, password)` | Authenticates, sets user state, returns role home path |
| `logout()` | Clears session, nulls user state |
| `register(email, password, name, role?)` | Creates account, auto-logs in |
| `updateProfile(data)` | Updates own profile, merges into user state |
| `checkPermission(domain, action)` | Direct matrix lookup (hasPermission) |
| `canView(domain)` | `hasPermissionScoped` shorthand |
| `canCreate(domain)` | `hasPermissionScoped` shorthand |
| `canEdit(domain)` | `hasPermissionScoped` shorthand |
| `canDelete(domain)` | `hasPermissionScoped` shorthand |
| `canExport(domain)` | `hasPermissionScoped` shorthand |
| `canApprove(domain)` | `hasPermissionScoped` shorthand |
| `canAssign(domain)` | `hasPermissionScoped` shorthand |

### 10.3 Permissions Flow

```
Component calls: canCreate("files")
      │
      ▼
AuthContext.canCreate("files")
      │
      ▼
rbacCanCreate(user, "files")    [from rbac.ts]
      │
      ▼
hasPermissionScoped(user, "files", "CREATE")
      │
      ├─ user.role === "super_admin"? → true
      ├─ user.role === "management"?  → hasPermission(user, "files", "CREATE")
      │                                 → RBAC_MATRIX["management"]["files"].includes("CREATE")
      │                                 → true (management has files: [VIEW,CREATE,EDIT,DELETE,EXPORT])
      │
      ├─ domain in CROSS_CUTTING_DOMAINS? ("files" → yes)
      │    → skip scope restriction
      │    → hasPermission(user, "files", "CREATE")
      │    → RBAC_MATRIX[role]["files"].includes("CREATE")
      │
      └─ else (non-cross-cutting, non-admin)
           → if action !== "VIEW" && primary !== domain → false
           → else hasPermission(user, domain, action)
```

### 10.4 ToastContext

Provides `showToast(message: string, type: "success" | "error" | "info" | "warning")`.
- Auto-dismissed after timeout
- Stacked in corner overlay
- Used by all pages for operation feedback

### 10.5 Notifications Flow

```
EVENT TRIGGERS notification creation:
  - Invoice mark-paid     → client notification (server-side)
  - File upload (shared)  → recipient notifications (server-side)
  - Lead conversion       → sales_admin notification (server-side)
  - Project assignment    → new assignee notifications (ProjectModal client-side)

REAL-TIME DELIVERY:
  useSSE hook
    → connects GET /saas/v1/sse/notifications
    → receives "notification" events
    → dispatches "saas:notification" DOM event
    → reconnects with exponential backoff on disconnect

CROSS-TAB SYNC:
  NotificationService
    → broadcastNotification() via BroadcastChannel("optivax-notifications")
    → localStorage "storage" event listener in useNotifications
    → Both channels trigger state refresh on other tabs

BADGE COUNT:
  useNotifications() → unreadCount
    → derived from notifications where read === false
    → shown in sidebar bell icon
```

---

<a name="section-11"></a>
## SECTION 11 — FILE MANAGEMENT SYSTEM

### 11.1 Upload Flow

```
User clicks "Upload File" (visible when canCreate("files") === true)
      │
      ▼
4-Step Modal Opens
  ┌─────────────────────────────────────────────────────────┐
  │  Step 1: Client Selection                               │
  │    ● Dropdown from optivax_clients                     │
  │    ● "Skip" button → proceeds to Step 2 with no client │
  │    ● "Next" button → proceeds with selected client      │
  └─────────────────────────────────────────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Step 2: Project + Description                          │
  │    ● Projects filtered to selected client (if chosen)  │
  │    ● All projects if no client selected                 │
  │    ● Description text input (optional)                  │
  │    ● "Back" to Step 1, "Next" to Step 3                 │
  └─────────────────────────────────────────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Step 3: Visibility Selection                           │
  │    ● Private — only you                                 │
  │    ● Department — your entire department                │
  │    ● Specific Users — searchable multi-picker           │
  │    ● Project Team — project.assignedTo[]                │
  │    ● Client — the attached client                       │
  │    ● User picker appears when "Specific Users" chosen   │
  │    ● Next disabled if Specific chosen with 0 users      │
  └─────────────────────────────────────────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Step 4: File Upload                                    │
  │    ● Summary card: client, project, desc, visibility   │
  │    ● File input → triggers upload on change             │
  │    ● Uploading... state with spinner                    │
  └─────────────────────────────────────────────────────────┘
      │
      ▼
POST /saas/v1/files/create
  Payload: { name, size, type, uploadedBy (name),
             uploadedById, uploaderDept, uploadDate,
             projectId?, clientId?, description?,
             visibility, visibleTo? }
  Server actions:
    1. Write file record to mock_files
    2. Write revision entry to mock_revisions
       (type: "file_upload", status: "completed")
    3. Send notifications:
       - visibility "specific" → each visibleTo[] user
       - visibility "client"   → clientId user → /client/files
       - visibility "project-team" → project.assignedTo[] users
      │
      ▼
File appears immediately in list (React state update via setFiles)
```

### 11.2 Visibility Enforcement Matrix

| Visibility | Server Filter Logic |
|---|---|
| `private` | `f.uploadedById === mockUserId` |
| `department` | `f.uploaderDept === currentUser.departmentId` |
| `specific` | `f.visibleTo.includes(mockUserId)` |
| `project-team` | `project.assignedTo.includes(mockUserId)` |
| `client` | `mockUserRole === "client" && f.clientId === mockUserId` |
| legacy (no visibility field) | Visible to all staff, hidden from clients |

**Bypass roles:** `super_admin` and `management` see all files regardless of visibility.

### 11.3 Visual Indicators

Each file card displays a colored visibility badge:
- Private → grey
- Department → purple
- Specific Users → blue
- Project Team → indigo
- Client → green

### 11.4 Delete Permissions

| Role | Can Delete Files |
|---|---|
| super_admin | ✓ All files |
| management | ✓ All files |
| production_admin | ✓ All files |
| marketing_admin | ✓ All files |
| hr_admin | ✓ All files |
| sales_admin | ✓ All files |
| *_member | ✗ |
| client | ✗ |

---

<a name="section-12"></a>
## SECTION 12 — PROJECT MANAGEMENT SYSTEM

### 12.1 Project Lifecycle

```
not-started → in-progress → on-hold → completed
                  │
                  └── can return to any prior status
```

### 12.2 Team Assignment

The project assignment panel (visible to super_admin, management, production_admin, sales_admin) allows:

1. **View current assignees** — displayed as read-only chips showing name · department · designation
2. **Search and select new assignees** — searchable checklist of all staff (excludes clients and super_admin)
3. **Toggle assignment** — checkbox per user, changes tracked in `formData.assignedTo[]`

**On save with assignment change:**
- Calculate `added` (new IDs not in previous list) and `removed` (previous IDs not in new list)
- Write revision entry: `{ type: "assignment_change", comment: "Added: X | Removed: Y", status: "pending" }`
- Send notification to each newly added user: `"You have been assigned to project {name}"`

### 12.3 Project → Task Hierarchy

Tasks must have a `projectId`. The task creation modal enforces project selection:
- Dept admin task picker shows projects in a dropdown
- `assigneeDept` and `assigneeRole` are stored on each task for scope enforcement
- Dept member assignee picker uses explicit allowlist: `[${dept}_admin, ${dept}_member]`

### 12.4 Deliverable Lifecycle

```
PRODUCTION MEMBER flow:
  Create deliverable → Pending
  → Advance (own deliverables only)
  Pending → In Progress → Review (member maximum)

PRODUCTION ADMIN flow:
  Review → Approved
  Approved → Delivered

STATUS DEFINITIONS:
  Pending     — submitted, awaiting work
  In Progress — actively being worked on
  Review      — submitted for internal review
  Approved    — admin has approved quality
  Delivered   — client has received the deliverable
```

### 12.5 Revision Tracking

Every project-related change that produces a revision:
| Trigger | Revision Type | Creator |
|---|---|---|
| Client submits revision request | (client request) | client (via `/client/revisions`) |
| Project assignment changes | `assignment_change` | ProjectModal (automatic) |
| File uploaded to project | `file_upload` | Server (automatic) |

---

<a name="section-13"></a>
## SECTION 13 — BILLING SYSTEM

### 13.1 Invoice Workflow

```
CREATE INVOICE
Actor: sales_admin | management | super_admin
Page: /*/billing → New Invoice

Fields:
  - Client (required) — FK to optivax_clients
  - Project (optional) — FK to mock_projects
  - Invoice number — Auto-generated: INV-{YYYY}-{NNN}
  - Issue date, Due date
  - Line items: description, quantity, unit price, total
  - Notes (optional)

Server:
  - Stores to mock_invoices
  - Status defaults to "pending"
  - Auto-detects overdue on every GET request

EDIT INVOICE
  - Gated by canEdit("billing")
  - management and super_admin: full edit
  - sales_admin: can edit (not delete/approve)

MARK PAID
  - Button visible only when canApprove("billing")
  - Only: management, super_admin
  - POST /saas/v1/invoices/mark-paid
  - Sets: status="paid", paidDate=today
  - Side effects:
      → project.spent += invoice.amount
      → Client notification: "Invoice {number} for ${amount} has been marked as paid"

DELETE INVOICE
  - Gated by canDelete("billing") 
  - Only: management, super_admin
```

### 13.2 Payment Records

Payments are created automatically when an invoice is marked paid. Each payment record stores:
- Payment method (credit-card, bank-transfer, check, cash)
- Transaction ID
- Check image URL (for check payments)
- Stripe PaymentIntent ID (for card payments)

### 13.3 Overdue Detection

The server auto-computes overdue status on every invoice GET:
```typescript
if (invoice.status === "pending" && new Date(invoice.dueDate) < new Date()) {
  invoice.status = "overdue";
}
```
This is computed at query time, not persisted — the stored status remains "pending" until explicitly marked paid or updated.

### 13.4 Stripe Integration Status

| Feature | Status |
|---|---|
| Publishable key endpoint | Implemented (mock key: `pk_test_mock_optivax_dev`) |
| Payment intent creation | Implemented (returns mock clientSecret) |
| Webhook handling | Not implemented |
| Real card processing | Not implemented |
| Stripe settings storage | Implemented (optivax_stripe_settings) |

The Stripe integration is scaffolded but uses mock credentials. The `POST /saas/v1/create-payment-intent` endpoint simulates a successful payment intent response. Actual card tokenization and webhook confirmation are not yet wired.

---

<a name="section-14"></a>
## SECTION 14 — REPORTING SYSTEM

### 14.1 Dashboard KPIs by Role

#### Super Admin / Admin Dashboard
- Total clients, total projects, total revenue
- Recent activity feed
- Cross-department status tiles

#### Sales Dashboard
- Total leads, conversion rate, pipeline value
- Leads by source (breakdown chart)
- Monthly revenue trend
- Top performers (by target achievement)
- Active campaigns count

#### Production Dashboard
- Deliverables by status (Pending / In Progress / Review / Approved / Delivered)
- Project progress distribution
- Team workload (tasks per member)
- Overdue deliverables count

#### Marketing Dashboard
- Email campaign stats (sent, open rate, click rate)
- Social link clicks by platform
- Lead attribution by channel
- Automation trigger counts

#### HR Dashboard
- Total headcount by department
- Active / on-leave / inactive employee split
- Pending leave requests
- Attendance rate (this month)
- Payroll status breakdown

#### Management Dashboard
- Financial summary: total billed, collected, outstanding
- Project pipeline: by status
- HR Analytics tile: headcount, active, pending/approved/rejected leaves
- Department performance comparison
- Recent audit activity

#### Client Dashboard
- Active project count + progress
- Invoice summary: paid vs pending vs overdue
- Unread notifications count
- Recent files count

### 14.2 Reports Page

The Reports page (`/*/reports`) is role-filtered and displays charts and tables relevant to the requesting department. Content adapts based on `user.role`:
- Sales: pipeline funnel, lead source breakdown, target achievement
- Production: deliverable completion rate, project health
- Marketing: campaign performance, social analytics
- HR: attendance, leave utilization, payroll summary
- Management: cross-department aggregate view

### 14.3 Export Capability

Roles with `canExport(domain)` can trigger data export (CSV/PDF where implemented). Export gating:

| Role | Exportable Domains |
|---|---|
| super_admin | All |
| management | All (VIEW+EXPORT on all) |
| sales_admin | sales, reports, files |
| production_admin | production, reports, files |
| marketing_admin | marketing, reports, files |
| hr_admin | hr, reports, files |
| *_member | None |

---

<a name="section-15"></a>
## SECTION 15 — SECURITY MODEL

### 15.1 Authentication

```
Login Flow:
  User submits email + password
      │
      ▼
  POST /saas/v1/auth/login
      │
      ▼
  Server: reads mock_passwords[email]
          bcrypt compare (mock implementation)
          if match: create session token
          write to mock_session in localStorage
          return { user, session }
      │
      ▼
  Client: AuthContext.login() sets user state
          Returns roleHome path (e.g., "/sales/dashboard")
          React Router navigates to role home

Session:
  - Stored in localStorage["mock_session"]
  - fetchSession() on app mount restores user
  - logout() clears mock_session and nulls user state
  - No JWT, no expiry, no refresh token (mock limitation)
```

### 15.2 Route Protection

Every non-public route is wrapped by `<ProtectedRoute>`:

```typescript
<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin", "sales_member"]}>
  {/* routes */}
</ProtectedRoute>
```

**ProtectedRoute behavior:**
1. If no authenticated user → redirect to `/login`
2. If user role not in `allowedRoles` → redirect to role home (prevents cross-role URL manipulation)
3. If role is allowed → render children

**Nested protection** (e.g., admin-only within dept route):
```typescript
<Route element={<ProtectedRoute allowedDomain="production" allowedRoles={["production_admin", "hr_admin", "management"]} />}>
  <Route path="/production/users" element={<Employees />} />
</Route>
```

### 15.3 Data Isolation

Server-level filtering enforced on every read:

| Entity | Filter Applied By Server |
|---|---|
| Files | Visibility rules per requesting role |
| Revisions | production_member → own projects only; other non-admin → empty |
| Clients | client role → own record only |
| Projects | client role → own clientId only |
| Invoices | client role → own clientId only |
| Notifications | all roles → own userId only (except super_admin) |
| Leads | sales_member → assignedTo === userId |

### 15.4 RBAC Enforcement Points

RBAC is enforced at **three layers**:

1. **Route Layer** — `ProtectedRoute` prevents rendering wrong role's pages
2. **UI Layer** — Buttons/forms conditionally rendered based on `canCreate/canEdit/canDelete(domain)`
3. **Server Layer** — Mock server reads `X-Mock-UserRole` header and applies data scope filters

### 15.5 Privilege Escalation Prevention

The signup endpoint validates role:
```typescript
const PRIVILEGED_ROLES = ["super_admin", "management", "sales_admin", "production_admin", 
                          "marketing_admin", "hr_admin", "sales_member", "production_member",
                          "marketing_member", "hr_member"];
// Public signup cannot claim a privileged role → defaults to "client"
```

All privileged accounts must be created by an existing super_admin through the employee management interface.

### 15.6 Audit Trail

Every significant action is logged to `optivax_audit_logs` via `AuditLogService.add()`:

```typescript
{
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "EXPORT" | "APPROVE"
  entityType: "client" | "project" | "invoice" | "file" | "user" | ...
  entityId: string
  entityName: string
  performedBy: string     // user ID
  performedByName: string
  performedByRole: UserRole
  timestamp: string
  description: string
  oldValue?: {}           // previous state for UPDATE
  newValue?: {}           // new state for UPDATE
}
```

- Maximum 2000 entries retained (oldest pruned automatically)
- Full-text search + filters by: entity type, action, role, date range
- Accessible to: super_admin, management only

---

<a name="section-16"></a>
## SECTION 16 — CURRENT LIMITATIONS

### 16.1 Fully Implemented

| Feature | Status |
|---|---|
| Role-based authentication (11 roles) | ✅ Complete |
| Protected route enforcement | ✅ Complete |
| RBAC matrix with scope enforcement | ✅ Complete |
| 4-step file upload with visibility | ✅ Complete |
| File visibility enforcement (server-side) | ✅ Complete |
| File upload → revision → notification pipeline | ✅ Complete |
| Deliverable 5-stage lifecycle | ✅ Complete |
| Invoice overdue auto-detection | ✅ Complete |
| Invoice mark-paid → project.spent update | ✅ Complete |
| Client notification on payment | ✅ Complete |
| Lead-to-client conversion with duplicate prevention | ✅ Complete |
| Project assignment panel with revision trail | ✅ Complete |
| Task dept-scope enforcement (assignee allowlist) | ✅ Complete |
| Management dashboard with HR analytics | ✅ Complete |
| Cross-tab notification sync | ✅ Complete |
| SSE connection with reconnect backoff | ✅ Complete |
| Email marketing (templates, campaigns, automations) | ✅ Complete |
| Social link tracking with persistent metrics | ✅ Complete |
| Audit log with search and filters | ✅ Complete |
| HR leave request workflow | ✅ Complete |
| Payroll display with leave deductions | ✅ Complete |
| Designation field on employees | ✅ Complete |
| Revision visibility scoping by role | ✅ Complete |
| Production member deliverable advancement limit | ✅ Complete |
| Management files access (CREATE/EDIT/DELETE) | ✅ Complete |
| HR department files page and route | ✅ Complete |
| Cross-cutting domain scope exemption (files etc.) | ✅ Complete |

### 16.2 Partially Implemented

| Feature | Gap |
|---|---|
| Stripe payments | Scaffolded with mock key; no real card tokenization or webhook |
| Email automation triggers | Rules exist in UI; no actual email sending |
| Campaign analytics | Mock data; not derived from real send events |
| Social click tracking | Tracking link stored; click events simulated |
| Reports export | Export permission gated but CSV/PDF generation not implemented |
| Attendance bulk import | Manual entry only; no CSV upload |
| Commission calculation | Records display; automatic calculation from targets/sales not wired |
| Profile avatar upload | UI field exists; actual image upload not persisted beyond URL |
| Campaign budget vs spend tracking | Display only; no spend deduction automation |

### 16.3 Mock Only (Backend Required for Production)

| Feature | Notes |
|---|---|
| Session management | localStorage session, no JWT, no expiry |
| Password storage | Stored as plaintext strings in `mock_passwords` |
| SSE notifications | Simulated; no real event stream from server |
| File storage | `URL.createObjectURL()` — files exist only in memory/tab |
| Email delivery | EmailService writes to localStorage; no SMTP |
| Stripe webhooks | No callback handler |
| Multi-user real-time collaboration | Each browser has own localStorage; no shared backend |
| Audit log persistence | Cleared on `localStorage.clear()`; no server-side log |

### 16.4 Future Features (Not Yet Started)

| Feature | Notes |
|---|---|
| Two-factor authentication | Not in scope for current build |
| Role change audit | No log entry for profile role updates |
| Client self-service billing | Clients cannot pay invoices through portal |
| Mobile app | Web-only; no React Native counterpart |
| Subscription billing (recurring) | Subscription model exists in data but no billing automation |
| API rate limiting | Not applicable (in-browser mock) |
| Data backup / export | No full-platform data export |
| Multi-language support | English only |
| Dark mode persistence | Likely functional but not documented |
| Webhook integrations (Slack, Zapier) | Not implemented |

---

<a name="section-17"></a>
## SECTION 17 — PRODUCTION READINESS

### 17.1 Scoring Summary

| Dimension | Score | Rationale |
|---|---|---|
| **Architecture** | 8.5 / 10 | Clean separation of concerns: context → hook → service → mock API → storage. Routes well-structured. Mock server cleanly mimics REST. Deduction: no backend, no true persistence layer. |
| **RBAC** | 9.0 / 10 | 11 roles × 11 domains × 7 actions matrix. Scope enforcement with cross-cutting exemptions correctly implemented. Route, UI, and server-level enforcement. Deduction: `checkPermission` bypasses scope (uses `hasPermission` directly) — minor inconsistency. |
| **Security** | 5.5 / 10 | Routes protected, privilege escalation prevented, data isolation enforced. Significant deductions: passwords plaintext in localStorage, session has no expiry, no HTTPS enforcement, no CSRF protection, no real auth backend. |
| **Data Integrity** | 8.0 / 10 | Foreign key relationships consistent throughout. Denormalized fields (totalBilled, totalProjects) correctly seeded. Invoice/payment amounts consistent. Overdue auto-detection on read. Deduction: denormalized counts not auto-updated on create/delete (only on mark-paid). |
| **Workflow** | 9.0 / 10 | All major business workflows implemented end-to-end: lead → client → project → deliverable → invoice → payment → client notification. File → revision → notification chain complete. HR leave/attendance/payroll linked. Deduction: no email actually sent, Stripe not real. |
| **Maintainability** | 8.0 / 10 | TypeScript strict mode, clear file organization, consistent service layer pattern. Seed data well-structured. Deduction: some pages access localStorage directly without going through a service; some denormalized fields could drift. |
| **Scalability** | 3.0 / 10 | localStorage has ~5MB cap. Single-browser single-user architecture. No database, no API server, no horizontal scaling. All data lost on `localStorage.clear()`. This is appropriate for a demo/prototype, not production. |

**Overall Production Readiness: 7.3 / 10** *(as a production-ready prototype; 4.5/10 as a deployable SaaS)*

### 17.2 Path to Production

The following changes are required before production deployment:

#### Critical (Must Have)
1. Replace localStorage with a real database (PostgreSQL recommended for relational data, S3/Blob for files)
2. Replace mock auth with real authentication (Supabase Auth, Auth0, or custom JWT with refresh tokens)
3. Hash passwords with bcrypt before storage
4. Deploy Node.js/Express or equivalent backend to serve the API endpoints defined by the mock server
5. Replace `URL.createObjectURL()` file URLs with real cloud file storage (S3, Cloudflare R2)
6. Implement real Stripe webhook confirmation for payment processing
7. Add HTTPS enforcement and proper CORS policy

#### High Priority
8. Implement real email delivery via SendGrid or Postmark for email marketing and notifications
9. Replace SSE simulation with real server-sent events or WebSocket connection
10. Add proper session management with JWT expiry and refresh token rotation
11. Add API rate limiting and input sanitization

#### Medium Priority
12. Migrate denormalized fields (totalBilled, totalProjects) to computed views or triggers
13. Add pagination to all list endpoints (currently returns all records)
14. Implement proper audit log backend storage with retention policy
15. Add comprehensive error boundary and error reporting (Sentry)

---

<a name="section-18"></a>
## SECTION 18 — FINAL SUMMARY

### Executive Summary

**OptiVax Global SaaS CRM** is a fully-featured, role-based client relationship and business operations platform serving a digital services agency model. The platform manages the complete client and employee lifecycle from lead acquisition through project delivery, invoicing, payment collection, and HR operations — all within a unified, permission-controlled interface.

### Platform Strengths

**Comprehensive Role Architecture**
Eleven distinct roles with granular RBAC across eleven permission domains and seven action types. Every significant user interaction — route access, button visibility, data retrieval — passes through permission checks at multiple enforcement layers. The scope restriction system ensures that departmental users cannot accidentally access cross-department data while still providing legitimate cross-cutting access to infrastructure domains like files, notifications, and reports.

**Complete Business Workflow Coverage**
The platform implements end-to-end workflows for every major business process:
- Sales pipeline from lead capture through client conversion
- Project management from creation through completion with team assignment audit trails
- Production delivery through a five-stage deliverable lifecycle
- Client-facing portal with billing, file access, and revision request tracking
- Financial management with invoice generation, overdue detection, and payment confirmation
- HR operations including leave management, attendance tracking, and payroll display

**Production-Quality Data Architecture**
All data entities carry proper foreign key relationships, denormalized display fields for performance, and role-scoped server-side filtering. The file visibility system (five distinct levels including private, department, project-team, specific users, and client) is enforced at the API layer with automatic bypass for administrator roles.

**Audit and Compliance Ready**
Every significant platform action is captured in a structured audit log with actor identity, role, entity references, old/new values, and timestamp. A maximum of 2000 entries with full-text search and multi-filter querying supports compliance review. Both management and super_admin roles have read-only access to the complete audit trail.

### Intended Audiences

| Audience | How to Use This Document |
|---|---|
| **Client (Non-Technical)** | Sections 1, 2, 7, 13, 14 — understand what the platform does and who uses it |
| **Developer Onboarding** | Sections 4, 5, 8, 10 — understand routes, pages, service layer, and state management |
| **Backend Engineer** | Sections 6, 8, 9, 16.3 — understand data model and what to build for production |
| **Security Review** | Sections 3, 15, 16.2, 17 — understand RBAC, auth model, and gaps |
| **Product Manager** | Sections 7, 16, 17 — understand workflows, gaps, and production requirements |
| **QA / Testing** | Sections 2, 3, 4, 7 — understand role behaviors, expected routes, and workflow sequences |
| **Future Maintainer** | Sections 6, 8, 9, 10 — understand the data model, service patterns, and context architecture |

### Technology Decisions

The choice of an in-browser mock server over a real API backend is the defining architectural decision of this build. It enables:
- **Zero infrastructure cost** for demonstration and development
- **Instant data reset** by clearing localStorage
- **Full API simulation** with real HTTP semantics, role-scoped filtering, and side-effect chains
- **No deployment dependency** — the entire platform runs from a single `npm run dev`

This is the appropriate approach for a prototype, proof-of-concept, or design system. The mock server's endpoint contracts are clean enough that swapping in a real backend requires implementing the same URL patterns against a real database — the frontend layer requires no changes.

### Production Migration Path

The fastest path to a production-deployable version is:
1. Deploy the existing frontend as-is to Vercel/Netlify
2. Build a Node.js/Express backend implementing every `/saas/v1/*` endpoint defined in `server.ts`
3. Connect to PostgreSQL for relational data and S3 for file storage
4. Replace `mockLogin` / `fetchSession` with Supabase Auth or a custom JWT implementation
5. Configure real Stripe webhooks for payment confirmation
6. Point the `api` client in `lib/client.ts` to the real backend URL

The service layer and hook architecture are production-ready. The UI components and RBAC logic require no modification for a real backend deployment.

---

*Document generated: 2026-06-20*  
*Platform version: 1.0 (prototype)*  
*Codebase: React 19 / TypeScript 5.7 / Vite 6*
