<?php

declare(strict_types=1);

namespace OptivaxAttendanceSync;

/**
 * Everything here is checked BEFORE the MDB is opened or any HTTP call is
 * made, so a bad environment fails fast with a clear log line instead of a
 * confusing exception halfway through a run.
 */
final class StartupValidator
{
    /** @return string[] problems found; empty means everything checked out */
    public static function validate(array $config, Logger $logger): array
    {
        $problems = [];

        if (!is_file((string) $config['mdb_path'])) {
            $problems[] = "MDB file not found: {$config['mdb_path']}";
        }

        foreach (['log_dir' => (string) $config['log_dir'], 'state_dir' => (string) $config['state_dir']] as $label => $dir) {
            if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
                $problems[] = "Could not create required directory ({$label}): {$dir}";
            } elseif (!is_writable($dir)) {
                $problems[] = "Directory not writable ({$label}): {$dir}";
            }
        }

        $stateFile = rtrim((string) $config['state_dir'], '/\\') . DIRECTORY_SEPARATOR . 'state.json';
        if (is_file($stateFile) && !is_readable($stateFile)) {
            $problems[] = "State file exists but is not readable: {$stateFile}";
        }

        if (!extension_loaded('pdo_odbc') || !in_array('odbc', \PDO::getAvailableDrivers(), true)) {
            $problems[] = 'PHP pdo_odbc extension/driver is not available on this PHP install.';
        }

        if (function_exists('odbc_drivers')) {
            $hasAccessDriver = false;
            foreach (array_keys(odbc_drivers()) as $driverName) {
                if (stripos((string) $driverName, 'access') !== false) {
                    $hasAccessDriver = true;
                    break;
                }
            }
            if (!$hasAccessDriver) {
                $problems[] = "No Microsoft Access ODBC driver found among installed ODBC drivers (configured driver: '{$config['odbc_driver']}'). Install the Microsoft Access Database Engine matching this PHP's bitness.";
            }
        } else {
            $logger->warn('Cannot enumerate installed ODBC drivers on this PHP build (odbc_drivers() unavailable) — the Access driver will only be validated by the actual connection attempt.');
        }

        $connectTimeout = (int) ($config['http']['connect_timeout_seconds'] ?? 10);
        $reachabilityError = self::checkReachable((string) $config['erp_base_url'], $connectTimeout);
        if ($reachabilityError !== null) {
            $problems[] = "ERP API not reachable: {$reachabilityError}";
        }

        return $problems;
    }

    /**
     * A single reachability probe against the ERP URL covers both "is the
     * ERP up" and "is this machine online" — any distinct internet outage
     * would fail this exact same way (DNS/connect error), so a separate
     * ping to an unrelated host would only add noise, not information.
     */
    private static function checkReachable(string $url, int $connectTimeout): ?string
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_NOBODY => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => $connectTimeout,
            CURLOPT_TIMEOUT => $connectTimeout + 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($errno === 0) {
            return null; // any HTTP response at all (even 404/401) proves DNS + connect + TLS all work
        }
        return match ($errno) {
            CURLE_COULDNT_RESOLVE_HOST => "DNS resolution failed for {$url} — check internet/DNS connectivity.",
            CURLE_COULDNT_CONNECT => "Could not connect to {$url} — host unreachable or blocked by a firewall.",
            CURLE_OPERATION_TIMEDOUT => "Connection to {$url} timed out.",
            default => "cURL error #{$errno} reaching {$url}: {$error}",
        };
    }
}
