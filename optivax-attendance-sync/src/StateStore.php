<?php

declare(strict_types=1);

namespace OptivaxAttendanceSync;

/**
 * Persists the watermark between runs. Every write is atomic (temp file +
 * rename) and preceded by a backup copy of the previous good state, so a
 * crash mid-write, or a corrupted state.json from a prior bad shutdown,
 * never blocks the next run — it falls back to the backup, and only starts
 * from a clean watermark if both are unusable.
 */
final class StateStore
{
    private string $file;
    private string $backupFile;
    private Logger $logger;

    public function __construct(string $stateDir, Logger $logger)
    {
        if (!is_dir($stateDir)) {
            @mkdir($stateDir, 0775, true);
        }
        $this->file = rtrim($stateDir, '/\\') . DIRECTORY_SEPARATOR . 'state.json';
        $this->backupFile = $this->file . '.bak';
        $this->logger = $logger;
    }

    public function load(): array
    {
        $state = $this->tryLoad($this->file);
        if ($state !== null) {
            return $state;
        }

        if (is_file($this->file)) {
            $this->logger->warn('state.json exists but is unreadable/corrupted, attempting recovery from backup', ['file' => $this->file]);
        }

        $state = $this->tryLoad($this->backupFile);
        if ($state !== null) {
            $this->logger->warn('Recovered watermark from state.json.bak');
            return $state;
        }

        $this->logger->warn('No usable state found, starting from a clean watermark (safe: the ERP\'s own duplicate protection absorbs any resend)');
        return [];
    }

    private function tryLoad(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    /** Atomic write: backs up the current file, writes to a temp file, then renames it into place. */
    public function save(array $state): void
    {
        if (is_file($this->file)) {
            @copy($this->file, $this->backupFile);
        }

        $tmpFile = $this->file . '.tmp.' . getmypid();
        $json = json_encode($state, JSON_PRETTY_PRINT);
        if ($json === false || file_put_contents($tmpFile, $json, LOCK_EX) === false) {
            throw new \RuntimeException("Could not write temp state file: {$tmpFile}");
        }

        if (!@rename($tmpFile, $this->file)) {
            // Windows can occasionally refuse rename() over an existing file
            // handle; fall back to copy+delete rather than losing the update.
            if (!@copy($tmpFile, $this->file)) {
                @unlink($tmpFile);
                throw new \RuntimeException("Could not persist state file: {$this->file}");
            }
            @unlink($tmpFile);
        }
    }
}
