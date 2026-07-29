<?php

namespace OptivaxERP\Connectors\ZKTeco;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * @deprecated Bridge-Ready architecture: only used by the legacy, opt-in-only
 * DeviceSyncService direct-TCP path — see that class's doc comment. A Local
 * Bridge Application is responsible for producing ingestBatch()'s wire
 * format itself in the production flow; this class is not part of it.
 *
 * Converts ZKTecoConnector::getAttendanceLogs()'s raw device records into
 * exactly the shape BiometricAttendanceService::ingestBatch() already
 * expects: [{biometricUserId, timestamp, punchType}]. This is the ONLY
 * class that needs to change if a different device brand/model is added
 * later — ingestBatch() itself is untouched, by design.
 *
 * Two correctness-critical decisions live here:
 *
 * 1. TIMEZONE: ZKProtocol::decodeTime() returns a *naive* value — exactly
 *    what the device's own real-time clock reads, with no timezone
 *    attached. That clock is set to local wall-clock time (standard
 *    practice for attendance hardware, and what
 *    ZKTecoConnector::setDeviceTime() itself assumes), not UTC. This class
 *    attaches wp_timezone() (the same site timezone AttendanceTimezone
 *    already uses everywhere else) before formatting an ISO-8601 string, so
 *    that ingestBatch() -> AttendanceTimezone::parseToUtc() converts it to
 *    true UTC correctly. If the device's RTC has drifted from site-local
 *    time (see DeviceSyncService's drift check), every punch from it will
 *    be off by exactly that drift — keeping the device clock synced (via
 *    ZKTecoConnector::setDeviceTime()) is what keeps this assumption valid,
 *    not something this parser can detect on its own.
 *
 * 2. PUNCH DIRECTION: the device's `status` byte is supposed to say
 *    in/out/break-in/break-out/OT-in/OT-out (see STATUS_MAP), but plenty of
 *    real deployments leave every punch tagged status=0 regardless of
 *    actual direction (common when the device's "State" prompt is left on
 *    a fixed value rather than auto-toggling). This parser detects that
 *    per employee per calendar day: if every punch in a (userId, date)
 *    group maps to the *same* direction, the status byte is treated as
 *    carrying no signal, and direction is instead inferred purely from
 *    chronological order (1st punch of the day = in, 2nd = out, 3rd = in,
 *    ...) — the same convention BiometricAttendanceService::aggregateDay()
 *    already uses (first `in`, last `out`) downstream. If a day's punches
 *    show genuine variety, the device's own status codes are trusted as-is.
 */
final class AttendanceParser
{
    private const STATUS_MAP = [
        0 => 'in',   // Check In
        1 => 'out',  // Check Out
        2 => 'break-out',
        3 => 'break-in',
        4 => 'in',   // Overtime In — no separate ingestBatch() punch type, treated as a normal in
        5 => 'out',  // Overtime Out
    ];

    /**
     * A device-clock hour before this is "early morning" — a night shift's tail end, not a
     * fresh day starting. Used only by the raw-calendar-date-crossing merge below.
     */
    private const NIGHT_TAIL_HOUR = 12;

    /** A device-clock hour at/after this is "late evening" — a night shift starting, not an ordinary day's last punches. */
    private const NIGHT_START_HOUR = 18;

    /**
     * @param array<int, array{uid:int, userId:string, timestamp:\DateTimeImmutable, status:int, verifyType:int}> $rawRecords
     * @return array<int, array{biometricUserId:string, timestamp:string, punchType:string}>
     */
    public static function parse(array $rawRecords): array
    {
        $byUserAndDate = [];
        foreach ($rawRecords as $record) {
            $userId = $record['userId'];
            $localDate = $record['timestamp']->format('Y-m-d');
            $byUserAndDate[$userId][$localDate][] = $record;
        }

        $punches = [];
        foreach ($byUserAndDate as $userId => $byDate) {
            foreach (self::mergeOvernightGroups($byDate) as $dayRecords) {
                usort($dayRecords, static fn (array $a, array $b): int => $a['timestamp'] <=> $b['timestamp']);

                $mappedTypes = array_values(array_unique(array_map(
                    static fn (array $r): ?string => self::STATUS_MAP[$r['status']] ?? null,
                    $dayRecords
                )));
                $statusCarriesNoSignal = count($dayRecords) > 1 && count($mappedTypes) <= 1;

                foreach ($dayRecords as $i => $record) {
                    if ($statusCarriesNoSignal) {
                        $punchType = $i % 2 === 0 ? 'in' : 'out';
                    } else {
                        $punchType = self::STATUS_MAP[$record['status']] ?? ($i % 2 === 0 ? 'in' : 'out');
                    }

                    $punches[] = [
                        'biometricUserId' => (string) $userId,
                        'timestamp' => self::toSiteLocalIso8601($record['timestamp']),
                        'punchType' => $punchType,
                    ];
                }
            }
        }

        return $punches;
    }

    /**
     * This parser has no employee/department mapping available (that only happens later, in
     * BiometricAttendanceService::ingestChunk() -> ShiftResolver), so it can't resolve an exact
     * per-department shift window the way the production Bridge-ingest path now does. Without
     * this merge, a night-shift employee's single IN (late evening, calendar day D) and single
     * OUT (early morning, day D+1) would each land alone in its own per-day group — and the
     * status-blind "1st punch = in, 2nd = out" inference below would then misread the lone OUT
     * as a fresh IN, since it has no sibling punch to alternate against. Merging two
     * chronologically adjacent per-day groups when the earlier one ends late evening and the
     * later one starts early morning restores the correct alternating pair before inference
     * runs — a generic heuristic (not exact shift times), appropriate for this deprecated,
     * opt-in-only path.
     *
     * @param array<string, array<int, array{uid:int, userId:string, timestamp:\DateTimeImmutable, status:int, verifyType:int}>> $byDate keyed by "Y-m-d", already grouped for one user
     * @return array<int, array<int, array{uid:int, userId:string, timestamp:\DateTimeImmutable, status:int, verifyType:int}>> re-grouped record lists, some spanning two calendar dates
     */
    private static function mergeOvernightGroups(array $byDate): array
    {
        $dates = array_keys($byDate);
        sort($dates);

        $merged = [];
        $skipNext = false;
        foreach ($dates as $i => $date) {
            if ($skipNext) {
                $skipNext = false;
                continue;
            }

            $group = $byDate[$date];
            $nextDate = $dates[$i + 1] ?? null;
            if ($nextDate !== null && self::datesAreConsecutive($date, $nextDate)) {
                $lastOfThisDay = end($group);
                $firstOfNextDay = $byDate[$nextDate][0];
                $endsLateEvening = ((int) $lastOfThisDay['timestamp']->format('G')) >= self::NIGHT_START_HOUR;
                $startsEarlyMorning = ((int) $firstOfNextDay['timestamp']->format('G')) < self::NIGHT_TAIL_HOUR;
                if ($endsLateEvening && $startsEarlyMorning) {
                    $group = array_merge($group, $byDate[$nextDate]);
                    $skipNext = true;
                }
            }

            $merged[] = $group;
        }

        return $merged;
    }

    private static function datesAreConsecutive(string $earlier, string $later): bool
    {
        $diff = (new \DateTimeImmutable($earlier))->diff(new \DateTimeImmutable($later));
        return $diff->days === 1 && !$diff->invert;
    }

    /** Re-anchors a naive device-clock DateTimeImmutable to wp_timezone() and formats it with that offset, e.g. "2026-07-16T09:03:11+05:00". */
    private static function toSiteLocalIso8601(\DateTimeImmutable $naiveDeviceTime): string
    {
        $siteLocal = \DateTimeImmutable::createFromFormat(
            'Y-m-d H:i:s',
            $naiveDeviceTime->format('Y-m-d H:i:s'),
            wp_timezone()
        );
        return $siteLocal->format(DATE_ATOM);
    }
}
