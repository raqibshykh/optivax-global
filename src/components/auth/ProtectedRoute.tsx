import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome } from "../../lib/roles";
import type { PermissionDomain, UserRole } from "../../types";

interface ProtectedRouteProps {
  allowedDomain?: PermissionDomain;
  // Optional: restrict to specific roles within the domain.
  // If omitted, any role with canView(domain) may access the route group.
  // If provided, only those exact roles (plus super_admin) may pass.
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedDomain,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading, canView } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-gray-900 bg-white">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Blocks every route except /change-password itself while the backend's
  // must_change_password flag is set — applies to every role, including
  // super_admin, and is re-evaluated on every route match so it can't be
  // defeated by editing the URL hash directly. The real, non-bypassable
  // enforcement is the backend's PasswordGateMiddleware; this is UX so the
  // user sees a redirect instead of a bare 403 from every API call.
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // super_admin bypasses all remaining checks
  if (user.role === "super_admin") {
    return <Outlet />;
  }

  // If specific roles are provided, enforce role identity first.
  // This prevents cross-department bleedthrough where multiple roles
  // share the same domain VIEW permission (e.g. management can VIEW sales).
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to={getRoleHome(user.role)} replace />;
    }
  }

  // Then check domain-level VIEW permission
  if (allowedDomain) {
    if (!canView(allowedDomain)) {
      return <Navigate to={getRoleHome(user.role)} replace />;
    }
  }

  return <Outlet />;
};
