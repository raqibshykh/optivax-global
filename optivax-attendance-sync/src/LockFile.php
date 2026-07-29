<?php

declare(strict_types=1);

namespace OptivaxAttendanceSync;

/**
 * flock()-based single-instance guard. Deliberately does NOT delete the lock
 * file on release — only the OS-level lock matters; the file itself can
 * persist empty between runs. Deleting it would reintroduce exactly the race
 * flock() is meant to close (another process opening/creating a new file
 * with the same name between our unlink() and its own fopen()).
 */
final class LockFile
{
    /** @var resource|null */
    private $handle = null;
    private string $path;

    public function __construct(string $path)
    {
        $this->path = $path;
    }

    /** @throws \RuntimeException if another instance already holds the lock, or the file can't be opened */
    public function acquire(): void
    {
        $dir = dirname($this->path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
            throw new \RuntimeException("Could not create lock directory: {$dir}");
        }

        $handle = fopen($this->path, 'c');
        if ($handle === false) {
            throw new \RuntimeException("Could not open lock file: {$this->path}");
        }

        if (!flock($handle, LOCK_EX | LOCK_NB)) {
            fclose($handle);
            throw new \RuntimeException('Another sync instance is already running (lock held on ' . $this->path . ').');
        }

        ftruncate($handle, 0);
        fwrite($handle, (string) getmypid() . ' ' . date('Y-m-d H:i:s'));
        fflush($handle);

        $this->handle = $handle;
    }

    /** Safe to call multiple times, and safe to call even if acquire() never succeeded. */
    public function release(): void
    {
        if ($this->handle !== null) {
            flock($this->handle, LOCK_UN);
            fclose($this->handle);
            $this->handle = null;
        }
    }
}
