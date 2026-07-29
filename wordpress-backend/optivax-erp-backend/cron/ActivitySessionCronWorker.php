<?php

namespace OptivaxERP\Cron;

use OptivaxERP\Helpers\Logger;
use OptivaxERP\Repositories\ActivityRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WP-Cron job, hourly (mirrors EmailQueueWorker/AutomationCronWorker/
 * BiometricAttendanceCronWorker's exact registerSchedule()/clearSchedule()/
 * run() pattern): force-closes any ERP login session still open 8 hours
 * after login, flagging it auto_logout=1. This is the fixed-cap reading of
 * "if active session reaches 8 hours, automatically logout" — it fires
 * regardless of activity, not an idle timeout (last_activity is a display/
 * IT-visibility field only, not part of this decision).
 */
final class ActivitySessionCronWorker
{
    private const HOOK = 'optivax_erp_activity_session_tick';
    private const MAX_SESSION_HOURS = 8;

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
        try {
            $closed = (new ActivityRepository())->closeStaleOpenSessions(self::MAX_SESSION_HOURS);
            if ($closed > 0) {
                Logger::info('activity-session', "Auto-closed {$closed} session(s) past the " . self::MAX_SESSION_HOURS . '-hour cap', ['count' => $closed]);
            }
        } catch (\Throwable $e) {
            Logger::error('activity-session', 'Auto-logout sweep failed: ' . $e->getMessage());
        }
    }
}
