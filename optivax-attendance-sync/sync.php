<?php

/**
 * Optivax Attendance Sync (PHP)
 *
 * Standalone CLI script, run on the office PC via Windows Task Scheduler
 * (e.g. every 5 minutes: `php.exe sync.php`). Reads new punches out of the
 * ZKTeco Attendance Management 2011 database (att2000.mdb) and POSTs them to
 * this ERP's existing, unmodified biometric ingestion endpoint:
 *
 *   POST {erp_base_url}/it/devices/{device_id}/punches/import
 *
 * This script only changes the SOURCE of the {punches} array in that
 * request. Auth (X-Device-Key), payload shape, idempotency
 * (Idempotency-Key header), duplicate protection, employee mapping,
 * attendance aggregation, late/shift rules, and payroll all live on the ERP
 * side, entirely unchanged — see src/ErpClient.php.
 *
 * Requires: PHP CLI with pdo_odbc enabled, and the Microsoft Access Database
 * Engine ODBC driver installed on this machine (same bitness as this PHP).
 *
 * Usage: php.exe sync.php
 */

declare(strict_types=1);

require __DIR__ . '/src/Logger.php';
require __DIR__ . '/src/LockFile.php';
require __DIR__ . '/src/StateStore.php';
require __DIR__ . '/src/StartupValidator.php';
require __DIR__ . '/src/Watermark.php';
require __DIR__ . '/src/PunchMapper.php';
require __DIR__ . '/src/MdbReader.php';
require __DIR__ . '/src/ErpClient.php';

use OptivaxAttendanceSync\ErpClient;
use OptivaxAttendanceSync\LockFile;
use OptivaxAttendanceSync\Logger;
use OptivaxAttendanceSync\MdbReader;
use OptivaxAttendanceSync\PunchMapper;
use OptivaxAttendanceSync\StartupValidator;
use OptivaxAttendanceSync\StateStore;
use OptivaxAttendanceSync\Watermark;

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    fwrite(STDERR, "Missing config.php — copy config.sample.php to config.php and fill in real values.\n");
    exit(1);
}
/** @var array<string,mixed> $config */
$config = require $configPath;

date_default_timezone_set((string) $config['timezone']);

$logger = new Logger((string) $config['log_dir']);
$lock = new LockFile(rtrim((string) $config['state_dir'], '/\\') . DIRECTORY_SEPARATOR . 'sync.lock');

$startedAt = microtime(true);
$logger->info('=== Optivax Attendance Sync starting ===');

try {
    $lock->acquire();
} catch (\Throwable $e) {
    // Another instance is already running — this is an expected outcome on
    // a tight schedule, not a failure, so it exits cleanly (0) rather than
    // logging an error.
    $logger->warn('Run skipped: ' . $e->getMessage());
    exit(0);
}

$exitCode = 0;
try {
    $problems = StartupValidator::validate($config, $logger);
    if ($problems) {
        foreach ($problems as $problem) {
            $logger->error('Startup validation failed: ' . $problem);
        }
        throw new \RuntimeException('Startup validation failed — aborting this run without touching the MDB or the ERP.');
    }
    $logger->info('Startup validation passed.');

    $stateStore = new StateStore((string) $config['state_dir'], $logger);
    $state = $stateStore->load();

    $mdb = new MdbReader((string) $config['mdb_path'], (string) $config['odbc_driver']);
    $watermark = new Watermark($mdb, $logger);

    [$sql, $params] = $watermark->buildQuery($state, (int) $config['lookback_overlap_minutes']);
    $rawRows = $mdb->fetch($sql, $params);
    $rawRows = $watermark->filterRows($rawRows, $state);

    $logger->info('Rows found', ['count' => count($rawRows)]);

    if (!$rawRows) {
        $logger->info('No new punches this run.');
    } else {
        $normalized = array_map(static function (array $row): array {
            return [
                'rowKey' => $row['ROWKEY'],
                'userId' => (string) $row['USERID'],
                'timestamp' => new \DateTimeImmutable((string) $row['CHECKTIME']),
                'checkTime' => (string) $row['CHECKTIME'],
                'rawType' => $row['CHECKTYPE'] !== null ? (string) $row['CHECKTYPE'] : null,
            ];
        }, $rawRows);

        $punches = PunchMapper::resolvePunchTypes($normalized);
        $batchSize = max(1, (int) $config['batch_size']);
        $batches = array_chunk($punches, $batchSize);

        $logger->info('Prepared batches', ['punchCount' => count($punches), 'batchCount' => count($batches)]);

        $erp = new ErpClient(
            (string) $config['erp_base_url'],
            (string) $config['device_id'],
            (string) $config['api_key'],
            (int) $config['http']['connect_timeout_seconds'],
            (int) $config['http']['timeout_seconds'],
            (int) $config['http']['max_retries'],
            (int) $config['http']['retry_backoff_seconds'],
            $logger
        );

        $uploaded = 0;
        $totalRetries = 0;
        foreach ($batches as $i => $batch) {
            $wireBatch = array_map(static fn (array $p): array => [
                'biometricUserId' => $p['biometricUserId'],
                'timestamp' => $p['timestamp'],
                'punchType' => $p['punchType'],
            ], $batch);

            $result = $erp->sendBatch($wireBatch);
            $totalRetries += $result['retries'];

            if (!$result['ok']) {
                $logger->error('Batch failed — stopping this run', [
                    'batch' => $i + 1,
                    'ofBatches' => count($batches),
                    'httpCode' => $result['httpCode'],
                    'apiResponse' => $result['body'],
                ]);
                // The watermark was already persisted after the previous
                // successful batch (below) and is never advanced past this
                // point — the next run re-fetches from here and retries.
                $exitCode = 1;
                break;
            }

            $uploaded += count($batch);
            $logger->info('Batch uploaded', [
                'batch' => $i + 1,
                'ofBatches' => count($batches),
                'punches' => count($batch),
                'httpCode' => $result['httpCode'],
                'apiResponse' => $result['body'],
                'retries' => $result['retries'],
            ]);

            $state = array_merge($state, $watermark->advance($state, $batch));
            $stateStore->save($state);
        }

        $logger->info('Upload summary', ['uploaded' => $uploaded, 'totalPunches' => count($punches), 'retries' => $totalRetries]);
    }
} catch (\Throwable $e) {
    $logger->error('Sync aborted with exception: ' . $e->getMessage());
    $exitCode = 1;
} finally {
    // Runs even if an exception was thrown above — the lock is always released.
    $lock->release();
    $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
    $logger->info('=== Sync finished ===', [
        'durationMs' => $durationMs,
        'peakMemoryMb' => round(memory_get_peak_usage(true) / 1048576, 2),
        'exitCode' => $exitCode,
    ]);
}

exit($exitCode);
