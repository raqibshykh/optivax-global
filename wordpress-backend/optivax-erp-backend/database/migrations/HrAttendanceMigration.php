<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: employees, employee_extra, attendance_records, attendance_audit,
 * leave_requests_hr, leave_requests_employee.
 * Maps to /saas/v1/hr/*, /attendance/*, /leave-requests/*.
 *
 * activity_sessions/activity_breaks (login/break tracking) live in
 * ActivityMigration.php instead — see that file's doc comment and the note
 * at the bottom of this file's sql() for why an earlier duplicate definition
 * here was removed rather than fixed in place.
 */
final class HrAttendanceMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'employees' => "CREATE TABLE {$p}employees (
                id VARCHAR(36) NOT NULL,
                user_id BIGINT UNSIGNED NULL,
                name VARCHAR(191) NOT NULL,
                email VARCHAR(191) NOT NULL,
                phone VARCHAR(40) NULL,
                role VARCHAR(32) NOT NULL,
                department_id VARCHAR(36) NULL,
                position VARCHAR(120) NOT NULL,
                salary DECIMAL(12,2) NULL,
                work_mode VARCHAR(20) NOT NULL DEFAULT 'onsite',
                join_date DATE NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                avatar TEXT NULL,
                PRIMARY KEY  (id),
                KEY user_id (user_id),
                KEY department_id (department_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'employee_extra' => "CREATE TABLE {$p}employee_extra (
                user_id VARCHAR(36) NOT NULL,
                leaves_taken INT NOT NULL DEFAULT 0,
                salary DECIMAL(12,2) NULL,
                extra_deduction DECIMAL(12,2) NULL,
                salary_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
                work_mode VARCHAR(20) NOT NULL DEFAULT 'Onsite',
                PRIMARY KEY  (user_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'attendance_records' => "CREATE TABLE {$p}attendance_records (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                user_name VARCHAR(191) NOT NULL,
                user_role VARCHAR(32) NOT NULL,
                date DATE NOT NULL,
                check_in VARCHAR(10) NULL,
                check_out VARCHAR(10) NULL,
                status VARCHAR(20) NOT NULL,
                notes TEXT NULL,
                shift_id VARCHAR(36) NULL,
                worked_minutes INT UNSIGNED NULL,
                break_minutes INT UNSIGNED NULL,
                overtime_minutes INT UNSIGNED NULL,
                punch_count INT UNSIGNED NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY user_date (user_id, date),
                KEY date (date),
                KEY shift_id (shift_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'attendance_audit' => "CREATE TABLE {$p}attendance_audit (
                id VARCHAR(36) NOT NULL,
                edited_at DATETIME NOT NULL,
                edited_by VARCHAR(191) NOT NULL,
                edited_by_role VARCHAR(32) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                attendance_date DATE NOT NULL,
                previous_status VARCHAR(20) NOT NULL,
                new_status VARCHAR(20) NOT NULL,
                previous_check_in VARCHAR(10) NULL,
                previous_check_out VARCHAR(10) NULL,
                new_check_in VARCHAR(10) NULL,
                new_check_out VARCHAR(10) NULL,
                reason TEXT NOT NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'leave_requests_hr' => "CREATE TABLE {$p}leave_requests_hr (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                user_name VARCHAR(191) NOT NULL,
                user_role VARCHAR(32) NOT NULL,
                department_id VARCHAR(36) NULL,
                type VARCHAR(20) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                days INT NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reviewed_by VARCHAR(191) NULL,
                review_note TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY user_id (user_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'leave_requests_employee' => "CREATE TABLE {$p}leave_requests_employee (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                role VARCHAR(32) NOT NULL,
                department VARCHAR(120) NOT NULL,
                type VARCHAR(20) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                days INT NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Pending',
                submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            // `activity_sessions`/`break_records` do NOT belong here — this
            // migration used to also define them "for schema completeness,"
            // but ActivityMigration.php (loaded later, see Migrator::migrations())
            // defines the actual `activity_sessions`/`activity_breaks` tables
            // ActivityRepository really reads/writes, including a UNIQUE KEY
            // this file's old definition lacked. Having both meant two
            // "source of truth" CREATE TABLE statements for one table.
            // Removed rather than fixed-in-place because dbDelta only ever
            // adds columns, never drops them — a site that already ran the
            // old version of this file keeps the extra `session_minutes`/
            // `total_break_minutes`/`active_minutes` columns and the
            // `break_records` table itself as harmless unused leftovers
            // (verified nothing reads them: `grep -r "break_records"` outside
            // this comment returns nothing) rather than this migration ever
            // issuing a destructive DROP.
        ];
    }
}
