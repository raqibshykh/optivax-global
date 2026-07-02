import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../lib/client";
import { useAuth } from "./AuthContext";
import { BreakType, BreakRecord, BREAK_LABELS, ActivitySession, ActiveBreak } from "../mock/activityData";
import { AuditLogService } from "../services/auditLogService";
import { notifyBreakWarning } from "../services/notificationHelpers";

export interface ActivityContextType {
  activeSession: ActivitySession | null;
  activeBreak: ActiveBreak | null;
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

export const ActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [activeSession, setActiveSession] = useState<ActivitySession | null>(null);
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrent = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get<{ session: ActivitySession | null; activeBreak: ActiveBreak | null }>("/saas/v1/activity/current");
      setActiveSession(res.session);
      setActiveBreak(res.activeBreak);
    } catch (err) {
      console.error("Failed to fetch activity state", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrent();
      const interval = setInterval(fetchCurrent, 30000); // sync every 30s
      return () => clearInterval(interval);
    } else {
      setActiveSession(null);
      setActiveBreak(null);
    }
  }, [isAuthenticated]);

  const startBreak = async (type: BreakType) => {
    setIsLoading(true);
    try {
      await api.post<{ session: ActivitySession; breakRecord: BreakRecord }>("/saas/v1/activity/break/start", { type });
      if (user) {
        AuditLogService.add({
          action: "BREAK_STARTED",
          entityType: "activity",
          entityId: user.id,
          entityName: user.name,
          performedBy: user.id,
          performedByName: user.name,
          performedByRole: user.role,
          description: `${user.name} started ${BREAK_LABELS[type]}`,
        });
      }
      await fetchCurrent(); // re-sync
    } catch (err) {
      if (user) {
        AuditLogService.add({
          action: "BREAK_REJECTED",
          entityType: "activity",
          entityId: user.id,
          entityName: user.name,
          performedBy: user.id,
          performedByName: user.name,
          performedByRole: user.role,
          description: `${user.name} attempted to start ${BREAK_LABELS[type]} — rejected: ${err instanceof Error ? err.message : "unknown error"}`,
        });
      }
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const endBreak = async () => {
    setIsLoading(true);
    try {
      const res = await api.post<{ session: ActivitySession; breakRecord: BreakRecord }>("/saas/v1/activity/break/end", {});
      if (user) {
        AuditLogService.add({
          action: "BREAK_ENDED",
          entityType: "activity",
          entityId: user.id,
          entityName: user.name,
          performedBy: user.id,
          performedByName: user.name,
          performedByRole: user.role,
          description: `${user.name} ended ${res.breakRecord.label} (${res.breakRecord.status}, ${res.breakRecord.actualMinutes}m)`,
          newValue: { status: res.breakRecord.status, exceededMinutes: res.breakRecord.exceededMinutes },
        });
        if (res.breakRecord.status === "warning") {
          notifyBreakWarning(user.id, user.name, user.role, res.breakRecord.label, res.breakRecord.exceededMinutes ?? 0);
        }
      }
      await fetchCurrent(); // re-sync
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ActivityContext.Provider value={{ activeSession, activeBreak, startBreak, endBreak, isLoading }}>
      {children}
    </ActivityContext.Provider>
  );
};
