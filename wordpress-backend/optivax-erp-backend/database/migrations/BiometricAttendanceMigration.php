<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: it_biometric_punches, it_biometric_employee_map.
 * Maps to /saas/v1/it/devices/{id}/punches/*, /it/punches/*, /it/biometric-mapping/*.
 *
 * Purely additive to the existing IT Support / Attendance schema
 * (ItSupportMigration.php, HrAttendanceMigration.php) — this is the raw,
 * append-only source of truth a biometric device (or its bridge/agent) POSTs
 * into; BiometricAttendanceService aggregates it into the existing
 * `attendance_records` table without changing that table's shape at all.
 */
final class BiometricAttendanceMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'it_biometric_punches' => "CREATE TABLE {$p}it_biometric_punches (
                id VARCHAR(36) NOT NULL,
                device_id VARCHAR(36) NOT NULL,
                biometric_user_id VARCHAR(64) NOT NULL,
                mapped_user_id VARCHAR(36) NULL,
                mapped_user_name VARCHAR(191) NULL,
                punch_type VARCHAR(20) NOT NULL,
                punch_time_utc DATETIME NOT NULL,
                punch_time_raw VARCHAR(40) NOT NULL,
                attendance_date DATE NOT NULL,
                shift_date DATE NULL,
                shift_id VARCHAR(36) NULL,
                received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                source_ip VARCHAR(64) NULL,
                is_duplicate TINYINT(1) NOT NULL DEFAULT 0,
                processed_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                processed_at DATETIME NULL,
                process_error TEXT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY dedupe (device_id, biometric_user_id, punch_type, punch_time_utc),
                KEY mapped_user_date (mapped_user_id, attendance_date),
                KEY mapped_user_shift_date (mapped_user_id, shift_date),
                KEY device_id (device_id),
                KEY processed_status (processed_status)
            ) ENGINE=InnoDB {$charsetCollate};",

            // device_id defaults to '' (not NULL) meaning "applies to any
            // device" — MySQL treats multiple NULLs in a unique index as
            // distinct, which would silently defeat this uniqueness
            // guarantee for the common case of a global (any-device) mapping.
            'it_biometric_employee_map' => "CREATE TABLE {$p}it_biometric_employee_map (
                id VARCHAR(36) NOT NULL,
                device_id VARCHAR(36) NOT NULL DEFAULT '',
                biometric_user_id VARCHAR(64) NOT NULL,
                internal_user_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                UNIQUE KEY device_biometric (device_id, biometric_user_id),
                KEY internal_user_id (internal_user_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
