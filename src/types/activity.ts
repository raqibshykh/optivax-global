// Employee Activity & Break Tracking — shared types and pure helpers.
// The live session/break endpoints (/saas/v1/activity/*) are server-authoritative;
// these are just the wire-format types plus a couple of pure, storage-free helpers
// used to render a display-only hint on the client.

export type BreakType = "meal_dinner" | "casual_5";
export type BreakStatus = "normal" | "warning";

export const BREAK_LABELS: Record<BreakType, string> = {
  meal_dinner: "Dinner Break",
  casual_5: "Casual Break (5 min)",
};

export const BREAK_CATEGORY: Record<BreakType, "meal" | "casual"> = {
  meal_dinner: "meal",
  casual_5: "casual",
};

export interface BreakRecord {
  id: string;
  type: BreakType;
  label: string;
  category: "meal" | "casual";
  startTime: string; // ISO
  endTime?: string; // ISO — set on return
  allowedMinutes: number;
  actualMinutes?: number; // set on return
  exceededMinutes?: number; // max(0, actual - allowed)
  status?: BreakStatus; // set on return
}

export interface ActivitySession {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  departmentId?: string;
  date: string; // YYYY-MM-DD
  loginTime: string; // ISO
  logoutTime?: string; // ISO
  sessionMinutes?: number;
  totalBreakMinutes?: number;
  activeMinutes?: number;
  warningCount: number;
  breaks: BreakRecord[];
  /** IT Support session-visibility fields — captured at login, refreshed on same-day re-login. */
  ipAddress?: string | null;
  browser?: string | null;
  device?: string | null;
  /** Last time this user's client pinged GET /activity/current or POST /activity/heartbeat while the session was open — a heartbeat, not literal keystroke/click activity. */
  lastHeartbeat?: string | null;
  /** True when the 8-hour cron cutoff closed this session, not a manual logout. */
  autoLogout?: boolean;
  /** Mirrors logout_time/auto_logout server-side — 'active' | 'completed' | 'auto_logout'. */
  sessionStatus?: string;
  /** Currently always 'web' — reserved for future non-browser clients. */
  loginSource?: string;
}

export interface ActiveBreak {
  sessionId: string;
  userId: string;
  breakId: string;
  type: BreakType;
  startTime: string;
  allowedMinutes: number;
}

// Rejection reasons for the break/start endpoint. The server is the sole authority
// on these checks — the frontend only ever displays whichever reason comes back.
export type BreakRejectionReason =
  | "NO_ACTIVE_SESSION"
  | "ALREADY_ACTIVE"
  | "MEAL_ALREADY_TAKEN"
  | "CASUAL_BALANCE_EXHAUSTED"
  | "INVALID_ALLOWED_MINUTES";

export type StartBreakResult =
  | { ok: true; session: ActivitySession; breakRecord: BreakRecord }
  | { ok: false; reason: BreakRejectionReason };

/**
 * Wire shape of the `breakStatus` object every /saas/v1/activity/* endpoint
 * (current, heartbeat, break/start, break/end) returns — the backend is the
 * sole authority for every one of these fields (elapsed time, balances,
 * meal-taken flag, overdue/warning state, remaining shift time). The
 * frontend never recomputes any of them, only displays whatever comes back;
 * see ActivityRepository::computeBreakStatus() in the backend for the exact
 * calculation.
 */
export interface BreakStatusInfo {
  currentBreak: BreakRecord | null;
  elapsedSeconds: number;
  allowedMinutes: number;
  remainingBalance: number;
  mealTaken: boolean;
  casualDailyLimitMinutes: number;
  warningLevel: "none" | "warning" | "critical";
  isOverdue: boolean;
  remainingShiftTime: number;
  /** Today's attendance status (present/late/absent/etc.), or null if not yet recorded — informational only, never gates whether a break can start. */
  attendanceStatus: string | null;
  /** True only if the server found corrupt/unreadable break timing data and refused to judge overdue status — isOverdue is always false in that case, never true on bad data. */
  invalidBreakData: boolean;
}

/** Pure aggregate stats over a list of sessions already fetched from the API. */
export function getActivityStats(sessions: ActivitySession[]) {
  const total = sessions.length;
  const completed = sessions.filter((s) => s.logoutTime).length;
  const avgSession = completed
    ? Math.round(
        sessions.filter((s) => s.sessionMinutes != null).reduce((a, s) => a + (s.sessionMinutes ?? 0), 0) / completed
      )
    : 0;
  const totalWarnings = sessions.reduce((a, s) => a + s.warningCount, 0);
  const totalBreaks = sessions.reduce((a, s) => a + s.breaks.length, 0);
  const lateReturns = sessions.reduce((a, s) => a + s.breaks.filter((b) => b.status === "warning").length, 0);
  return { total, completed, avgSession, totalWarnings, totalBreaks, lateReturns };
}
