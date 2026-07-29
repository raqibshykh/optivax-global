<?php

namespace OptivaxERP\Helpers\Xls;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Minimal BIFF8 (Excel 97-2003 binary format) reader over a raw "Workbook"
 * stream (already extracted by CompoundFileReader). Reads only what a flat
 * data export needs: the Shared String Table (SST), the sheet directory
 * (BOUNDSHEET), and the first worksheet's cell records — enough to cover
 * every cell type a report generator like ZKTeco Attendance Management
 * realistically emits (LABELSST, LABEL, NUMBER, RK, MULRK, MULBLANK, and a
 * best-effort read of cached FORMULA results). No formatting, defined
 * names, charts, or macro sheets are interpreted; this is intentionally not
 * a general-purpose BIFF reader.
 *
 * Format reference: [MS-XLS].
 */
final class BiffWorkbookReader
{
    private const TYPE_BOF = 0x0809;
    private const TYPE_EOF = 0x000A;
    private const TYPE_BOUNDSHEET = 0x0085;
    private const TYPE_SST = 0x00FC;
    private const TYPE_CONTINUE = 0x003C;
    private const TYPE_LABEL = 0x0204;
    private const TYPE_LABELSST = 0x00FD;
    private const TYPE_NUMBER = 0x0203;
    private const TYPE_RK = 0x027E;
    private const TYPE_MULRK = 0x00BD;
    private const TYPE_MULBLANK = 0x00BE;
    private const TYPE_FORMULA = 0x0006;
    private const TYPE_STRING = 0x0207;

    private string $stream;

    /** @var string[] the Shared String Table, index-aligned with LABELSST's sstIndex field */
    private array $sst = [];

    public function __construct(string $workbookStream)
    {
        $this->stream = $workbookStream;
    }

    /** @return array<int, array<int, mixed>> rows, each a 0-indexed array of cell values — same shape AttendanceImportFileParser's .xlsx path already produces */
    public function readFirstSheetRows(): array
    {
        $sheetBofOffset = $this->readGlobalsAndFindFirstSheet();
        if ($sheetBofOffset === null) {
            throw new \InvalidArgumentException('Could not find a worksheet inside the .xls file.');
        }
        return $this->readSheetCells($sheetBofOffset);
    }

    /**
     * Walks the "workbook globals" substream (from offset 0 up to its own
     * EOF) collecting the SST and every BOUNDSHEET entry, and returns the
     * stream offset of the first visible worksheet's own BOF record.
     */
    private function readGlobalsAndFindFirstSheet(): ?int
    {
        $len = strlen($this->stream);
        if ($len < 4 || self::u16($this->stream, 0) !== self::TYPE_BOF) {
            throw new \InvalidArgumentException('The .xls file does not start with a valid BIFF record — it may be corrupted or in an unsupported format.');
        }
        // BOF body: version(2) + type(2) + ... — 0x0600 is BIFF8, the only
        // version this lightweight reader understands. Older BIFF versions
        // (BIFF5 and earlier) use different record layouts for LABEL/RK and
        // don't use a Unicode SST at all — silently parsing those with
        // BIFF8 assumptions would produce garbled, not just missing, data.
        $bofVersion = self::u16($this->stream, 4);
        if ($bofVersion !== 0x0600) {
            throw new \InvalidArgumentException('This .xls file uses an older Excel format (pre-97) that is not supported. Please re-save it as .xlsx or .csv, or export as Excel 97-2003 (.xls).');
        }

        $offset = 0;
        $firstSheetOffset = null;
        $sheetCandidates = [];

        while ($offset + 4 <= $len) {
            $type = self::u16($this->stream, $offset);
            $recLen = self::u16($this->stream, $offset + 2);
            $bodyStart = $offset + 4;

            if ($type === self::TYPE_SST) {
                [$this->sst, $consumed] = $this->readSst($bodyStart, $recLen);
                $offset = $consumed;
                continue;
            }

            if ($type === self::TYPE_BOUNDSHEET && $bodyStart + 6 <= $len) {
                $bofPosition = self::u32($this->stream, $bodyStart);
                $sheetType = ord($this->stream[$bodyStart + 5] ?? "\x00");
                // sheetType 0x00 = worksheet; 0x02 = chart; 0x06 = VB module; etc. — only worksheets are candidates.
                if ($sheetType === 0x00) {
                    $sheetCandidates[] = $bofPosition;
                }
            }

            if ($type === self::TYPE_EOF) {
                // End of workbook globals — every BOUNDSHEET has been seen.
                $offset = $bodyStart + $recLen;
                break;
            }

            $offset = $bodyStart + $recLen;
        }

        $firstSheetOffset = $sheetCandidates[0] ?? null;
        return $firstSheetOffset;
    }

    /** @return array<int, array<int, mixed>> */
    private function readSheetCells(int $startOffset): array
    {
        $offset = $startOffset;
        $len = strlen($this->stream);
        /** @var array<int, array<int, mixed>> $rows */
        $rows = [];

        while ($offset + 4 <= $len) {
            $type = self::u16($this->stream, $offset);
            $recLen = self::u16($this->stream, $offset + 2);
            $body = substr($this->stream, $offset + 4, $recLen);
            $nextOffset = $offset + 4 + $recLen;

            switch ($type) {
                case self::TYPE_EOF:
                    return $this->materializeRows($rows);

                case self::TYPE_LABELSST:
                    $row = self::u16($body, 0);
                    $col = self::u16($body, 2);
                    $sstIndex = self::u32($body, 6);
                    $rows[$row][$col] = $this->sst[$sstIndex] ?? null;
                    break;

                case self::TYPE_LABEL:
                    $row = self::u16($body, 0);
                    $col = self::u16($body, 2);
                    $strLen = self::u16($body, 6);
                    // Old-format (non-Unicode) inline string — one byte per character.
                    $rows[$row][$col] = substr($body, 8, $strLen);
                    break;

                case self::TYPE_NUMBER:
                    $row = self::u16($body, 0);
                    $col = self::u16($body, 2);
                    $rows[$row][$col] = self::readDouble(substr($body, 6, 8));
                    break;

                case self::TYPE_RK:
                    $row = self::u16($body, 0);
                    $col = self::u16($body, 2);
                    $rows[$row][$col] = self::decodeRk(self::u32($body, 6));
                    break;

                case self::TYPE_MULRK:
                    $row = self::u16($body, 0);
                    $firstCol = self::u16($body, 2);
                    $lastCol = self::u16($body, strlen($body) - 2);
                    $count = $lastCol - $firstCol + 1;
                    for ($i = 0; $i < $count; $i++) {
                        $entryOffset = 4 + $i * 6; // xf(2) + rk(4) per column, starting right after row/firstCol
                        $rk = self::u32($body, $entryOffset + 2);
                        $rows[$row][$firstCol + $i] = self::decodeRk($rk);
                    }
                    break;

                case self::TYPE_MULBLANK:
                    // Blank cells — nothing to store; a blank slot is
                    // indistinguishable from "never written" once
                    // materializeRows() fills gaps with null anyway.
                    break;

                case self::TYPE_FORMULA:
                    $row = self::u16($body, 0);
                    $col = self::u16($body, 2);
                    $resultBytes = substr($body, 6, 8);
                    if (substr($resultBytes, 6, 2) === "\xFF\xFF") {
                        $resultType = ord($resultBytes[0]);
                        if ($resultType === 0 && $nextOffset + 4 <= $len && self::u16($this->stream, $nextOffset) === self::TYPE_STRING) {
                            // Cached string result: the actual value is in the immediately-following STRING record.
                            $stringRecLen = self::u16($this->stream, $nextOffset + 2);
                            $stringBody = substr($this->stream, $nextOffset + 4, $stringRecLen);
                            $rows[$row][$col] = self::readSimpleUnicodeString($stringBody);
                            $nextOffset += 4 + $stringRecLen;
                        } elseif ($resultType === 1) {
                            $rows[$row][$col] = ord($resultBytes[2]) === 1 ? 'TRUE' : 'FALSE';
                        } else {
                            $rows[$row][$col] = null; // error or blank cached result — not meaningful for attendance data
                        }
                    } else {
                        $rows[$row][$col] = self::readDouble($resultBytes);
                    }
                    break;

                default:
                    // Every other record type (ROW, DBCELL, formatting, etc.) is irrelevant to plain cell extraction.
                    break;
            }

            $offset = $nextOffset;
        }

        return $this->materializeRows($rows);
    }

    /** @return array<int, array<int, mixed>> dense rows, sorted by row index, gaps within a row filled with null — same contract as the .xlsx reader. */
    private function materializeRows(array $rowsByIndex): array
    {
        ksort($rowsByIndex);
        $out = [];
        foreach ($rowsByIndex as $cellsByCol) {
            ksort($cellsByCol);
            $maxCol = empty($cellsByCol) ? -1 : max(array_keys($cellsByCol));
            $line = [];
            for ($i = 0; $i <= $maxCol; $i++) {
                $line[] = $cellsByCol[$i] ?? null;
            }
            $out[] = $line;
        }
        return $out;
    }

    /**
     * Reads the SST record's header + every shared string, transparently
     * following CONTINUE records when a string's character data is split
     * across a record boundary (handled by BiffMultiChunkCursor).
     * @return array{0: string[], 1: int} [strings, streamOffsetAfterLastConsumedRecord]
     */
    private function readSst(int $bodyStart, int $firstRecLen): array
    {
        // chunks: [ [dataOffsetInStream, dataLength], ... ] — the SST record itself, plus every CONTINUE that immediately follows it.
        $chunks = [[$bodyStart, $firstRecLen]];
        $scanOffset = $bodyStart + $firstRecLen;
        while ($scanOffset + 4 <= strlen($this->stream) && self::u16($this->stream, $scanOffset) === self::TYPE_CONTINUE) {
            $contLen = self::u16($this->stream, $scanOffset + 2);
            $chunks[] = [$scanOffset + 4, $contLen];
            $scanOffset += 4 + $contLen;
        }

        $cursor = new BiffMultiChunkCursor($this->stream, $chunks);
        $cursor->skip(4); // total string count (Cst) — unused
        $uniqueCount = $cursor->readUInt32();

        $strings = [];
        for ($i = 0; $i < $uniqueCount; $i++) {
            $strings[] = $cursor->readXlUnicodeString();
        }

        return [$strings, $scanOffset];
    }

    /** One-shot (non-continuation-aware) unicode string read, for the single, standalone STRING record following a formula's cached string result — realistically always short enough to never span a CONTINUE boundary. */
    private static function readSimpleUnicodeString(string $body): string
    {
        $cch = self::u16($body, 0);
        $flags = ord($body[2] ?? "\x00");
        $uncompressed = ($flags & 0x1) !== 0;
        $charBytes = $cch * ($uncompressed ? 2 : 1);
        $chars = substr($body, 3, $charBytes);
        return $uncompressed ? self::utf16leToUtf8($chars) : $chars;
    }

    private static function decodeRk(int $rk): float
    {
        $multipliedBy100 = ($rk & 0x1) !== 0;
        $isInteger = ($rk & 0x2) !== 0;

        if ($isInteger) {
            $signed = $rk > 0x7FFFFFFF ? $rk - 0x100000000 : $rk;
            $value = (float) ($signed >> 2);
        } else {
            $maskedHigh32 = $rk & 0xFFFFFFFC;
            $bytes = pack('V', 0) . pack('V', $maskedHigh32);
            $value = unpack('e', $bytes)[1];
        }

        return $multipliedBy100 ? $value / 100 : $value;
    }

    private static function readDouble(string $eightBytes): float
    {
        return unpack('e', $eightBytes)[1];
    }

    private static function utf16leToUtf8(string $bytes): string
    {
        $converted = @iconv('UTF-16LE', 'UTF-8//IGNORE', $bytes);
        return $converted !== false ? $converted : $bytes;
    }

    private static function u16(string $bytes, int $offset): int
    {
        return unpack('v', substr($bytes, $offset, 2))[1];
    }

    private static function u32(string $bytes, int $offset): int
    {
        return unpack('V', substr($bytes, $offset, 4))[1];
    }
}
