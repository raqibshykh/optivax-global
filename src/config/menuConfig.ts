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
    { key: "clients",         label: "Clients",        icon: "users",        path: "/admin/clients" },
    { key: "projects",        label: "Projects",       icon: "task",         path: "/admin/projects" },
    { key: "billing",         label: "Billing",        icon: "dollar",       path: "/admin/billing" },
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
    { key: "notifications",   label: "Notifications",  icon: "bell",         path: "/admin/notifications" },
    { key: "revisions",       label: "Revisions",      icon: "task",         path: "/admin/revisions" },
    { key: "audit-logs",      label: "Audit Logs",     icon: "shield",       path: "/admin/audit-logs" },
    { key: "settings",        label: "Settings",       icon: "settings",     path: "/admin/settings" },
    { key: "employees",       label: "Employees",      icon: "users",        path: "/admin/users" },
    { key: "departments",     label: "Departments",    icon: "grid",         path: "/super-admin/departments" },
  ],

  // ── Management ────────────────────────────────────────────────────────
  management: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/management/dashboard" },
    { key: "employees",     label: "Employees",     icon: "users",       path: "/management/users" },
    { key: "clients",       label: "Clients",       icon: "users",       path: "/management/clients" },
    { key: "projects",      label: "Projects",      icon: "task",        path: "/management/projects" },
    { key: "deliverables",  label: "Deliverables",  icon: "folder",      path: "/management/deliverables" },
    { key: "reports",       label: "Reports",       icon: "chart",       path: "/management/reports" },
    { key: "tasks",         label: "Tasks",         icon: "task",        path: "/management/tasks" },
    { key: "audit-logs",    label: "Audit Logs",    icon: "shield",      path: "/management/audit-logs" },
    { key: "billing",       label: "Billing",       icon: "dollar",      path: "/management/billing" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/management/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/management/profile" },
  ],

  // ── Sales Admin ───────────────────────────────────────────────────────
  sales_admin: [
    { key: "dashboard",        label: "Dashboard",           icon: "grid",        path: "/sales/dashboard" },
    { key: "leads",            label: "Leads",               icon: "users",       path: "/sales/leads" },
    { key: "clients",          label: "Clients",             icon: "users",       path: "/sales/clients" },
    { key: "campaigns",        label: "Campaigns & Budgets", icon: "dollar",      path: "/sales/campaigns" },
    { key: "targets",          label: "Sales Targets",       icon: "chart",       path: "/sales/targets" },
    { key: "tasks",            label: "Tasks",               icon: "task",        path: "/sales/tasks" },
    { key: "team-performance", label: "Team Performance",    icon: "chart",       path: "/sales/team-performance" },
    { key: "employees",        label: "Employees",           icon: "users",       path: "/sales/users" },
    { key: "reports",          label: "Reports",             icon: "chart",       path: "/sales/reports" },
    { key: "billing",          label: "Billing",             icon: "dollar",      path: "/sales/billing" },
    { key: "files",            label: "Files",               icon: "folder",      path: "/sales/files" },
    { key: "notifications",    label: "Notifications",       icon: "bell",        path: "/sales/notifications" },
    { key: "settings",         label: "Settings",            icon: "settings",    path: "/sales/settings" },
    { key: "profile",          label: "Profile",             icon: "user-circle", path: "/sales/profile" },
  ],

  // ── Sales Member ──────────────────────────────────────────────────────
  sales_member: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/sales/dashboard" },
    { key: "leads",         label: "Leads",         icon: "users",       path: "/sales/leads" },
    { key: "clients",       label: "Clients",       icon: "users",       path: "/sales/clients" },
    { key: "tasks",         label: "My Tasks",      icon: "task",        path: "/sales/tasks" },
    { key: "targets",       label: "My Targets",    icon: "chart",       path: "/sales/targets" },
    { key: "files",         label: "Files",         icon: "folder",      path: "/sales/files" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/sales/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/sales/profile" },
  ],

  // ── Production Admin ──────────────────────────────────────────────────
  production_admin: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/production/dashboard" },
    { key: "deliverables",  label: "Deliverables",  icon: "folder",      path: "/production/deliverables" },
    { key: "projects",      label: "Projects",      icon: "task",        path: "/production/projects" },
    { key: "employees",     label: "Employees",     icon: "users",       path: "/production/users" },
    { key: "reports",       label: "Reports",       icon: "chart",       path: "/production/reports" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/production/notifications" },
    { key: "settings",      label: "Settings",      icon: "settings",    path: "/production/settings" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/production/profile" },
  ],

  // ── Production Member ─────────────────────────────────────────────────
  production_member: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/production/dashboard" },
    { key: "deliverables",  label: "Deliverables",  icon: "folder",      path: "/production/deliverables" },
    { key: "tasks",         label: "Tasks",         icon: "task",        path: "/production/tasks" },
    { key: "files",         label: "Files",         icon: "folder",      path: "/production/files" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/production/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/production/profile" },
  ],

  // ── Marketing Admin ───────────────────────────────────────────────────
  marketing_admin: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/marketing/dashboard" },
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
    { key: "leads",         label: "Leads",         icon: "users",       path: "/marketing/leads" },
    { key: "tasks",         label: "Tasks",         icon: "task",        path: "/marketing/tasks" },
    { key: "reports",       label: "Reports",       icon: "chart",       path: "/marketing/reports" },
    { key: "files",         label: "Files",         icon: "folder",      path: "/marketing/files" },
    { key: "employees",     label: "Employees",     icon: "users",       path: "/marketing/users" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/marketing/notifications" },
    { key: "settings",      label: "Settings",      icon: "settings",    path: "/marketing/settings" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/marketing/profile" },
  ],

  // ── Marketing Member ──────────────────────────────────────────────────
  marketing_member: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/marketing/dashboard" },
    { key: "my-tasks",      label: "My Tasks",      icon: "task",        path: "/marketing/tasks" },
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
    { key: "files",         label: "Files",         icon: "folder",      path: "/marketing/files" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/marketing/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/marketing/profile" },
  ],

  // ── HR Admin ──────────────────────────────────────────────────────────
  hr_admin: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/hr/dashboard" },
    { key: "employees",     label: "Employees",     icon: "users",       path: "/hr/users" },
    { key: "payroll",       label: "Payroll",       icon: "dollar",      path: "/hr/payroll" },
    { key: "tasks",         label: "Tasks",         icon: "task",        path: "/hr/tasks" },
    { key: "reports",       label: "Reports",       icon: "chart",       path: "/hr/reports" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/hr/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/hr/profile" },
  ],

  // ── HR Member ─────────────────────────────────────────────────────────
  hr_member: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/hr/dashboard" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/hr/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/hr/profile" },
  ],

  // ── Client ────────────────────────────────────────────────────────────
  client: [
    { key: "dashboard",     label: "Dashboard",     icon: "grid",        path: "/client/dashboard" },
    { key: "projects",      label: "My Projects",   icon: "task",        path: "/client/projects" },
    { key: "billing",       label: "Billing",       icon: "dollar",      path: "/client/billing" },
    { key: "files",         label: "Files",         icon: "folder",      path: "/client/files" },
    { key: "revisions",     label: "Revisions",     icon: "task",        path: "/client/revisions" },
    { key: "notifications", label: "Notifications", icon: "bell",        path: "/client/notifications" },
    { key: "profile",       label: "Profile",       icon: "user-circle", path: "/client/profile" },
  ],
};
