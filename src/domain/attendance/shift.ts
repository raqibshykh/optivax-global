// Shift-date resolution and shift-aware attendance math — verbatim TS mirror of
// wordpress-backend/optivax-erp-backend/helpers/ShiftResolver.php. Every function here has a
// same-named, same-behavior PHP counterpart; if either changes, the other must change with it
// (same convention this codebase already uses for LATE_THRESHOLD/STANDARD_CHECKIN between this
// domain folder and BiometricAttendanceService.php).

import type { Department } from "../../services/departmentService";
import type { DepartmentShift } from "../../services/shiftService";

export interface ShiftConfig {
  shiftId: string | null;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  graceMinutes: number;
  crossesMidnight: boolean;
}

export const DEFAULT_SHIFT: ShiftConfig = {
  shiftId: null,
  start: "09:00",
  end: "17:00",
  graceMinutes: 30,
  crossesMidnight: false,
};

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function crossesMidnight(start: string, end: string): boolean {
  return timeToMinutes(end) <= timeToMinutes(start);
}

/**
 * Resolves the ShiftConfig for an employee from already-fetched Department/DepartmentShift
 * lists (own shift assignment isn't tracked client-side yet, so this mirrors the backend's
 * department-default_shift_id fallback only — falls back to DEFAULT_SHIFT when nothing is
 * configured, exactly like ShiftResolver::configForUser()'s own final fallback).
 */
export function resolveShiftConfig(
  departmentId: string | null | undefined,
  departments: Department[],
  shifts: DepartmentShift[],
): ShiftConfig {
  const dept = departmentId ? departments.find((d) => d.id === departmentId) : undefined;
  const shiftId = dept?.defaultShiftId;
  if (!shiftId) return DEFAULT_SHIFT;

  const shift = shifts.find((s) => s.id === shiftId && s.status === "active");
  if (!shift) return DEFAULT_SHIFT;

  return {
    shiftId: shift.id,
    start: shift.startTime,
    end: shift.endTime,
    graceMinutes: shift.graceMinutes,
    crossesMidnight: crossesMidnight(shift.startTime, shift.endTime),
  };
}

/**
 * The core night-shift fix: which calendar date a local instant belongs to, given the
 * employee's shift. Non-crossing shift -> unchanged (the instant's own date). Crossing shift ->
 * at/after the shift's start time-of-day belongs to that date; before the shift's end
 * time-of-day belongs to the PREVIOUS date (it's the tail end of last night's shift); anything
 * else (outside the shift window entirely) falls back to its own date.
 */
export function resolveShiftDate(now: Date, config: ShiftConfig): string {
  const dateStr = toDateStr(now);
  if (!config.crossesMidnight) return dateStr;

  const timeOfDay = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(config.start);
  const endMin = timeToMinutes(config.end);

  if (timeOfDay >= startMin) return dateStr;
  if (timeOfDay < endMin) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return toDateStr(prev);
  }
  return dateStr;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Every shift's lateness grace period is a fixed 15 minutes by policy — mirrors
 * ShiftResolver::isLate() in the PHP backend; deliberately NOT config.graceMinutes
 * (department_shifts.grace_minutes is a separate, unrelated column). The grace window
 * is closed at both ends (e.g. a 19:00 start means 19:00-19:14 is on time, 19:15 itself
 * is already Late), hence >= rather than >.
 */
const LATE_GRACE_MINUTES = 15;

export function isLate(checkIn: string, config: ShiftConfig): boolean {
  return timeToMinutes(checkIn) >= timeToMinutes(config.start) + LATE_GRACE_MINUTES;
}

export function isEarlyLeave(checkOut: string, config: ShiftConfig): boolean {
  return timeToMinutes(checkOut) < timeToMinutes(config.end);
}

/** Wraparound-aware: for a crossing shift, a checkout numerically earlier than check-in is treated as "next day." */
export function workedMinutesSimple(checkIn: string, checkOut: string, config: ShiftConfig): number {
  const inMin = timeToMinutes(checkIn);
  let outMin = timeToMinutes(checkOut);
  if (config.crossesMidnight && outMin <= inMin) outMin += 24 * 60;
  return Math.max(0, outMin - inMin);
}

export function overtimeMinutes(workedMinutes: number, config: ShiftConfig): number {
  const startMin = timeToMinutes(config.start);
  let endMin = timeToMinutes(config.end);
  if (config.crossesMidnight && endMin <= startMin) endMin += 24 * 60;
  const scheduled = Math.max(0, endMin - startMin);
  return Math.max(0, workedMinutes - scheduled);
}

export interface RawPunch {
  punchType: "in" | "out" | "break-in" | "break-out";
  punchTimeUtc: string; // "Y-m-d H:i:s" (UTC, no offset marker)
}

export interface ShiftSummary {
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number;
  breakMinutes: number;
  punchCount: number;
}

/**
 * Multi-punch aggregation, mirroring ShiftResolver::computeShiftSummary() — walks the
 * chronological punch sequence pairing each "resume work" punch with the next "pause work"
 * punch (summed durations = worked time; gaps between a pause and the next resume = break
 * time). Operates on absolute UTC instants so midnight-crossing is handled for free.
 */
export function computeShiftSummary(punchesSortedByTime: RawPunch[]): ShiftSummary {
  if (punchesSortedByTime.length === 0) {
    return { checkIn: null, checkOut: null, workedMinutes: 0, breakMinutes: 0, punchCount: 0 };
  }

  const isResume = (t: string) => t === "in" || t === "break-in";
  const isPause = (t: string) => t === "out" || t === "break-out";

  let workedMs = 0;
  let breakMs = 0;
  let openAt: number | null = null;
  let lastPauseAt: number | null = null;

  for (const p of punchesSortedByTime) {
    const ts = Date.parse(`${p.punchTimeUtc.replace(" ", "T")}Z`);
    if (Number.isNaN(ts)) continue;

    if (isResume(p.punchType)) {
      if (openAt === null) {
        if (lastPauseAt !== null) breakMs += Math.max(0, ts - lastPauseAt);
        openAt = ts;
      }
    } else if (isPause(p.punchType)) {
      if (openAt !== null) {
        workedMs += Math.max(0, ts - openAt);
        lastPauseAt = ts;
        openAt = null;
      }
    }
  }

  const first = new Date(`${punchesSortedByTime[0].punchTimeUtc.replace(" ", "T")}Z`);
  const last = new Date(`${punchesSortedByTime[punchesSortedByTime.length - 1].punchTimeUtc.replace(" ", "T")}Z`);
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return {
    checkIn: fmt(first),
    checkOut: fmt(last),
    workedMinutes: Math.round(workedMs / 60000),
    breakMinutes: Math.round(breakMs / 60000),
    punchCount: punchesSortedByTime.length,
  };
}
