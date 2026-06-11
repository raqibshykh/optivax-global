// src/components/RequireRole.tsx
import React, { ReactNode } from 'react';
import { useUserRole } from '../hooks/useUserRole';

interface RequireRoleProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Higher‑order component that renders its children only when the current
 * authenticated user's role matches one of the allowedRoles. It fetches the
 * role via the `/saas/v1/auth/me` endpoint using the `useUserRole`
 * hook. While the role is being resolved a loading placeholder is shown.
 */
const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children, fallback = null }) => {
  const { role, loading, error } = useUserRole();

  if (loading) {
    return <div className="text-sm text-gray-500">Loading…</div>;
  }

  if (error) {
    console.error('RequireRole error:', error);
    return <div className="text-sm text-red-500">Unable to determine permissions.</div>;
  }

  if (allowedRoles.includes(role ?? '')) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default RequireRole;
