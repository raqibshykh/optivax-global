<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: leads, sales_campaigns, sales_targets, sales_tasks,
 * sales_widget_leads, sales_widget_deals, sales_widget_commissions.
 * Maps to /saas/v1/leads/*, /saas/v1/sales/campaigns/*, /saas/v1/sales/targets/*,
 * /saas/v1/sales/tasks/*, /saas/v1/sales-widget/*.
 *
 * `leads` (the full CRM Lead entity) and `sales_widget_leads` (the SalesPanel
 * "at a glance" widget) are deliberately separate tables — the frontend keeps
 * two independent data sets under similar names, confirmed intentional
 * duplication rather than a join/view candidate. Same story for
 * `sales_tasks` here vs. the generic `tasks` table owned by another module:
 * same shape, different domain, not to be merged.
 */
final class SalesMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'leads' => "CREATE TABLE {$p}leads (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                email VARCHAR(191) NOT NULL,
                phone VARCHAR(40) NULL,
                company VARCHAR(191) NULL,
                source VARCHAR(60) NULL,
                status VARCHAR(32) NULL,
                estimated_value DECIMAL(12,2) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_campaigns' => "CREATE TABLE {$p}sales_campaigns (
                id VARCHAR(36) NOT NULL,
                campaign_name VARCHAR(191) NOT NULL,
                total_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
                budget_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                assigned_members TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'planned',
                notes TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(64) NOT NULL,
                PRIMARY KEY  (id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_targets' => "CREATE TABLE {$p}sales_targets (
                id VARCHAR(36) NOT NULL,
                member_id VARCHAR(64) NOT NULL,
                member_name VARCHAR(191) NOT NULL,
                monthly_target DECIMAL(12,2) NOT NULL DEFAULT 0,
                quarterly_target DECIMAL(12,2) NOT NULL DEFAULT 0,
                annual_target DECIMAL(12,2) NOT NULL DEFAULT 0,
                achieved_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                period VARCHAR(32) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY member_id (member_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_tasks' => "CREATE TABLE {$p}sales_tasks (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                description TEXT NULL,
                assigned_to VARCHAR(64) NOT NULL,
                assigned_name VARCHAR(191) NOT NULL,
                priority VARCHAR(20) NOT NULL,
                due_date DATE NOT NULL,
                status VARCHAR(20) NOT NULL,
                estimated_value DECIMAL(12,2) NOT NULL DEFAULT 0,
                notes TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(64) NOT NULL,
                PRIMARY KEY  (id),
                KEY assigned_to (assigned_to)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_widget_leads' => "CREATE TABLE {$p}sales_widget_leads (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                email VARCHAR(191) NOT NULL,
                company VARCHAR(191) NULL,
                status VARCHAR(20) NOT NULL,
                estimated_value DECIMAL(12,2) NOT NULL DEFAULT 0,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_widget_deals' => "CREATE TABLE {$p}sales_widget_deals (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                client VARCHAR(191) NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                stage VARCHAR(20) NOT NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_widget_commissions' => "CREATE TABLE {$p}sales_widget_commissions (
                id VARCHAR(36) NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                deal_id VARCHAR(36) NULL,
                status VARCHAR(20) NOT NULL,
                date DATE NOT NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
