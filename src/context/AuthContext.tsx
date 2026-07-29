/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

import { api, setUnauthorizedHandler } from "../lib/client";
import { User } from "../types";
import type { SessionUserDto } from "../dto/auth.dto";
import { AuthService } from "../services/authService";
import { useSSE } from "../hooks/useSSE";
import { getRoleHome } from "../lib/roles";
import { hasPermission, canView as rbacCanView, canCreate as rbacCanCreate, canEdit as rbacCanEdit, canDelete as rbacCanDelete, canExport as rbacCanExport, canApprove as rbacCanApprove, canAssign as rbacCanAssign } from "../utils/rbac";
import { notifyLoginActivity } from "../services/notificationHelpers";
import { AuditLogService } from "../services/auditLogService";

// Maps the real backend's session-user DTO to the app's canonical User shape.
// The API never returns a password, so this is always blank client-side.
const sessionToUser = (dto: SessionUserDto): User => ({
  id: dto.id,
  email: dto.email,
  password: "",
  name: dto.full_name,
  role: dto.role,
  avatar: dto.avatar_url ?? "",
  company: dto.company ?? "",
  joinDate: new Date().toISOString(),
  mustChangePassword: dto.must_change_password ?? false,
});

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  /** Local-only state merge (no network call) — for after a self-profile save (ProfileService) already persisted the change server-side, so the header/sidebar avatar and name reflect it immediately without a redundant write through updateProfile()/`/profiles/update`. */
  syncUser: (data: Partial<User>) => void;
  checkPermission: (domain: import("../types").PermissionDomain, action: import("../types").PermissionAction) => boolean;
  canView: (domain: import("../types").PermissionDomain) => boolean;
  canCreate: (domain: import("../types").PermissionDomain) => boolean;
  canEdit: (domain: import("../types").PermissionDomain) => boolean;
  canDelete: (domain: import("../types").PermissionDomain) => boolean;
  canExport: (domain: import("../types").PermissionDomain) => boolean;
  canApprove: (domain: import("../types").PermissionDomain) => boolean;
  canAssign: (domain: import("../types").PermissionDomain) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Start SSE when a user is authenticated
  useSSE(!!user);

  // A 401 from any API call clears the session, anywhere in the app.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const session = await AuthService.getSession();
        if (session) {
          setUser(sessionToUser(session.user));
        }
      } catch {
        // No valid session — user stays null
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string> => {
    const { user: dto } = await AuthService.login(email, password);
    const profile = sessionToUser(dto);
    setUser(profile);
    notifyLoginActivity(profile.id, profile.name, profile.role);

    // Start Activity tracking
    try { await api.post("/saas/v1/activity/login", {}); } catch { /* non-critical */ }

    return getRoleHome(profile.role);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/saas/v1/activity/logout", {});
      await AuthService.logout();
    } catch {
      // ignore — still clear local state
    }
    setUser((current) => {
      if (current) {
        AuditLogService.add({
          action: "USER_LOGOUT",
          entityType: "security",
          entityId: current.id,
          entityName: current.name,
          performedBy: current.id,
          performedByName: current.name,
          performedByRole: current.role,
          description: `${current.name} logged out`,
        });
      }
      return null;
    });
  }, []);

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> => {
    const dto = await AuthService.changePassword(currentPassword, newPassword, confirmPassword);
    setUser(sessionToUser(dto));
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>): Promise<void> => {
    if (!user) throw new Error("No user logged in");
    await AuthService.updateProfile(user.id, data);
    setUser({ ...user, ...data });
  }, [user]);

  const syncUser = useCallback((data: Partial<User>): void => {
    setUser((current) => (current ? { ...current, ...data } : current));
  }, []);

  const checkPermission = useCallback(
    (domain: import("../types").PermissionDomain, action: import("../types").PermissionAction) =>
      hasPermission(user, domain, action),
    [user]
  );
  const canView = useCallback((domain: import("../types").PermissionDomain) => rbacCanView(user, domain), [user]);
  const canCreate = useCallback((domain: import("../types").PermissionDomain) => rbacCanCreate(user, domain), [user]);
  const canEdit = useCallback((domain: import("../types").PermissionDomain) => rbacCanEdit(user, domain), [user]);
  const canDelete = useCallback((domain: import("../types").PermissionDomain) => rbacCanDelete(user, domain), [user]);
  const canExport = useCallback((domain: import("../types").PermissionDomain) => rbacCanExport(user, domain), [user]);
  const canApprove = useCallback((domain: import("../types").PermissionDomain) => rbacCanApprove(user, domain), [user]);
  const canAssign = useCallback((domain: import("../types").PermissionDomain) => rbacCanAssign(user, domain), [user]);

  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading: isInitializing,
    isAuthenticated: !!user,
    login,
    logout,
    changePassword,
    updateProfile,
    syncUser,
    checkPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canApprove,
    canAssign,
  }), [
    user,
    isInitializing,
    login,
    logout,
    changePassword,
    updateProfile,
    syncUser,
    checkPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canApprove,
    canAssign,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
