import React from "react";
import { useAuth } from "../../context/AuthContext";
import { hasPermissionScoped } from "../../utils/rbac";
import { PermissionDomain, PermissionAction } from "../../types";

interface RequirePermissionProps {
  domain: PermissionDomain;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  domain,
  action,
  children,
  fallback = null,
}) => {
  const { user } = useAuth();
  
  if (hasPermissionScoped(user, domain, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
