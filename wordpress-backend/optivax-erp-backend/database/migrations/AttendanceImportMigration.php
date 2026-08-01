<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: attendance_biometric_mapping, attendance_imports, attendance_import_rows.
 * Maps to /saas/v1/attendance/import/*, /attendance/mapping/*.
 *
 * Purely additive — a separate, HR-facing file-import pipeline alongside the
 * existing IT Support / device-push biometric pipeline
 * (BiometricAttendanceMigration.php's it_biometric_punches/
 * it_biometric_employee_map). That pipeline is per-device and real-time;
 * this one is a manual spreadsheet upload with its own one-employee-to-one-
 * biometric-id mapping. Both funnel into the same, unchanged
 * `attendance_records` table (HrAttendanceMigration.php) via
 * AttendanceRepository — no shared code with the device pipeline, by design,
 * so this feature can't regress it.
 */
final class AttendanceImportMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            // One employee <-> one biometric id, enforced by two UNIQUE keys
            // (not the device-scoped, many-mapping model
            // it_biometric_employee_map uses) — this feature's mapping is
            // intentionally simpler/global, per its own spec.
            'attendance_biometric_mapping' => "CREATE TABLE {$p}attendance_biometric_mapping (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                biometric_user_id VARCHAR(64) NOT NULL,
                device_name VARCHAR(191) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                UNIQUE KEY employee_unique (employee_id),
                UNIQUE KEY biometric_unique (biometric_user_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'attendance_imports' => "CREATE TABLE {$p}attendance_imports (
                id VARCHAR(36) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                total_records INT UNSIGNED NOT NULL DEFAULT 0,
                imported_records INT UNSIGNED NOT NULL DEFAULT 0,
                duplicate_records INT UNSIGNED NOT NULL DEFAULT 0,
                failed_records INT UNSIGNED NOT NULL DEFAULT 0,
                error_summary TEXT NULL,
                uploaded_by VARCHAR(36) NOT NULL,
                uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY uploaded_by (uploaded_by),
                KEY uploaded_at (uploaded_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            // record_hash is the sha256(biometric_id|date time|status) dedup
            // key, unique across the WHOLE table (not per-import) so a row
            // re-uploaded in a later file is still caught. Nullable because a
            // structurally invalid row (bad date, missing biometric id) never
            // reaches hashing — MySQL allows multiple NULLs in a UNIQUE
            // index, so failed rows never block each other or real hashes.
            'attendance_import_rows' => "CREATE TABLE {$p}attendance_import_rows (
                id VARCHAR(36) NOT NULL,
                import_id VARCHAR(36) NOT NULL,
                'row_number' INT UNSIGNED NOT NULL,
                biometric_user_id VARCHAR(64) NULL,
                employee_id VARCHAR(36) NULL,
                record_date DATE NULL,
                record_time VARCHAR(20) NULL,
                punch_type VARCHAR(20) NULL,
                raw_status VARCHAR(50) NULL,
                record_hash CHAR(64) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                error_message VARCHAR(255) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                UNIQUE KEY record_hash (record_hash),
                KEY import_id (import_id),
                KEY employee_date (employee_id, record_date)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
