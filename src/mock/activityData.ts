/**
 * Employee Activity & Break Tracking — mock data layer.
 * Stores login/logout sessions and break records in localStorage.
 * IMPORTANT: This module is monitoring/reporting ONLY.
 * It has NO effect on payroll, salary deductions, or budget calculations.
 */
import { safeParse } from "../lib/storage";
import { mockUsers } from "./users";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BreakType   = "meal_dinner" | "casual_5";
export type BreakStatus = "normal" | "warning";

export const BREAK_ALLOWED_MINUTES: Record<BreakType, number> = {
  meal_dinner: 60,
  casual_5:    5,
};

export const BREAK_LABELS: Record<BreakType, string> = {
  meal_dinner: "Dinner Break",
  casual_5:    "Casual Break (5 min)",
};

export const BREAK_CATEGORY: Record<BreakType, "meal" | "casual"> = {
  meal_dinner: "meal",
  casual_5:    "casual",
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

// Rejection reasons for startBreak(). The server is the sole authority on these checks —
// the frontend only ever displays whichever reason comes back.
export type BreakRejectionReason =
  | "NO_ACTIVE_SESSION"
  | "ALREADY_ACTIVE"
  | "MEAL_ALREADY_TAKEN"
  | "CASUAL_BALANCE_EXHAUSTED";

export type StartBreakResult =
  | { ok: true; session: ActivitySession; breakRecord: BreakRecord }
  | { ok: false; reason: BreakRejectionReason };

// Casual Break Balance Rule: each employee gets a 15-minute pool of casual break
// time per working day. Returning early banks the unused minutes for later use
// the same day; the pool never carries over to the next day (it's always
// recomputed from that day's records, never persisted separately).
export const CASUAL_DAILY_BALANCE_MINUTES = 15;

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

  // Auto-close any unclosed session for this user. If it has a break still in
  // progress, finalize that break too so nothing is ever left dangling against
  // a session the server has already closed.
  const closed = sessions.map(s => {
    if (s.userId === userId && !s.logoutTime) {
      const openBreakIdx = s.breaks.findIndex(b => !b.endTime);
      let breaks = s.breaks;
      if (openBreakIdx !== -1) {
        const openBreak    = s.breaks[openBreakIdx];
        const actualMins    = Math.round((now.getTime() - new Date(openBreak.startTime).getTime()) / 60000);
        const exceededMins  = Math.max(0, actualMins - openBreak.allowedMinutes);
        breaks = [...s.breaks];
        breaks[openBreakIdx] = {
          ...openBreak,
          endTime:         now.toISOString(),
          actualMinutes:   actualMins,
          exceededMinutes: exceededMins,
          status:          exceededMins > 0 ? "warning" : "normal",
        };
      }
      const sessionMinutes    = Math.round((now.getTime() - new Date(s.loginTime).getTime()) / 60000);
      const totalBreakMinutes = breaks.reduce((a, b) => a + (b.actualMinutes ?? 0), 0);
      const warningCount      = s.warningCount + (openBreakIdx !== -1 && breaks[openBreakIdx].status === "warning" ? 1 : 0);
      return {
        ...s,
        breaks,
        warningCount,
        logoutTime: now.toISOString(),
        sessionMinutes,
        totalBreakMinutes,
        activeMinutes: Math.max(0, sessionMinutes - totalBreakMinutes),
      };
    }
    return s;
  });

  // Clear any active-break pointer left over from the closed session.
  const activeBreaks = readActiveBreaks();
  if (activeBreaks[userId]) {
    delete activeBreaks[userId];
    writeActiveBreaks(activeBreaks);
  }

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

/**
 * Casual Break Balance Rule: minutes actually used today (completed breaks only —
 * an in-progress break hasn't consumed its balance yet) never persisted separately,
 * always recomputed from that day's records so it can never carry over to the next day.
 */
function sumCasualMinutesUsed(breaks: BreakRecord[]): number {
  return breaks
    .filter(b => BREAK_CATEGORY[b.type] === "casual" && b.actualMinutes != null)
    .reduce((sum, b) => sum + (b.actualMinutes ?? 0), 0);
}

/** Remaining casual-break minutes for today (out of the 15-minute daily pool). */
export function getRemainingCasualBalance(userId: string, todaysBreaksOverride?: BreakRecord[]): number {
  const today = new Date().toISOString().slice(0, 10);
  const todaysBreaks = todaysBreaksOverride ?? readSessions()
    .filter(s => s.userId === userId && s.date === today)
    .flatMap(s => s.breaks);
  return Math.max(0, CASUAL_DAILY_BALANCE_MINUTES - sumCasualMinutesUsed(todaysBreaks));
}

export function startBreak(
  userId: string,
  type:   BreakType
): StartBreakResult {
  const sessions   = readSessions();
  const now        = new Date();
  const today      = now.toISOString().slice(0, 10);
  const sessionIdx = sessions.findIndex(s => s.userId === userId && !s.logoutTime);
  if (sessionIdx === -1) return { ok: false, reason: "NO_ACTIVE_SESSION" };

  // Multi-tab safety: another tab may have already started a break for this user.
  if (readActiveBreaks()[userId]) return { ok: false, reason: "ALREADY_ACTIVE" };

  // Daily break-limit policy — evaluated across ALL of today's sessions for this
  // user, since login/logout can happen more than once in a day.
  const todaysBreaks = sessions
    .filter(s => s.userId === userId && s.date === today)
    .flatMap(s => s.breaks);

  const category = BREAK_CATEGORY[type];
  let allowedMinutesForThisBreak = BREAK_ALLOWED_MINUTES[type];

  if (category === "meal") {
    if (todaysBreaks.some(b => b.type === type)) {
      return { ok: false, reason: "MEAL_ALREADY_TAKEN" };
    }
  } else {
    // Casual Break Balance Rule: a 15-minute pool per day, not a fixed count.
    // Returning early banks the unused minutes for a later break the same day.
    const remainingBalance = getRemainingCasualBalance(userId, todaysBreaks);
    if (remainingBalance <= 0) {
      return { ok: false, reason: "CASUAL_BALANCE_EXHAUSTED" };
    }
    allowedMinutesForThisBreak = Math.min(BREAK_ALLOWED_MINUTES[type], remainingBalance);
  }

  const session     = sessions[sessionIdx];
  const breakRecord: BreakRecord = {
    id:             genId(),
    type,
    label:          BREAK_LABELS[type],
    category:       BREAK_CATEGORY[type],
    startTime:      now.toISOString(),
    allowedMinutes: allowedMinutesForThisBreak,
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
    allowedMinutes: allowedMinutesForThisBreak,
  };
  writeActiveBreaks(breaks);

  return { ok: true, session: updatedSession, breakRecord };
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

// ── Optional sample-data generation ────────────────────────────────────────────
// NOT called automatically anywhere (no devSeed.ts wiring, no SEED_VERSION gate).
// Must be triggered explicitly (e.g. an admin clicking "Generate Sample Data").
// Refuses to run if sessions already exist unless `force` is passed, so it can
// never silently overwrite real or previously-seeded activity data.

function buildSampleBreak(type: BreakType, startTime: Date, actualMinutes: number): BreakRecord {
  const allowedMinutes = BREAK_ALLOWED_MINUTES[type];
  const endTime         = new Date(startTime.getTime() + actualMinutes * 60000);
  const exceededMinutes = Math.max(0, actualMinutes - allowedMinutes);
  return {
    id: genId(),
    type,
    label: BREAK_LABELS[type],
    category: BREAK_CATEGORY[type],
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    allowedMinutes,
    actualMinutes,
    exceededMinutes,
    status: exceededMinutes > 0 ? "warning" : "normal",
  };
}

export function seedActivitySessions(force = false): { seeded: boolean; count: number } {
  const existing = readSessions();
  if (existing.length > 0 && !force) return { seeded: false, count: existing.length };

  const staff = mockUsers.filter(u => u.role !== "client");
  const sessions: ActivitySession[] = [];
  const DAYS = 15;

  for (let dayOffset = DAYS; dayOffset >= 1; dayOffset--) {
    const day = new Date();
    day.setDate(day.getDate() - dayOffset);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    staff.forEach((u, idx) => {
      const loginHour = 9 + (idx % 2);
      const login     = new Date(day); login.setHours(loginHour, (idx * 7) % 60, 0, 0);
      const logout    = new Date(login); logout.setHours(login.getHours() + 8, (idx * 11) % 60, 0, 0);

      const breaks: BreakRecord[] = [];
      const dinnerStart = new Date(login); dinnerStart.setHours(13, 0, 0, 0);
      breaks.push(buildSampleBreak("meal_dinner", dinnerStart, idx % 5 === 0 ? 72 : 45));

      if (idx % 3 === 0) {
        const casualStart = new Date(login); casualStart.setHours(11, 15, 0, 0);
        breaks.push(buildSampleBreak("casual_5", casualStart, idx % 6 === 0 ? 9 : 5));
      }

      const totalBreakMinutes = breaks.reduce((a, b) => a + (b.actualMinutes ?? 0), 0);
      const sessionMinutes    = Math.round((logout.getTime() - login.getTime()) / 60000);
      const warningCount      = breaks.filter(b => b.status === "warning").length;

      sessions.push({
        id: genId(),
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        departmentId: u.departmentId,
        date: login.toISOString().slice(0, 10),
        loginTime: login.toISOString(),
        logoutTime: logout.toISOString(),
        sessionMinutes,
        totalBreakMinutes,
        activeMinutes: Math.max(0, sessionMinutes - totalBreakMinutes),
        warningCount,
        breaks,
      });
    });
  }

  writeSessions(sessions);
  return { seeded: true, count: sessions.length };
}
