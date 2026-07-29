<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: notifications, audit_logs, conversations, conversation_messages,
 * calendar_events, automation_workflows, email_queue, plugin_settings.
 * Maps to /saas/v1/notifications/*, /saas/v1/audit-logs/*, /saas/v1/conversations/*,
 * /saas/v1/calendar-events/*, /saas/v1/automation/*, plus the internal
 * mail queue (mail/MailService.php, cron/EmailQueueWorker.php) and a
 * forward-compatible settings key-value store.
 *
 * Column names/types on `notifications` and `email_queue` are load-bearing:
 * NotificationService and MailService/EmailQueueWorker read/write these
 * exact columns directly via $wpdb, with no repository layer in between.
 */
final class CrossCuttingMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            // Exact shape required by notifications/NotificationService.php.
            'notifications' => "CREATE TABLE {$p}notifications (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(64) NOT NULL,
                type VARCHAR(32) NOT NULL,
                module VARCHAR(32) NULL,
                title VARCHAR(191) NOT NULL,
                message TEXT NOT NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                action_url TEXT NULL,
                action_label VARCHAR(191) NULL,
                PRIMARY KEY  (id),
                KEY user_id (user_id),
                KEY user_id_created_at (user_id, created_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'audit_logs' => "CREATE TABLE {$p}audit_logs (
                id VARCHAR(36) NOT NULL,
                action VARCHAR(60) NOT NULL,
                entity_type VARCHAR(60) NOT NULL,
                entity_id VARCHAR(36) NOT NULL,
                entity_name VARCHAR(191) NOT NULL,
                performed_by VARCHAR(64) NOT NULL,
                performed_by_name VARCHAR(191) NOT NULL,
                performed_by_role VARCHAR(32) NOT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                description TEXT NOT NULL,
                department VARCHAR(60) NULL,
                old_value LONGTEXT NULL,
                new_value LONGTEXT NULL,
                PRIMARY KEY  (id),
                KEY entity_type (entity_type),
                KEY performed_by (performed_by),
                KEY timestamp (timestamp),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",

            // Header row per Conversation (domain/conversations/visibility.ts);
            // messages live in conversation_messages below.
            'conversations' => "CREATE TABLE {$p}conversations (
                id VARCHAR(36) NOT NULL,
                subject VARCHAR(191) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                client_name VARCHAR(191) NOT NULL,
                client_email VARCHAR(191) NULL,
                assigned_dept VARCHAR(32) NOT NULL,
                assigned_user_id VARCHAR(64) NULL,
                assigned_user_name VARCHAR(191) NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'open',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME NULL,
                unread_by_client INT UNSIGNED NOT NULL DEFAULT 0,
                unread_by_team INT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY  (id),
                KEY client_id (client_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            // Exact shape required by ConvMessage (domain/conversations/visibility.ts).
            // read_by stores the ConvMessage.readBy string[] as JSON.
            'conversation_messages' => "CREATE TABLE {$p}conversation_messages (
                id VARCHAR(36) NOT NULL,
                conversation_id VARCHAR(36) NOT NULL,
                sender_id VARCHAR(64) NOT NULL,
                sender_name VARCHAR(191) NOT NULL,
                sender_role VARCHAR(32) NULL,
                body TEXT NOT NULL,
                sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                read_by TEXT NULL,
                PRIMARY KEY  (id),
                KEY conversation_id (conversation_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            // `start`/`end` are backtick-quoted: END is a reserved MySQL
            // keyword, and START is used in START TRANSACTION — quoting
            // both avoids a DDL syntax error even though only `end` strictly
            // requires it. Matches CalendarEvent's start/end field names
            // exactly (src/types/index.ts) rather than renaming to
            // start_at/end_at.
            'calendar_events' => "CREATE TABLE {$p}calendar_events (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                `start` DATETIME NOT NULL,
                `end` DATETIME NOT NULL,
                description TEXT NULL,
                all_day TINYINT(1) NULL DEFAULT 0,
                type VARCHAR(32) NOT NULL DEFAULT 'other',
                color VARCHAR(20) NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'automation_workflows' => "CREATE TABLE {$p}automation_workflows (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                trigger_event VARCHAR(120) NOT NULL,
                enabled TINYINT(1) NOT NULL DEFAULT 1,
                callback_class VARCHAR(191) NOT NULL,
                config LONGTEXT NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            // Exact shape required by mail/MailService.php::queue() and
            // cron/EmailQueueWorker.php.
            'email_queue' => "CREATE TABLE {$p}email_queue (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                to_email VARCHAR(191) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                body_html LONGTEXT NOT NULL,
                attempts INT UNSIGNED NOT NULL DEFAULT 0,
                max_attempts INT UNSIGNED NOT NULL DEFAULT 5,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                next_attempt_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                sent_at DATETIME NULL,
                last_error TEXT NULL,
                PRIMARY KEY  (id),
                KEY status_next_attempt (status, next_attempt_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            // Forward-compatible key-value store. Not currently read by any
            // Phase 2A code — JWT (helpers/Jwt.php) and SMTP (mail/MailService.php)
            // settings actually live in wp_options via get_option/update_option.
            'plugin_settings' => "CREATE TABLE {$p}plugin_settings (
                setting_key VARCHAR(191) NOT NULL,
                setting_value LONGTEXT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (setting_key)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
