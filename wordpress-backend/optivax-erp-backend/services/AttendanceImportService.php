<?php

namespace OptivaxERP\Services;

use OptivaxERP\Helpers\AttendanceImportFileParser;
use OptivaxERP\Helpers\Logger;
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
    /** Ported verbatim from src/domain/attendance/calculations.ts and BiometricAttendanceService::LATE_THRESHOLD — do not let any of the three drift apart. */
    private const LATE_THRESHOLD = '09:30';

    /** HR's own judgment calls — an import must never overwrite one of these with a sheet-derived present/late/absent, same rule BiometricAttendanceService::aggregateDay() enforces. */
    private const NON_OVERRIDABLE_STATUSES = ['half-day', 'leave', 'weekly-off', 'holiday'];

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
        $parsed = AttendanceImportFileParser::parse($tmpPath, $originalName);
        return $this->buildPreviewRows($parsed);
    }

    /**
     * @param array $rawRecords each: {rowNumber, biometricUserId, date, time, rawStatus} — exactly preview()'s raw
     * input shape, resent by the frontend. Any other field (employeeId, status, recordHash) present in the payload is ignored.
     */
    public function confirmImport(string $fileName, array $rawRecords, string $uploadedByUserId): array
    {
        $sanitized = array_map(static function (array $r): array {
            return [
                'rowNumber' => (int) ($r['rowNumber'] ?? 0),
                'biometricUserId' => isset($r['biometricUserId']) ? (string) $r['biometricUserId'] : null,
                'date' => isset($r['date']) ? (string) $r['date'] : null,
                'time' => isset($r['time']) ? (string) $r['time'] : null,
                'rawStatus' => isset($r['rawStatus']) ? (string) $r['rawStatus'] : null,
            ];
        }, $rawRecords);

        $rows = $this->buildPreviewRows($sanitized);

        $importId = Uuid::v4();
        $insertRows = [];
        $touchedPairs = [];
        $imported = 0;
        $duplicates = 0;
        $failed = 0;
        $errors = [];

        foreach ($rows as $row) {
            if ($row['status'] === 'ready') {
                $imported++;
                $touchedPairs[$row['employeeId'] . '|' . $row['date']] = ['employeeId' => $row['employeeId'], 'date' => $row['date']];
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

        $this->imports->bulkInsertRows($insertRows);

        $aggregationErrors = 0;
        foreach ($touchedPairs as $pair) {
            try {
                Transaction::run(function () use ($pair): void {
                    $this->aggregateDay($pair['employeeId'], $pair['date']);
                });
            } catch (\Throwable $e) {
                $aggregationErrors++;
                Logger::error('attendance-import', 'aggregateDay failed', [
                    'employeeId' => $pair['employeeId'],
                    'date' => $pair['date'],
                    'error' => $e->getMessage(),
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
    private function buildPreviewRows(array $records): array
    {
        $distinctBioIds = array_values(array_unique(array_filter(
            array_column($records, 'biometricUserId'),
            static fn ($v): bool => $v !== null
        )));
        $employeeMap = $this->mapping->resolveMany($distinctBioIds);

        $rows = [];
        $hashesToCheck = [];
        foreach ($records as $record) {
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
                $rows[$i]['status'] = 'duplicate';
                $rows[$i]['errorMessage'] = isset($existingHashes[$row['recordHash']])
                    ? 'This exact punch was already imported previously.'
                    : 'Duplicate of another row in this same file.';
                continue;
            }
            $seenInThisBatch[$row['recordHash']] = true;
        }

        return $rows;
    }

    private function buildRow(array $record, array $employeeMap): array
    {
        $rowNumber = $record['rowNumber'];
        $biometricUserId = $record['biometricUserId'];

        if ($biometricUserId === null) {
            return $this->failedRow($record, 'Missing Employee/User/Biometric ID.', 'failed');
        }

        $employeeId = $employeeMap[$biometricUserId] ?? null;
        if ($employeeId === null) {
            return $this->failedRow($record, "Unknown biometric ID '{$biometricUserId}' — add a mapping for it first.", 'unmapped');
        }

        $dateTime = self::parseDateTime($record['date'], $record['time']);
        if ($dateTime === null) {
            return $this->failedRow($record, "Could not parse date/time ('{$record['date']}' / '{$record['time']}').", 'failed');
        }

        $punchType = self::normalizeStatus($record['rawStatus']);
        if ($punchType === null) {
            return $this->failedRow($record, "Unrecognized status '{$record['rawStatus']}'.", 'failed');
        }

        [$date, $time] = $dateTime;

        return [
            'rowNumber' => $rowNumber,
            'biometricUserId' => $biometricUserId,
            'employeeId' => $employeeId,
            'employeeName' => self::employeeDisplayName($employeeId),
            'date' => $date,
            'time' => $time,
            'punchType' => $punchType,
            'rawStatus' => $record['rawStatus'],
            'recordHash' => self::computeHash($biometricUserId, $date, $time, $punchType),
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
            'employeeName' => null,
            'date' => $record['date'] ?? null,
            'time' => $record['time'] ?? null,
            'punchType' => null,
            'rawStatus' => $record['rawStatus'] ?? null,
            'recordHash' => null,
            'status' => $status,
            'errorMessage' => $message,
        ];
    }

    /**
     * Derives check_in (first `in`)/check_out (last `out`)/status for one
     * employee+day from this import's rows, and upserts the existing
     * `attendance_records` row via AttendanceRepository's own createSelf()/
     * updateSelf() — the exact same call BiometricAttendanceService and a
     * manual self-check-in both use, never a bespoke write. Deliberately
     * does not touch payroll/salary — nothing in this class references the
     * Payroll module at all.
     */
    private function aggregateDay(string $employeeId, string $date): void
    {
        $dayRows = $this->imports->forEmployeeAndDate($employeeId, $date);
        if (empty($dayRows)) {
            return;
        }

        $existing = $this->attendance->findByUserAndDate($employeeId, $date);
        if ($existing && in_array($existing['status'], self::NON_OVERRIDABLE_STATUSES, true)) {
            return;
        }

        $inRows = array_values(array_filter($dayRows, static fn (array $r): bool => $r['punchType'] === 'in'));
        $outRows = array_values(array_filter($dayRows, static fn (array $r): bool => $r['punchType'] === 'out'));

        $checkIn = !empty($inRows) ? substr($inRows[0]['recordTime'], 0, 5) : null;
        $checkOut = !empty($outRows) ? substr($outRows[count($outRows) - 1]['recordTime'], 0, 5) : null;

        if ($checkIn === null) {
            $status = 'absent';
        } elseif (self::timeToMinutes($checkIn) > self::timeToMinutes(self::LATE_THRESHOLD)) {
            $status = 'late';
        } else {
            $status = 'present';
        }

        $employeeName = self::employeeDisplayName($employeeId);

        if ($existing) {
            $this->attendance->updateSelf($existing['id'], ['checkIn' => $checkIn, 'checkOut' => $checkOut, 'status' => $status]);
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

    private static function computeHash(string $biometricUserId, string $date, string $time, string $punchType): string
    {
        $statusForHash = $punchType === 'in' ? 'check_in' : 'check_out';
        return hash('sha256', "{$biometricUserId}|{$date} {$time}|{$statusForHash}");
    }

    private static function employeeDisplayName(string $employeeId): ?string
    {
        $user = get_userdata((int) $employeeId);
        return $user ? $user->display_name : null;
    }

    private static function timeToMinutes(string $hhmm): int
    {
        [$h, $m] = array_map('intval', explode(':', $hhmm));
        return $h * 60 + $m;
    }
}
