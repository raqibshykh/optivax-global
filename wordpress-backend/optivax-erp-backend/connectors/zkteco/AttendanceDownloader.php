<?php

namespace OptivaxERP\Connectors\ZKTeco;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * @deprecated Bridge-Ready architecture: only used by the legacy, opt-in-only
 * DeviceSyncService direct-TCP path — see that class's doc comment. Not part
 * of the production Bridge-push flow.
 *
 * Thin orchestration wrapper around ZKTecoConnector::getAttendanceLogs() for
 * exactly one responsibility: pull the raw punch log off an already-
 * connected device and hand it back untouched. Deliberately does not
 * connect/disconnect the socket itself (DeviceSyncService owns that
 * lifecycle, since a sync run may also call getDeviceInfo()/setDeviceTime()
 * on the same connection) and never writes to the database — the return
 * value is a plain array of raw device records; AttendanceParser is the
 * only thing that turns it into ingestBatch()'s wire format.
 */
final class AttendanceDownloader
{
    /**
     * @return array{records: array<int, array{uid:int, userId:string, timestamp:\DateTimeImmutable, status:int, verifyType:int}>, deviceTimeAtDownload: ?\DateTimeImmutable, count: int}
     * $deviceTimeAtDownload is a best-effort read of the device's own clock
     * at download time (null if that read itself fails, which never aborts
     * the log download) — used by DeviceSyncService purely to log clock-drift
     * warnings, it plays no role in how punches are parsed.
     */
    public function download(ZKTecoConnector $connector): array
    {
        if (!$connector->isConnected()) {
            throw new \RuntimeException('AttendanceDownloader::download() requires an already-connected ZKTecoConnector.');
        }

        $records = $connector->getAttendanceLogs();

        $deviceTime = null;
        try {
            $deviceTime = $connector->getDeviceTime();
        } catch (\Throwable $e) {
            // Clock read is a diagnostic nicety, not required for the download itself.
        }

        return [
            'records' => $records,
            'deviceTimeAtDownload' => $deviceTime,
            'count' => count($records),
        ];
    }
}
