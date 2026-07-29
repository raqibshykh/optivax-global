<?php

namespace OptivaxERP\Services;

use OptivaxERP\Helpers\AttendanceTimezone;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Helpers\ShiftResolver;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;
use OptivaxERP\Repositories\AttendanceAuditRepository;
use OptivaxERP\Repositories\AttendanceRepository;
use OptivaxERP\Repositories\ItAttendanceExceptionRepository;
use OptivaxERP\Repositories\ItBiometricEmployeeMapRepository;
use OptivaxERP\Repositories\ItBiometricPunchRepository;
use OptivaxERP\Repositories\ItDeviceLogRepository;
use OptivaxERP\Repositories\ItDeviceRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * The aggregation engine that turns raw device punches (it_biometric_punches)
 * into the exact same `attendance_records` shape a manual self-check-in
 * already produces (AttendanceRepository::createSelf()/updateSelf()) — so
 * HR/Payroll/Reports need zero code changes, they just start reflecting real
 * biometric data. Note `internal_user_id` throughout this class is the WP
 * numeric user id (as a string), matching what
 * AttendanceController::selfCreate() stores in attendance_records.user_id
 * (AuthMiddleware::currentUserId()) — not the `employees` table's UUID.
 */
final class BiometricAttendanceService
{
    private const VALID_PUNCH_TYPES = ['in', 'out', 'break-in', 'break-out'];

    /** Same-device+employee+type punches within this many seconds are treated as a near-duplicate (device double-scan), not two real events. */
    private const DUPLICATE_WINDOW_SECONDS = 120;

    /**
     * A punch timestamped further into the future than this (relative to the
     * ERP server's own clock) is rejected rather than accepted — a forged or
     * badly-drifted-clock timestamp, not a legitimate late-arriving offline
     * punch. Deliberately generous (not zero) to tolerate real Bridge/device
     * clock drift and network latency without punishing it. Offline/backdated
     * punches (yesterday, last week, last month) have no equivalent lower
     * bound — the whole point of Bridge offline support is that old punches
     * must import correctly.
     */
    private const MAX_FUTURE_SKEW_SECONDS = 300;

    /**
     * A single ingest call is processed in fixed-size chunks rather than one
     * pass over the whole payload — bounds memory for a very large single
     * import (100,000+ punches) and keeps each chunk to a small, constant
     * number of DB round trips (see ingestChunk()) instead of one query per
     * punch, which is what made the original per-punch implementation an
     * N+1 pattern that would not scale to that volume.
     */
    private const CHUNK_SIZE = 500;

    // Late/status thresholds now come from ShiftResolver::configForUser() (per-department
    // shift, falling back to ShiftResolver::DEFAULT_START/DEFAULT_GRACE_MINUTES) instead of a
    // single hardcoded constant here — see ShiftResolver.php's own doc comment for the
    // frontend mirror this must stay in sync with.

    /** HR's own judgment calls — an auto-aggregation run must never overwrite one of these with a punch-derived present/late/absent. */
    private const NON_OVERRIDABLE_STATUSES = ['half-day', 'leave', 'weekly-off', 'holiday'];

    private ItBiometricPunchRepository $punches;
    private ItBiometricEmployeeMapRepository $mapping;
    private AttendanceRepository $attendance;
    private AttendanceAuditRepository $audit;
    private ItAttendanceExceptionRepository $exceptions;
    private ItDeviceLogRepository $deviceLogs;
    private ItDeviceRepository $devices;

    public function __construct()
    {
        $this->punches = new ItBiometricPunchRepository();
        $this->mapping = new ItBiometricEmployeeMapRepository();
        $this->attendance = new AttendanceRepository();
        $this->audit = new AttendanceAuditRepository();
        $this->exceptions = new ItAttendanceExceptionRepository();
        $this->deviceLogs = new ItDeviceLogRepository();
        $this->devices = new ItDeviceRepository();
    }

    /**
     * The ingestion entry point — `POST /it/devices/{deviceId}/punches/import`,
     * the primary and (on a shared-hosting deployment) only way punches ever
     * reach the ERP. Processes $rawPunches in fixed-size chunks (see
     * CHUNK_SIZE), each chunk costing a small constant number of DB round
     * trips (ingestChunk()) rather than one query per punch — required to
     * stay responsive at batches up to several thousand punches per call.
     * @param array $rawPunches each: ['biometricUserId'=>string,'timestamp'=>string ISO8601,'punchType'=>in|out|break-in|break-out]
     * @param array $bridgeMeta optional Local Bridge Application identity/diagnostics: ['bridgeId','bridgeVersion','bridgeHostname','bridgeIp','bridgeOs','bridgeLatencyMs','deviceTime'] — every key optional, used only for status/logging, never for auth or business logic.
     * @throws \InvalidArgumentException if $deviceId doesn't resolve to a real device row.
     */
    public function ingestBatch(string $deviceId, array $rawPunches, string $sourceIp, array $bridgeMeta = []): array
    {
        $startedAt = microtime(true);

        $device = $this->devices->find($deviceId);
        if (!$device) {
            throw new \InvalidArgumentException("Unknown device id: {$deviceId}");
        }

        $accepted = 0;
        $duplicates = 0;
        $rejected = 0;
        $unmapped = 0;
        $errors = [];
        /** @var array<string, array{userId: string, date: string}> $touchedPairs keyed by "userId|date" to dedupe across every chunk */
        $touchedPairs = [];

        foreach (array_chunk($rawPunches, self::CHUNK_SIZE) as $chunk) {
            $chunkResult = $this->ingestChunk($deviceId, $sourceIp, $chunk);
            $accepted += $chunkResult['accepted'];
            $duplicates += $chunkResult['duplicates'];
            $rejected += $chunkResult['rejected'];
            $unmapped += $chunkResult['unmapped'];
            $errors = array_merge($errors, $chunkResult['errors']);
            // '+' union keeps the first chunk's entry when the same
            // (userId, date) pair is touched by punches spread across
            // multiple chunks — the value is identical either way, so which
            // one wins doesn't matter, only that the pair ends up aggregated once.
            $touchedPairs += $chunkResult['touchedPairs'];
        }

        $aggregatedOk = 0;
        $aggregatedFailed = 0;
        foreach ($touchedPairs as $pair) {
            try {
                Transaction::run(function () use ($pair, $deviceId, $sourceIp): void {
                    $this->aggregateDay($pair['userId'], $pair['date'], $deviceId, $sourceIp);
                });
                $aggregatedOk++;
            } catch (\Throwable $e) {
                $aggregatedFailed++;
                $errors[] = "Aggregation failed for user {$pair['userId']} on {$pair['date']}: " . $e->getMessage();
                Logger::error('biometric-attendance', 'aggregateDay failed', [
                    'userId' => $pair['userId'],
                    'date' => $pair['date'],
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $result = $aggregatedFailed > 0 ? ($aggregatedOk > 0 ? 'partial' : 'failed') : 'success';
        $processingTimeMs = (int) round((microtime(true) - $startedAt) * 1000);

        $this->logSync($deviceId, $device['name'] ?? null, $result, $accepted, $errors, 'auto', 'Biometric device ingest', [
            'rejectedCount' => $rejected,
            'unmappedCount' => $unmapped,
            'duplicates' => $duplicates,
            'aggregationFailures' => $aggregatedFailed,
            'punchCount' => count($rawPunches),
            'sourceIp' => $sourceIp,
            'bridgeId' => $bridgeMeta['bridgeId'] ?? null,
            'idempotencyKey' => $bridgeMeta['idempotencyKey'] ?? null,
            'durationMs' => $processingTimeMs,
        ]);

        $this->devices->recordBridgeStatus($deviceId, [
            'bridgeId' => $bridgeMeta['bridgeId'] ?? null,
            'bridgeVersion' => $bridgeMeta['bridgeVersion'] ?? null,
            'bridgeHostname' => $bridgeMeta['bridgeHostname'] ?? null,
            'bridgeIp' => $bridgeMeta['bridgeIp'] ?? $sourceIp,
            'bridgeOs' => $bridgeMeta['bridgeOs'] ?? null,
            'bridgeLatencyMs' => $bridgeMeta['bridgeLatencyMs'] ?? null,
            'lastUploadDurationMs' => $processingTimeMs,
            'lastUploadCount' => count($rawPunches),
            'failed' => $result === 'failed',
        ]);

        return [
            'accepted' => $accepted,
            'duplicates' => $duplicates,
            'rejected' => $rejected,
            'unmapped' => $unmapped,
            'aggregated' => $aggregatedOk,
            'aggregationFailures' => $aggregatedFailed,
            'errors' => $errors,
            'processingTimeMs' => $processingTimeMs,
            'deviceTime' => $bridgeMeta['deviceTime'] ?? null,
            'serverTime' => gmdate('c'),
        ];
    }

    /**
     * Processes one chunk with a fixed, small number of DB round trips
     * regardless of chunk size: one batch mapping-resolution query
     * (ItBiometricEmployeeMapRepository::resolveMany()), one batch
     * near-duplicate-window query (ItBiometricPunchRepository::
     * findRecentWindowForDevice()), and one bulk INSERT IGNORE
     * (bulkInsertIgnore()) — replacing what was previously 2-3 queries
     * PER PUNCH. Validation/parsing/dedupe-window comparison all happen
     * in-memory against those batch results.
     *
     * @return array{accepted:int,duplicates:int,rejected:int,unmapped:int,errors:string[],touchedPairs:array<string,array{userId:string,date:string}>}
     */
    private function ingestChunk(string $deviceId, string $sourceIp, array $chunk): array
    {
        $accepted = 0;
        $duplicates = 0;
        $rejected = 0;
        $unmapped = 0;
        $errors = [];
        $touchedPairs = [];

        // Phase 1 — parse & structurally validate every punch in-memory, no DB calls yet.
        $parsed = [];
        foreach ($chunk as $i => $punch) {
            $biometricUserId = trim((string) ($punch['biometricUserId'] ?? ''));
            $punchType = trim((string) ($punch['punchType'] ?? ''));
            $rawTimestamp = trim((string) ($punch['timestamp'] ?? ''));

            if ($biometricUserId === '' || $rawTimestamp === '' || !in_array($punchType, self::VALID_PUNCH_TYPES, true)) {
                $rejected++;
                $errors[] = "Punch #{$i}: missing/invalid biometricUserId, timestamp, or punchType";
                continue;
            }

            $utc = AttendanceTimezone::parseToUtc($rawTimestamp);
            if (!$utc) {
                $rejected++;
                $errors[] = "Punch #{$i}: unparseable timestamp '{$rawTimestamp}'";
                continue;
            }

            if ($utc->getTimestamp() > time() + self::MAX_FUTURE_SKEW_SECONDS) {
                $rejected++;
                $errors[] = "Punch #{$i}: timestamp '{$rawTimestamp}' is too far in the future — rejected as a forged/misconfigured-clock timestamp";
                continue;
            }

            $parsed[] = [
                'id' => Uuid::v4(),
                'biometricUserId' => $biometricUserId,
                'punchType' => $punchType,
                'punchTimeUtc' => $utc->format('Y-m-d H:i:s'),
                'punchTimeRaw' => $rawTimestamp,
                'attendanceDate' => AttendanceTimezone::localDate($utc),
                'unixTime' => $utc->getTimestamp(),
            ];
        }

        if (empty($parsed)) {
            return compact('accepted', 'duplicates', 'rejected', 'unmapped', 'errors', 'touchedPairs');
        }

        // Phase 2 — ONE query resolving every distinct biometric id in this chunk.
        $distinctBioIds = array_values(array_unique(array_column($parsed, 'biometricUserId')));
        $mappings = $this->mapping->resolveMany($deviceId, $distinctBioIds);

        // Phase 3 — ONE query for near-duplicate candidates covering this chunk's whole time span (padded by the dedupe window).
        $unixTimes = array_column($parsed, 'unixTime');
        $fromUtc = gmdate('Y-m-d H:i:s', min($unixTimes) - self::DUPLICATE_WINDOW_SECONDS);
        $toUtc = gmdate('Y-m-d H:i:s', max($unixTimes) + self::DUPLICATE_WINDOW_SECONDS);
        $recentGroups = $this->punches->findRecentWindowForDevice($deviceId, $distinctBioIds, $fromUtc, $toUtc);

        // Phase 4 — build every insert row in-memory, checking near-duplicates
        // against both existing DB history AND punches already seen earlier
        // in this same chunk (appended to the same in-memory groups as we go).
        $rows = [];
        $rowMeta = [];
        /** @var array<string, array> $shiftConfigCache one ShiftResolver::configForUser() call per distinct mapped user per chunk, not per punch — a chunk can hold hundreds of punches from the same handful of employees, and this class's whole design (CHUNK_SIZE, batch mapping/dedupe queries) exists specifically to avoid an N+1 pattern at that volume. */
        $shiftConfigCache = [];
        foreach ($parsed as $p) {
            $mapped = $mappings[$p['biometricUserId']] ?? null;
            if (!$mapped) {
                $unmapped++;
            }

            $groupKey = $p['biometricUserId'] . '|' . $p['punchType'];
            $isDuplicate = false;
            foreach (($recentGroups[$groupKey] ?? []) as $existingUtc) {
                // $existingUtc is a stored "Y-m-d H:i:s" string with no
                // offset marker — appending " UTC" is required so strtotime()
                // parses it as UTC rather than the server's ambient default
                // PHP timezone, which could otherwise skew this comparison
                // by whatever that server offset happens to be.
                if (abs(strtotime($existingUtc . ' UTC') - $p['unixTime']) <= self::DUPLICATE_WINDOW_SECONDS) {
                    $isDuplicate = true;
                    break;
                }
            }
            $recentGroups[$groupKey][] = $p['punchTimeUtc'];
            if ($isDuplicate) {
                $duplicates++;
            }

            // The night-shift fix: a punch belongs to the shift it's part of, not the raw
            // calendar date it happens to land on — only resolvable once we know WHO the
            // punch belongs to (their department's shift config). Unmapped punches (no
            // employee to look up) fall back to the raw calendar date, same as before; they
            // never drive aggregation anyway (see the unmapped++ above).
            if ($mapped) {
                $uid = $mapped['internalUserId'];
                $shiftConfig = $shiftConfigCache[$uid] ??= ShiftResolver::configForUser($uid);
                $utcInstant = AttendanceTimezone::parseToUtc($p['punchTimeUtc'] . '+00:00');
                $localInstant = $utcInstant ? $utcInstant->setTimezone(wp_timezone()) : null;
                $shiftDate = $localInstant ? ShiftResolver::resolveShiftDate($localInstant, $shiftConfig) : $p['attendanceDate'];
                $shiftId = $shiftConfig['shiftId'];
            } else {
                $shiftDate = $p['attendanceDate'];
                $shiftId = null;
            }

            $rows[] = [
                'id' => $p['id'],
                'deviceId' => $deviceId,
                'biometricUserId' => $p['biometricUserId'],
                'mappedUserId' => $mapped['internalUserId'] ?? null,
                'mappedUserName' => $mapped['employeeName'] ?? null,
                'punchType' => $p['punchType'],
                'punchTimeUtc' => $p['punchTimeUtc'],
                'punchTimeRaw' => $p['punchTimeRaw'],
                'attendanceDate' => $p['attendanceDate'],
                'shiftDate' => $shiftDate,
                'shiftId' => $shiftId,
                'sourceIp' => $sourceIp,
                'isDuplicate' => $isDuplicate,
                'processedStatus' => $mapped ? 'pending' : 'unmapped',
            ];
            $rowMeta[$p['id']] = ['mapped' => $mapped, 'shiftDate' => $shiftDate, 'isDuplicate' => $isDuplicate];
        }

        // Phase 5 — ONE bulk insert for the whole chunk (INSERT IGNORE silently
        // skips exact-resubmission collisions against the `dedupe` UNIQUE KEY).
        $insertedIds = array_flip($this->punches->bulkInsertIgnore($rows));

        // Phase 6 — tally + side effects only for rows that actually landed.
        foreach ($rowMeta as $id => $meta) {
            if (!isset($insertedIds[$id])) {
                continue; // exact resubmission — already accepted on a prior call, not a new event
            }
            $accepted++;
            if ($meta['isDuplicate']) {
                $this->flagDuplicateException($meta['mapped'], $meta['shiftDate']);
                continue; // near-duplicates are recorded but never drive aggregation
            }
            if ($meta['mapped']) {
                // Keyed by shift date, not raw calendar date — this is what makes an overnight
                // shift's IN (landing on calendar day D) and OUT (landing on D+1) collapse into
                // ONE aggregation pass instead of two, each seeing only half the punches.
                $key = $meta['mapped']['internalUserId'] . '|' . $meta['shiftDate'];
                $touchedPairs[$key] = ['userId' => $meta['mapped']['internalUserId'], 'date' => $meta['shiftDate']];
            }
        }

        return compact('accepted', 'duplicates', 'rejected', 'unmapped', 'errors', 'touchedPairs');
    }

    /**
     * Derives checkIn/checkOut/status/workedMinutes/breakMinutes/overtimeMinutes for one
     * employee+shift-date from its raw punches (multi-punch aware — every in/out/break-in/
     * break-out pair contributes, not just the first `in` and last `out`; see
     * ShiftResolver::computeShiftSummary()), and upserts the existing `attendance_records` row
     * via AttendanceRepository's own createSelf()/updateSelf() — never a bespoke write, so the
     * row this produces is byte-identical in shape to a manual self-check-in. `$date` here is
     * always a shift date (see ingestChunk()/touchedPairs), never a raw calendar date.
     */
    public function aggregateDay(string $userId, string $date, string $deviceId, string $sourceIp): void
    {
        $dayPunches = $this->punches->forUserAndDate($userId, $date);
        if (empty($dayPunches)) {
            return;
        }

        $existing = $this->attendance->findByUserAndDate($userId, $date);
        if ($existing && in_array($existing['status'], self::NON_OVERRIDABLE_STATUSES, true)) {
            // HR's own judgment call (leave/half-day/holiday/weekly-off) wins
            // — skip the write entirely rather than risk a confusing
            // check-in time on what HR has already marked a non-working day.
            $this->punches->markProcessedBulk(array_column($dayPunches, 'id'), 'processed');
            return;
        }

        $shiftConfig = ShiftResolver::configForUser($userId);
        $summary = ShiftResolver::computeShiftSummary($dayPunches);
        $checkIn = $summary['checkIn'];
        $checkOut = $summary['checkOut'];

        if ($checkIn === null) {
            $status = 'absent';
        } elseif (ShiftResolver::isLate($checkIn, $shiftConfig)) {
            $status = 'late';
        } else {
            $status = 'present';
        }

        $overtimeMinutes = $checkOut !== null ? ShiftResolver::overtimeMinutes($summary['workedMinutes'], $shiftConfig) : 0;

        $mappedName = $dayPunches[0]['mappedUserName'] ?? null;

        if ($existing) {
            $patch = [
                'checkIn' => $checkIn,
                'checkOut' => $checkOut,
                'status' => $status,
                'shiftId' => $shiftConfig['shiftId'],
                'workedMinutes' => $summary['workedMinutes'],
                'breakMinutes' => $summary['breakMinutes'],
                'overtimeMinutes' => $overtimeMinutes,
                'punchCount' => $summary['punchCount'],
            ];
            $this->attendance->updateSelf($existing['id'], $patch);
            $previousStatus = $existing['status'];
            $previousCheckIn = $existing['checkIn'];
            $previousCheckOut = $existing['checkOut'];
        } else {
            $mapping = AuthService::mappingFor((int) $userId);
            $this->attendance->createSelf([
                'userId' => $userId,
                'userName' => $mappedName ?: ('Employee ' . $userId),
                'userRole' => $mapping['role'] ?? 'client',
                'date' => $date,
                'checkIn' => $checkIn,
                'checkOut' => $checkOut,
                'status' => $status,
                'shiftId' => $shiftConfig['shiftId'],
                'workedMinutes' => $summary['workedMinutes'],
                'breakMinutes' => $summary['breakMinutes'],
                'overtimeMinutes' => $overtimeMinutes,
                'punchCount' => $summary['punchCount'],
            ]);
            $previousStatus = null;
            $previousCheckIn = null;
            $previousCheckOut = null;
        }

        $this->audit->create([
            'editedAt' => current_time('mysql', true),
            'editedBy' => 'system:biometric-sync',
            'editedByRole' => 'system',
            'employeeId' => $userId,
            'employeeName' => $mappedName ?: $userId,
            'attendanceDate' => $date,
            'previousStatus' => $previousStatus ?? '',
            'newStatus' => $status,
            'previousCheckIn' => $previousCheckIn,
            'previousCheckOut' => $previousCheckOut,
            'newCheckIn' => $checkIn,
            'newCheckOut' => $checkOut,
            'reason' => "Biometric sync — device {$deviceId}, source IP {$sourceIp}",
        ]);

        $this->punches->markProcessedBulk(array_column($dayPunches, 'id'), 'processed');

        if ($checkIn !== null && $checkOut === null) {
            $this->flagMissingPunchException($userId, $mappedName, $date, $checkIn);
        }
    }

    /**
     * The real "Sync Now" / "Retry Sync" action — re-runs aggregation for
     * whatever this device's raw punches haven't been successfully processed
     * yet (new arrivals since the last run, or previously-failed rows).
     * Replaces the frontend's old Math.random()-based fake sync entirely.
     */
    public function reprocessDevice(string $deviceId, string $triggeredByName): array
    {
        $device = $this->devices->find($deviceId);
        if (!$device) {
            throw new \InvalidArgumentException("Unknown device id: {$deviceId}");
        }

        $pairs = $this->punches->distinctPendingUserDates($deviceId);
        [$ok, $failed, $errors] = $this->reprocessPairs($pairs, $deviceId, '(manual reprocess)');

        $result = $failed > 0 ? ($ok > 0 ? 'partial' : 'failed') : 'success';
        $this->logSync($deviceId, $device['name'] ?? null, $result, $ok, $errors, 'manual', $triggeredByName);

        return ['aggregated' => $ok, 'aggregationFailures' => $failed, 'errors' => $errors];
    }

    /** Cron-driven, all devices — retries anything still pending/failed regardless of which device it came from. */
    public function reprocessAllPending(): array
    {
        $pairs = $this->punches->distinctPendingUserDates(null);
        [$ok, $failed, $errors] = $this->reprocessPairs($pairs, null, '(scheduled reprocess)');
        if ($ok > 0 || $failed > 0) {
            Logger::info('biometric-attendance', 'Cron reprocess pass complete', ['ok' => $ok, 'failed' => $failed]);
        }
        return ['aggregated' => $ok, 'aggregationFailures' => $failed, 'errors' => $errors];
    }

    /** @return array{0: int, 1: int, 2: string[]} [okCount, failedCount, errors] */
    private function reprocessPairs(array $pairs, ?string $deviceId, string $context): array
    {
        $ok = 0;
        $failed = 0;
        $errors = [];
        foreach ($pairs as $pair) {
            try {
                Transaction::run(function () use ($pair, $deviceId): void {
                    $this->aggregateDay($pair['userId'], $pair['date'], $deviceId ?? 'unknown', '(reprocess — no live request)');
                });
                $ok++;
            } catch (\Throwable $e) {
                $failed++;
                $errors[] = "{$context}: user {$pair['userId']} on {$pair['date']}: " . $e->getMessage();
                Logger::error('biometric-attendance', 'Reprocess aggregation failed', [
                    'userId' => $pair['userId'],
                    'date' => $pair['date'],
                    'error' => $e->getMessage(),
                ]);
            }
        }
        return [$ok, $failed, $errors];
    }

    /**
     * Cron sweep (BiometricAttendanceCronWorker, hourly): for each of the
     * last few "closed" calendar days (site-local, so today's still-in-
     * progress shift is never flagged), detect employees with an in-punch
     * but no matching out-punch, and mapped-active employees with zero
     * punches on what looks like a working weekday. Both are idempotent
     * (skipped if a matching pending exception already exists) and both
     * accept the documented limitation that company holidays aren't known
     * server-side (see the implementation plan) — a false-positive
     * no-record on a holiday is dismissible via the existing exceptions UI
     * like any other exception.
     */
    public function sweepMissingAndNoRecordExceptions(): void
    {
        $siteToday = new \DateTimeImmutable('now', wp_timezone());
        $activeEmployees = $this->mapping->activeMappedEmployees();

        for ($daysAgo = 1; $daysAgo <= 3; $daysAgo++) {
            $date = $siteToday->modify("-{$daysAgo} day")->format('Y-m-d');
            $dayOfWeek = (int) $siteToday->modify("-{$daysAgo} day")->format('N'); // 1=Mon .. 7=Sun

            foreach ($activeEmployees as $employee) {
                $userId = $employee['userId'];
                $dayPunches = $this->punches->forUserAndDate($userId, $date);

                if (empty($dayPunches)) {
                    if ($dayOfWeek <= 5 && !$this->attendance->findByUserAndDate($userId, $date)) {
                        $this->upsertException($userId, $employee['name'], $date, 'no-record', null, null);
                    }
                    continue;
                }

                $hasIn = false;
                $hasOut = false;
                $firstIn = null;
                foreach ($dayPunches as $p) {
                    if ($p['punchType'] === 'in') {
                        $hasIn = true;
                        $firstIn ??= $p['punchTimeUtc'];
                    }
                    if ($p['punchType'] === 'out') {
                        $hasOut = true;
                    }
                }
                if ($hasIn && !$hasOut) {
                    $checkInLocal = $firstIn ? AttendanceTimezone::localTime(AttendanceTimezone::parseToUtc($firstIn . '+00:00')) : null;
                    $this->upsertException($userId, $employee['name'], $date, 'missing-punch', $checkInLocal, null);
                }
            }
        }
    }

    private function flagDuplicateException(?array $mapped, string $date): void
    {
        if (!$mapped) {
            return; // can't attribute an unmapped biometric id to an employee
        }
        $this->upsertException($mapped['internalUserId'], $mapped['employeeName'] ?? null, $date, 'duplicate-punch', null, null);
    }

    private function flagMissingPunchException(string $userId, ?string $employeeName, string $date, string $checkIn): void
    {
        $this->upsertException($userId, $employeeName, $date, 'missing-punch', $checkIn, null);
    }

    /** Idempotent — one pending exception per (employee, date, type), never a growing pile of duplicates on repeated runs. */
    private function upsertException(string $userId, ?string $employeeName, string $date, string $exceptionType, ?string $checkIn, ?string $checkOut): void
    {
        $existing = $this->exceptions->list([
            'employee_id' => $userId,
            'date' => $date,
            'exception_type' => $exceptionType,
        ]);
        if (!empty($existing)) {
            return;
        }

        $this->exceptions->create([
            'employeeId' => $userId,
            'employeeName' => $employeeName,
            'date' => $date,
            'exceptionType' => $exceptionType,
            'checkIn' => $checkIn,
            'checkOut' => $checkOut,
            'status' => 'pending',
        ]);
    }

    /**
     * A punch that fails structural validation (missing fields, unparseable
     * timestamp) can never be given a valid attendance_date/punch_time_utc,
     * so it can't be stored as a row in it_biometric_punches (whose whole
     * purpose is being a real, dated punch) — its only record is this text
     * summary. Every OTHER rejection reason (unmapped, duplicate) already
     * has a full traceable row in it_biometric_punches; this cap is
     * generous specifically so a batch with many structurally-bad rows
     * (a misconfigured bridge) doesn't silently lose most of its detail,
     * while still bounding a single TEXT column at very large batch sizes.
     */
    private const MAX_LOGGED_ERRORS = 500;

    /** @param array $extra optional richer audit fields for a Bridge push (rejectedCount, unmappedCount, duplicates, aggregationFailures, punchCount, sourceIp, bridgeId, idempotencyKey, durationMs) — omitted entirely by the legacy TCP/manual-reprocess call sites, which have no equivalent data. */
    private function logSync(string $deviceId, ?string $deviceName, string $result, int $recordsSynced, array $errors, string $triggeredBy, string $triggeredByName, array $extra = []): void
    {
        $errorText = null;
        if (!empty($errors)) {
            $shown = array_slice($errors, 0, self::MAX_LOGGED_ERRORS);
            $errorText = implode('; ', $shown);
            $remaining = count($errors) - count($shown);
            if ($remaining > 0) {
                $errorText .= "; (+{$remaining} more error(s) truncated)";
            }
        }

        $this->deviceLogs->create(array_merge([
            'deviceId' => $deviceId,
            'deviceName' => $deviceName,
            'result' => $result,
            'recordsSynced' => $recordsSynced,
            'errors' => $errorText,
            'triggeredBy' => $triggeredBy,
            'triggeredByName' => $triggeredByName,
        ], $extra));
        $this->devices->update($deviceId, [
            'lastSync' => current_time('mysql', true),
            'status' => $result === 'failed' ? 'error' : 'online',
        ]);
    }
}
