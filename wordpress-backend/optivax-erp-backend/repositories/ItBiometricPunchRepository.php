<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/it/punches/* (read-only viewer) and the raw side of
 * BiometricAttendanceService's ingest/aggregate pipeline. `extends
 * AbstractRepository` so the read-only list route can reuse
 * BaseCrudController::listHandler() exactly like every other IT Support
 * resource — the bespoke methods below are for the service layer, which
 * needs more than plain CRUD (dedupe-safe insert, unprocessed-row queries).
 */
final class ItBiometricPunchRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'it_biometric_punches';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'deviceId' => $row['device_id'],
            'biometricUserId' => $row['biometric_user_id'],
            'mappedUserId' => $row['mapped_user_id'] ?: null,
            'mappedUserName' => $row['mapped_user_name'] ?: null,
            'punchType' => $row['punch_type'],
            'punchTimeUtc' => $row['punch_time_utc'],
            'punchTimeRaw' => $row['punch_time_raw'],
            'attendanceDate' => $row['attendance_date'],
            'shiftDate' => $row['shift_date'] ?? null,
            'shiftId' => $row['shift_id'] ?? null,
            'receivedAt' => $row['received_at'],
            'sourceIp' => $row['source_ip'] ?: null,
            'isDuplicate' => (bool) $row['is_duplicate'],
            'processedStatus' => $row['processed_status'],
            'processedAt' => $row['processed_at'] ?: null,
            'processError' => $row['process_error'] ?: null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'device_id' => Sanitize::text($data['deviceId'] ?? ''),
            'biometric_user_id' => Sanitize::text($data['biometricUserId'] ?? ''),
            'mapped_user_id' => Sanitize::text($data['mappedUserId'] ?? null),
            'mapped_user_name' => Sanitize::text($data['mappedUserName'] ?? null),
            'punch_type' => Sanitize::text($data['punchType'] ?? ''),
            'punch_time_utc' => Sanitize::text($data['punchTimeUtc'] ?? ''),
            'punch_time_raw' => Sanitize::text($data['punchTimeRaw'] ?? ''),
            'attendance_date' => Sanitize::text($data['attendanceDate'] ?? ''),
            'shift_date' => Sanitize::text($data['shiftDate'] ?? null) ?: null,
            'shift_id' => Sanitize::text($data['shiftId'] ?? null) ?: null,
            'source_ip' => Sanitize::text($data['sourceIp'] ?? null),
            'is_duplicate' => !empty($data['isDuplicate']) ? 1 : 0,
            'processed_status' => Sanitize::text($data['processedStatus'] ?? 'pending'),
        ];
    }

    /**
     * Batch near-duplicate lookup: ONE query covering every biometric id in
     * an entire incoming punch batch (padded time range), instead of one
     * query per punch — the per-punch version this replaced was the exact
     * N+1 pattern that falls over at 100,000+ punches. Callers do the
     * per-punch "is this within N seconds of an existing one" comparison
     * in-memory against the returned groups.
     *
     * @return array<string, string[]> punch_time_utc values grouped by
     * "biometricUserId|punchType" key.
     */
    public function findRecentWindowForDevice(string $deviceId, array $biometricUserIds, string $fromUtc, string $toUtc): array
    {
        if (empty($biometricUserIds)) {
            return [];
        }
        global $wpdb;
        $placeholders = implode(', ', array_fill(0, count($biometricUserIds), '%s'));
        $sql = "SELECT biometric_user_id, punch_type, punch_time_utc FROM {$this->table()}
                WHERE device_id = %s AND biometric_user_id IN ({$placeholders})
                  AND punch_time_utc BETWEEN %s AND %s";
        $values = array_merge([$deviceId], $biometricUserIds, [$fromUtc, $toUtc]);
        $rows = $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        $grouped = [];
        foreach ($rows ?: [] as $row) {
            $key = $row['biometric_user_id'] . '|' . $row['punch_type'];
            $grouped[$key][] = $row['punch_time_utc'];
        }
        return $grouped;
    }

    /**
     * Bulk insert for an entire chunk in one round trip — `INSERT IGNORE`
     * silently skips any row that collides with the `dedupe` UNIQUE KEY (an
     * exact resubmission) instead of erroring. A device/bridge retrying an
     * already-accepted punch after a timeout must not surface as an error,
     * it must behave exactly as if it had succeeded the first time. Since
     * ids are generated here before the insert, re-checking which of those
     * exact ids exist afterward (existingIds()) tells us precisely which
     * rows were newly accepted vs silently skipped as duplicates — without
     * needing per-row affected-rows feedback MySQL doesn't provide for bulk
     * inserts.
     *
     * @param array $rows each: the same DTO shape fromDtoForCreate() expects, optionally with a pre-generated 'id'
     * @return string[] ids that were actually inserted (i.e. NOT an exact-resubmission collision)
     */
    public function bulkInsertIgnore(array $rows): array
    {
        if (empty($rows)) {
            return [];
        }
        global $wpdb;

        $columns = null;
        $ids = [];
        $flatValues = [];
        foreach ($rows as $row) {
            $id = $row['id'] ?? Uuid::v4();
            $mapped = array_merge(['id' => $id], $this->fromDtoForCreate($row));
            if ($columns === null) {
                $columns = array_keys($mapped);
            }
            $ids[] = $id;
            foreach ($columns as $col) {
                $flatValues[] = $mapped[$col];
            }
        }

        $placeholderRow = '(' . implode(', ', array_fill(0, count($columns), '%s')) . ')';
        $placeholders = implode(', ', array_fill(0, count($rows), $placeholderRow));
        $columnList = implode(', ', $columns);

        $sql = "INSERT IGNORE INTO {$this->table()} ({$columnList}) VALUES {$placeholders}";
        $wpdb->query($wpdb->prepare($sql, $flatValues));

        return $this->existingIds($ids);
    }

    /** @return string[] the subset of $ids that actually exist in the table right now — used by bulkInsertIgnore() to detect which candidate rows survived. */
    public function existingIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }
        global $wpdb;
        $placeholders = implode(', ', array_fill(0, count($ids), '%s'));
        return $wpdb->get_col($wpdb->prepare("SELECT id FROM {$this->table()} WHERE id IN ({$placeholders})", $ids));
    }

    /** One UPDATE for a whole day's (or batch's) punch ids at once, rather than one per row — the pending/failed processed_status is what a retry pass filters on, so a failed aggregation simply leaves its punches untouched here (still 'pending') for the next attempt. */
    public function markProcessedBulk(array $ids, string $status): void
    {
        if (empty($ids)) {
            return;
        }
        global $wpdb;
        $placeholders = implode(', ', array_fill(0, count($ids), '%s'));
        $sql = "UPDATE {$this->table()} SET processed_status = %s, processed_at = %s WHERE id IN ({$placeholders})";
        $values = array_merge([$status, current_time('mysql', true)], $ids);
        $wpdb->query($wpdb->prepare($sql, $values));
    }

    /**
     * @return array<int, array{userId: string, date: string}> distinct (mapped_user_id,
     * shift_date) pairs still needing aggregation. Uses COALESCE(shift_date, attendance_date)
     * so rows written before the shift_date column existed (pre-upgrade data still pending
     * reprocessing) group by the old raw calendar date instead of by NULL.
     */
    public function distinctPendingUserDates(?string $deviceId): array
    {
        global $wpdb;
        $where = "processed_status IN ('pending', 'failed') AND is_duplicate = 0 AND mapped_user_id IS NOT NULL";
        $values = [];
        if ($deviceId) {
            $where .= ' AND device_id = %s';
            $values[] = $deviceId;
        }
        $sql = "SELECT DISTINCT mapped_user_id, COALESCE(shift_date, attendance_date) AS effective_date FROM {$this->table()} WHERE {$where}";
        $rows = empty($values)
            ? $wpdb->get_results($sql, ARRAY_A)
            : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map(static function (array $row): array {
            return ['userId' => (string) $row['mapped_user_id'], 'date' => (string) $row['effective_date']];
        }, $rows ?: []);
    }

    /** Total stored punch rows for a device — the real, DB-backed "Total Logs" figure DeviceSyncService refreshes onto it_devices.total_logs after every live sync. */
    public function countByDevice(string $deviceId): int
    {
        global $wpdb;
        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->table()} WHERE device_id = %s",
            $deviceId
        ));
    }

    /**
     * Non-duplicate punches for one (user, shift date), time-ordered — the direct input to
     * BiometricAttendanceService::aggregateDay(). Matches on COALESCE(shift_date,
     * attendance_date) rather than attendance_date alone, so a punch stored before shift_date
     * existed (still NULL) is found via its raw calendar date exactly as before — this is what
     * makes the night-shift fix apply going forward without orphaning older rows.
     */
    public function forUserAndDate(string $userId, string $date): array
    {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->table()}
             WHERE mapped_user_id = %s AND COALESCE(shift_date, attendance_date) = %s AND is_duplicate = 0
             ORDER BY punch_time_utc ASC",
            $userId,
            $date
        ), ARRAY_A);
        return array_map([$this, 'toDto'], $rows ?: []);
    }
}
