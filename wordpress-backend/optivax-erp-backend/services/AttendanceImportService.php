<?php

namespace OptivaxERP\Services;

use OptivaxERP\Helpers\AttendanceImportFileParser;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Helpers\ShiftResolver;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;
use OptivaxERP\Repositories\AttendanceAuditRepository;
use OptivaxERP\Repositories\AttendanceBiometricMappingRepository;
use OptivaxERP\Repositories\AttendanceImportRepository;
use OptivaxERP\Repositories\AttendanceRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Parses an uploaded ZKTeco attendance export and aggregates it into the
 * existing `attendance_records` table via the existing AttendanceRepository
 * — byte-identical row shape to a manual self-check-in or the device/Bridge
 * biometric pipeline (BiometricAttendanceService::aggregateDay()), so HR,
 * Payroll, and Reports need zero changes; they just start reflecting
 * imported data. This service is otherwise fully independent of that device
 * pipeline (separate mapping table, separate raw-row ledger, separate hash-
 * based dedup) — no shared code, by design, so this feature can't regress it.
 *
 * preview() and confirmImport() share buildPreviewRows() so a "Confirm
 * Import" call can never diverge from what the admin was shown, and so
 * confirmImport() never trusts client-supplied employeeId/punchType/hash —
 * only the raw sheet fields (biometricUserId/date/time/rawStatus) survive
 * the round trip to the browser and back; everything derived from them is
 * always recomputed server-side.
 */
final class AttendanceImportService
{
    /** HR's own judgment calls — an import must never overwrite one of these with a sheet-derived present/late/absent, same rule BiometricAttendanceService::aggregateDay() enforces. */
    private const NON_OVERRIDABLE_STATUSES = ['half-day', 'leave', 'weekly-off', 'holiday'];

    /**
     * Recognized biometric-verification-method values — how a punch was
     * authenticated (fingerprint/face/card/password scanner), never a
     * check-in/check-out direction. Distinct from normalizeStatus()'s
     * in/out synonyms; a value landing here is accepted (not rejected as
     * Invalid) but doesn't itself assert a direction — see buildRow()'s
     * status handling. "fingerpint" (missing r) is a known typo some ZKTeco
     * exports actually contain verbatim, kept alongside the correct spelling.
     */
    private const VERIFICATION_METHODS = ['fingerpint', 'fingerprint', 'finger', 'fp', 'face', 'card', 'password'];

    /** Below this, two names are too different to auto-map — the floor of the "fuzzy similarity (85-90%)" spec, chosen so more legitimate near-matches (ERP renames, typos) qualify rather than fewer. */
    private const FUZZY_NAME_MATCH_MIN_PERCENT = 85.0;

    private AttendanceBiometricMappingRepository $mapping;
    private AttendanceImportRepository $imports;
    private AttendanceRepository $attendance;
    private AttendanceAuditRepository $audit;

    public function __construct()
    {
        $this->mapping = new AttendanceBiometricMappingRepository();
        $this->imports = new AttendanceImportRepository();
        $this->attendance = new AttendanceRepository();
        $this->audit = new AttendanceAuditRepository();
    }

    /** Parses + resolves + dedup-checks a freshly uploaded file. No DB writes except read-only hash/mapping lookups. */
    public function preview(string $tmpPath, string $originalName): array
    {
        $parsed = AttendanceImportFileParser::parseWithMetadata($tmpPath, $originalName);
        return $this->buildPreviewRows($parsed['rows'], $parsed['employeeNames']);
    }

    /**
     * @param array $rawRecords each: {rowNumber, biometricUserId, date, time, rawStatus} — exactly preview()'s raw
     * input shape, resent by the frontend. Any other field (employeeId, status, recordHash) present in the payload is ignored.
     */
    public function confirmImport(string $fileName, array $rawRecords, string $uploadedByUserId): array
    {
        // TEMP-DIAG (root-cause investigation, remove after the fix is confirmed).
        error_log('[ATTENDANCE-IMPORT-DIAG] confirmImport() entered. fileName=' . $fileName . ' rawRecords count=' . count($rawRecords) . ' uploadedBy=' . $uploadedByUserId);

        $sanitized = array_map(static function (array $r): array {
            return [
                'rowNumber' => (int) ($r['rowNumber'] ?? 0),
                'biometricUserId' => isset($r['biometricUserId']) ? (string) $r['biometricUserId'] : null,
                'date' => isset($r['date']) ? (string) $r['date'] : null,
                'time' => isset($r['time']) ? (string) $r['time'] : null,
                'rawStatus' => isset($r['rawStatus']) ? (string) $r['rawStatus'] : null,
            ];
        }, $rawRecords);

        $rows = $this->buildPreviewRows($sanitized, array_fill(0, count($sanitized), null));

        // TEMP-DIAG: input vs output row count, and a status breakdown — 'failed' is rows
        // removed by validation (bad date/time/status), 'unmapped' is rows removed by employee
        // mapping, 'duplicate' is rows removed by duplicate-hash detection. buildPreviewRows()
        // never actually drops a row (1 in -> 1 out, always), so these counts should always sum
        // to the input count; logged explicitly so that's provable rather than assumed.
        $statusCounts = ['ready' => 0, 'duplicate' => 0, 'unmapped' => 0, 'failed' => 0];
        foreach ($rows as $r) {
            $statusCounts[$r['status']] = ($statusCounts[$r['status']] ?? 0) + 1;
        }
        error_log('[ATTENDANCE-IMPORT-DIAG] buildPreviewRows(): input=' . count($sanitized) . ' output=' . count($rows) . ' statusBreakdown=' . wp_json_encode($statusCounts));

        $importId = Uuid::v4();
        $insertRows = [];
        $touchedPairs = [];
        $imported = 0;
        $duplicates = 0;
        $failed = 0;
        $errors = [];
        // One ShiftResolver::configForUser() lookup per distinct employee in
        // this file, not per row — mirrors BiometricAttendanceService::
        // ingestChunk()'s own shiftConfigCache, for the same reason (a file
        // can hold thousands of rows from the same handful of employees).
        $shiftConfigCache = [];

        foreach ($rows as $row) {
            if ($row['status'] === 'ready') {
                $imported++;
                // Grouped by SHIFT date (ShiftResolver::resolveShiftDate()),
                // not the raw calendar date the punch happened to land on —
                // this is what makes an overnight shift's late-evening punch
                // and its after-midnight counterpart aggregate together into
                // one day instead of two, exactly like the biometric pipeline
                // already does. Only affects which aggregateDay() calls get
                // made below — the row's own 'date'/'time' fields, and what
                // gets stored in recordDate two lines down, are untouched.
                $shiftConfig = $shiftConfigCache[$row['employeeId']] ??= ShiftResolver::configForUser($row['employeeId']);
                $shiftDate = self::resolveRowShiftDate($row, $shiftConfig);
                $touchedPairs[$row['employeeId'] . '|' . $shiftDate] = ['employeeId' => $row['employeeId'], 'date' => $shiftDate];
            } elseif ($row['status'] === 'duplicate') {
                $duplicates++;
            } else {
                $failed++;
                if (count($errors) < 500) {
                    $errors[] = "Row {$row['rowNumber']}: {$row['errorMessage']}";
                }
            }

            $insertRows[] = [
                'importId' => $importId,
                'rowNumber' => $row['rowNumber'],
                'biometricUserId' => $row['biometricUserId'],
                'employeeId' => $row['employeeId'],
                'recordDate' => $row['date'],
                'recordTime' => $row['time'],
                'punchType' => $row['punchType'],
                'rawStatus' => $row['rawStatus'],
                'recordHash' => $row['recordHash'],
                'status' => $row['status'] === 'ready' ? 'imported' : $row['status'],
                'errorMessage' => $row['errorMessage'],
            ];
        }

        // TEMP-DIAG (root-cause investigation, remove after the fix is confirmed).
        error_log('[ATTENDANCE-IMPORT-DIAG] About to call bulkInsertRows(). importId=' . $importId . ' insertRows count=' . count($insertRows) . ' (imported=' . $imported . ' duplicates=' . $duplicates . ' failed=' . $failed . ')');
        try {
            $this->imports->bulkInsertRows($insertRows);
            error_log('[ATTENDANCE-IMPORT-DIAG] bulkInsertRows() returned normally — no exception thrown.');
        } catch (\Throwable $e) {
            error_log('[ATTENDANCE-IMPORT-DIAG] bulkInsertRows() THREW: ' . get_class($e) . ': ' . $e->getMessage());
            error_log('[ATTENDANCE-IMPORT-DIAG] Stack trace: ' . $e->getTraceAsString());
            throw $e; // do not swallow — the controller's existing catch(\Throwable) still turns this into a 500 response exactly as before, now with full detail already logged
        }

        $aggregationErrors = 0;
        foreach ($touchedPairs as $pair) {
            try {
                Transaction::run(function () use ($pair): void {
                    $this->aggregateDay($pair['employeeId'], $pair['date']);
                });
            } catch (\Throwable $e) {
                $aggregationErrors++;
                // Full diagnostic context, not just a message — so the exact failing
                // repository call and statement are visible from this log line alone, without
                // needing to reproduce the failure. $wpdb->last_error is read here on a
                // best-effort basis (a ROLLBACK inside Transaction::run may already have cleared
                // it by the time we get here); the throw site embeds the real SQL error text
                // into $e->getMessage() itself (see AttendanceRepository::createSelf()), which is
                // why exceptionMessage is the primary field to read.
                global $wpdb;
                $originFrame = $e->getTrace()[0] ?? [];
                $originMethod = trim(($originFrame['class'] ?? '') . ($originFrame['type'] ?? '') . ($originFrame['function'] ?? 'unknown'), '\\');
                Logger::error('attendance-import', 'aggregateDay failed', [
                    'employeeId' => $pair['employeeId'],
                    'shiftDate' => $pair['date'],
                    'exceptionClass' => get_class($e),
                    'exceptionMessage' => $e->getMessage(),
                    'sqlError' => $wpdb->last_error ?: null,
                    'repositoryMethod' => $originMethod,
                    'failedAt' => $e->getFile() . ':' . $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $importRecord = $this->imports->createImportRecord([
            'fileName' => $fileName,
            'totalRecords' => count($rows),
            'importedRecords' => $imported,
            'duplicateRecords' => $duplicates,
            'failedRecords' => $failed,
            'errorSummary' => !empty($errors) ? implode('; ', $errors) : null,
            'uploadedBy' => $uploadedByUserId,
        ]);

        return [
            'importId' => $importRecord['id'],
            'totalRecords' => count($rows),
            'importedRecords' => $imported,
            'duplicateRecords' => $duplicates,
            'failedRecords' => $failed,
            'aggregationErrors' => $aggregationErrors,
        ];
    }

    /**
     * @param array $records each: {rowNumber, biometricUserId, date, time, rawStatus}
     * @return array<int, array{rowNumber:int, biometricUserId:?string, employeeId:?string, employeeName:?string, date:?string, time:?string, punchType:?string, rawStatus:?string, recordHash:?string, status:string, errorMessage:?string}>
     */
    private function buildPreviewRows(array $records, array $employeeNames = []): array
    {
        $distinctBioIds = array_values(array_unique(array_filter(
            array_column($records, 'biometricUserId'),
            static fn ($v): bool => $v !== null
        )));
        $employeeMap = $this->mapping->resolveMany($distinctBioIds);

        $rows = [];
        $hashesToCheck = [];
        foreach ($records as $index => $record) {
            $record['employeeName'] = $employeeNames[$index] ?? null;
            $row = $this->buildRow($record, $employeeMap);
            $rows[] = $row;
            if ($row['recordHash'] !== null) {
                $hashesToCheck[] = $row['recordHash'];
            }
        }

        $existingHashes = array_flip($this->imports->findExistingHashes($hashesToCheck));
        // A hash already in the DB (from an earlier import) AND a hash
        // repeated more than once within THIS SAME file are both duplicates
        // — without tracking the latter, two identical rows in one sheet
        // would both be counted as "will import" even though bulkInsertRows()'s
        // UNIQUE KEY would silently drop the second at insert time, making
        // the summary counts lie about what actually landed.
        $seenInThisBatch = [];
        foreach ($rows as $i => $row) {
            if ($row['status'] !== 'ready') {
                continue;
            }
            if (isset($existingHashes[$row['recordHash']]) || isset($seenInThisBatch[$row['recordHash']])) {
                // Same lookups as before ($existingHashes = prior-import
                // history, $seenInThisBatch = repeats within this file) —
                // just also recorded as a flag now, so a caller can tell
                // "Already Imported" apart from "Duplicate In Current File"
                // without parsing the errorMessage text.
                $isAlreadyImported = isset($existingHashes[$row['recordHash']]);
                $rows[$i]['status'] = 'duplicate';
                $rows[$i]['alreadyImported'] = $isAlreadyImported;
                $rows[$i]['errorMessage'] = $isAlreadyImported
                    ? 'This exact punch was already imported previously.'
                    : 'Duplicate of another row in this same file.';
                continue;
            }
            $seenInThisBatch[$row['recordHash']] = true;
        }

        return $rows;
    }

    private function buildRow(array $record, array &$employeeMap): array
    {
        $rowNumber = $record['rowNumber'];
        $biometricUserId = $record['biometricUserId'];

        if ($biometricUserId === null) {
            return $this->failedRow($record, 'Missing Employee/User/Biometric ID.', 'failed');
        }

        // Metadata only — none of these three flags feed into the
        // resolution decision itself (that logic below is unchanged); they
        // just record WHICH branch resolved $employeeId, so the response can
        // tell "Existing Mapping" apart from "Mapped by Name"/"Mapping
        // Created" without changing what gets matched or written anywhere.
        $matchedByExistingMapping = false;
        $matchedByName = false;
        $mappingCreated = false;

        $employeeId = $employeeMap[$biometricUserId] ?? null;
        if ($employeeId !== null) {
            $matchedByExistingMapping = true;
        }
        if ($employeeId === null) {
            $matchedEmployeeId = $this->resolveEmployeeByName($record['employeeName'] ?? null);
            if ($matchedEmployeeId !== null) {
                $conflict = $this->mapping->findConflict((string) $matchedEmployeeId, $biometricUserId);
                if ($conflict === null) {
                    $this->mapping->create([
                        'employeeId' => (string) $matchedEmployeeId,
                        'biometricUserId' => $biometricUserId,
                    ]);
                    $employeeMap[$biometricUserId] = (string) $matchedEmployeeId;
                    $employeeId = (string) $matchedEmployeeId;
                    $matchedByName = true;
                    $mappingCreated = true;
                }
            }
        }

        if ($employeeId === null) {
            return $this->failedRow($record, "Unknown biometric ID '{$biometricUserId}' — add a mapping for it first.", 'unmapped');
        }

        $dateTime = self::parseDateTime($record['date'], $record['time']);
        if ($dateTime === null) {
            return $this->failedRow($record, "Could not parse date/time ('{$record['date']}' / '{$record['time']}').", 'failed');
        }

        $punchType = self::normalizeStatus($record['rawStatus']);
        if ($punchType === null && !self::isVerificationMethod($record['rawStatus'])) {
            return $this->failedRow($record, "Unrecognized status '{$record['rawStatus']}'.", 'failed');
        }
        // When $punchType is still null here, $record['rawStatus'] was a
        // recognized verification method (Fingerprint/Face/Card/Password/
        // ...) — how the punch was authenticated on the device, not which
        // direction it was. ZKTeco exports often carry only this one column
        // (no separate Status/Punch-Type column at all), so there is
        // genuinely no direction to read here. It is intentionally left
        // null rather than invented — no new punch-type value is created —
        // so the row still imports normally (employee + timestamp only) and
        // is neither rejected nor mis-tagged as 'in' or 'out'.

        [$date, $time] = $dateTime;

        return [
            'rowNumber' => $rowNumber,
            'biometricUserId' => $biometricUserId,
            'employeeId' => $employeeId,
            // Raw sheet value, untouched — previously this was overwritten
            // with the resolved ERP display name, which made it impossible
            // for a caller to see what the sheet actually said once a match
            // was found. The resolved name now lives in its own field below.
            'employeeName' => self::rawEmployeeName($record['employeeName'] ?? null),
            'matchedEmployeeName' => self::employeeDisplayName($employeeId),
            'mappingCreated' => $mappingCreated,
            'matchedByExistingMapping' => $matchedByExistingMapping,
            'matchedByName' => $matchedByName,
            // Overwritten to true by buildPreviewRows()'s duplicate pass
            // when this row's hash matches prior import history — false
            // here is the "not a duplicate (yet)" default for every
            // freshly-resolved row.
            'alreadyImported' => false,
            'date' => $date,
            'time' => $time,
            'punchType' => $punchType,
            'rawStatus' => $record['rawStatus'],
            // computeHash()'s $punchType parameter is a non-nullable
            // string (untouched — see its own doc comment on why hash
            // generation must not change), so a genuinely-null direction
            // is passed through as '' here for hashing purposes only; that
            // placeholder is never itself stored or returned as a
            // punch-type value — the row's own 'punchType' above stays the
            // real null. computeHash() already treats every non-'in' value
            // identically (hashes as the 'check_out' bucket), so this
            // changes nothing about how duplicates are detected.
            'recordHash' => self::computeHash($biometricUserId, $date, $time, $punchType ?? '', $employeeId),
            'status' => 'ready',
            'errorMessage' => null,
        ];
    }

    private function failedRow(array $record, string $message, string $status): array
    {
        return [
            'rowNumber' => $record['rowNumber'],
            'biometricUserId' => $record['biometricUserId'],
            'employeeId' => null,
            'employeeName' => self::rawEmployeeName($record['employeeName'] ?? null),
            'matchedEmployeeName' => null,
            'mappingCreated' => false,
            'matchedByExistingMapping' => false,
            'matchedByName' => false,
            'alreadyImported' => false,
            'date' => $record['date'] ?? null,
            'time' => $record['time'] ?? null,
            'punchType' => null,
            'rawStatus' => $record['rawStatus'] ?? null,
            'recordHash' => null,
            'status' => $status,
            'errorMessage' => $message,
        ];
    }

    /** The sheet's employee-name cell, trimmed but otherwise verbatim — display-only, never used for matching (see normalizeEmployeeName() for that). */
    private static function rawEmployeeName(?string $name): ?string
    {
        $trimmed = trim((string) ($name ?? ''));
        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * Derives checkIn/checkOut/status/workedMinutes/overtimeMinutes for one
     * employee+shift-date from this import's rows, and upserts the existing
     * `attendance_records` row via AttendanceRepository's own createSelf()/
     * updateSelf(), never a bespoke write. `$date` here is always a shift
     * date (see confirmImport()'s touchedPairs), not necessarily the raw
     * calendar date a punch happened to be recorded under.
     *
     * Finalized Attendance Import policy (Attendance Import is the only
     * active attendance source; Biometric Sync is out of scope here):
     *  - Check In = the earliest imported punch for the shift-date, Check Out
     *    = the latest — every punch in between is ignored, regardless of any
     *    in/out/verification-method tag it carries (see the earliest/latest
     *    selection below).
     *  - Worked Hours = Check Out − Check In, via ShiftResolver::
     *    workedMinutesSimple() — a plain duration, never break-adjusted.
     *    Breaks are tracked exclusively by the ERP's own break/activity
     *    system (ActivityController/ActivityRepository, activity_breaks),
     *    entirely separate from attendance_records; this class never reads
     *    or writes break data and worked/overtime minutes here are
     *    unaffected by it, by design.
     *  - Shift assignment, shift date, cross-midnight handling, grace
     *    period, late policy, early leave, and overtime all still come from
     *    ShiftResolver, unchanged.
     * Deliberately does not touch payroll/salary — nothing in this class
     * references the Payroll module at all; Payroll/Reports/Dashboard all
     * read the workedMinutes this method writes via the shared
     * attendance_records table.
     */
    private function aggregateDay(string $employeeId, string $date): void
    {
        $shiftConfig = ShiftResolver::configForUser($employeeId);
        $dayRows = self::rowsForShiftDate($this->imports, $employeeId, $date, $shiftConfig);
        if (empty($dayRows)) {
            return;
        }

        $existing = $this->attendance->findByUserAndDate($employeeId, $date);
        if ($existing && in_array($existing['status'], self::NON_OVERRIDABLE_STATUSES, true)) {
            return;
        }

        // Finalized policy: Check In = earliest imported punch, Check Out = latest imported
        // punch, full stop — every punch in between (including any 'in'/'out'/verification-method
        // tag on it) is ignored for this determination. $dayRows is chronologically ordered (see
        // rowsForShiftDate()), so the first/last elements ARE the earliest/latest punch. A single
        // punch for the day is a check-in with no check-out yet, same as before.
        $checkIn = substr($dayRows[0]['recordTime'], 0, 5);
        $checkOut = count($dayRows) > 1 ? substr($dayRows[count($dayRows) - 1]['recordTime'], 0, 5) : null;

        // $checkIn is always a real punch time here ($dayRows is non-empty, checked above), so
        // there is no "no punches at all" case to fall back to 'absent' for — an import-sourced
        // row always has at least one punch behind it.
        $status = ShiftResolver::isLate($checkIn, $shiftConfig) ? 'late' : 'present';

        // Worked Hours = Check Out − Check In, full stop — never break-adjusted (breaks are
        // tracked only by the ERP's own break/activity system, not here). Zero when there's no
        // Check Out yet (a single punch for the day, or a shift still open).
        $workedMinutes = $checkOut !== null
            ? ShiftResolver::workedMinutesSimple($checkIn, $checkOut, $shiftConfig)
            : 0;
        $overtimeMinutes = $checkOut !== null ? ShiftResolver::overtimeMinutes($workedMinutes, $shiftConfig) : 0;

        $employeeName = self::employeeDisplayName($employeeId);

        if ($existing) {
            $this->attendance->updateSelf($existing['id'], [
                'checkIn' => $checkIn,
                'checkOut' => $checkOut,
                'status' => $status,
                'shiftId' => $shiftConfig['shiftId'],
                'workedMinutes' => $workedMinutes,
                'overtimeMinutes' => $overtimeMinutes,
                'punchCount' => count($dayRows),
            ]);
            $previousStatus = $existing['status'];
            $previousCheckIn = $existing['checkIn'];
            $previousCheckOut = $existing['checkOut'];
        } else {
            $mapping = AuthService::mappingFor((int) $employeeId);
            $this->attendance->createSelf([
                'userId' => $employeeId,
                'userName' => $employeeName ?: ('Employee ' . $employeeId),
                'userRole' => $mapping['role'] ?? 'client',
                'date' => $date,
                'checkIn' => $checkIn,
                'checkOut' => $checkOut,
                'status' => $status,
                'shiftId' => $shiftConfig['shiftId'],
                'workedMinutes' => $workedMinutes,
                'overtimeMinutes' => $overtimeMinutes,
                'punchCount' => count($dayRows),
            ]);
            $previousStatus = null;
            $previousCheckIn = null;
            $previousCheckOut = null;
        }

        $this->audit->create([
            'editedAt' => current_time('mysql', true),
            'editedBy' => 'system:attendance-import',
            'editedByRole' => 'system',
            'employeeId' => $employeeId,
            'employeeName' => $employeeName ?: $employeeId,
            'attendanceDate' => $date,
            'previousStatus' => $previousStatus ?? '',
            'newStatus' => $status,
            'previousCheckIn' => $previousCheckIn,
            'previousCheckOut' => $previousCheckOut,
            'newCheckIn' => $checkIn,
            'newCheckOut' => $checkOut,
            'reason' => 'Attendance sheet import',
        ]);
    }

    /**
     * confirmImport()'s touched-pair grouping key — resolves the SHIFT date
     * (ShiftResolver::resolveShiftDate()) a row's employee+timestamp belongs
     * to, so an overnight shift's evening and after-midnight punches group
     * into one aggregateDay() call instead of two. Falls back to the row's
     * own raw date if it somehow can't be reparsed (shouldn't happen —
     * buildRow() only ever produces rows with an already-valid date/time).
     */
    private static function resolveRowShiftDate(array $row, array $shiftConfig): string
    {
        $instant = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $row['date'] . ' ' . $row['time']);
        return $instant !== false ? ShiftResolver::resolveShiftDate($instant, $shiftConfig) : $row['date'];
    }

    /**
     * Gathers every successfully-imported row for one employee whose ACTUAL
     * shift date equals $shiftDate — not simply every row whose stored
     * record_date column equals $shiftDate. AttendanceImportRepository::
     * forEmployeeAndDate() only supports an exact calendar-date match (left
     * unchanged — no repository/schema change), so for a shift that crosses
     * midnight the early-morning "tail" (stored under the NEXT calendar
     * date) is fetched separately, and both calendar-date batches are
     * filtered down to exactly the rows that truly belong to $shiftDate
     * before being merged — already in chronological order by construction,
     * see the merge's own doc comment below.
     */
    private static function rowsForShiftDate(AttendanceImportRepository $imports, string $employeeId, string $shiftDate, array $shiftConfig): array
    {
        $rows = self::rowsBelongingToShiftDate(
            $imports->forEmployeeAndDate($employeeId, $shiftDate),
            $shiftDate,
            $shiftDate,
            $shiftConfig
        );

        if ($shiftConfig['crossesMidnight']) {
            $nextCalendarDate = (new \DateTimeImmutable($shiftDate))->modify('+1 day')->format('Y-m-d');
            // $rows (calendar day = $shiftDate, already time-ascending from forEmployeeAndDate())
            // is chronologically entirely BEFORE the next calendar day's rows appended here (also
            // already time-ascending) — no re-sort needed or correct: sorting the merged list by
            // recordTime alone (a bare "H:i:s" with no date component) would compare only
            // time-of-day and wrongly interleave the next day's early-morning tail (e.g. "00:45")
            // ahead of this day's evening punches (e.g. "19:05"), corrupting first-in/last-out.
            $rows = array_merge($rows, self::rowsBelongingToShiftDate(
                $imports->forEmployeeAndDate($employeeId, $nextCalendarDate),
                $nextCalendarDate,
                $shiftDate,
                $shiftConfig
            ));
        }

        return $rows;
    }

    /** Filters $rows (all recorded under the single calendar date $recordCalendarDate) down to only those whose true shift date is $targetShiftDate. */
    private static function rowsBelongingToShiftDate(array $rows, string $recordCalendarDate, string $targetShiftDate, array $shiftConfig): array
    {
        return array_values(array_filter($rows, static function (array $row) use ($recordCalendarDate, $targetShiftDate, $shiftConfig): bool {
            $instant = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $recordCalendarDate . ' ' . $row['recordTime']);
            return $instant !== false && ShiftResolver::resolveShiftDate($instant, $shiftConfig) === $targetShiftDate;
        }));
    }

    private static function normalizeStatus(?string $rawStatus): ?string
    {
        if ($rawStatus === null) {
            return null;
        }
        $normalized = strtolower(trim($rawStatus));
        return match (true) {
            in_array($normalized, ['check in', 'checkin', 'check-in', 'in', '0', 'present'], true) => 'in',
            in_array($normalized, ['check out', 'checkout', 'check-out', 'out', '1', 'exit'], true) => 'out',
            default => null,
        };
    }

    /** True when $rawStatus is a recognized verification method (see VERIFICATION_METHODS) rather than an in/out direction — checked only after normalizeStatus() has already failed to recognize it as a direction. */
    private static function isVerificationMethod(?string $rawStatus): bool
    {
        if ($rawStatus === null) {
            return false;
        }
        return in_array(strtolower(trim($rawStatus)), self::VERIFICATION_METHODS, true);
    }

    /**
     * Resolution order once biometric-mapping lookup (in buildRow()) has
     * already failed:
     *  1. Exact match on the normalized name (case-insensitive, whitespace-
     *     collapsed, punctuation-stripped — see normalizeEmployeeName())
     *     against every candidate name form. If exactly one distinct
     *     employee matches this way, that's the result; more than one is
     *     ambiguous and left unmapped — fuzzy is never tried to break that
     *     tie, since the names are already identical under normalization.
     *  2. Only when NO exact match exists at all: fuzzy similarity (via
     *     PHP's built-in similar_text(), computed against the same
     *     normalized candidate forms) — an employee qualifies once their
     *     best-matching candidate name clears FUZZY_NAME_MATCH_MIN_PERCENT.
     *     Again, exactly one distinct qualifying employee is required;
     *     more than one is ambiguous and left unmapped.
     * Either tier: a caller that gets a non-null employeeId back may safely
     * auto-create a biometric mapping for it (see buildRow()) — this method
     * never itself writes anything, only resolves.
     */
    private function resolveEmployeeByName(?string $name): ?string
    {
        $normalized = self::normalizeEmployeeName($name);
        if ($normalized === null) {
            return null;
        }

        $exactMatches = [];
        $fuzzyMatches = [];
        foreach (get_users(['fields' => ['ID', 'display_name', 'first_name', 'last_name', 'user_login']]) as $user) {
            $candidateNames = array_values(array_unique(array_filter([
                $user->display_name ?? null,
                trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
                $user->user_login ?? null,
            ], static fn ($value): bool => $value !== null && $value !== '')));

            $isExact = false;
            $bestPercent = 0.0;
            foreach ($candidateNames as $candidateName) {
                $normalizedCandidate = self::normalizeEmployeeName($candidateName);
                if ($normalizedCandidate === null) {
                    continue;
                }
                if ($normalizedCandidate === $normalized) {
                    $isExact = true;
                    break;
                }
                similar_text($normalized, $normalizedCandidate, $percent);
                $bestPercent = max($bestPercent, $percent);
            }

            if ($isExact) {
                $exactMatches[] = (string) $user->ID;
            } elseif ($bestPercent >= self::FUZZY_NAME_MATCH_MIN_PERCENT) {
                $fuzzyMatches[] = (string) $user->ID;
            }
        }

        if (!empty($exactMatches)) {
            $uniqueExact = array_values(array_unique($exactMatches));
            return count($uniqueExact) === 1 ? $uniqueExact[0] : null;
        }

        $uniqueFuzzy = array_values(array_unique($fuzzyMatches));
        return count($uniqueFuzzy) === 1 ? $uniqueFuzzy[0] : null;
    }

    /**
     * Case-insensitive, whitespace-collapsed, punctuation-stripped
     * comparison key for a name — "O'Brien", "O Brien", and "OBrien" (or
     * "Jane-Doe" vs "Jane Doe") all normalize to the same value. \p{L}/\p{N}
     * (Unicode letter/number categories, via PCRE's /u modifier — no
     * mbstring dependency needed) are kept so accented names round-trip
     * correctly; every other character (periods, commas, apostrophes,
     * hyphens, ...) is dropped rather than replaced with a space.
     */
    private static function normalizeEmployeeName(?string $name): ?string
    {
        $normalized = trim((string) ($name ?? ''));
        if ($normalized === '') {
            return null;
        }
        $normalized = strtolower($normalized);
        $normalized = preg_replace('/[^\p{L}\p{N}\s]/u', '', $normalized);
        $normalized = trim(preg_replace('/\s+/', ' ', $normalized));
        return $normalized === '' ? null : $normalized;
    }

    /**
     * Treats the sheet's date/time as literal local wall-clock values (same
     * assumption the device/Bridge pipeline makes about a device's RTC) —
     * no timezone conversion is applied anywhere in this method; format()
     * only re-renders the same parsed components back out.
     * @return array{0:string, 1:string}|null [date "Y-m-d", time "H:i:s"]
     */
    private static function parseDateTime(?string $date, ?string $time): ?array
    {
        if ($date === null) {
            return null;
        }
        $combined = ($time !== null && $time !== '') ? trim($date . ' ' . $time) : trim($date);

        $formats = [
            'Y-m-d H:i:s', 'Y-m-d H:i', 'Y-m-d',
            'd-m-Y H:i:s', 'd-m-Y H:i', 'd-m-Y',
            'd/m/Y H:i:s', 'd/m/Y H:i', 'd/m/Y',
            'm/d/Y H:i:s', 'm/d/Y H:i', 'm/d/Y',
        ];
        foreach ($formats as $format) {
            $dt = \DateTime::createFromFormat($format, $combined);
            if ($dt !== false) {
                return [$dt->format('Y-m-d'), $dt->format('H:i:s')];
            }
        }

        $timestamp = strtotime($combined);
        if ($timestamp === false) {
            return null;
        }
        return [date('Y-m-d', $timestamp), date('H:i:s', $timestamp)];
    }

    private static function computeHash(string $biometricUserId, string $date, string $time, string $punchType, ?string $employeeId = null): string
    {
        $statusForHash = $punchType === 'in' ? 'check_in' : 'check_out';
        $employeeSegment = $employeeId !== null ? "|{$employeeId}" : '';
        return hash('sha256', "{$biometricUserId}{$employeeSegment}|{$date} {$time}|{$statusForHash}");
    }

    private static function employeeDisplayName(string $employeeId): ?string
    {
        $user = get_userdata((int) $employeeId);
        return $user ? $user->display_name : null;
    }
}
