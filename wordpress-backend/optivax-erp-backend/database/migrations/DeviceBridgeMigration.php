<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Table: it_device_import_requests — request-level idempotency cache for
 * POST /it/devices/{deviceId}/punches/import. A Local Bridge Application may
 * retry an upload after a network timeout without knowing whether the ERP
 * actually received/processed it; a caller that sends the same
 * `Idempotency-Key` header for the same device gets back the exact original
 * response instead of the batch being reprocessed. Distinct from — and in
 * addition to — the punch-level `dedupe` UNIQUE KEY on it_biometric_punches
 * (BiometricAttendanceMigration), which protects individual punches even
 * when no idempotency key is sent at all.
 */
final class DeviceBridgeMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'it_device_import_requests' => "CREATE TABLE {$p}it_device_import_requests (
                id VARCHAR(36) NOT NULL,
                device_id VARCHAR(36) NOT NULL,
                idempotency_key VARCHAR(191) NOT NULL,
                status_code SMALLINT UNSIGNED NOT NULL DEFAULT 201,
                response_json LONGTEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                UNIQUE KEY device_idempotency (device_id, idempotency_key),
                KEY created_at (created_at)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
