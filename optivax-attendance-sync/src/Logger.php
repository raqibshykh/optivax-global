<?php

declare(strict_types=1);

namespace OptivaxAttendanceSync;

final class Logger
{
    private string $logFile;

    public function __construct(string $logDir)
    {
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0775, true);
        }
        $this->logFile = rtrim($logDir, '/\\') . DIRECTORY_SEPARATOR . 'sync.log';
    }

    public function info(string $message, array $context = []): void
    {
        $this->write('INFO', $message, $context);
    }

    public function warn(string $message, array $context = []): void
    {
        $this->write('WARN', $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->write('ERROR', $message, $context);
    }

    private function write(string $level, string $message, array $context): void
    {
        $line = sprintf('[%s] %s: %s', date('Y-m-d H:i:s'), $level, $message);
        if ($context) {
            $line .= ' ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
        }
        echo $line . PHP_EOL;
        @file_put_contents($this->logFile, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
