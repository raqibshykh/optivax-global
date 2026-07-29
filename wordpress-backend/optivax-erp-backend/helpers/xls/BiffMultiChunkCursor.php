<?php

namespace OptivaxERP\Helpers\Xls;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Reads primitives sequentially across a list of (offset,length) byte
 * ranges within one underlying string — used only for the Shared String
 * Table, whose entries are the one place in BIFF8 a value can legitimately
 * be split across a CONTINUE record boundary. Per [MS-XLS], when a string's
 * character array is split, the continuation always resumes with a fresh
 * 1-byte compressed/uncompressed flag before the remaining raw characters —
 * every real-world BIFF writer follows this convention, and
 * readXlUnicodeString() relies on it.
 */
final class BiffMultiChunkCursor
{
    private string $data;
    /** @var array<int, array{0:int,1:int}> [streamOffset, length] pairs, in order */
    private array $chunks;
    private int $chunkIndex = 0;
    private int $posInChunk = 0;

    public function __construct(string $data, array $chunks)
    {
        $this->data = $data;
        $this->chunks = array_values($chunks);
    }

    public function skip(int $bytes): void
    {
        $this->readBytes($bytes);
    }

    public function readUInt16(): int
    {
        return unpack('v', $this->readBytes(2))[1];
    }

    public function readUInt32(): int
    {
        return unpack('V', $this->readBytes(4))[1];
    }

    public function readByte(): int
    {
        return ord($this->readBytes(1));
    }

    /** @return string one Shared String Table entry's decoded text */
    public function readXlUnicodeString(): string
    {
        $cch = $this->readUInt16();
        $flags = $this->readByte();
        $uncompressed = ($flags & 0x1) !== 0;
        $hasRichRuns = ($flags & 0x8) !== 0;
        $hasExt = ($flags & 0x4) !== 0;
        $cRun = $hasRichRuns ? $this->readUInt16() : 0;
        $cbExt = $hasExt ? $this->readUInt32() : 0;

        $charsRemaining = $cch;
        $rawChars = '';
        while ($charsRemaining > 0) {
            $availableBytes = $this->bytesLeftInCurrentChunk();
            if ($availableBytes <= 0) {
                if (!$this->advanceToNextChunk()) {
                    break; // truncated/corrupt file — return whatever was read
                }
                // A split string resumes with a fresh flag byte for the remaining characters.
                $uncompressed = ($this->readByte() & 0x1) !== 0;
                continue;
            }
            $bytesPerChar = $uncompressed ? 2 : 1;
            $charsAvailable = intdiv($availableBytes, $bytesPerChar);
            if ($charsAvailable === 0) {
                // An odd leftover byte with an uncompressed (2-byte) string
                // mid-character — cross into the next chunk to complete it.
                if (!$this->advanceToNextChunk()) {
                    break;
                }
                $uncompressed = ($this->readByte() & 0x1) !== 0;
                continue;
            }
            $take = min($charsAvailable, $charsRemaining);
            $bytes = $this->readBytes($take * $bytesPerChar);
            $rawChars .= $uncompressed ? self::utf16leToUtf8($bytes) : $bytes;
            $charsRemaining -= $take;
        }

        $this->skip($cRun * 4);
        $this->skip($cbExt);

        return $rawChars;
    }

    private function bytesLeftInCurrentChunk(): int
    {
        if (!isset($this->chunks[$this->chunkIndex])) {
            return 0;
        }
        return $this->chunks[$this->chunkIndex][1] - $this->posInChunk;
    }

    private function advanceToNextChunk(): bool
    {
        if (!isset($this->chunks[$this->chunkIndex + 1])) {
            return false;
        }
        $this->chunkIndex++;
        $this->posInChunk = 0;
        return true;
    }

    private function readBytes(int $n): string
    {
        $out = '';
        while ($n > 0) {
            if (!isset($this->chunks[$this->chunkIndex])) {
                break; // truncated file — return what we have
            }
            [$streamOffset, $length] = $this->chunks[$this->chunkIndex];
            $available = $length - $this->posInChunk;
            if ($available <= 0) {
                if (!$this->advanceToNextChunk()) {
                    break;
                }
                continue;
            }
            $take = min($available, $n);
            $out .= substr($this->data, $streamOffset + $this->posInChunk, $take);
            $this->posInChunk += $take;
            $n -= $take;
        }
        return $out;
    }

    private static function utf16leToUtf8(string $bytes): string
    {
        $converted = @iconv('UTF-16LE', 'UTF-8//IGNORE', $bytes);
        return $converted !== false ? $converted : $bytes;
    }
}
