<?php

/**
 * Copy this file to config.php (same folder) and fill in real values.
 * config.php is a per-machine secret file — do not commit it.
 */
return [
    // Base REST URL of the existing ERP API, no trailing slash.
    // Same host the React admin dashboard already talks to.
    'erp_base_url' => 'https://your-erp-domain.com/wp-json/saas/v1',

    // The device row's id + plaintext API key, from IT Support -> Devices ->
    // "Generate API Key" for the device representing this K70. The same
    // X-Device-Key auth the ERP's punches/import endpoint already expects.
    'device_id' => 'REPLACE_WITH_DEVICE_ID',
    'api_key' => 'REPLACE_WITH_DEVICE_API_KEY',

    // Full path to the ZKTeco Attendance Management 2011 database file.
    'mdb_path' => 'C:\\ZKTeco\\att2000.mdb',

    // ODBC driver name exactly as installed/registered on this machine.
    // Change this (not the PHP code) if the driver is registered under a
    // different name, e.g. a 64-bit vs 32-bit install.
    'odbc_driver' => 'Microsoft Access Driver (*.mdb, *.accdb)',

    // PHP timezone name matching the site timezone the ERP is configured
    // with (Settings -> OptiVax ERP), since att2000.mdb stores naive local
    // wall-clock time exactly like the device's own clock.
    'timezone' => 'Asia/Karachi',

    // Max punches sent per HTTP request (existing endpoint caps at 5000).
    'batch_size' => 500,

    // Composite-watermark fallback only (used when CHECKINOUT has no
    // CHECKID/ID/RecordID column): how far behind the last-synced timestamp
    // to re-query, as a safety margin against late-arriving rows. Any
    // re-sent punch is absorbed by the ERP's own duplicate protection.
    'lookback_overlap_minutes' => 60,

    'http' => [
        'connect_timeout_seconds' => 10,
        'timeout_seconds' => 120,
        'max_retries' => 3,
        // Backoff doubles each retry: retry 1 waits this many seconds, retry 2 waits 2x, retry 3 waits 4x, ...
        'retry_backoff_seconds' => 2,
    ],

    // Where this script keeps its own local logs/progress. Both are created
    // automatically if missing.
    'log_dir' => __DIR__ . '/logs',
    'state_dir' => __DIR__ . '/state',
];
