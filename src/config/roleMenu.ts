import { PermissionDomain } from "../types";

export const MENU_DOMAINS: Record<string, PermissionDomain | null> = {
  dashboard: null, // special case, everyone has a dashboard
  departments: "hr", // super_admin only for overview
  clients: "clients",
  projects: "production",
  billing: "billing",
  files: "files",
  notifications: "notifications",
  revisions: null, // revisions tied to projects/clients, maybe null is fine if we check inside
  email_marketing: "marketing",
  settings: "system",
  leads: "sales",
  tasks: "production",
  users: "hr",
  payroll: "hr",
  reports: "reports",
  profile: null, // everyone has a profile
};
