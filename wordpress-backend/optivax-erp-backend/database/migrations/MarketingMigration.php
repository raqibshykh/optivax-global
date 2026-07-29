<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: marketing_campaigns, content_calendar, email_templates,
 * email_campaigns, email_automations, social_links, social_click_events,
 * social_account_metrics.
 * Maps to /saas/v1/marketing-campaigns/*, /content-calendar/*, /email/*,
 * /social-links/*, /social-analytics/*.
 *
 * `audience_tags` and `extra_json` are JSON-encoded into TEXT/LONGTEXT
 * columns (via Sanitize::json/jsonDecode) rather than a native JSON column
 * type, matching the TEXT-for-JSON convention already used elsewhere in this
 * schema (see `tags`/`assigned_production_members`/`visible_to` in
 * ClientMigration/FileMigration).
 *
 * `social_click_events.occurred_at` is the DB column backing the frontend's
 * `timestamp` field — named differently to sidestep TIMESTAMP being a SQL
 * data-type keyword; SocialTrackingRepository::toDto() maps it back to
 * `timestamp` in the wire shape.
 */
final class MarketingMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'marketing_campaigns' => "CREATE TABLE {$p}marketing_campaigns (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                platform VARCHAR(60) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Draft',
                budget DECIMAL(12,2) NOT NULL DEFAULT 0,
                spent DECIMAL(12,2) NOT NULL DEFAULT 0,
                created_by VARCHAR(36) NULL,
                linked_task_id VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'content_calendar' => "CREATE TABLE {$p}content_calendar (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                description TEXT NULL,
                platform VARCHAR(20) NOT NULL,
                content_type VARCHAR(20) NOT NULL,
                scheduled_date DATE NOT NULL,
                scheduled_time TIME NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Planned',
                production_support_required TINYINT(1) NOT NULL DEFAULT 0,
                production_requirement_type VARCHAR(40) NULL,
                production_status VARCHAR(40) NULL,
                created_by VARCHAR(36) NULL,
                created_by_name VARCHAR(191) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY scheduled_date (scheduled_date),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'email_templates' => "CREATE TABLE {$p}email_templates (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                content LONGTEXT NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'custom',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'email_campaigns' => "CREATE TABLE {$p}email_campaigns (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                template_id VARCHAR(36) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'draft',
                schedule_date DATETIME NULL,
                sent_date DATETIME NULL,
                audience_tags TEXT NULL,
                stats_sent INT UNSIGNED NOT NULL DEFAULT 0,
                stats_opened INT UNSIGNED NOT NULL DEFAULT 0,
                stats_clicked INT UNSIGNED NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY template_id (template_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'email_automations' => "CREATE TABLE {$p}email_automations (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                trigger_type VARCHAR(40) NOT NULL,
                template_id VARCHAR(36) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                delay_hours INT UNSIGNED NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY template_id (template_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'social_links' => "CREATE TABLE {$p}social_links (
                id VARCHAR(36) NOT NULL,
                platform VARCHAR(20) NOT NULL,
                label VARCHAR(191) NOT NULL,
                url TEXT NOT NULL,
                tracking_id VARCHAR(40) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY tracking_id (tracking_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'social_click_events' => "CREATE TABLE {$p}social_click_events (
                id VARCHAR(36) NOT NULL,
                link_id VARCHAR(36) NOT NULL,
                tracking_id VARCHAR(40) NOT NULL,
                platform VARCHAR(20) NOT NULL,
                occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                visitor_id VARCHAR(60) NOT NULL,
                referrer TEXT NULL,
                device VARCHAR(40) NULL,
                browser VARCHAR(60) NULL,
                source_url TEXT NULL,
                PRIMARY KEY  (id),
                KEY link_id (link_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'social_account_metrics' => "CREATE TABLE {$p}social_account_metrics (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                link_id VARCHAR(36) NOT NULL,
                metric_date DATE NOT NULL,
                impressions INT UNSIGNED NULL,
                clicks INT UNSIGNED NULL,
                extra_json LONGTEXT NULL,
                PRIMARY KEY  (id),
                KEY link_id (link_id),
                KEY metric_date (metric_date)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
