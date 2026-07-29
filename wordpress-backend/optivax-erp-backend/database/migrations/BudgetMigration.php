<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: budget_company, budget_departments, budget_members, budget_requests,
 * budget_returns, budget_audit. Maps to /saas/v1/budget/*.
 *
 * This is the hierarchical (company -> department -> member) budget model that
 * is actually wired to real service endpoints (see src/services/budgetService.ts).
 * The frontend also has a separate legacy flat `Budget`/`BudgetAuditLog` shape
 * with no backing service endpoint (BudgetService's getBudgets()/getAuditLogs()
 * are read-only compat shims computed from the tables below) — intentionally
 * not given its own table here.
 */
final class BudgetMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'budget_company' => "CREATE TABLE {$p}budget_company (
                id TINYINT UNSIGNED NOT NULL,
                total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                fiscal_year VARCHAR(20) NOT NULL,
                description TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                created_by_id VARCHAR(36) NOT NULL,
                created_by_name VARCHAR(191) NOT NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_departments' => "CREATE TABLE {$p}budget_departments (
                id VARCHAR(36) NOT NULL,
                department VARCHAR(120) NOT NULL,
                admin_id VARCHAR(36) NOT NULL,
                admin_name VARCHAR(191) NOT NULL,
                allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                purpose VARCHAR(255) NULL,
                effective_date DATE NULL,
                allocated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                allocated_by_id VARCHAR(36) NOT NULL,
                allocated_by_name VARCHAR(191) NOT NULL,
                PRIMARY KEY  (id),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_members' => "CREATE TABLE {$p}budget_members (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                employee_role VARCHAR(32) NOT NULL,
                department VARCHAR(120) NOT NULL,
                allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                used_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                allocated_by_id VARCHAR(36) NOT NULL,
                allocated_by_name VARCHAR(191) NOT NULL,
                allocated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_requests' => "CREATE TABLE {$p}budget_requests (
                id VARCHAR(36) NOT NULL,
                department VARCHAR(120) NOT NULL,
                admin_id VARCHAR(36) NOT NULL,
                admin_name VARCHAR(191) NOT NULL,
                admin_role VARCHAR(32) NOT NULL,
                requested_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                approved_amount DECIMAL(12,2) NULL,
                status VARCHAR(24) NOT NULL DEFAULT 'Pending',
                priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
                justification TEXT NOT NULL,
                notes TEXT NULL,
                actioned_by_id VARCHAR(36) NULL,
                actioned_by_name VARCHAR(191) NULL,
                action_notes TEXT NULL,
                submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actioned_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY department (department),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_returns' => "CREATE TABLE {$p}budget_returns (
                id VARCHAR(36) NOT NULL,
                department VARCHAR(120) NOT NULL,
                admin_id VARCHAR(36) NOT NULL,
                admin_name VARCHAR(191) NOT NULL,
                admin_role VARCHAR(32) NOT NULL,
                previous_allocated DECIMAL(12,2) NOT NULL DEFAULT 0,
                returned_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                new_allocated DECIMAL(12,2) NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                notes TEXT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_audit' => "CREATE TABLE {$p}budget_audit (
                id VARCHAR(36) NOT NULL,
                action VARCHAR(32) NOT NULL,
                previous_amount DECIMAL(12,2) NULL,
                new_amount DECIMAL(12,2) NULL,
                performed_by_id VARCHAR(36) NOT NULL,
                performed_by_name VARCHAR(191) NOT NULL,
                performed_by_role VARCHAR(32) NOT NULL,
                target_name VARCHAR(191) NULL,
                department VARCHAR(120) NULL,
                from_department VARCHAR(120) NULL,
                to_department VARCHAR(120) NULL,
                purpose VARCHAR(255) NULL,
                previous_purpose VARCHAR(255) NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
