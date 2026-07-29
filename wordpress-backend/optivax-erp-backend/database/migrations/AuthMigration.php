<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: refresh_tokens, security_audit_logs.
 * Access tokens are stateless JWTs (not stored). Password reset reuses
 * WordPress-native user_activation_key via get_password_reset_key()/
 * check_password_reset_key() — no custom table needed.
 * security_audit_logs is a dedicated, super-admin-only trail for
 * authentication/user-management events — deliberately separate from the
 * general-purpose `audit_logs` table (CrossCuttingMigration), which is
 * readable by several roles via the 'reports' RBAC domain. There is no
 * REST route to write to security_audit_logs; only helpers/SecurityAuditLog.php
 * inserts into it, directly from PHP.
 */
final class AuthMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'refresh_tokens' => "CREATE TABLE {$p}refresh_tokens (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT UNSIGNED NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                revoked_at DATETIME NULL,
                remember_me TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                UNIQUE KEY token_hash (token_hash),
                KEY user_id (user_id),
                KEY expires_at (expires_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'security_audit_logs' => "CREATE TABLE {$p}security_audit_logs (
                id VARCHAR(36) NOT NULL,
                action VARCHAR(60) NOT NULL,
                actor_user_id BIGINT UNSIGNED NULL,
                actor_role VARCHAR(32) NULL,
                target_user_id BIGINT UNSIGNED NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'success',
                old_value LONGTEXT NULL,
                new_value LONGTEXT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(255) NULL,
                metadata LONGTEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY actor_user_id (actor_user_id),
                KEY target_user_id (target_user_id),
                KEY action (action),
                KEY created_at (created_at)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
