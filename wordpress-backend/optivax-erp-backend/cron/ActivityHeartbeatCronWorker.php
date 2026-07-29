<?php

namespace OptivaxERP\Cron;

use OptivaxERP\Helpers\Logger;
use OptivaxERP\Repositories\ActivityRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WP-Cron job, every minute (reuses EmailQueueWorker's 'every_minute' custom
 * schedule — registering the same schedule key twice via cron_schedules is
 * harmless): flags any open session whose last_heartbeat has gone stale for
 * MAX_STALE_MINUTES as is_online=0. This is a live-presence indicator only —
 * distinct from ActivitySessionCronWorker's 8-hour hard cap — it never sets
 * logout_time/session_status and never touches attendance.
 */
final class ActivityHeartbeatCronWorker
{
    private const HOOK = 'optivax_erp_activity_heartbeat_tick';
    private const MAX_STALE_MINUTES = 2;

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
        try {
            $flagged = (new ActivityRepository())->markStaleHeartbeatsOffline(self::MAX_STALE_MINUTES);
            if ($flagged > 0) {
                Logger::info('activity-session', "Flagged {$flagged} session(s) offline after " . self::MAX_STALE_MINUTES . ' minute(s) without a heartbeat', ['count' => $flagged]);
            }
        } catch (\Throwable $e) {
            Logger::error('activity-session', 'Heartbeat-loss sweep failed: ' . $e->getMessage());
        }
    }
}
