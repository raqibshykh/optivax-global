<?php

namespace OptivaxERP\Database;

use OptivaxERP\Database\Migrations\ForeignKeyMigration;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Runs every migration class registered in self::migrations() through dbDelta(),
 * in the listed (dependency) order, on plugin activation, and again on any
 * later code-deploy update via maybeUpgrade() (see its doc comment). dbDelta
 * is idempotent — re-running it never drops a table/column/row, only creates
 * what's missing — so both paths are safe to re-apply without losing data.
 */
final class Migrator
{
    private const OPTION_DB_VERSION = 'optivax_erp_db_version';

    public static function runOnActivation(): void
    {
        self::runDbDeltaPass();
        self::backfillDeviceApiKeyHashes();
        self::seedDefaults();
        self::seedDefaultSuperAdmin();
        self::seedCompanyHolidaysFromDefaults();
        self::seedDepartmentDefaults();
        ForeignKeyMigration::apply();
        update_option(self::OPTION_DB_VERSION, OPTIVAX_ERP_DB_VERSION);
        \OptivaxERP\Helpers\Logger::info('migrator', 'Activation migrations complete', ['db_version' => OPTIVAX_ERP_DB_VERSION]);
    }

    /**
     * Hooked on `plugins_loaded` (see optivax-erp-backend.php) so schema
     * changes shipped in a later plugin version actually reach a site that's
     * updated via a normal code deploy (git pull / zip overwrite) rather than
     * a deactivate-then-reactivate — activation hooks alone only ever fire on
     * that one explicit action, never on a plain code update. Compares the
     * stored option against the current version constant and, only on a
     * mismatch, re-runs the same idempotent dbDelta + foreign-key pass
     * `runOnActivation()` uses (skips super-admin/company-defaults reseeding
     * only for clarity of intent — those are separately idempotent no-ops
     * past first install anyway, so re-running them here is harmless but the
     * explicit skip keeps this path's purpose — schema only — obvious).
     */
    public static function maybeUpgrade(): void
    {
        $stored = get_option(self::OPTION_DB_VERSION);
        if ($stored === OPTIVAX_ERP_DB_VERSION) {
            return;
        }

        self::runDbDeltaPass();
        self::backfillDeviceApiKeyHashes();
        self::seedCompanyHolidaysFromDefaults();
        self::seedDepartmentDefaults();
        ForeignKeyMigration::apply();
        update_option(self::OPTION_DB_VERSION, OPTIVAX_ERP_DB_VERSION);
        \OptivaxERP\Helpers\Logger::info('migrator', 'Schema upgraded on code-deploy path', [
            'from' => $stored ?: '(none)',
            'to' => OPTIVAX_ERP_DB_VERSION,
        ]);
    }

    /**
     * One-time, idempotent backward-compatibility bridge for the Bridge-Ready
     * device-auth hardening (2026-07-17): DeviceApiKeyMiddleware now
     * authenticates purely off `api_key_hash`, never the legacy plaintext
     * `api_key` column. Without this, every device/Bridge configured before
     * that change would be locked out the moment this deploy lands — its row
     * has a plaintext `api_key` but no `api_key_hash` yet. For any such row,
     * hash the existing plaintext value in place (no key rotation, no
     * Bridge-side reconfiguration needed — the credential a device already
     * has keeps working). Only ever touches rows where api_key_hash is still
     * empty, so this is safe to call on every deploy, forever.
     */
    private static function backfillDeviceApiKeyHashes(): void
    {
        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'it_devices';
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table}'") !== $table) {
            return; // fresh install, dbDelta hasn't created it yet on this pass for some reason — nothing to backfill
        }

        $rows = $wpdb->get_results(
            "SELECT id, api_key FROM {$table} WHERE api_key IS NOT NULL AND api_key != '' AND (api_key_hash IS NULL OR api_key_hash = '')",
            ARRAY_A
        );
        if (empty($rows)) {
            return;
        }

        foreach ($rows as $row) {
            $plain = (string) $row['api_key'];
            $wpdb->update($table, [
                'api_key_hash' => \OptivaxERP\Helpers\DeviceKeyHasher::hash($plain),
                'api_key_last_four' => substr($plain, -4),
            ], ['id' => $row['id']]);
        }

        \OptivaxERP\Helpers\Logger::info('migrator', 'Backfilled api_key_hash for pre-existing devices', ['count' => count($rows)]);
    }

    /** dbDelta is idempotent and additive-only (creates missing tables, adds missing columns/keys — never drops data), safe to re-run on every version bump. */
    private static function runDbDeltaPass(): void
    {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        global $wpdb;
        $charsetCollate = $wpdb->get_charset_collate();

        foreach (self::migrations() as $migrationClass) {
            if (!class_exists($migrationClass)) {
                \OptivaxERP\Helpers\Logger::error('migrator', "Migration class not found: {$migrationClass}");
                continue;
            }
            foreach ($migrationClass::sql($wpdb, $charsetCollate) as $tableName => $sql) {
                dbDelta($sql);
            }
        }
    }

    /**
     * Explicit, auditable load order — tables with foreign keys are listed after
     * the tables they reference.
     */
    private static function migrations(): array
    {
        return [
            \OptivaxERP\Database\Migrations\IdentityOrgMigration::class,
            \OptivaxERP\Database\Migrations\ShiftMasterMigration::class,
            \OptivaxERP\Database\Migrations\AuthMigration::class,
            \OptivaxERP\Database\Migrations\ClientMigration::class,
            \OptivaxERP\Database\Migrations\ProjectTaskMigration::class,
            \OptivaxERP\Database\Migrations\FileMigration::class,
            \OptivaxERP\Database\Migrations\HrAttendanceMigration::class,
            \OptivaxERP\Database\Migrations\PayrollMigration::class,
            \OptivaxERP\Database\Migrations\BudgetMigration::class,
            \OptivaxERP\Database\Migrations\BillingMigration::class,
            \OptivaxERP\Database\Migrations\SalesMigration::class,
            \OptivaxERP\Database\Migrations\MarketingMigration::class,
            \OptivaxERP\Database\Migrations\ItSupportMigration::class,
            \OptivaxERP\Database\Migrations\BiometricAttendanceMigration::class,
            \OptivaxERP\Database\Migrations\DeviceBridgeMigration::class,
            \OptivaxERP\Database\Migrations\AttendanceImportMigration::class,
            \OptivaxERP\Database\Migrations\CrossCuttingMigration::class,
            \OptivaxERP\Database\Migrations\ActivityMigration::class,
        ];
    }

    /** Company defaults, holiday calendars, settings — everything besides JWT/SMTP should "just work" per item 9. */
    private static function seedDefaults(): void
    {
        global $wpdb;
        $settingsTable = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'company_settings';
        $existing = $wpdb->get_var("SELECT COUNT(*) FROM {$settingsTable}");
        if ((int) $existing === 0) {
            $wpdb->insert($settingsTable, [
                'id' => 1,
                'name' => 'Optivax Global',
                'tagline' => '',
                'address' => '',
                'city' => 'Karachi',
                'country' => 'Pakistan',
                'phone' => '',
                'email' => 'info@optivaxglobal.com',
                'website' => 'www.optivaxglobal.com',
                'logo_data_url' => '',
            ]);
        }
    }

    /**
     * Seeds exactly one ERP super_admin account on first activation:
     * globaloptivax / globaloptivax@gmail.com / password (forced to change
     * on first login via must_change_password). Idempotent — a second
     * activation short-circuits as soon as any super_admin mapping row
     * exists. If a WP user with this username/email already exists (a
     * partial prior run, or one created manually ahead of time) but has no
     * super_admin mapping yet, that account is reused/upserted rather than
     * erroring or creating a duplicate WordPress user.
     */
    private static function seedDefaultSuperAdmin(): void
    {
        global $wpdb;
        $mappingTable = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping';

        $hasSuperAdmin = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$mappingTable} WHERE role = %s",
            'super_admin'
        ));
        if ($hasSuperAdmin > 0) {
            return;
        }

        $username = 'globaloptivax';
        $email = 'globaloptivax@gmail.com';
        $existingUserId = email_exists($email) ?: (username_exists($username) ?: null);

        if ($existingUserId) {
            $userId = (int) $existingUserId;
            $hasMapping = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$mappingTable} WHERE user_id = %d",
                $userId
            ));
            $fields = ['role' => 'super_admin', 'status' => 'active', 'must_change_password' => 1];
            if ($hasMapping > 0) {
                $wpdb->update($mappingTable, $fields, ['user_id' => $userId]);
            } else {
                $wpdb->insert($mappingTable, $fields + ['user_id' => $userId, 'created_at' => current_time('mysql', true)]);
            }
            \OptivaxERP\Helpers\SecurityAuditLog::record(
                'default_super_admin_bootstrap',
                null,
                'super_admin',
                $userId,
                'success',
                null,
                null,
                ['reused_existing_wp_user' => true]
            );
            return;
        }

        $userId = wp_insert_user([
            'user_login' => $username,
            'user_email' => $email,
            'user_pass' => 'password',
            'display_name' => 'Global Optivax',
            'nickname' => 'Global Optivax',
        ]);

        if (is_wp_error($userId)) {
            \OptivaxERP\Helpers\Logger::error('migrator', 'Failed to seed default super admin: ' . $userId->get_error_message());
            \OptivaxERP\Helpers\SecurityAuditLog::record(
                'default_super_admin_bootstrap',
                null,
                'super_admin',
                null,
                'failure',
                null,
                null,
                ['error' => $userId->get_error_message()]
            );
            return;
        }

        $wpdb->insert($mappingTable, [
            'user_id' => $userId,
            'role' => 'super_admin',
            'status' => 'active',
            'must_change_password' => 1,
            'created_at' => current_time('mysql', true),
        ]);
        \OptivaxERP\Helpers\SecurityAuditLog::record(
            'default_super_admin_bootstrap',
            null,
            'super_admin',
            $userId,
            'success',
            null,
            null,
            ['reused_existing_wp_user' => false]
        );
    }

    /**
     * `company_holidays` existed since IdentityOrgMigration but nothing ever wrote to it — the
     * frontend's COMPANY_HOLIDAYS_2026/_2025 hardcoded arrays were the only holiday source in
     * practice (see calculations.ts). Seeds those exact dates so the DB becomes the live source
     * without losing any date previously relied on. Idempotent: skipped entirely once any row
     * exists, and per-date INSERT IGNORE (UNIQUE KEY holiday_date) even within that window.
     */
    private static function seedCompanyHolidaysFromDefaults(): void
    {
        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'company_holidays';
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table}'") !== $table) {
            return;
        }
        if ((int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}") > 0) {
            return;
        }

        $defaults = [
            '2025-01-01' => "New Year's Day", '2025-01-26' => 'Republic Day', '2025-03-14' => 'Holi',
            '2025-04-14' => 'Ambedkar Jayanti', '2025-05-01' => 'Labour Day', '2025-08-15' => 'Independence Day',
            '2025-10-02' => 'Gandhi Jayanti', '2025-10-20' => 'Diwali', '2025-12-25' => 'Christmas',
            '2026-01-01' => "New Year's Day", '2026-01-26' => 'Republic Day', '2026-03-25' => 'Holi',
            '2026-04-14' => 'Ambedkar Jayanti', '2026-05-01' => 'Labour Day', '2026-08-15' => 'Independence Day',
            '2026-10-02' => 'Gandhi Jayanti', '2026-11-14' => 'Diwali', '2026-12-25' => 'Christmas',
        ];
        foreach ($defaults as $date => $label) {
            $wpdb->query($wpdb->prepare(
                "INSERT IGNORE INTO {$table} (holiday_date, year, label) VALUES (%s, %d, %s)",
                $date,
                (int) substr($date, 0, 4),
                $label
            ));
        }
        \OptivaxERP\Helpers\Logger::info('migrator', 'Seeded company_holidays from prior hardcoded defaults', ['count' => count($defaults)]);
    }

    /**
     * Auto-provisions the Department Master from what the RBAC role system has always
     * implicitly assumed (roles like production_admin/sales_member each imply exactly one
     * department domain — see DepartmentMapper), and gives the 5 departments named in the
     * night-shift spec their shift row. Purely additive/idempotent: only inserts a department
     * for a domain that doesn't already have one, only backfills users_mapping.department_id
     * for a user whose value is empty or a legacy pre-Department-Master slug (never overwrites
     * an already-real department_id), and only creates a shift for a department that doesn't
     * already have a default_shift_id. No existing department, employee, or shift is altered.
     */
    private static function seedDepartmentDefaults(): void
    {
        global $wpdb;
        $prefix = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;
        $deptTable = $prefix . 'departments';
        $shiftTable = $prefix . 'department_shifts';
        $usersTable = $prefix . 'users_mapping';
        if ($wpdb->get_var("SHOW TABLES LIKE '{$deptTable}'") !== $deptTable) {
            return;
        }

        // [name, RBAC domain, night-shift start/end or null for "leave on the global day-shift default"]
        $canonical = [
            ['Sales', 'sales', '21:00:00', '05:00:00'],
            ['Production', 'production', '22:00:00', '06:00:00'],
            ['Marketing', 'marketing', '22:00:00', '06:00:00'],
            ['HR', 'hr', '19:00:00', '01:00:00'],
            ['Management', 'system', '22:00:00', '06:00:00'],
            ['IT Support', 'it_support', null, null],
        ];

        // role -> RBAC domain, mirroring DepartmentMapper::ROLE_TO_DEPT_SLUG's domain (the
        // slug minus its "dept-" prefix) — used only to backfill legacy department_id values.
        $roleDomain = [
            'sales_admin' => 'sales', 'sales_member' => 'sales',
            'production_admin' => 'production', 'production_member' => 'production',
            'marketing_admin' => 'marketing', 'marketing_member' => 'marketing',
            'hr_admin' => 'hr', 'hr_member' => 'hr',
            'it_admin' => 'it_support', 'it_member' => 'it_support',
        ];

        foreach ($canonical as [$name, $domain, $start, $end]) {
            $deptId = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM {$deptTable} WHERE domain = %s LIMIT 1",
                $domain
            ));

            if (!$deptId) {
                $deptId = \OptivaxERP\Helpers\Uuid::v4();
                $wpdb->insert($deptTable, [
                    'id' => $deptId,
                    'name' => $name,
                    'domain' => $domain,
                    'status' => 'active',
                    'created_at' => current_time('mysql', true),
                ]);
            }

            if ($start !== null && $end !== null) {
                $hasDefaultShift = (bool) $wpdb->get_var($wpdb->prepare(
                    "SELECT default_shift_id FROM {$deptTable} WHERE id = %s",
                    $deptId
                ));
                if (!$hasDefaultShift) {
                    $shiftId = \OptivaxERP\Helpers\Uuid::v4();
                    $wpdb->insert($shiftTable, [
                        'id' => $shiftId,
                        'department_id' => $deptId,
                        'shift_name' => 'Night',
                        'start_time' => $start,
                        'end_time' => $end,
                        'grace_minutes' => 30,
                        'status' => 'active',
                        'created_at' => current_time('mysql', true),
                    ]);
                    $wpdb->update($deptTable, ['default_shift_id' => $shiftId], ['id' => $deptId]);
                }
            }

            // Backfill: any user whose role belongs to this domain but has no real department
            // row yet (empty department_id, or a legacy "dept-sales"-style slug from before the
            // Department Master existed) gets pointed at this real row.
            $rolesForDomain = array_keys(array_filter($roleDomain, static fn ($d) => $d === $domain));
            if (!empty($rolesForDomain)) {
                $placeholders = implode(', ', array_fill(0, count($rolesForDomain), '%s'));
                $wpdb->query($wpdb->prepare(
                    "UPDATE {$usersTable} SET department_id = %s
                     WHERE role IN ({$placeholders})
                       AND (department_id IS NULL OR department_id = '' OR department_id NOT IN (SELECT id FROM {$deptTable}))",
                    array_merge([$deptId], $rolesForDomain)
                ));
            }
        }

        // "management", "super_admin", and "client" are deliberately absent from $roleDomain
        // above — none has an RBAC domain of its own (see DepartmentMapper::domainForRole()'s
        // doc comment), so all three were silently excluded from every iteration of the
        // domain-keyed backfill loop above. That was the actual root cause of "<role> users
        // never get linked to a department" (first found for management, same gap for
        // super_admin/client): every other role's backfill ran once per domain; these roles'
        // never ran at all. Fixed via the same name-based resolution
        // DepartmentAutoAssignService uses at write time (create/update), applied here for any
        // user row that predates this fix — idempotent and safe to re-run on every version
        // bump, same as the loop above. Mirrors DepartmentMapper::ROLE_TO_DEPARTMENT_NAME.
        foreach (['management', 'super_admin', 'client'] as $namedRole) {
            $deptId = \OptivaxERP\Services\DepartmentAutoAssignService::resolveOrCreateDepartmentId($namedRole);
            if ($deptId) {
                $fixedCount = $wpdb->query($wpdb->prepare(
                    "UPDATE {$usersTable} SET department_id = %s
                     WHERE role = %s
                       AND (department_id IS NULL OR department_id = '' OR department_id NOT IN (SELECT id FROM {$deptTable}))",
                    $deptId,
                    $namedRole
                ));
                \OptivaxERP\Helpers\Logger::info('migrator', "Backfilled department_id for {$namedRole}-role users", [
                    'departmentId' => $deptId,
                    'usersFixed' => $fixedCount,
                ]);
            } else {
                \OptivaxERP\Helpers\Logger::error('migrator', "Could not resolve or create the department for {$namedRole} during backfill — {$namedRole}-role users remain unassigned", []);
            }
        }
    }
}
