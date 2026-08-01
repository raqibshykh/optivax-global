<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Single source of truth for "which shift does this employee work, and what date/lateness/
 * worked-hours does a given punch/instant belong to" — the fix for the night-shift attendance
 * bug, and the shared engine multi-punch aggregation builds on.
 *
 * Verbatim-mirrored in src/domain/attendance/shift.ts — every method here has a same-named,
 * same-behavior TS counterpart. If either changes, the other must change with it (same
 * convention this codebase already uses for LATE_THRESHOLD between calculations.ts and
 * BiometricAttendanceService.php).
 *
 * configForUser() resolution order: the employee's own assigned shift
 * (users_mapping.shift_id) -> their department's default_shift_id -> the Default (Production)
 * shift policy, 22:00-06:00 with a 15-minute grace period. Per policy there are only three
 * shift types (HR 19:00-01:00, Sales 21:00-05:00, and this Default shift for every other role
 * or department, including any not yet explicitly configured) — this fallback is that Default
 * shift, not an unrelated day-shift default, so any employee/role whose department has no shift
 * of its own (e.g. IT Support, or a role with no department-scoping like super_admin) correctly
 * lands on Default rather than a legacy 09:00-17:00 assumption.
 */
final class ShiftResolver
{
    public const DEFAULT_START = '22:00';
    public const DEFAULT_END = '06:00';
    public const DEFAULT_GRACE_MINUTES = 15;

    /** @return array{shiftId: ?string, start: string, end: string, graceMinutes: int, crossesMidnight: bool} */
    public static function configForUser(string $userId): array
    {
        global $wpdb;
        $prefix = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        $mapping = $wpdb->get_row($wpdb->prepare(
            "SELECT department_id, shift_id, role FROM {$prefix}users_mapping WHERE user_id = %d",
            (int) $userId
        ), ARRAY_A);

        $shiftId = $mapping['shift_id'] ?? null;

        if (!$shiftId && !empty($mapping['department_id'])) {
            $dept = $wpdb->get_row($wpdb->prepare(
                "SELECT default_shift_id FROM {$prefix}departments WHERE id = %s",
                $mapping['department_id']
            ), ARRAY_A);
            $shiftId = $dept['default_shift_id'] ?? null;
        }

        // Legacy department_id values (pre-Department-Master slugs like "dept-sales" rather
        // than a real departments.id row) won't resolve via the join above — fall back to
        // matching a department by RBAC domain derived from the role, same mapping
        // DepartmentMapper already uses for scoping elsewhere.
        if (!$shiftId && !empty($mapping['role'])) {
            $domain = DepartmentMapper::domainForRole($mapping['role']);
            if ($domain) {
                $dept = $wpdb->get_row($wpdb->prepare(
                    "SELECT default_shift_id FROM {$prefix}departments WHERE domain = %s LIMIT 1",
                    $domain
                ), ARRAY_A);
                $shiftId = $dept['default_shift_id'] ?? null;
            }
        }

        if ($shiftId) {
            $shift = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$prefix}department_shifts WHERE id = %s AND status = 'active'",
                $shiftId
            ), ARRAY_A);
            if ($shift) {
                $start = substr((string) $shift['start_time'], 0, 5);
                $end = substr((string) $shift['end_time'], 0, 5);
                return [
                    'shiftId' => $shift['id'],
                    'start' => $start,
                    'end' => $end,
                    'graceMinutes' => (int) $shift['grace_minutes'],
                    'crossesMidnight' => self::crossesMidnight($start, $end),
                ];
            }
        }

        return [
            'shiftId' => null,
            'start' => self::DEFAULT_START,
            'end' => self::DEFAULT_END,
            'graceMinutes' => self::DEFAULT_GRACE_MINUTES,
            'crossesMidnight' => false,
        ];
    }

    public static function crossesMidnight(string $start, string $end): bool
    {
        return self::timeToMinutes($end) <= self::timeToMinutes($start);
    }

    /**
     * The core night-shift fix: which calendar date a local instant's punch belongs to, given
     * the employee's shift. Non-crossing shift -> unchanged (the instant's own date). Crossing
     * shift -> at/after the shift's start time-of-day belongs to that date; before the shift's
     * end time-of-day belongs to the PREVIOUS date (it's the tail end of last night's shift);
     * anything else (outside the shift window entirely, e.g. a stray daytime punch) falls back
     * to its own date rather than guessing.
     */
    public static function resolveShiftDate(\DateTimeImmutable $localInstant, array $config): string
    {
        $date = $localInstant->format('Y-m-d');
        if (!$config['crossesMidnight']) {
            return $date;
        }

        $timeOfDay = ((int) $localInstant->format('H')) * 60 + (int) $localInstant->format('i');
        $startMin = self::timeToMinutes($config['start']);
        $endMin = self::timeToMinutes($config['end']);

        if ($timeOfDay >= $startMin) {
            return $date;
        }
        if ($timeOfDay < $endMin) {
            return $localInstant->modify('-1 day')->format('Y-m-d');
        }
        return $date;
    }

    /**
     * Every shift's lateness grace period is a fixed 15 minutes by policy — deliberately NOT
     * $config['graceMinutes'] (sourced from department_shifts.grace_minutes, currently seeded
     * at 30 for HR/Sales/Production/Marketing/Management; that column is left as-is, only the
     * late-decision here uses the policy value). The grace window is closed at both ends
     * (e.g. a 19:00 start means 19:00-19:14 is on time, 19:15 itself is already Late), hence
     * >= rather than the > this used before.
     */
    private const LATE_GRACE_MINUTES = 15;

    public static function isLate(string $checkInHHMM, array $config): bool
    {
        $threshold = self::timeToMinutes($config['start']) + self::LATE_GRACE_MINUTES;
        return self::timeToMinutes($checkInHHMM) >= $threshold;
    }

    public static function isEarlyLeave(string $checkOutHHMM, array $config): bool
    {
        return self::timeToMinutes($checkOutHHMM) < self::timeToMinutes($config['end']);
    }

    /** Wraparound-aware: for a crossing shift, a checkout numerically earlier than check-in is treated as "next day." */
    public static function workedMinutesSimple(string $checkInHHMM, string $checkOutHHMM, array $config): int
    {
        $inMin = self::timeToMinutes($checkInHHMM);
        $outMin = self::timeToMinutes($checkOutHHMM);
        if ($config['crossesMidnight'] && $outMin <= $inMin) {
            $outMin += 24 * 60;
        }
        return max(0, $outMin - $inMin);
    }

    public static function overtimeMinutes(int $workedMinutes, array $config): int
    {
        $startMin = self::timeToMinutes($config['start']);
        $endMin = self::timeToMinutes($config['end']);
        if ($config['crossesMidnight'] && $endMin <= $startMin) {
            $endMin += 24 * 60;
        }
        $scheduled = max(0, $endMin - $startMin);
        return max(0, $workedMinutes - $scheduled);
    }

    /**
     * Multi-punch aggregation — replaces "first in / last out only." Walks the chronological
     * punch sequence (any mix of in/out/break-in/break-out, using absolute UTC timestamps so
     * midnight-crossing is handled for free, no HH:MM wraparound math needed here) pairing each
     * "resume work" punch with the next "pause work" punch: the summed durations of those pairs
     * is worked time, and the gaps between a pause and the next resume are break time. A
     * trailing unmatched "in" (shift still open) contributes nothing to worked time yet.
     *
     * @param array $punchesSortedByTime each: ['punchType' => in|out|break-in|break-out, 'punchTimeUtc' => 'Y-m-d H:i:s'], already sorted ascending
     * @return array{checkIn: ?string, checkOut: ?string, workedMinutes: int, breakMinutes: int, punchCount: int} checkIn/checkOut as local "H:i"
     */
    public static function computeShiftSummary(array $punchesSortedByTime): array
    {
        if (empty($punchesSortedByTime)) {
            return ['checkIn' => null, 'checkOut' => null, 'workedMinutes' => 0, 'breakMinutes' => 0, 'punchCount' => 0];
        }

        $isResume = static fn (string $type): bool => in_array($type, ['in', 'break-in'], true);
        $isPause = static fn (string $type): bool => in_array($type, ['out', 'break-out'], true);

        $workedSeconds = 0;
        $breakSeconds = 0;
        $openAt = null;
        $lastPauseAt = null;

        foreach ($punchesSortedByTime as $p) {
            $ts = strtotime($p['punchTimeUtc'] . ' UTC');
            if ($ts === false) {
                continue;
            }
            if ($isResume($p['punchType'])) {
                if ($openAt === null) {
                    if ($lastPauseAt !== null) {
                        $breakSeconds += max(0, $ts - $lastPauseAt);
                    }
                    $openAt = $ts;
                }
            } elseif ($isPause($p['punchType'])) {
                if ($openAt !== null) {
                    $workedSeconds += max(0, $ts - $openAt);
                    $lastPauseAt = $ts;
                    $openAt = null;
                }
            }
        }

        $first = AttendanceTimezone::parseToUtc($punchesSortedByTime[0]['punchTimeUtc'] . '+00:00');
        $last = AttendanceTimezone::parseToUtc($punchesSortedByTime[count($punchesSortedByTime) - 1]['punchTimeUtc'] . '+00:00');

        return [
            'checkIn' => $first ? AttendanceTimezone::localTime($first) : null,
            'checkOut' => $last ? AttendanceTimezone::localTime($last) : null,
            'workedMinutes' => (int) round($workedSeconds / 60),
            'breakMinutes' => (int) round($breakSeconds / 60),
            'punchCount' => count($punchesSortedByTime),
        ];
    }

    private static function timeToMinutes(string $hhmm): int
    {
        [$h, $m] = array_map('intval', explode(':', $hhmm));
        return $h * 60 + $m;
    }
}
