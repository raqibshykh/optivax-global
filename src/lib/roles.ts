import type { UserRole } from "../types";

/** Role → default dashboard path mapping */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  sales_admin: "/sales/dashboard",
  production_admin: "/production/dashboard",
  marketing_admin: "/marketing/dashboard",
  hr_admin: "/hr/dashboard",
  management: "/management/dashboard",
  client: "/client/dashboard",
};

export const getRoleHome = (role: UserRole): string =>
  ROLE_HOME[role] ?? "/client/dashboard";
