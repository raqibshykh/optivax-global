<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: invoices, invoice_items, payments, commissions.
 * Maps to /saas/v1/invoices/*, /saas/v1/payments/*, /saas/v1/commissions.
 * Invoice line items are a proper child table (invoice_items), not a JSON
 * column, because InvoiceRepository assembles Invoice.items from it on read
 * and persists each item as its own row on create.
 */
final class BillingMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'invoices' => "CREATE TABLE {$p}invoices (
                id VARCHAR(36) NOT NULL,
                number VARCHAR(60) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                project_id VARCHAR(36) NULL,
                description TEXT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                amount_paid DECIMAL(12,2) NULL DEFAULT 0,
                remaining_balance DECIMAL(12,2) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                issue_date DATE NULL,
                due_date DATE NULL,
                paid_date DATE NULL,
                notes TEXT NULL,
                invoice_url TEXT NULL,
                created_by VARCHAR(36) NULL,
                updated_by VARCHAR(36) NULL,
                deleted_at DATETIME NULL,
                deleted_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY client_id (client_id),
                KEY status (status),
                KEY deleted_at (deleted_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'invoice_items' => "CREATE TABLE {$p}invoice_items (
                id VARCHAR(36) NOT NULL,
                invoice_id VARCHAR(36) NOT NULL,
                description VARCHAR(255) NULL,
                quantity INT UNSIGNED NOT NULL DEFAULT 1,
                rate DECIMAL(12,2) NOT NULL DEFAULT 0,
                total DECIMAL(12,2) NOT NULL DEFAULT 0,
                PRIMARY KEY  (id),
                KEY invoice_id (invoice_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'payments' => "CREATE TABLE {$p}payments (
                id VARCHAR(36) NOT NULL,
                invoice_id VARCHAR(36) NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                currency VARCHAR(10) NOT NULL DEFAULT 'usd',
                date DATE NULL,
                paid_at DATETIME NULL,
                paid_by_user_id VARCHAR(36) NULL,
                method VARCHAR(30) NOT NULL DEFAULT 'credit-card',
                transaction_id VARCHAR(120) NULL,
                stripe_payment_intent_id VARCHAR(191) NULL,
                stripe_charge_id VARCHAR(191) NULL,
                notes TEXT NULL,
                check_image_url TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY invoice_id (invoice_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'commissions' => "CREATE TABLE {$p}commissions (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                user_name VARCHAR(191) NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'percentage',
                value DECIMAL(12,2) NOT NULL DEFAULT 0,
                project_id VARCHAR(36) NULL,
                project_name VARCHAR(191) NULL,
                invoice_id VARCHAR(36) NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                notes TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY user_id (user_id),
                KEY invoice_id (invoice_id),
                KEY project_id (project_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
