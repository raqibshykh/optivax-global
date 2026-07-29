<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Table: department_shifts. Maps to /saas/v1/shifts/*.
 *
 * One department -> many shifts (Morning/Night/Weekend/...). `departments.default_shift_id`
 * and `users_mapping.shift_id` (see IdentityOrgMigration) both reference rows here; neither
 * table stores its own start/end time, so adding, editing, or rotating a shift never requires
 * touching department or employee rows. Registered after IdentityOrgMigration in Migrator's
 * list because `department_id` references `departments`.
 */
final class ShiftMasterMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'department_shifts' => "CREATE TABLE {$p}department_shifts (
                id VARCHAR(36) NOT NULL,
                department_id VARCHAR(36) NOT NULL,
                shift_name VARCHAR(100) NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                grace_minutes INT UNSIGNED NOT NULL DEFAULT 30,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY department_id (department_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
