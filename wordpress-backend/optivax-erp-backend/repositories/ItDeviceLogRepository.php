<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/it/device-logs/* (src/services/itSupportService.ts
 * DeviceSyncLog). Create-only from the route's perspective (no update/delete
 * endpoint), so fromDtoForUpdate() is unused but implemented for completeness.
 */
final class ItDeviceLogRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'it_device_logs';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'deviceId' => $row['device_id'],
            'deviceName' => $row['device_name'],
            'startedAt' => $row['started_at'],
            'completedAt' => $row['completed_at'] ?? null,
            'result' => $row['result'],
            'recordsSynced' => isset($row['records_synced']) ? (int) $row['records_synced'] : 0,
            'errors' => $row['errors'] ?? null,
            'triggeredBy' => $row['triggered_by'],
            'triggeredByName' => $row['triggered_by_name'] ?? null,
            'downloadedRecords' => isset($row['downloaded_records']) ? (int) $row['downloaded_records'] : null,
            'duplicates' => isset($row['duplicates']) ? (int) $row['duplicates'] : null,
            'aggregationFailures' => isset($row['aggregation_failures']) ? (int) $row['aggregation_failures'] : null,
            'connectionResult' => $row['connection_result'] ?? null,
            'durationMs' => isset($row['duration_ms']) ? (int) $row['duration_ms'] : null,
            'rejectedCount' => isset($row['rejected_count']) ? (int) $row['rejected_count'] : null,
            'unmappedCount' => isset($row['unmapped_count']) ? (int) $row['unmapped_count'] : null,
            'punchCount' => isset($row['punch_count']) ? (int) $row['punch_count'] : null,
            'sourceIp' => $row['source_ip'] ?? null,
            'bridgeId' => $row['bridge_id'] ?? null,
            'idempotencyKey' => $row['idempotency_key'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'device_id' => Sanitize::text($data['deviceId'] ?? ''),
            'device_name' => Sanitize::text($data['deviceName'] ?? null),
            'started_at' => Sanitize::text($data['startedAt'] ?? null) ?? current_time('mysql', true),
            'completed_at' => Sanitize::text($data['completedAt'] ?? null),
            'result' => Sanitize::text($data['result'] ?? 'success'),
            'records_synced' => Sanitize::int($data['recordsSynced'] ?? 0),
            'errors' => Sanitize::textarea($data['errors'] ?? null),
            'triggered_by' => Sanitize::text($data['triggeredBy'] ?? 'auto'),
            'triggered_by_name' => Sanitize::text($data['triggeredByName'] ?? null),
            'downloaded_records' => array_key_exists('downloadedRecords', $data) ? Sanitize::int($data['downloadedRecords']) : null,
            'duplicates' => array_key_exists('duplicates', $data) ? Sanitize::int($data['duplicates']) : null,
            'aggregation_failures' => array_key_exists('aggregationFailures', $data) ? Sanitize::int($data['aggregationFailures']) : null,
            'connection_result' => Sanitize::text($data['connectionResult'] ?? null),
            'duration_ms' => array_key_exists('durationMs', $data) ? Sanitize::int($data['durationMs']) : null,
            'rejected_count' => array_key_exists('rejectedCount', $data) ? Sanitize::int($data['rejectedCount']) : null,
            'unmapped_count' => array_key_exists('unmappedCount', $data) ? Sanitize::int($data['unmappedCount']) : null,
            'punch_count' => array_key_exists('punchCount', $data) ? Sanitize::int($data['punchCount']) : null,
            'source_ip' => Sanitize::text($data['sourceIp'] ?? null),
            'bridge_id' => Sanitize::text($data['bridgeId'] ?? null),
            'idempotency_key' => Sanitize::text($data['idempotencyKey'] ?? null),
        ];
    }

    /** Only touches columns actually present in the patch, so a partial PUT can't blank out unrelated fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('deviceId', $data)) {
            $row['device_id'] = Sanitize::text($data['deviceId']);
        }
        if (array_key_exists('deviceName', $data)) {
            $row['device_name'] = Sanitize::text($data['deviceName']);
        }
        if (array_key_exists('completedAt', $data)) {
            $row['completed_at'] = Sanitize::text($data['completedAt']);
        }
        if (array_key_exists('result', $data)) {
            $row['result'] = Sanitize::text($data['result']);
        }
        if (array_key_exists('recordsSynced', $data)) {
            $row['records_synced'] = Sanitize::int($data['recordsSynced']);
        }
        if (array_key_exists('errors', $data)) {
            $row['errors'] = Sanitize::textarea($data['errors']);
        }
        if (array_key_exists('triggeredBy', $data)) {
            $row['triggered_by'] = Sanitize::text($data['triggeredBy']);
        }
        if (array_key_exists('triggeredByName', $data)) {
            $row['triggered_by_name'] = Sanitize::text($data['triggeredByName']);
        }
        if (array_key_exists('downloadedRecords', $data)) {
            $row['downloaded_records'] = Sanitize::int($data['downloadedRecords']);
        }
        if (array_key_exists('duplicates', $data)) {
            $row['duplicates'] = Sanitize::int($data['duplicates']);
        }
        if (array_key_exists('aggregationFailures', $data)) {
            $row['aggregation_failures'] = Sanitize::int($data['aggregationFailures']);
        }
        if (array_key_exists('connectionResult', $data)) {
            $row['connection_result'] = Sanitize::text($data['connectionResult']);
        }
        if (array_key_exists('durationMs', $data)) {
            $row['duration_ms'] = Sanitize::int($data['durationMs']);
        }
        if (array_key_exists('rejectedCount', $data)) {
            $row['rejected_count'] = Sanitize::int($data['rejectedCount']);
        }
        if (array_key_exists('unmappedCount', $data)) {
            $row['unmapped_count'] = Sanitize::int($data['unmappedCount']);
        }
        if (array_key_exists('punchCount', $data)) {
            $row['punch_count'] = Sanitize::int($data['punchCount']);
        }
        if (array_key_exists('sourceIp', $data)) {
            $row['source_ip'] = Sanitize::text($data['sourceIp']);
        }
        if (array_key_exists('bridgeId', $data)) {
            $row['bridge_id'] = Sanitize::text($data['bridgeId']);
        }
        if (array_key_exists('idempotencyKey', $data)) {
            $row['idempotency_key'] = Sanitize::text($data['idempotencyKey']);
        }
        return $row;
    }

    /**
     * Most recent log row for a device — used by DeviceSyncService to
     * enrich the row BiometricAttendanceService::ingestBatch() already wrote
     * (via its own internal logSync()) with fields ingestBatch() itself has
     * no reason to know about (download/connection diagnostics). Reads back
     * as "whatever we just wrote", since nothing else runs between
     * ingestBatch() returning and this being called within the same
     * request.
     */
    public function findMostRecentForDevice(string $deviceId): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->table()} WHERE device_id = %s ORDER BY started_at DESC LIMIT 1",
            $deviceId
        ), ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }
}
