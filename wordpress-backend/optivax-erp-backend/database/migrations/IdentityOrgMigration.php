<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: users_mapping, departments, organizations, subscriptions,
 * company_settings, company_holidays.
 * Maps to /saas/v1/profiles/*, /departments/*, /organizations/*, /subscriptions/*, /company-settings.
 */
final class IdentityOrgMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'users_mapping' => "CREATE TABLE {$p}users_mapping (
                user_id BIGINT UNSIGNED NOT NULL,
                role VARCHAR(32) NOT NULL DEFAULT 'client',
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                must_change_password TINYINT(1) NOT NULL DEFAULT 0,
                token_version INT UNSIGNED NOT NULL DEFAULT 1,
                department_id VARCHAR(36) NULL,
                shift_id VARCHAR(36) NULL,
                designation VARCHAR(120) NULL,
                avatar_url TEXT NULL,
                company VARCHAR(191) NULL,
                phone VARCHAR(40) NULL,
                alt_phone VARCHAR(40) NULL,
                address VARCHAR(255) NULL,
                city VARCHAR(120) NULL,
                country VARCHAR(120) NULL,
                postal_code VARCHAR(20) NULL,
                emergency_contact_name VARCHAR(191) NULL,
                emergency_contact_number VARCHAR(40) NULL,
                gender VARCHAR(20) NULL,
                date_of_birth DATE NULL,
                timezone VARCHAR(64) NULL,
                language VARCHAR(10) NULL,
                bio TEXT NULL,
                created_by VARCHAR(36) NULL,
                notification_prefs_email TINYINT(1) NOT NULL DEFAULT 1,
                notification_prefs_payment_reminders TINYINT(1) NOT NULL DEFAULT 1,
                last_login DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (user_id),
                KEY role (role),
                KEY department_id (department_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'departments' => "CREATE TABLE {$p}departments (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                domain VARCHAR(32) NOT NULL,
                code VARCHAR(20) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                default_shift_id VARCHAR(36) NULL,
                head_user_id BIGINT UNSIGNED NULL,
                description TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY domain (domain),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'organizations' => "CREATE TABLE {$p}organizations (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                owner_id BIGINT UNSIGNED NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY owner_id (owner_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'subscriptions' => "CREATE TABLE {$p}subscriptions (
                id VARCHAR(36) NOT NULL,
                organization_id VARCHAR(36) NOT NULL,
                plan_name VARCHAR(120) NOT NULL,
                status VARCHAR(32) NOT NULL,
                billing_cycle VARCHAR(32) NOT NULL,
                current_period_end DATETIME NULL,
                PRIMARY KEY  (id),
                KEY organization_id (organization_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'company_settings' => "CREATE TABLE {$p}company_settings (
                id TINYINT UNSIGNED NOT NULL,
                name VARCHAR(191) NOT NULL DEFAULT '',
                tagline VARCHAR(255) NOT NULL DEFAULT '',
                address VARCHAR(255) NOT NULL DEFAULT '',
                city VARCHAR(120) NOT NULL DEFAULT '',
                country VARCHAR(120) NOT NULL DEFAULT '',
                phone VARCHAR(40) NOT NULL DEFAULT '',
                email VARCHAR(191) NOT NULL DEFAULT '',
                website VARCHAR(191) NOT NULL DEFAULT '',
                logo_data_url LONGTEXT NULL,
                stripe_enabled TINYINT(1) NOT NULL DEFAULT 0,
                stripe_publishable_key VARCHAR(255) NOT NULL DEFAULT '',
                stripe_secret_key VARCHAR(255) NOT NULL DEFAULT '',
                stripe_webhook_secret VARCHAR(255) NOT NULL DEFAULT '',
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'company_holidays' => "CREATE TABLE {$p}company_holidays (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                holiday_date DATE NOT NULL,
                year SMALLINT UNSIGNED NOT NULL,
                label VARCHAR(191) NOT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY holiday_date (holiday_date),
                KEY year (year)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
