<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: it_tickets, it_devices, it_device_logs, it_attendance_exceptions.
 * Maps to /saas/v1/it/tickets/*, /it/devices/*, /it/device-logs/*,
 * /it/attendance-exceptions/*.
 */
final class ItSupportMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'it_tickets' => "CREATE TABLE {$p}it_tickets (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                description TEXT NULL,
                category VARCHAR(20) NOT NULL DEFAULT 'other',
                priority VARCHAR(20) NOT NULL DEFAULT 'medium',
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                requested_by VARCHAR(36) NOT NULL,
                requested_by_name VARCHAR(191) NULL,
                requested_by_dept VARCHAR(60) NULL,
                assigned_to VARCHAR(36) NULL,
                assigned_to_name VARCHAR(191) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                resolved_at DATETIME NULL,
                sla_deadline DATETIME NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY status (status),
                KEY assigned_to (assigned_to)
            ) ENGINE=InnoDB {$charsetCollate};",

            'it_devices' => "CREATE TABLE {$p}it_devices (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                device_type VARCHAR(40) NOT NULL DEFAULT 'ZKTeco',
                serial_number VARCHAR(120) NULL,
                ip_address VARCHAR(60) NULL,
                port INT UNSIGNED NOT NULL DEFAULT 0,
                branch VARCHAR(120) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'offline',
                last_sync DATETIME NULL,
                sync_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
                total_users INT UNSIGNED NOT NULL DEFAULT 0,
                firmware_version VARCHAR(60) NULL,
                api_key VARCHAR(64) NULL,
                last_connection DATETIME NULL,
                last_download DATETIME NULL,
                last_successful_sync DATETIME NULL,
                last_error TEXT NULL,
                last_device_time DATETIME NULL,
                total_logs INT UNSIGNED NOT NULL DEFAULT 0,
                api_key_hash CHAR(64) NULL,
                api_key_last_four VARCHAR(8) NULL,
                api_key_rotated_at DATETIME NULL,
                api_key_expires_at DATETIME NULL,
                api_key_revoked_at DATETIME NULL,
                bridge_id VARCHAR(191) NULL,
                bridge_version VARCHAR(40) NULL,
                bridge_hostname VARCHAR(191) NULL,
                bridge_ip VARCHAR(60) NULL,
                bridge_os VARCHAR(60) NULL,
                bridge_last_seen DATETIME NULL,
                bridge_latency_ms INT UNSIGNED NULL,
                last_upload_duration_ms INT UNSIGNED NULL,
                last_upload_count INT UNSIGNED NULL,
                last_failed_upload DATETIME NULL,
                PRIMARY KEY  (id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'it_device_logs' => "CREATE TABLE {$p}it_device_logs (
                id VARCHAR(36) NOT NULL,
                device_id VARCHAR(36) NOT NULL,
                device_name VARCHAR(191) NULL,
                started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME NULL,
                result VARCHAR(20) NOT NULL DEFAULT 'success',
                records_synced INT UNSIGNED NOT NULL DEFAULT 0,
                errors TEXT NULL,
                triggered_by VARCHAR(20) NOT NULL DEFAULT 'auto',
                triggered_by_name VARCHAR(191) NULL,
                downloaded_records INT UNSIGNED NULL,
                duplicates INT UNSIGNED NULL,
                aggregation_failures INT UNSIGNED NULL,
                connection_result VARCHAR(20) NULL,
                duration_ms INT UNSIGNED NULL,
                rejected_count INT UNSIGNED NULL,
                unmapped_count INT UNSIGNED NULL,
                punch_count INT UNSIGNED NULL,
                source_ip VARCHAR(60) NULL,
                bridge_id VARCHAR(191) NULL,
                idempotency_key VARCHAR(191) NULL,
                PRIMARY KEY  (id),
                KEY device_id (device_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'it_attendance_exceptions' => "CREATE TABLE {$p}it_attendance_exceptions (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NULL,
                department VARCHAR(60) NULL,
                date DATE NOT NULL,
                exception_type VARCHAR(30) NOT NULL,
                check_in TIME NULL,
                check_out TIME NULL,
                expected_check_in TIME NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY date (date)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
