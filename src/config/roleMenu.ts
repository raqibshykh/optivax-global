// src/config/roleMenu.ts
/**
 * Centralised navigation definition per role.
 * Each role returns an array of NavItem identifiers matching the
 * items defined in `AppSidebar`. This allows the sidebar to be
 * generated dynamically and keeps routing logic in a single place.
 */
export const roleMenu: Record<string, string[]> = {
  super_admin: [
    'dashboard',
    'departments',
    'clients',
    'projects',
    'billing',
    'files',
    'notifications',
    'revisions',
    'email_marketing',
    'settings',
  ],
  client: ['dashboard', 'projects', 'billing', 'files', 'notifications', 'profile'],
  sales_admin: ['dashboard', 'leads', 'projects', 'billing', 'notifications'],
  production_admin: ['dashboard', 'tasks', 'projects', 'billing', 'notifications'],
  marketing_admin: ['dashboard', 'leads', 'email_marketing', 'notifications'],
  hr_admin: ['dashboard', 'users', 'departments', 'notifications'],
  management: ['dashboard', 'projects', 'billing', 'reports', 'notifications'],
};
