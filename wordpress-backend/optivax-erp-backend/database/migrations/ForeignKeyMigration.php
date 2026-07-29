<?php

namespace OptivaxERP\Database\Migrations;

use OptivaxERP\Helpers\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Adds real InnoDB foreign-key constraints for the schema's genuine
 * parent-child ownership relationships. Kept entirely separate from the
 * per-module CREATE TABLE migrations and from dbDelta() on purpose: dbDelta
 * does not reliably parse/diff FOREIGN KEY clauses inside a CREATE TABLE
 * statement (a well-documented WordPress core limitation), so constraints
 * are applied here via plain ALTER TABLE, run once after the dbDelta pass
 * (see Migrator::runOnActivation()/maybeUpgrade()).
 *
 * Deliberately NOT covered: audit/history/log tables (client_ownership_history,
 * audit_logs, security_audit_logs, budget_audit, advance_salary_audit,
 * attendance_audit) — these are meant to outlive their subject even if the
 * subject is later deleted, so they're intentionally left unconstrained.
 * Also not covered: anything referencing wp_users directly (refresh_tokens,
 * users_mapping) — that table is core WordPress's, not this plugin's, and
 * user deletion goes through wp_delete_user()'s own cleanup path.
 *
 * Every constraint is applied defensively: if a table already has orphaned
 * rows (a value with no matching parent — possible on a live site with older
 * data), adding the constraint fails at the database level and this class
 * logs it and moves on rather than deleting/modifying rows to force it
 * through. Re-run (e.g. after the site owner cleans up the orphaned rows and
 * bumps the plugin) to pick up anything that was skipped.
 */
final class ForeignKeyMigration
{
    /**
     * Each entry: [table, column, constraint name, referenced table, referenced column, ON DELETE action].
     */
    private static function foreignKeys(): array
    {
        return [
            ['invoice_items', 'invoice_id', 'fk_invoice_items_invoice', 'invoices', 'id', 'CASCADE'],
            ['payments', 'invoice_id', 'fk_payments_invoice', 'invoices', 'id', 'CASCADE'],
            ['client_ownership', 'client_id', 'fk_client_ownership_client', 'clients', 'id', 'CASCADE'],
            ['production_assignments', 'client_id', 'fk_production_assignments_client', 'clients', 'id', 'CASCADE'],
            ['tasks', 'project_id', 'fk_tasks_project', 'projects', 'id', 'SET NULL'],
            ['it_device_logs', 'device_id', 'fk_it_device_logs_device', 'it_devices', 'id', 'CASCADE'],
            ['social_click_events', 'link_id', 'fk_social_click_events_link', 'social_links', 'id', 'CASCADE'],
            ['social_account_metrics', 'link_id', 'fk_social_account_metrics_link', 'social_links', 'id', 'CASCADE'],
            ['conversation_messages', 'conversation_id', 'fk_conversation_messages_conversation', 'conversations', 'id', 'CASCADE'],
            ['activity_breaks', 'session_id', 'fk_activity_breaks_session', 'activity_sessions', 'id', 'CASCADE'],
        ];
    }

    public static function apply(): void
    {
        global $wpdb;
        $prefix = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        foreach (self::foreignKeys() as [$table, $column, $constraintName, $refTable, $refColumn, $onDelete]) {
            $fullTable = $prefix . $table;
            $fullRefTable = $prefix . $refTable;

            if (!self::tablesExist($fullTable, $fullRefTable)) {
                continue; // A referenced/child table not existing yet (partial install) — next pass will catch it.
            }

            if (self::constraintExists($fullTable, $constraintName)) {
                continue; // Already applied — idempotent.
            }

            $sql = "ALTER TABLE {$fullTable} ADD CONSTRAINT {$constraintName} "
                . "FOREIGN KEY ({$column}) REFERENCES {$fullRefTable} ({$refColumn}) ON DELETE {$onDelete}";

            $wpdb->suppress_errors(true);
            $wpdb->query($sql);
            $wpdb->suppress_errors(false);

            if (!empty($wpdb->last_error)) {
                // Most common cause: existing orphaned rows (a value in
                // $column with no matching parent row) — never resolved by
                // deleting/modifying data here. Logged so an admin can find
                // and clean up the offending rows, then let the next version
                // bump re-attempt this constraint.
                Logger::warning('migrator', "Skipped foreign key {$constraintName} — likely orphaned data", [
                    'table' => $fullTable,
                    'column' => $column,
                    'error' => $wpdb->last_error,
                ]);
            }
        }
    }

    private static function tablesExist(string ...$tables): bool
    {
        global $wpdb;
        foreach ($tables as $table) {
            $found = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
            if (!$found) {
                return false;
            }
        }
        return true;
    }

    private static function constraintExists(string $table, string $constraintName): bool
    {
        global $wpdb;
        $count = $wpdb->get_var($wpdb->prepare(
            'SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = %s AND TABLE_NAME = %s AND CONSTRAINT_NAME = %s',
            DB_NAME,
            $table,
            $constraintName
        ));
        return (int) $count > 0;
    }
}
