<?php

namespace OptivaxERP\Services;

use OptivaxERP\Connectors\ZKTeco\AttendanceDownloader;
use OptivaxERP\Connectors\ZKTeco\AttendanceParser;
use OptivaxERP\Connectors\ZKTeco\ZKTecoConnector;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Repositories\ItBiometricPunchRepository;
use OptivaxERP\Repositories\ItDeviceLogRepository;
use OptivaxERP\Repositories\ItDeviceRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * @deprecated Bridge-Ready architecture (see BiometricAttendanceController's
 * doc comment): this ERP is designed to run on shared hosting (e.g.
 * Hostinger) that CANNOT open a TCP socket to a device sitting on an office
 * LAN. This class is the one place in the plugin that still does that —
 * it is disabled by default (see isLanSyncEnabled()/assertLanSyncEnabled()
 * below) and every public entry point throws a clear \RuntimeException
 * instead of attempting a connection unless an operator has explicitly
 * opted in via the "Allow direct LAN device sync (legacy)" checkbox in
 * Settings → OptiVax ERP — appropriate ONLY for a deployment where the ERP
 * server itself genuinely sits inside the same network as the device (a
 * self-hosted/on-premise install, not this app's normal cloud deployment).
 * The supported, production path for getting punches into the ERP is now
 * POST /it/devices/{deviceId}/punches/import, pushed by a Local Bridge
 * Application running inside the office LAN — see
 * BiometricAttendanceService::ingestBatch(). Kept (not deleted) purely for
 * that opt-in LAN scenario; do not build new functionality on top of this
 * class.
 *
 * Orchestrates one real TCP sync run against a physical ZKTeco device:
 * Connect -> Download Logs -> Parse Logs -> BiometricAttendanceService::
 * ingestBatch() -> Aggregation -> Update Device Logs -> Disconnect. This is
 * the class that replaces the legacy bundled "Attendance Management"
 * software's role — same connect-over-TCP-and-pull-logs approach, just
 * running on the ERP's own server instead of a desktop PC. Every method a
 * caller (BiometricAttendanceController, DeviceSyncCron) invokes here talks
 * to a real socket and a real device; nothing in this class fabricates a
 * status, a count, or a timing figure.
 *
 * OPERATIONAL PREREQUISITE — read before wiring this into anything: the ERP
 * is hosted online and the device lives on the office LAN. A TCP socket
 * from the public internet to a private LAN address only works if there's
 * an actual network path between them (the office router port-forwards
 * 4370 to the device, or the ERP host and the office are joined by a VPN/
 * site-to-site tunnel). No code in this class (or anywhere in this plugin)
 * can create that path — it can only use it once it exists. If the device
 * is unreachable, every method below fails with a clear, specific
 * \RuntimeException (see ZKTecoConnector::connect()) rather than silently
 * doing nothing.
 *
 * DELTA IMPORT: the classic ZKTeco standalone protocol (CMD_ATTLOG_RRQ) has
 * no server-side "give me only logs since timestamp X" parameter — every
 * pull downloads the device's whole current log buffer over TCP. What this
 * class controls is which of those downloaded records actually get handed
 * to ingestBatch(): filterNewPunches() drops anything at/before the
 * device's it_devices.last_successful_sync high-water mark (minus a small
 * safety margin), so a routine cron tick only pushes genuinely new punches
 * into the pipeline instead of re-submitting the device's entire history
 * every 5 minutes. ingestBatch()'s own dedup (exact-resubmission UNIQUE
 * KEY, near-duplicate window) is what makes over-inclusion at that margin
 * completely safe — "never duplicate punches" falls out of reusing that
 * existing guarantee rather than needing new dedup logic here.
 */
final class DeviceSyncService
{
    private const LAN_SYNC_OPTION = 'optivax_erp_enable_lan_device_sync';

    /** True only when an operator has explicitly opted into legacy direct-TCP device sync (see SettingsPage). Defaults to disabled — the correct default for this app's normal shared-hosting deployment. */
    public static function isLanSyncEnabled(): bool
    {
        return Sanitize::bool(get_option(self::LAN_SYNC_OPTION, '0'));
    }

    /** @throws \RuntimeException if direct LAN device sync is disabled (the default). */
    private function assertLanSyncEnabled(): void
    {
        if (!self::isLanSyncEnabled()) {
            throw new \RuntimeException(
                'Direct TCP device sync is disabled on this deployment. This ERP no longer connects to biometric devices directly — that fails by design on hosts (e.g. Hostinger) that cannot reach an office LAN. Punches must be pushed by a Local Bridge Application via POST /it/devices/{deviceId}/punches/import instead. If this ERP genuinely runs inside the same network as the device, enable "Allow direct LAN device sync (legacy)" in Settings → OptiVax ERP.'
            );
        }
    }

    /** How long a device's configured `syncFrequency` allows between runs, before syncAllDue() considers it overdue. */
    private const SYNC_FREQUENCY_MINUTES = [
        'every-hour' => 60,
        'every-6h' => 360,
        'every-12h' => 720,
        'daily' => 1440,
    ];

    private const MAX_ATTEMPTS = 3;
    /** Seconds to wait before attempt N+1, indexed by attempt number (0-based) that just failed. */
    private const RETRY_BACKOFF_SECONDS = [5, 15, 30];

    /** A device clock more than this many minutes off site time gets a logged warning — punches from it will be off by exactly that drift until corrected. */
    private const CLOCK_DRIFT_WARNING_MINUTES = 5;

    /** Widens the delta-import cutoff behind last_successful_sync so a punch that landed on the device mid-sync is never excluded — safe because ingestBatch()'s dedup makes re-including a few already-processed punches free. */
    private const DELTA_SAFETY_MARGIN_MINUTES = 10;

    private ItDeviceRepository $devices;
    private ItDeviceLogRepository $deviceLogs;
    private ItBiometricPunchRepository $punches;
    private BiometricAttendanceService $attendance;

    public function __construct()
    {
        $this->devices = new ItDeviceRepository();
        $this->deviceLogs = new ItDeviceLogRepository();
        $this->punches = new ItBiometricPunchRepository();
        $this->attendance = new BiometricAttendanceService();
    }

    /**
     * Manual "sync this device right now" entry point — connects live over
     * TCP regardless of the device's configured sync frequency.
     * @return array{deviceId:string, accepted:int, duplicates:int, rejected:int, unmapped:int, aggregated:int, aggregationFailures:int, errors:string[], rawRecordsDownloaded:int, newRecordsConsidered:int, durationMs:int}
     * @throws \InvalidArgumentException unknown device id.
     * @throws \RuntimeException every connection attempt was exhausted (see MAX_ATTEMPTS) — message is the last underlying error.
     */
    public function syncDevice(string $deviceId): array
    {
        $this->assertLanSyncEnabled();
        $device = $this->devices->find($deviceId);
        if (!$device) {
            throw new \InvalidArgumentException("Unknown device id: {$deviceId}");
        }
        return $this->syncWithRetries($device);
    }

    /**
     * Cron entry point (DeviceSyncCron) — syncs every ZKTeco device with an
     * IP configured whose own syncFrequency says it's overdue (this is what
     * makes the sync interval "configurable": per-device, via the existing
     * Devices.tsx Sync Frequency field/isDue() below — the cron tick itself
     * just needs to run at least as often as the shortest configured
     * frequency). One device's failure never stops the others.
     * @return array{devicesChecked:int, devicesSynced:int, devicesSkipped:int, devicesFailed:int, results: array<string, array>}
     */
    public function syncAllDue(): array
    {
        $summary = ['devicesChecked' => 0, 'devicesSynced' => 0, 'devicesSkipped' => 0, 'devicesFailed' => 0, 'results' => []];
        if (!self::isLanSyncEnabled()) {
            // Disabled by default — see class doc comment. Silent, cheap
            // early return (not an error/log line) so the 5-minute cron tick
            // that calls this doesn't spam the log forever on a normal
            // shared-hosting deployment where this is simply not applicable.
            return $summary;
        }

        $devices = $this->devices->list(['device_type' => 'ZKTeco']);

        foreach ($devices as $device) {
            $summary['devicesChecked']++;

            if (empty($device['ipAddress'])) {
                $summary['devicesSkipped']++;
                continue;
            }
            if (!$this->isDue($device)) {
                $summary['devicesSkipped']++;
                continue;
            }

            try {
                $summary['results'][$device['id']] = $this->syncWithRetries($device);
                $summary['devicesSynced']++;
            } catch (\Throwable $e) {
                $summary['devicesFailed']++;
                Logger::error('device-sync', "Scheduled TCP sync failed for device {$device['id']} ({$device['name']}): " . $e->getMessage());
            }
        }

        return $summary;
    }

    /**
     * A real, live TCP probe — connects, reads device info/firmware/clock/
     * enrolled-user count, disconnects. Distinct from syncDevice(): this
     * never touches attendance data, it only answers "can we actually reach
     * and talk to this device right now, and what does it report about
     * itself". Refreshes the device's own diagnostic columns
     * (lastConnection/lastDeviceTime/firmwareVersion/totalUsers/status) on
     * success so Devices.tsx's cards reflect device-verified truth rather
     * than admin-typed guesses. Never throws for a connectivity failure —
     * that's a normal, expected outcome of a connection test, returned as
     * `reachable: false` with the underlying error message, not an
     * application error.
     * @return array{reachable:bool, deviceName?:string, firmwareVersion?:string, serialNumber?:string, deviceTime?:string, siteTime?:string, enrolledUsers?:int, responseTimeMs:int, error?:string}
     * @throws \InvalidArgumentException unknown device id.
     * @throws \RuntimeException device has no IP address configured (a setup error, not a connectivity outcome).
     */
    public function testConnection(string $deviceId): array
    {
        $this->assertLanSyncEnabled();
        $device = $this->devices->find($deviceId);
        if (!$device) {
            throw new \InvalidArgumentException("Unknown device id: {$deviceId}");
        }
        if (empty($device['ipAddress'])) {
            throw new \RuntimeException("Device {$deviceId} has no IP address configured.");
        }

        $start = microtime(true);
        $connector = new ZKTecoConnector($device['ipAddress'], (int) ($device['port'] ?: 4370));

        try {
            $connector->connect();
            $info = $connector->getDeviceInfo();
            $deviceTime = $connector->getDeviceTime();
            $enrolledUsers = count($connector->getUsers());
        } catch (\Throwable $e) {
            $connector->disconnect();
            $responseTimeMs = (int) round((microtime(true) - $start) * 1000);
            $this->devices->update($deviceId, ['lastError' => $e->getMessage(), 'status' => 'error']);
            Logger::warning('device-sync', "Test connection failed for device {$deviceId} ({$device['name']}): " . $e->getMessage());
            return ['reachable' => false, 'error' => $e->getMessage(), 'responseTimeMs' => $responseTimeMs];
        }
        $connector->disconnect();
        $responseTimeMs = (int) round((microtime(true) - $start) * 1000);

        $this->devices->update($deviceId, [
            'lastConnection' => current_time('mysql', true),
            'lastError' => null,
            'lastDeviceTime' => $deviceTime->format('Y-m-d H:i:s'),
            'firmwareVersion' => $info['firmwareVersion'] ?: $device['firmwareVersion'],
            'totalUsers' => $enrolledUsers,
            'status' => 'online',
        ]);

        Logger::info('device-sync', "Test connection succeeded for device {$deviceId} ({$device['name']})", ['responseTimeMs' => $responseTimeMs, 'enrolledUsers' => $enrolledUsers]);

        return [
            'reachable' => true,
            'deviceName' => $info['deviceName'] ?: $device['name'],
            'firmwareVersion' => $info['firmwareVersion'],
            'serialNumber' => $info['serialNumber'],
            'deviceTime' => $deviceTime->format('Y-m-d H:i:s'),
            'siteTime' => (new \DateTimeImmutable('now', wp_timezone()))->format('Y-m-d H:i:s'),
            'enrolledUsers' => $enrolledUsers,
            'responseTimeMs' => $responseTimeMs,
        ];
    }

    private function isDue(array $device): bool
    {
        if (empty($device['lastSync'])) {
            return true;
        }
        $lastSyncTimestamp = strtotime($device['lastSync'] . ' UTC');
        if ($lastSyncTimestamp === false) {
            return true;
        }
        $minutes = self::SYNC_FREQUENCY_MINUTES[$device['syncFrequency']] ?? 60;
        return (time() - $lastSyncTimestamp) >= ($minutes * 60);
    }

    /** @throws \RuntimeException once every retry attempt has failed — carries the last attempt's error message. */
    private function syncWithRetries(array $device): array
    {
        $overallStart = microtime(true);
        $lastError = null;

        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            try {
                return $this->attemptSync($device);
            } catch (\Throwable $e) {
                $lastError = $e;
                Logger::warning('device-sync', "Sync attempt {$attempt}/" . self::MAX_ATTEMPTS . " failed for device {$device['id']} ({$device['name']}): " . $e->getMessage());
                if ($attempt < self::MAX_ATTEMPTS) {
                    sleep(self::RETRY_BACKOFF_SECONDS[$attempt - 1] ?? 30);
                }
            }
        }

        $durationMs = (int) round((microtime(true) - $overallStart) * 1000);
        $this->recordUnreachableSync($device['id'], $device['name'] ?? null, $lastError?->getMessage() ?? 'Unknown error', $durationMs);
        throw $lastError ?? new \RuntimeException("Sync failed for device {$device['id']} for an unknown reason.");
    }

    /**
     * One full, non-retried attempt: connect, drift-check, download, parse,
     * filter-to-new, ingest, enrich the sync-log row, disconnect. Always
     * disconnects (finally) even on failure, so a partial attempt never
     * leaves the device holding an orphaned session slot. ingestBatch()
     * itself writes the initial it_device_logs entry and updates the
     * device's lastSync/status on success — that row is then enriched
     * in-place with the download/duplicate/connection/timing detail
     * ingestBatch() has no reason to know about (see
     * ItDeviceLogRepository::findMostRecentForDevice()'s doc comment).
     */
    private function attemptSync(array $device): array
    {
        $deviceId = $device['id'];
        $ip = $device['ipAddress'];
        $port = (int) ($device['port'] ?: 4370);

        if (empty($ip)) {
            throw new \RuntimeException("Device {$deviceId} has no IP address configured.");
        }

        $syncStartedAt = current_time('mysql', true);
        $startedAtMicrotime = microtime(true);

        $connector = new ZKTecoConnector($ip, $port);
        $connector->connect();

        try {
            $this->devices->update($deviceId, ['lastConnection' => current_time('mysql', true), 'lastError' => null]);

            $deviceTime = $this->checkClockDrift($connector, $deviceId);

            $downloadResult = (new AttendanceDownloader())->download($connector);
            $this->devices->update($deviceId, ['lastDownload' => current_time('mysql', true)]);

            $allPunches = AttendanceParser::parse($downloadResult['records']);
            $newPunches = $this->filterNewPunches($allPunches, $device['lastSuccessfulSync'] ?? null);

            // ingestBatch() is called even with zero new punches — a
            // successful connect-and-find-nothing-new is still a real,
            // loggable sync (records_synced=0), same as the device having
            // nothing queued for the physical push endpoint.
            $ingestSummary = $this->attendance->ingestBatch($deviceId, $newPunches, $ip);

            $durationMs = (int) round((microtime(true) - $startedAtMicrotime) * 1000);
            $fullySuccessful = $ingestSummary['aggregationFailures'] === 0;

            $this->enrichLatestLogRow($deviceId, [
                'downloadedRecords' => $downloadResult['count'],
                'duplicates' => $ingestSummary['duplicates'],
                'aggregationFailures' => $ingestSummary['aggregationFailures'],
                'connectionResult' => 'connected',
                'durationMs' => $durationMs,
            ]);

            $totalLogs = $this->punches->countByDevice($deviceId);
            $deviceUpdate = [
                'lastDeviceTime' => $deviceTime?->format('Y-m-d H:i:s'),
                'totalLogs' => $totalLogs,
            ];
            if ($fullySuccessful) {
                $deviceUpdate['lastSuccessfulSync'] = $syncStartedAt;
            }
            $this->devices->update($deviceId, $deviceUpdate);

            Logger::info('device-sync', "TCP sync complete for device {$deviceId} ({$device['name']})", [
                'rawRecordsDownloaded' => $downloadResult['count'],
                'newPunchesConsidered' => count($newPunches),
                'accepted' => $ingestSummary['accepted'],
                'unmapped' => $ingestSummary['unmapped'],
                'durationMs' => $durationMs,
            ]);

            return array_merge($ingestSummary, [
                'deviceId' => $deviceId,
                'rawRecordsDownloaded' => $downloadResult['count'],
                'newRecordsConsidered' => count($newPunches),
                'durationMs' => $durationMs,
            ]);
        } catch (\Throwable $e) {
            $this->devices->update($deviceId, ['lastError' => $e->getMessage()]);
            throw $e;
        } finally {
            $connector->disconnect();
        }
    }

    /**
     * Drops any punch at/before the device's last successful sync
     * (minus DELTA_SAFETY_MARGIN_MINUTES). $lastSuccessfulSyncUtc is null
     * for a device's first-ever sync (or one that's never fully succeeded),
     * in which case its complete current history is imported — the correct
     * behavior for onboarding a device that already has weeks of punches on
     * it.
     */
    private function filterNewPunches(array $punches, ?string $lastSuccessfulSyncUtc): array
    {
        if (empty($lastSuccessfulSyncUtc)) {
            return $punches;
        }

        $cutoff = (new \DateTimeImmutable($lastSuccessfulSyncUtc, new \DateTimeZone('UTC')))
            ->modify('-' . self::DELTA_SAFETY_MARGIN_MINUTES . ' minutes');

        return array_values(array_filter($punches, static function (array $punch) use ($cutoff): bool {
            return new \DateTimeImmutable($punch['timestamp']) > $cutoff;
        }));
    }

    /** @return \DateTimeImmutable|null the device's own clock reading, or null if it couldn't be read (never fails the sync). */
    private function checkClockDrift(ZKTecoConnector $connector, string $deviceId): ?\DateTimeImmutable
    {
        try {
            $deviceTime = $connector->getDeviceTime();
            $deviceAsSiteLocal = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $deviceTime->format('Y-m-d H:i:s'), wp_timezone());
            $siteNow = new \DateTimeImmutable('now', wp_timezone());
            $driftSeconds = abs($siteNow->getTimestamp() - $deviceAsSiteLocal->getTimestamp());

            if ($driftSeconds >= self::CLOCK_DRIFT_WARNING_MINUTES * 60) {
                Logger::warning('device-sync', "Device {$deviceId}'s clock differs from site time by ~" . round($driftSeconds / 60) . ' minute(s) — punch timestamps from it will be off by this amount until the device clock is corrected (see ZKTecoConnector::setDeviceTime()).', ['driftSeconds' => $driftSeconds]);
            }

            return $deviceTime;
        } catch (\Throwable $e) {
            Logger::warning('device-sync', "Could not read device {$deviceId}'s clock for drift check: " . $e->getMessage());
            return null;
        }
    }

    /** Enriches the it_device_logs row ingestBatch()'s own logSync() just wrote — a no-op if, somehow, no row is found (never fails the sync over a logging nicety). */
    private function enrichLatestLogRow(string $deviceId, array $enrichment): void
    {
        $row = $this->deviceLogs->findMostRecentForDevice($deviceId);
        if ($row) {
            $this->deviceLogs->update($row['id'], $enrichment);
        }
    }

    /**
     * Written only once retries are fully exhausted (a connection that
     * never succeeded never reaches ingestBatch(), so its own logSync()
     * never runs) — without this, a persistently-unreachable device would
     * show a stale lastSync/status forever with no visibility in
     * DeviceLogs.tsx.
     */
    private function recordUnreachableSync(string $deviceId, ?string $deviceName, string $errorMessage, int $durationMs): void
    {
        $this->deviceLogs->create([
            'deviceId' => $deviceId,
            'deviceName' => $deviceName,
            'result' => 'failed',
            'recordsSynced' => 0,
            'errors' => $errorMessage,
            'triggeredBy' => 'auto',
            'triggeredByName' => 'ZKTeco TCP connector',
            'downloadedRecords' => 0,
            'duplicates' => 0,
            'aggregationFailures' => 0,
            'connectionResult' => 'failed',
            'durationMs' => $durationMs,
        ]);
        $this->devices->update($deviceId, ['status' => 'error', 'lastError' => $errorMessage]);
    }
}
