/**
 * menuConfig.ts
 *
 * Single source of truth for sidebar navigation.
 * Each role has an explicit list of menu items with exact, pre-computed paths.
 * AppSidebar reads this directly — no fragile prefix+key generation.
 */

import type { UserRole } from "../types";

export interface SubMenuItem {
  key: string;
  label: string;
  path: string;
}

export interface MenuItem {
  key: string;
  label: string;
  /** icon key — mapped to a component in AppSidebar */
  icon: "grid" | "users" | "task" | "dollar" | "file" | "mail" | "user-circle" | "settings" | "bell" | "folder" | "shield" | "chart";
  /** Direct path — omit when item has subItems */
  path?: string;
  subItems?: SubMenuItem[];
}

export type MenuConfig = Record<UserRole, MenuItem[]>;

export const MENU_CONFIG: MenuConfig = {
  // ── Super Admin ────────────────────────────────────────────────────────
  super_admin: [
    { key: "super-dashboard", label: "Super Admin",    icon: "shield",       path: "/super-admin/dashboard" },
    { key: "admin-panel",     label: "Admin Panel",    icon: "grid",         path: "/admin/dashboard" },
    { key: "employees",       label: "All Employees",  icon: "users",        path: "/admin/users" },
    { key: "departments",     label: "Departments",    icon: "grid",         path: "/super-admin/departments" },
    { key: "clients",         label: "Clients",        icon: "users",        path: "/admin/clients" },
    { key: "projects",        label: "Projects",       icon: "task",         path: "/admin/projects" },
    { key: "billing",         label: "Billing",        icon: "dollar",       path: "/admin/billing" },
    { key: "commissions",     label: "Commissions",    icon: "dollar",       path: "/admin/commissions" },
    { key: "files",           label: "Files",          icon: "folder",       path: "/admin/files" },
    {
      key: "email-marketing",
      label: "Email Marketing",
      icon: "mail",
      subItems: [
        { key: "campaigns",  label: "Campaigns",  path: "/admin/email/campaigns" },
        { key: "templates",  label: "Templates",  path: "/admin/email/templates" },
        { key: "audience",   label: "Audience",   path: "/admin/email/audience" },
        { key: "analytics",  label: "Analytics",  path: "/admin/email/analytics" },
        { key: "automation", label: "Automation", path: "/admin/email/automation" },
      ],
    },
    { key: "reports",         label: "Reports",        icon: "chart",        path: "/admin/reports" },
    { key: "notifications",   label: "Notifications",  icon: "bell",         path: "/admin/notifications" },
    { key: "revisions",       label: "Revisions",      icon: "task",         path: "/admin/revisions" },
    { key: "conversations",   label: "Client Messages",icon: "mail",         path: "/conversations" },
    { key: "budget",          label: "Budget Mgmt",    icon: "dollar",       path: "/budget" },
    { key: "salary-slips",    label: "Salary Slips",   icon: "file",         path: "/hr/salary-slips" },
    { key: "advance-salary",  label: "Advance Salary", icon: "dollar",       path: "/hr/advance-salary" },
    { key: "audit-logs",      label: "Audit Logs",     icon: "shield",       path: "/admin/audit-logs" },
    { key: "settings",        label: "Settings",       icon: "settings",     path: "/admin/settings" },
    {
      key: "sa-sales",
      label: "Sales",
      icon: "dollar",
      subItems: [
        { key: "sa-sales-dashboard",  label: "Dashboard",        path: "/sales/dashboard" },
        { key: "sa-sales-leads",      label: "Leads",            path: "/sales/leads" },
        { key: "sa-sales-clients",    label: "Clients",          path: "/sales/clients" },
        { key: "sa-sales-campaigns",  label: "Campaigns",        path: "/sales/campaigns" },
        { key: "sa-sales-targets",    label: "Targets",          path: "/sales/targets" },
        { key: "sa-sales-commission", label: "Commissions",      path: "/sales/commissions" },
        { key: "sa-sales-perf",       label: "Team Performance", path: "/sales/team-performance" },
        { key: "sa-sales-employees",  label: "Employees",        path: "/sales/users" },
        { key: "sa-sales-tasks",      label: "Tasks",            path: "/sales/tasks" },
        { key: "sa-sales-reports",    label: "Reports",          path: "/sales/reports" },
      ],
    },
    {
      key: "sa-production",
      label: "Production",
      icon: "folder",
      subItems: [
        { key: "sa-prod-dashboard",    label: "Dashboard",    path: "/production/dashboard" },
        { key: "sa-prod-deliverables", label: "Deliverables", path: "/production/deliverables" },
        { key: "sa-prod-projects",     label: "Projects",     path: "/production/projects" },
        { key: "sa-prod-tasks",        label: "Tasks",        path: "/production/tasks" },
        { key: "sa-prod-employees",    label: "Employees",    path: "/production/users" },
        { key: "sa-prod-reports",      label: "Reports",      path: "/production/reports" },
      ],
    },
    {
      key: "sa-marketing",
      label: "Marketing",
      icon: "chart",
      subItems: [
        { key: "sa-mkt-dashboard", label: "Dashboard",       path: "/marketing/dashboard" },
        { key: "sa-mkt-leads",     label: "Lead Attribution",path: "/marketing/leads" },
        { key: "sa-mkt-social",    label: "Social Tracking", path: "/marketing/social" },
        { key: "sa-mkt-employees", label: "Employees",       path: "/marketing/users" },
        { key: "sa-mkt-tasks",     label: "Tasks",           path: "/marketing/tasks" },
        { key: "sa-mkt-reports",   label: "Reports",         path: "/marketing/reports" },
      ],
    },
    {
      key: "sa-hr",
      label: "HR",
      icon: "users",
      subItems: [
        { key: "sa-hr-dashboard",   label: "Dashboard",     path: "/hr/dashboard" },
        { key: "sa-hr-employees",   label: "Employees",     path: "/hr/users" },
        { key: "sa-hr-payroll",     label: "Payroll",       path: "/hr/payroll" },
        { key: "sa-hr-leave",       label: "Leave Requests",path: "/hr/leave" },
        { key: "sa-hr-attendance",  label: "Attendance",    path: "/hr/attendance" },
        { key: "sa-hr-tasks",       label: "Tasks",         path: "/hr/tasks" },
        { key: "sa-hr-reports",     label: "Reports",       path: "/hr/reports" },
        { key: "sa-hr-settings",    label: "Settings",      path: "/hr/settings" },
      ],
    },
    {
      key: "sa-it",
      label: "IT Support",
      icon: "settings",
      subItems: [
        { key: "sa-it-dashboard",   label: "Dashboard",            path: "/it/dashboard" },
        { key: "sa-it-tickets",     label: "IT Tickets",           path: "/it/tickets" },
        { key: "sa-it-attendance",  label: "Attendance",           path: "/it/attendance" },
        { key: "sa-it-devices",     label: "Biometric Devices",    path: "/it/devices" },
        { key: "sa-it-device-logs", label: "Sync Logs",            path: "/it/device-logs" },
        { key: "sa-it-exceptions",  label: "Attendance Exceptions",path: "/it/exceptions" },
        { key: "sa-it-reports",     label: "Reports",              path: "/it/reports" },
      ],
    },
  ],

  // ── Management ────────────────────────────────────────────────────────
  management: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/management/dashboard" },
    { key: "employees",     label: "Employees",     icon: "users",       path: "/management/users" },
    { key: "clients",       label: "Clients",       icon: "users",       path: "/management/clients" },
    { key: "projects",      label: "Projects",      icon: "task",        path: "/management/projects" },
    { key: "deliverables",  label: "Deliverables",  icon: "folder",      path: "/management/deliverables" },
    { key: "revisions",    label: "Revisions",     icon: "task",        path: "/management/revisions" },
    { key: "reports",       label: "Reports",       icon: "chart",       path: "/management/reports" },
    { key: "tasks",         label: "Tasks",         icon: "task",        path: "/management/tasks" },
    { key: "audit-logs",    label: "Audit Logs",    icon: "shield",      path: "/management/audit-logs" },
    { key: "billing",       label: "Billing",       icon: "dollar",      path: "/management/billing" },
    { key: "files",         label: "Files",         icon: "folder",      path: "/management/files" },
    { key: "it-tickets",      label: "IT Tickets",      icon: "task",        path: "/it/tickets" },
    { key: "conversations",   label: "Client Messages", icon: "mail",        path: "/conversations" },
    { key: "budget",          label: "Budget Mgmt",     icon: "dollar",      path: "/budget" },
    { key: "salary-slips",    label: "Salary Slips",    icon: "file",        path: "/hr/salary-slips" },
    { key: "advance-salary",  label: "Advance Salary",  icon: "dollar",      path: "/hr/advance-salary" },
    { key: "notifications",   label: "Notifications",   icon: "bell",        path: "/management/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/management/profile" },
  ],

  // ── Sales Admin ───────────────────────────────────────────────────────
  sales_admin: [
    { key: "dashboard",        label: "Dashboard",           icon: "grid",        path: "/sales/dashboard" },
    { key: "leads",            label: "Leads",               icon: "users",       path: "/sales/leads" },
    { key: "clients",          label: "Clients",             icon: "users",       path: "/sales/clients" },
    { key: "campaigns",        label: "Campaigns & Budgets", icon: "dollar",      path: "/sales/campaigns" },
    { key: "targets",          label: "Sales Targets",       icon: "chart",       path: "/sales/targets" },
    { key: "commissions",      label: "Commissions",         icon: "dollar",      path: "/sales/commissions" },
    { key: "tasks",            label: "Tasks",               icon: "task",        path: "/sales/tasks" },
    { key: "team-performance", label: "Team Performance",    icon: "chart",       path: "/sales/team-performance" },
    { key: "employees",        label: "Employees",           icon: "users",       path: "/sales/users" },
    { key: "reports",          label: "Reports",             icon: "chart",       path: "/sales/reports" },
    { key: "billing",          label: "Billing",             icon: "dollar",      path: "/sales/billing" },
    { key: "files",            label: "Files",               icon: "folder",      path: "/sales/files" },
    { key: "it-tickets",       label: "IT Tickets",          icon: "task",        path: "/it/tickets" },
    { key: "conversations",    label: "Client Messages",     icon: "mail",        path: "/conversations" },
    { key: "budget",           label: "Budget Mgmt",         icon: "dollar",      path: "/budget" },
    { key: "salary-slip",      label: "My Salary Slip",      icon: "file",        path: "/salary-slips" },
    { key: "advance-salary",   label: "Advance Salary",      icon: "dollar",      path: "/advance-salary" },
    { key: "notifications",    label: "Notifications",       icon: "bell",        path: "/sales/notifications" },
    { key: "settings",         label: "Settings",            icon: "settings",    path: "/sales/settings" },
    { key: "profile",          label: "Profile",             icon: "user-circle", path: "/sales/profile" },
  ],

  // ── Sales Member ──────────────────────────────────────────────────────
  sales_member: [
    { key: "dashboard",       label: "Dashboard",       icon: "grid",        path: "/sales/dashboard" },
    { key: "leads",           label: "Leads",           icon: "users",       path: "/sales/leads" },
    { key: "clients",         label: "Clients",         icon: "users",       path: "/sales/clients" },
    { key: "tasks",           label: "My Tasks",        icon: "task",        path: "/sales/tasks" },
    { key: "targets",         label: "My Targets",      icon: "chart",       path: "/sales/targets" },
    { key: "commissions",     label: "My Commissions",  icon: "dollar",      path: "/sales/commissions" },
    { key: "files",           label: "Files",           icon: "folder",      path: "/sales/files" },
    { key: "it-tickets",      label: "IT Tickets",      icon: "task",        path: "/it/tickets" },
    { key: "conversations",   label: "Client Messages", icon: "mail",        path: "/conversations" },
    { key: "salary-slip",     label: "My Salary Slip",  icon: "file",        path: "/salary-slips" },
    { key: "advance-salary",  label: "Advance Salary",  icon: "dollar",      path: "/advance-salary" },
    { key: "notifications",   label: "Notifications",   icon: "bell",        path: "/sales/notifications" },
    { key: "profile",         label: "Profile",         icon: "user-circle", path: "/sales/profile" },
  ],

  // ── Production Admin ──────────────────────────────────────────────────
  production_admin: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/production/dashboard" },
    { key: "deliverables",  label: "Deliverables",  icon: "folder",      path: "/production/deliverables" },
    { key: "projects",      label: "Projects",      icon: "task",        path: "/production/projects" },
    { key: "tasks",         label: "Tasks",         icon: "task",        path: "/production/tasks" },
    { key: "files",         label: "Files",         icon: "folder",      path: "/production/files" },
    { key: "revisions",    label: "Revisions",     icon: "task",        path: "/production/revisions" },
    { key: "employees",     label: "Employees",     icon: "users",       path: "/production/users" },
    { key: "reports",       label: "Reports",       icon: "chart",       path: "/production/reports" },
    { key: "it-tickets",    label: "IT Tickets",    icon: "task",        path: "/it/tickets" },
    { key: "conversations", label: "Client Messages",icon: "mail",       path: "/conversations" },
    { key: "budget",           label: "Budget",          icon: "dollar",      path: "/budget" },
    { key: "salary-slip",      label: "My Salary Slip",  icon: "file",        path: "/salary-slips" },
    { key: "advance-salary",   label: "Advance Salary",  icon: "dollar",      path: "/advance-salary" },
    { key: "notifications",    label: "Notifications",   icon: "bell",        path: "/production/notifications" },
    { key: "settings",         label: "Settings",        icon: "settings",    path: "/production/settings" },
    { key: "profile",          label: "Profile",         icon: "user-circle", path: "/production/profile" },
  ],

  // ── Production Member ─────────────────────────────────────────────────
  production_member: [
    { key: "dashboard",        label: "Dashboard",       icon: "grid",        path: "/production/dashboard" },
    { key: "deliverables",     label: "Deliverables",    icon: "folder",      path: "/production/deliverables" },
    { key: "tasks",            label: "Tasks",           icon: "task",        path: "/production/tasks" },
    { key: "files",            label: "Files",           icon: "folder",      path: "/production/files" },
    { key: "revisions",        label: "Revisions",       icon: "task",        path: "/production/revisions" },
    { key: "it-tickets",       label: "IT Tickets",      icon: "task",        path: "/it/tickets" },
    { key: "conversations",    label: "Client Messages", icon: "mail",        path: "/conversations" },
    { key: "salary-slip",      label: "My Salary Slip",  icon: "file",        path: "/salary-slips" },
    { key: "advance-salary",   label: "Advance Salary",  icon: "dollar",      path: "/advance-salary" },
    { key: "notifications",    label: "Notifications",   icon: "bell",        path: "/production/notifications" },
    { key: "profile",          label: "Profile",         icon: "user-circle", path: "/production/profile" },
  ],

  // ── Marketing Admin ───────────────────────────────────────────────────
  marketing_admin: [
    { key: "dashboard",        label: "Dashboard",        icon: "grid",        path: "/marketing/dashboard" },
    { key: "leads",            label: "Lead Attribution", icon: "chart",       path: "/marketing/leads" },
    {
      key: "email-marketing",
      label: "Email Marketing",
      icon: "mail",
      subItems: [
        { key: "campaigns",  label: "Campaigns",  path: "/marketing/email/campaigns" },
        { key: "templates",  label: "Templates",  path: "/marketing/email/templates" },
        { key: "audience",   label: "Audience",   path: "/marketing/email/audience" },
        { key: "analytics",  label: "Analytics",  path: "/marketing/email/analytics" },
        { key: "automation", label: "Automation", path: "/marketing/email/automation" },
      ],
    },
    { key: "social-tracking", label: "Social Tracking",  icon: "chart",       path: "/marketing/social" },
    { key: "tasks",            label: "Tasks",            icon: "task",        path: "/marketing/tasks" },
    { key: "reports",          label: "Reports",          icon: "chart",       path: "/marketing/reports" },
    { key: "files",            label: "Files",            icon: "folder",      path: "/marketing/files" },
    { key: "employees",        label: "Employees",        icon: "users",       path: "/marketing/users" },
    { key: "it-tickets",       label: "IT Tickets",       icon: "task",        path: "/it/tickets" },
    { key: "conversations",    label: "Client Messages",  icon: "mail",        path: "/conversations" },
    { key: "budget",           label: "Budget",           icon: "dollar",      path: "/budget" },
    { key: "salary-slip",      label: "My Salary Slip",   icon: "file",        path: "/salary-slips" },
    { key: "advance-salary",   label: "Advance Salary",   icon: "dollar",      path: "/advance-salary" },
    { key: "notifications",    label: "Notifications",    icon: "bell",        path: "/marketing/notifications" },
    { key: "settings",         label: "Settings",         icon: "settings",    path: "/marketing/settings" },
    { key: "profile",          label: "Profile",          icon: "user-circle", path: "/marketing/profile" },
  ],

  // ── Marketing Member ──────────────────────────────────────────────────
  marketing_member: [
    { key: "dashboard",        label: "Dashboard",        icon: "grid",        path: "/marketing/dashboard" },
    { key: "my-tasks",         label: "My Tasks",         icon: "task",        path: "/marketing/tasks" },
    { key: "social-tracking",  label: "Social Tracking",  icon: "chart",       path: "/marketing/social" },
    {
      key: "email-marketing",
      label: "Content",
      icon: "mail",
      subItems: [
        { key: "campaigns",  label: "Campaigns",  path: "/marketing/email/campaigns" },
        { key: "templates",  label: "Templates",  path: "/marketing/email/templates" },
        { key: "audience",   label: "Audience",   path: "/marketing/email/audience" },
      ],
    },
    { key: "files",            label: "Files",            icon: "folder",      path: "/marketing/files" },
    { key: "it-tickets",       label: "IT Tickets",       icon: "task",        path: "/it/tickets" },
    { key: "conversations",    label: "Client Messages",  icon: "mail",        path: "/conversations" },
    { key: "salary-slip",      label: "My Salary Slip",   icon: "file",        path: "/salary-slips" },
    { key: "advance-salary",   label: "Advance Salary",   icon: "dollar",      path: "/advance-salary" },
    { key: "notifications",    label: "Notifications",    icon: "bell",        path: "/marketing/notifications" },
    { key: "profile",          label: "Profile",          icon: "user-circle", path: "/marketing/profile" },
  ],

  // ── HR Admin ──────────────────────────────────────────────────────────
  hr_admin: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/hr/dashboard" },
    { key: "employees",     label: "Employees",     icon: "users",       path: "/hr/users" },
    { key: "payroll",       label: "Payroll",       icon: "dollar",      path: "/hr/payroll" },
    { key: "leave",         label: "Leave Requests",icon: "task",        path: "/hr/leave" },
    { key: "attendance",    label: "Attendance",    icon: "users",       path: "/hr/attendance" },
    { key: "tasks",         label: "Tasks",         icon: "task",        path: "/hr/tasks" },
    { key: "files",         label: "Files",         icon: "folder",      path: "/hr/files" },
    { key: "reports",       label: "Reports",       icon: "chart",       path: "/hr/reports" },
    { key: "it-tickets",      label: "IT Tickets",      icon: "task",        path: "/it/tickets" },
    { key: "budget",          label: "Budget",          icon: "dollar",      path: "/budget" },
    { key: "salary-slips",    label: "Salary Slips",    icon: "file",        path: "/hr/salary-slips" },
    { key: "advance-salary",  label: "Advance Salary",  icon: "dollar",      path: "/hr/advance-salary" },
    { key: "notifications",   label: "Notifications",   icon: "bell",        path: "/hr/notifications" },
    { key: "settings",        label: "Settings",        icon: "settings",    path: "/hr/settings" },
    { key: "profile",         label: "Profile",         icon: "user-circle", path: "/hr/profile" },
  ],

  // ── HR Member ─────────────────────────────────────────────────────────
  hr_member: [
    { key: "dashboard",       label: "Dashboard",       icon: "grid",        path: "/hr/dashboard" },
    { key: "leave",           label: "My Leaves",       icon: "task",        path: "/hr/leave" },
    { key: "attendance",      label: "Attendance",      icon: "users",       path: "/hr/attendance" },
    { key: "tasks",           label: "Tasks",           icon: "task",        path: "/hr/tasks" },
    { key: "files",           label: "Files",           icon: "folder",      path: "/hr/files" },
    { key: "it-tickets",      label: "IT Tickets",      icon: "task",        path: "/it/tickets" },
    { key: "salary-slip",     label: "My Salary Slip",  icon: "file",        path: "/salary-slips" },
    { key: "advance-salary",  label: "Advance Salary",  icon: "dollar",      path: "/advance-salary" },
    { key: "notifications",   label: "Notifications",   icon: "bell",        path: "/hr/notifications" },
    { key: "profile",         label: "Profile",         icon: "user-circle", path: "/hr/profile" },
  ],

  // ── IT Admin ─────────────────────────────────────────────────────────
  // Exact items per spec. NO billing / payroll / salary / financial items.
  it_admin: [
    { key: "dashboard",   label: "Dashboard",             icon: "grid",        path: "/it/dashboard" },
    { key: "tickets",     label: "IT Tickets",            icon: "task",        path: "/it/tickets" },
    { key: "attendance",  label: "Attendance",            icon: "chart",       path: "/it/attendance" },
    { key: "devices",     label: "Biometric Devices",     icon: "settings",    path: "/it/devices" },
    { key: "device-logs", label: "Sync Logs",             icon: "file",        path: "/it/device-logs" },
    { key: "exceptions",  label: "Attendance Exceptions", icon: "bell",        path: "/it/exceptions" },
    { key: "reports",     label: "Reports",               icon: "chart",       path: "/it/reports" },
    { key: "notifications",label:"Notifications",         icon: "bell",        path: "/it/notifications" },
    { key: "profile",     label: "Profile",               icon: "user-circle", path: "/it/profile" },
  ],

  // ── IT Member ─────────────────────────────────────────────────────────
  it_member: [
    { key: "dashboard",   label: "Dashboard",             icon: "grid",        path: "/it/dashboard" },
    { key: "tickets",     label: "IT Tickets",            icon: "task",        path: "/it/tickets" },
    { key: "attendance",  label: "Attendance",            icon: "chart",       path: "/it/attendance" },
    { key: "devices",     label: "Biometric Devices",     icon: "settings",    path: "/it/devices" },
    { key: "device-logs", label: "Sync Logs",             icon: "file",        path: "/it/device-logs" },
    { key: "exceptions",  label: "Attendance Exceptions", icon: "bell",        path: "/it/exceptions" },
    { key: "notifications",label:"Notifications",         icon: "bell",        path: "/it/notifications" },
    { key: "profile",     label: "Profile",               icon: "user-circle", path: "/it/profile" },
  ],

  // ── Client ────────────────────────────────────────────────────────────
  client: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/client/dashboard" },
    { key: "projects",      label: "My Projects",   icon: "task",        path: "/client/projects" },
    { key: "billing",       label: "Billing",       icon: "dollar",      path: "/client/billing" },
    { key: "files",         label: "Files",         icon: "folder",      path: "/client/files" },
    { key: "revisions",     label: "Revisions",     icon: "task",        path: "/client/revisions" },
    { key: "messages",      label: "Messages",      icon: "mail",        path: "/client/messages" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/client/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/client/profile" },
  ],
};
