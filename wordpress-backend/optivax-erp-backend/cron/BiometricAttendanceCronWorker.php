<?php

namespace OptivaxERP\Cron;

use OptivaxERP\Helpers\Logger;
use OptivaxERP\Services\BiometricAttendanceService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WP-Cron job, hourly (mirrors EmailQueueWorker/AutomationCronWorker's exact
 * registerSchedule()/clearSchedule()/run() pattern): retries any biometric
 * punch that's still 'pending'/'failed' (a device's ingest call may have
 * partially failed, or a punch arrived unmapped and got mapped later) and
 * sweeps for missing-punch/no-record exceptions once a day is "closed."
 * This is also what makes "Sync Now" meaningful even between device pushes
 * — nothing here pulls from hardware, it only reprocesses what's already
 * been received.
 */
final class BiometricAttendanceCronWorker
{
    private const HOOK = 'optivax_erp_biometric_attendance_tick';

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
        $service = new BiometricAttendanceService();

        try {
            $service->reprocessAllPending();
        } catch (\Throwable $e) {
            Logger::error('biometric-attendance', 'Cron reprocess pass failed: ' . $e->getMessage());
        }

        try {
            $service->sweepMissingAndNoRecordExceptions();
        } catch (\Throwable $e) {
            Logger::error('biometric-attendance', 'Cron exception sweep failed: ' . $e->getMessage());
        }
    }
}
