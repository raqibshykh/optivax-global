<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: clients, client_ownership, client_ownership_history.
 * Maps to /saas/v1/clients/*, /saas/v1/client-ownership/*.
 * `client_ownership` holds only the *current* owner per client (one row per
 * client_id, upserted by ClientOwnershipRepository::assign/remove);
 * `client_ownership_history` is the append-only audit trail behind it.
 */
final class ClientMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'clients' => "CREATE TABLE {$p}clients (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                email VARCHAR(191) NOT NULL,
                phone VARCHAR(40) NULL,
                company VARCHAR(191) NULL,
                address VARCHAR(255) NULL,
                city VARCHAR(120) NULL,
                country VARCHAR(120) NULL,
                website VARCHAR(191) NULL,
                company_logo TEXT NULL,
                bio TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                join_date DATE NULL,
                avatar TEXT NULL,
                total_projects INT UNSIGNED NOT NULL DEFAULT 0,
                total_billed DECIMAL(12,2) NOT NULL DEFAULT 0,
                last_payment_date DATE NULL,
                tags TEXT NULL,
                contact_name VARCHAR(191) NULL,
                company_name VARCHAR(191) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(36) NULL,
                created_by_name VARCHAR(191) NULL,
                updated_by VARCHAR(36) NULL,
                deleted_at DATETIME NULL,
                deleted_by VARCHAR(36) NULL,
                assigned_production_members TEXT NULL,
                PRIMARY KEY  (id),
                KEY email (email),
                KEY status (status),
                KEY deleted_at (deleted_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'client_ownership' => "CREATE TABLE {$p}client_ownership (
                id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                client_name VARCHAR(191) NOT NULL,
                owner_id VARCHAR(36) NOT NULL,
                owner_name VARCHAR(191) NOT NULL,
                owner_email VARCHAR(191) NULL,
                assigned_by_id VARCHAR(36) NULL,
                assigned_by_name VARCHAR(191) NULL,
                assigned_by_role VARCHAR(32) NULL,
                assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY client_id (client_id),
                KEY owner_id (owner_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'client_ownership_history' => "CREATE TABLE {$p}client_ownership_history (
                id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                client_name VARCHAR(191) NOT NULL,
                action VARCHAR(20) NOT NULL,
                previous_owner_id VARCHAR(36) NULL,
                previous_owner_name VARCHAR(191) NULL,
                new_owner_id VARCHAR(36) NULL,
                new_owner_name VARCHAR(191) NULL,
                assigned_by_id VARCHAR(36) NULL,
                assigned_by_name VARCHAR(191) NULL,
                assigned_by_role VARCHAR(32) NULL,
                assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY client_id (client_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
