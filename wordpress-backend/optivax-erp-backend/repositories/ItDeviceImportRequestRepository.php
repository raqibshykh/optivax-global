<?php

namespace OptivaxERP\Repositories;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs the `Idempotency-Key` replay cache for
 * POST /it/devices/{deviceId}/punches/import — see DeviceBridgeMigration's
 * doc comment. Bespoke (not AbstractRepository-based, same as
 * AttendanceRepository): no CRUD/DTO frontend contract, just a
 * find-or-store cache keyed by (device_id, idempotency_key).
 */
final class ItDeviceImportRequestRepository
{
    /** How long a cached response stays eligible for replay before it's swept — long enough to cover any realistic Bridge retry/backoff window. */
    private const RETENTION_DAYS = 14;

    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'it_device_import_requests';
    }

    /** @return array{statusCode:int, response:array}|null the cached result of a prior identical (deviceId, idempotencyKey) request, or null if this is a first-time key. */
    public function find(string $deviceId, string $idempotencyKey): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT status_code, response_json FROM {$this->table()} WHERE device_id = %s AND idempotency_key = %s",
            $deviceId,
            $idempotencyKey
        ), ARRAY_A);
        if (!$row) {
            return null;
        }
        $decoded = json_decode((string) $row['response_json'], true);
        return [
            'statusCode' => (int) $row['status_code'],
            'response' => is_array($decoded) ? $decoded : [],
        ];
    }

    /**
     * Best-effort store — a failure here (e.g. a genuine race losing the
     * UNIQUE KEY) must never fail the request whose result it's caching, so
     * errors are swallowed exactly like Logger does.
     */
    public function store(string $deviceId, string $idempotencyKey, int $statusCode, array $response): void
    {
        global $wpdb;
        try {
            $wpdb->insert($this->table(), [
                'id' => \OptivaxERP\Helpers\Uuid::v4(),
                'device_id' => $deviceId,
                'idempotency_key' => $idempotencyKey,
                'status_code' => $statusCode,
                'response_json' => wp_json_encode($response),
                'created_at' => current_time('mysql', true),
            ]);
        } catch (\Throwable $e) {
            \OptivaxERP\Helpers\Logger::error('device-sync-http', 'Failed to store idempotency cache row: ' . $e->getMessage());
        }

        // ~2% of writes also sweep expired rows — cheap, indexed DELETE,
        // avoids needing a dedicated cron just for this cache's housekeeping.
        if (random_int(1, 100) <= 2) {
            $this->sweepExpired();
        }
    }

    /** Sweeps rows older than RETENTION_DAYS — called opportunistically (~2% of writes) from store(). */
    public function sweepExpired(): void
    {
        global $wpdb;
        $cutoff = gmdate('Y-m-d H:i:s', time() - self::RETENTION_DAYS * DAY_IN_SECONDS);
        $wpdb->query($wpdb->prepare("DELETE FROM {$this->table()} WHERE created_at < %s", $cutoff));
    }
}
