import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../lib/client";
import { useAuth } from "./AuthContext";
import { BreakType, BreakRecord, ActivitySession, ActiveBreak } from "../mock/activityData";

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
  const { isAuthenticated } = useAuth();
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
      const res = await api.post<{ session: ActivitySession; breakRecord: BreakRecord }>("/saas/v1/activity/break/start", { type });
      await fetchCurrent(); // re-sync
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const endBreak = async () => {
    setIsLoading(true);
    try {
      await api.post("/saas/v1/activity/break/end", {});
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
