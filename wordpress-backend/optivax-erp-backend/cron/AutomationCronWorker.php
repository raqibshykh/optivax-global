<?php

namespace OptivaxERP\Cron;

use OptivaxERP\Helpers\AutomationEngine;
use OptivaxERP\Helpers\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WP-Cron job for trigger events that are a state *transition over time*
 * rather than a direct API action — 'invoice_overdue' has no single call
 * site to hook into (an invoice becomes overdue by the clock passing
 * `due_date`, not by any request), so it needs a periodic sweep. Runs hourly
 * (invoice due-dates are day-granularity; per-minute would be wasted work).
 */
final class AutomationCronWorker
{
    private const HOOK = 'optivax_erp_automation_tick';

    public static function registerSchedule(): void
    {
        if (!wp_next_scheduled(self::HOOK)) {
            wp_schedule_event(time(), 'hourly', self::HOOK);
        }
    }

    public static function clearSchedule(): void
    {
        wp_clear_scheduled_hook(self::HOOK);
    }

    public static function run(): void
    {
        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'invoices';
        $today = current_time('Y-m-d', true);

        // Only rows transitioning *into* overdue this run get the event —
        // once flipped to 'overdue' they no longer match this WHERE clause,
        // so a workflow fires once per invoice, not once per hour forever.
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT id, client_id, number, due_date, amount FROM {$table}
             WHERE status IN ('pending', 'partially_paid')
               AND due_date IS NOT NULL AND due_date < %s
               AND deleted_at IS NULL",
            $today
        ), ARRAY_A) ?: [];

        foreach ($rows as $row) {
            $wpdb->update($table, ['status' => 'overdue'], ['id' => $row['id']]);

            AutomationEngine::fire('invoice_overdue', [
                'invoiceId' => $row['id'],
                'clientId' => $row['client_id'],
                'invoiceNumber' => $row['number'],
                'dueDate' => $row['due_date'],
                'amount' => $row['amount'],
            ]);
        }

        if (!empty($rows)) {
            Logger::info('automation', 'Marked ' . count($rows) . ' invoice(s) overdue', ['count' => count($rows)]);
        }
    }
}
