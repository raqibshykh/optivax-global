<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: activity_sessions, activity_breaks.
 * Backs /saas/v1/activity/* (src/context/ActivityContext.tsx, AuthContext.tsx's
 * login/logout calls) — login/logout session tracking plus break start/end,
 * with the server as sole authority on break-balance/warning rules per
 * src/types/activity.ts's doc comments. This module did not exist anywhere in
 * the plugin prior to this migration (confirmed: no Activity* files anywhere)
 * — genuinely new, not an audit of pre-existing scaffolding like every other
 * Phase 2B domain.
 */
final class ActivityMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'activity_sessions' => "CREATE TABLE {$p}activity_sessions (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                user_name VARCHAR(191) NOT NULL,
                user_role VARCHAR(32) NOT NULL,
                department_id VARCHAR(36) NULL,
                date DATE NOT NULL,
                login_time DATETIME NOT NULL,
                logout_time DATETIME NULL,
                warning_count INT UNSIGNED NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(255) NULL,
                last_heartbeat DATETIME NULL,
                auto_logout TINYINT(1) NOT NULL DEFAULT 0,
                session_status VARCHAR(20) NOT NULL DEFAULT 'active',
                login_source VARCHAR(20) NOT NULL DEFAULT 'web',
                is_online TINYINT(1) NOT NULL DEFAULT 1,
                timeout_acknowledged TINYINT(1) NOT NULL DEFAULT 0,
                PRIMARY KEY  (id),
                UNIQUE KEY user_date (user_id, date),
                KEY date (date)
            ) ENGINE=InnoDB {$charsetCollate};",

            'activity_breaks' => "CREATE TABLE {$p}activity_breaks (
                id VARCHAR(36) NOT NULL,
                session_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                type VARCHAR(20) NOT NULL,
                label VARCHAR(60) NOT NULL,
                category VARCHAR(20) NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME NULL,
                allowed_minutes INT UNSIGNED NOT NULL,
                actual_minutes INT UNSIGNED NULL,
                exceeded_minutes INT UNSIGNED NULL,
                status VARCHAR(20) NULL,
                PRIMARY KEY  (id),
                KEY session_id (session_id),
                KEY user_id (user_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
