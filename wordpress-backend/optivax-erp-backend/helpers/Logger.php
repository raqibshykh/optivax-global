<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/** Writes to /logs/*.log, rotated daily. Never throws — logging must not break a request. */
final class Logger
{
    private static function path(string $channel): string
    {
        return OPTIVAX_ERP_DIR . 'logs/' . $channel . '-' . gmdate('Y-m-d') . '.log';
    }

    public static function write(string $channel, string $level, string $message, array $context = []): void
    {
        try {
            $line = sprintf(
                "[%s] %s: %s %s\n",
                gmdate('Y-m-d H:i:s'),
                strtoupper($level),
                $message,
                empty($context) ? '' : wp_json_encode($context)
            );
            $path = self::path($channel);
            if (!file_exists(dirname($path))) {
                wp_mkdir_p(dirname($path));
            }
            file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
        } catch (\Throwable $e) {
            // Logging failures are never fatal.
        }
    }

    public static function info(string $channel, string $message, array $context = []): void
    {
        self::write($channel, 'info', $message, $context);
    }

    public static function error(string $channel, string $message, array $context = []): void
    {
        self::write($channel, 'error', $message, $context);
    }

    public static function warning(string $channel, string $message, array $context = []): void
    {
        self::write($channel, 'warning', $message, $context);
    }
}
