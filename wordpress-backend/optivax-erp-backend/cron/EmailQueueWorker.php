<?php

namespace OptivaxERP\Cron;

use OptivaxERP\Helpers\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/** WP-Cron job: drains email_queue, retrying failures with exponential backoff up to max_attempts. */
final class EmailQueueWorker
{
    private const HOOK = 'optivax_erp_email_queue_tick';
    private const BATCH_SIZE = 20;

    public static function registerSchedule(): void
    {
        if (!wp_next_scheduled(self::HOOK)) {
            wp_schedule_event(time(), 'every_minute', self::HOOK);
        }
        add_filter('cron_schedules', [self::class, 'addSchedule']);
    }

    public static function clearSchedule(): void
    {
        wp_clear_scheduled_hook(self::HOOK);
    }

    public static function addSchedule(array $schedules): array
    {
        $schedules['every_minute'] = [
            'interval' => 60,
            'display' => __('Every Minute (OptiVax ERP mail queue)', 'optivax-erp-backend'),
        ];
        return $schedules;
    }

    public static function run(): void
    {
        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'email_queue';
        $now = current_time('mysql', true);

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} WHERE status = %s AND next_attempt_at <= %s ORDER BY id ASC LIMIT %d",
            'pending',
            $now,
            self::BATCH_SIZE
        ));

        foreach ($rows as $row) {
            $sent = wp_mail($row->to_email, $row->subject, $row->body_html, ['Content-Type: text/html; charset=UTF-8']);
            $attempts = (int) $row->attempts + 1;

            if ($sent) {
                $wpdb->update($table, [
                    'status' => 'sent',
                    'attempts' => $attempts,
                    'sent_at' => current_time('mysql', true),
                ], ['id' => $row->id]);
                continue;
            }

            $failed = $attempts >= (int) $row->max_attempts;
            $backoffMinutes = min(60, (int) pow(2, $attempts));
            $wpdb->update($table, [
                'status' => $failed ? 'failed' : 'pending',
                'attempts' => $attempts,
                'last_error' => 'wp_mail() returned false',
                'next_attempt_at' => gmdate('Y-m-d H:i:s', time() + $backoffMinutes * 60),
            ], ['id' => $row->id]);

            Logger::warning('mail-queue', "Delivery attempt {$attempts} failed", ['to' => $row->to_email, 'failed_permanently' => $failed]);
        }
    }
}
