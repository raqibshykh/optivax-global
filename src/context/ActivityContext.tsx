import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { api } from "../lib/client";
import { useAuth } from "./AuthContext";
import { BreakType, BreakRecord, ActivitySession, ActiveBreak, BreakStatusInfo } from "../types/activity";
import { notifyAutoLogout, notifyBreakWarning } from "../services/notificationHelpers";

export interface ActivityContextType {
  activeSession: ActivitySession | null;
  activeBreak: ActiveBreak | null;
  breakStatus: BreakStatusInfo | null;
  startBreak: (type: BreakType) => Promise<void>;
  endBreak: () => Promise<void>;
  isLoading: boolean;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) throw new Error("useActivity must be used within ActivityProvider");
  return context;
};

type ActivityPayload = { session: ActivitySession | null; activeBreak: ActiveBreak | null; breakStatus: BreakStatusInfo | null };

export const ActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeSession, setActiveSession] = useState<ActivitySession | null>(null);
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null);
  const [breakStatus, setBreakStatus] = useState<BreakStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  // Previous poll's session, kept in a ref (not state) purely to detect the
  // "was open, is now auto-closed" transition below — reading it must never
  // itself trigger a re-render.
  const previousSessionRef = useRef<ActivitySession | null>(null);
  // Guards against a second poll landing in the async gap between detecting
  // the auto-logout and logout() actually resolving.
  const autoLogoutHandledRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Shared by the one-time initial fetch and the recurring 30s heartbeat —
   * applies a freshly-fetched {session, activeBreak, breakStatus} payload to
   * state, including the auto-logout-transition detection (the 8-hour cron
   * cutoff can close a session server-side between polls; this is what
   * bridges that server-side fact into a real client-side logout+redirect).
   */
  const applyPayload = useCallback(
    async (payload: ActivityPayload) => {
      if (!mountedRef.current) return;

      const previous = previousSessionRef.current;
      previousSessionRef.current = payload.session;

      if (
        !autoLogoutHandledRef.current &&
        previous && !previous.logoutTime &&
        payload.session?.logoutTime && payload.session.autoLogout
      ) {
        autoLogoutHandledRef.current = true;
        if (user) {
          notifyAutoLogout(user.id, payload.session.sessionMinutes ?? 0);
        }
        await logout();
        return;
      }

      setActiveSession(payload.session);
      setActiveBreak(payload.activeBreak);
      setBreakStatus(payload.breakStatus);
    },
    [user, logout]
  );

  const fetchCurrent = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get<ActivityPayload>("/saas/v1/activity/current");
      await applyPayload(res);
    } catch (err) {
      console.error("Failed to fetch activity state", err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [isAuthenticated, applyPayload]);

  const sendHeartbeat = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.post<ActivityPayload>("/saas/v1/activity/heartbeat", {});
      await applyPayload(res);
    } catch (err) {
      console.error("Failed to send activity heartbeat", err);
    }
  }, [isAuthenticated, applyPayload]);

  useEffect(() => {
    if (isAuthenticated) {
      // Fresh login (including logging back in after an auto-logout) starts
      // with a clean slate for the transition-detection refs above.
      previousSessionRef.current = null;
      autoLogoutHandledRef.current = false;
      fetchCurrent();
      const interval = setInterval(sendHeartbeat, 30000); // heartbeat every 30s
      return () => clearInterval(interval);
    } else {
      setActiveSession(null);
      setActiveBreak(null);
      setBreakStatus(null);
    }
  }, [isAuthenticated, fetchCurrent, sendHeartbeat]);

  const startBreak = useCallback(async (type: BreakType) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ session: ActivitySession; breakRecord: BreakRecord; breakStatus: BreakStatusInfo | null }>("/saas/v1/activity/break/start", { type });
      setActiveSession(res.session);
      setBreakStatus(res.breakStatus);
      await fetchCurrent(); // re-sync
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrent]);

  const endBreak = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.post<{ session: ActivitySession; breakRecord: BreakRecord; breakStatus: BreakStatusInfo | null }>("/saas/v1/activity/break/end", {});
      setActiveSession(res.session);
      setBreakStatus(res.breakStatus);
      if (user && res.breakRecord.status === "warning") {
        notifyBreakWarning(user.id, user.name, user.role, res.breakRecord.label, res.breakRecord.exceededMinutes ?? 0);
      }
      await fetchCurrent(); // re-sync
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchCurrent]);

  const value = useMemo(
    () => ({ activeSession, activeBreak, breakStatus, startBreak, endBreak, isLoading }),
    [activeSession, activeBreak, breakStatus, startBreak, endBreak, isLoading]
  );

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};
