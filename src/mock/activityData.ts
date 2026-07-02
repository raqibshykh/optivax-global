/**
 * Employee Activity & Break Tracking — mock data layer.
 * Stores login/logout sessions and break records in localStorage.
 * IMPORTANT: This module is monitoring/reporting ONLY.
 * It has NO effect on payroll, salary deductions, or budget calculations.
 */
import { safeParse } from "../lib/storage";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BreakType   = "meal_lunch" | "meal_dinner" | "casual_5" | "casual_10";
export type BreakStatus = "normal" | "warning";

export const BREAK_ALLOWED_MINUTES: Record<BreakType, number> = {
  meal_lunch:  60,
  meal_dinner: 60,
  casual_5:    5,
  casual_10:   10,
};

export const BREAK_LABELS: Record<BreakType, string> = {
  meal_lunch:  "Lunch Break",
  meal_dinner: "Dinner Break",
  casual_5:    "Casual Break (5 min)",
  casual_10:   "Casual Break (10 min)",
};

export const BREAK_CATEGORY: Record<BreakType, "meal" | "casual"> = {
  meal_lunch:  "meal",
  meal_dinner: "meal",
  casual_5:    "casual",
  casual_10:   "casual",
};

export interface BreakRecord {
  id:               string;
  type:             BreakType;
  label:            string;
  category:         "meal" | "casual";
  startTime:        string;       // ISO
  endTime?:         string;       // ISO — set on return
  allowedMinutes:   number;
  actualMinutes?:   number;       // set on return
  exceededMinutes?: number;       // max(0, actual - allowed)
  status?:          BreakStatus;  // set on return
}

export interface ActivitySession {
  id:                  string;
  userId:              string;
  userName:            string;
  userRole:            string;
  departmentId?:       string;
  date:                string;    // YYYY-MM-DD
  loginTime:           string;    // ISO
  logoutTime?:         string;    // ISO
  sessionMinutes?:     number;    // computed on logout
  totalBreakMinutes?:  number;    // sum of actual break durations
  activeMinutes?:      number;    // sessionMinutes - totalBreakMinutes
  warningCount:        number;    // breaks that exceeded their limit
  breaks:              BreakRecord[];
}

export interface ActiveBreak {
  sessionId:      string;
  userId:         string;
  breakId:        string;
  type:           BreakType;
  startTime:      string;
  allowedMinutes: number;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const SESSIONS_KEY     = "optivax_activity_sessions";
const ACTIVE_BREAK_KEY = "optivax_active_breaks";
const MAX_SESSIONS     = 5000;

function readSessions(): ActivitySession[] {
  return safeParse<ActivitySession[]>(localStorage.getItem(SESSIONS_KEY), []);
}

function writeSessions(data: ActivitySession[]): void {
  const capped = data.length > MAX_SESSIONS ? data.slice(-MAX_SESSIONS) : data;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(capped));
}

function readActiveBreaks(): Record<string, ActiveBreak> {
  return safeParse<Record<string, ActiveBreak>>(localStorage.getItem(ACTIVE_BREAK_KEY), {});
}

function writeActiveBreaks(data: Record<string, ActiveBreak>): void {
  localStorage.setItem(ACTIVE_BREAK_KEY, JSON.stringify(data));
}

function genId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Session Management ────────────────────────────────────────────────────────

export function startSession(
  userId:       string,
  userName:     string,
  userRole:     string,
  departmentId?: string
): ActivitySession {
  const sessions = readSessions();
  const now      = new Date();
  const today    = now.toISOString().slice(0, 10);

  // Auto-close any unclosed session for this user
  const closed = sessions.map(s => {
    if (s.userId === userId && !s.logoutTime) {
      const sessionMinutes    = Math.round((now.getTime() - new Date(s.loginTime).getTime()) / 60000);
      const totalBreakMinutes = s.breaks.reduce((a, b) => a + (b.actualMinutes ?? 0), 0);
      return { ...s, logoutTime: now.toISOString(), sessionMinutes, totalBreakMinutes, activeMinutes: Math.max(0, sessionMinutes - totalBreakMinutes) };
    }
    return s;
  });

  const newSession: ActivitySession = {
    id:           genId(),
    userId,
    userName,
    userRole,
    departmentId,
    date:         today,
    loginTime:    now.toISOString(),
    warningCount: 0,
    breaks:       [],
  };

  closed.push(newSession);
  writeSessions(closed);
  return newSession;
}

export function endSession(userId: string): ActivitySession | null {
  const sessions = readSessions();
  const now      = new Date();
  let result: ActivitySession | null = null;

  const updated = sessions.map(s => {
    if (s.userId === userId && !s.logoutTime) {
      const sessionMinutes    = Math.round((now.getTime() - new Date(s.loginTime).getTime()) / 60000);
      const totalBreakMinutes = s.breaks.reduce((a, b) => a + (b.actualMinutes ?? 0), 0);
      const finished: ActivitySession = {
        ...s,
        logoutTime:         now.toISOString(),
        sessionMinutes,
        totalBreakMinutes,
        activeMinutes:      Math.max(0, sessionMinutes - totalBreakMinutes),
      };
      result = finished;
      return finished;
    }
    return s;
  });

  writeSessions(updated);

  // Clear any active break
  const breaks = readActiveBreaks();
  if (breaks[userId]) {
    delete breaks[userId];
    writeActiveBreaks(breaks);
  }

  return result;
}

export function getCurrentSession(userId: string): ActivitySession | null {
  return readSessions().find(s => s.userId === userId && !s.logoutTime) ?? null;
}

// ── Break Management ──────────────────────────────────────────────────────────

export function getActiveBreak(userId: string): ActiveBreak | null {
  return readActiveBreaks()[userId] ?? null;
}

export function startBreak(
  userId: string,
  type:   BreakType
): { session: ActivitySession; breakRecord: BreakRecord } | null {
  const sessions   = readSessions();
  const now        = new Date();
  const sessionIdx = sessions.findIndex(s => s.userId === userId && !s.logoutTime);
  if (sessionIdx === -1) return null;

  const session     = sessions[sessionIdx];
  const breakRecord: BreakRecord = {
    id:             genId(),
    type,
    label:          BREAK_LABELS[type],
    category:       BREAK_CATEGORY[type],
    startTime:      now.toISOString(),
    allowedMinutes: BREAK_ALLOWED_MINUTES[type],
  };

  const updatedSession: ActivitySession = { ...session, breaks: [...session.breaks, breakRecord] };
  sessions[sessionIdx] = updatedSession;
  writeSessions(sessions);

  const breaks = readActiveBreaks();
  breaks[userId] = {
    sessionId:      session.id,
    userId,
    breakId:        breakRecord.id,
    type,
    startTime:      now.toISOString(),
    allowedMinutes: BREAK_ALLOWED_MINUTES[type],
  };
  writeActiveBreaks(breaks);

  return { session: updatedSession, breakRecord };
}

export function endBreak(userId: string): { session: ActivitySession; breakRecord: BreakRecord } | null {
  const activeBreaks = readActiveBreaks();
  const active       = activeBreaks[userId];
  if (!active) return null;

  const sessions   = readSessions();
  const now        = new Date();
  const sessionIdx = sessions.findIndex(s => s.id === active.sessionId);
  if (sessionIdx === -1) return null;

  const session  = sessions[sessionIdx];
  const breakIdx = session.breaks.findIndex(b => b.id === active.breakId);
  if (breakIdx === -1) return null;

  const actualMins   = Math.round((now.getTime() - new Date(active.startTime).getTime()) / 60000);
  const exceededMins = Math.max(0, actualMins - active.allowedMinutes);
  const status: BreakStatus = exceededMins > 0 ? "warning" : "normal";

  const updatedBreak: BreakRecord = {
    ...session.breaks[breakIdx],
    endTime:         now.toISOString(),
    actualMinutes:   actualMins,
    exceededMinutes: exceededMins,
    status,
  };

  const updatedBreaks = [...session.breaks];
  updatedBreaks[breakIdx] = updatedBreak;

  const updatedSession: ActivitySession = {
    ...session,
    breaks:       updatedBreaks,
    warningCount: session.warningCount + (status === "warning" ? 1 : 0),
  };
  sessions[sessionIdx] = updatedSession;
  writeSessions(sessions);

  delete activeBreaks[userId];
  writeActiveBreaks(activeBreaks);

  return { session: updatedSession, breakRecord: updatedBreak };
}

// ── Reporting ─────────────────────────────────────────────────────────────────

export interface SessionFilters {
  userId?:       string;
  dateFrom?:     string;   // YYYY-MM-DD
  dateTo?:       string;   // YYYY-MM-DD
  rolePrefix?:   string;   // e.g. "production" — matches production_admin + production_member
  userRole?:     string;   // exact role match
  departmentId?: string;
}

export function getSessions(filters?: SessionFilters): ActivitySession[] {
  let sessions = readSessions();

  if (filters?.userId)       sessions = sessions.filter(s => s.userId === filters.userId);
  if (filters?.dateFrom)     sessions = sessions.filter(s => s.date >= filters.dateFrom!);
  if (filters?.dateTo)       sessions = sessions.filter(s => s.date <= filters.dateTo!);
  if (filters?.userRole)     sessions = sessions.filter(s => s.userRole === filters.userRole);
  if (filters?.rolePrefix)   sessions = sessions.filter(s => s.userRole.startsWith(filters.rolePrefix!));
  if (filters?.departmentId) sessions = sessions.filter(s => s.departmentId === filters.departmentId);

  return sessions.sort((a, b) => b.loginTime.localeCompare(a.loginTime));
}

export function getUserSessions(userId: string): ActivitySession[] {
  return getSessions({ userId });
}

/** Determine which role prefix a viewer can see (null = all roles) */
export function getViewableDeptPrefix(viewerRole: string): string | null {
  if (["super_admin", "management", "hr_admin"].includes(viewerRole)) return null;
  if (viewerRole.endsWith("_admin")) return viewerRole.replace("_admin", "");
  return null;
}

export function getActivityStats(sessions: ActivitySession[]) {
  const total         = sessions.length;
  const completed     = sessions.filter(s => s.logoutTime).length;
  const avgSession    = completed
    ? Math.round(sessions.filter(s => s.sessionMinutes != null).reduce((a, s) => a + (s.sessionMinutes ?? 0), 0) / completed)
    : 0;
  const totalWarnings = sessions.reduce((a, s) => a + s.warningCount, 0);
  const totalBreaks   = sessions.reduce((a, s) => a + s.breaks.length, 0);
  const lateReturns   = sessions.reduce(
    (a, s) => a + s.breaks.filter(b => b.status === "warning").length, 0
  );
  return { total, completed, avgSession, totalWarnings, totalBreaks, lateReturns };
}
