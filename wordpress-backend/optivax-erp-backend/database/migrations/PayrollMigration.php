<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: salary_slips, advance_salary_requests, advance_salary_audit.
 * Maps to /saas/v1/payroll/*.
 */
final class PayrollMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'salary_slips' => "CREATE TABLE {$p}salary_slips (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                employee_email VARCHAR(191) NOT NULL,
                department VARCHAR(120) NOT NULL,
                designation VARCHAR(120) NOT NULL,
                salary_month VARCHAR(7) NOT NULL,
                basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
                allowances LONGTEXT NULL,
                bonuses LONGTEXT NULL,
                deductions LONGTEXT NULL,
                advance_salary_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
                unpaid_leave_days INT NULL,
                unpaid_leave_deduction DECIMAL(12,2) NULL,
                half_day_deduction DECIMAL(12,2) NULL,
                late_penalty_count INT NULL,
                late_penalty_days INT NULL,
                late_penalty_deduction DECIMAL(12,2) NULL,
                gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
                total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
                net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
                generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                generated_by_id VARCHAR(36) NOT NULL,
                generated_by_name VARCHAR(191) NOT NULL,
                generated_by_role VARCHAR(32) NOT NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY salary_month (salary_month)
            ) ENGINE=InnoDB {$charsetCollate};",

            'advance_salary_requests' => "CREATE TABLE {$p}advance_salary_requests (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                employee_role VARCHAR(32) NOT NULL,
                department VARCHAR(120) NOT NULL,
                requested_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                request_date DATE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                approved_by_id VARCHAR(36) NULL,
                approved_by_name VARCHAR(191) NULL,
                approved_at DATETIME NULL,
                rejection_reason TEXT NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'advance_salary_audit' => "CREATE TABLE {$p}advance_salary_audit (
                id VARCHAR(36) NOT NULL,
                action VARCHAR(32) NOT NULL,
                request_id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                employee_role VARCHAR(32) NOT NULL,
                department VARCHAR(120) NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                performed_by_id VARCHAR(36) NOT NULL,
                performed_by_name VARCHAR(191) NOT NULL,
                performed_by_role VARCHAR(32) NOT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY request_id (request_id),
                KEY employee_id (employee_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
