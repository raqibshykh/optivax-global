<?php

namespace OptivaxERP\Cron;

use OptivaxERP\Helpers\Logger;
use OptivaxERP\Services\DeviceSyncService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * @deprecated Bridge-Ready architecture: this tick is a no-op on the default
 * deployment. It calls DeviceSyncService::syncAllDue(), which itself returns
 * immediately unless "Allow direct LAN device sync (legacy)" has been
 * explicitly enabled in Settings → OptiVax ERP — see that class's doc
 * comment. Left registered (rather than removed) so an opt-in LAN
 * deployment doesn't need any code change, only a settings toggle, to make
 * this tick do real work again.
 *
 * WP-Cron job (mirrors EmailQueueWorker/BiometricAttendanceCronWorker's
 * registerSchedule()/clearSchedule()/run() pattern): every 5 minutes,
 * actually dials every reachable ZKTeco device over TCP and pulls its
 * attendance log via DeviceSyncService — this is the piece that replaces
 * the legacy desktop "Attendance Management" software's job. Distinct from
 * BiometricAttendanceCronWorker (hourly), which only reprocesses punches
 * already sitting in the database and never touches hardware.
 *
 * 5 minutes is a cadence choice, not a protocol requirement — TCP is used
 * directly (no HTTP polling layer), this interval is simply how often the
 * server dials out. Lower it (via a shorter custom schedule below) if
 * near-real-time matters more than the extra connection overhead on the
 * device side; raise it if a device's syncFrequency is already every-hour
 * or coarser and there is no need to check more often than that (isDue()
 * in DeviceSyncService already skips a device early if its own configured
 * frequency hasn't elapsed, regardless of how often this tick fires).
 */
final class DeviceSyncCron
{
    private const HOOK = 'optivax_erp_device_sync_tick';
    private const SCHEDULE_KEY = 'optivax_five_minutes';

    public static function registerSchedule(): void
    {
        add_filter('cron_schedules', [self::class, 'addSchedule']);
        if (!wp_next_scheduled(self::HOOK)) {
            wp_schedule_event(time(), self::SCHEDULE_KEY, self::HOOK);
        }
    }

    public static function clearSchedule(): void
    {
        wp_clear_scheduled_hook(self::HOOK);
    }

    public static function addSchedule(array $schedules): array
    {
        $schedules[self::SCHEDULE_KEY] = [
            'interval' => 300,
            'display' => __('Every 5 Minutes (OptiVax ERP biometric device TCP sync)', 'optivax-erp-backend'),
        ];
        return $schedules;
    }

    public static function run(): void
    {
        try {
            $summary = (new DeviceSyncService())->syncAllDue();
            if ($summary['devicesSynced'] > 0 || $summary['devicesFailed'] > 0) {
                Logger::info('device-sync', 'Cron TCP sync pass complete', $summary);
            }
        } catch (\Throwable $e) {
            Logger::error('device-sync', 'Cron TCP sync pass failed: ' . $e->getMessage());
        }
    }
}
