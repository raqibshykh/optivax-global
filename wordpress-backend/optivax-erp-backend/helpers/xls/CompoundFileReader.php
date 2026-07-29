<?php

namespace OptivaxERP\Helpers\Xls;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Minimal OLE2 / Compound File Binary (CFB) container reader — the wrapper
 * format every legacy .xls file is stored in (the actual BIFF spreadsheet
 * data lives inside a stream named "Workbook" or "Book"). Reads only what's
 * needed to extract one named stream by name: the header, the FAT (sector
 * allocation chain), the directory, and — for small streams — the Mini FAT.
 * No write support, no other stream types (no dependency on ext-com/ext-ole
 * or any package — pure byte-offset parsing of the file's own bytes).
 *
 * Format reference: [MS-CFB]. Only the handful of fields this class reads
 * are documented inline; everything else in the 512-byte header is ignored.
 */
final class CompoundFileReader
{
    private const SIGNATURE = "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1";
    private const FREESECT = 0xFFFFFFFF;
    private const ENDOFCHAIN = 0xFFFFFFFE;
    private const FATSECT = 0xFFFFFFFD;
    private const DIFSECT = 0xFFFFFFFC;
    private const HEADER_SIZE = 512;

    private string $data;
    private int $sectorSize;
    private int $miniSectorSize;
    private int $miniStreamCutoff;
    private int $dirStartSector;
    private int $miniFatStartSector;
    private int $miniFatSectorCount;
    private int $difatFirstSector;
    private int $difatSectorCount;

    /** @var array<int,int> sector index => next sector index (or one of the ENDOFCHAIN/FREESECT/... markers) */
    private array $fat = [];

    /** @var array<int,int> same shape as $fat, but for the mini stream */
    private array $miniFat = [];

    /** @var array<int, array{name:string, type:int, start:int, size:int}> */
    private array $directory = [];

    private int $rootStartSector;

    public function __construct(string $data)
    {
        if (strlen($data) < self::HEADER_SIZE || substr($data, 0, 8) !== self::SIGNATURE) {
            throw new \InvalidArgumentException('Not a valid legacy Excel (.xls) file — missing the OLE2 compound-file signature.');
        }
        $this->data = $data;
        $this->parseHeader();
        $this->parseFat();
        $this->parseDirectory();
        if ($this->miniFatSectorCount > 0) {
            $this->parseMiniFat();
        }
    }

    /** @return string the full contents of a named stream (e.g. "Workbook" or "Book"), case-insensitive match */
    public function getStream(string $name): string
    {
        $entry = null;
        foreach ($this->directory as $candidate) {
            if ($candidate['type'] === 2 && strcasecmp($candidate['name'], $name) === 0) {
                $entry = $candidate;
                break;
            }
        }
        if ($entry === null) {
            throw new \InvalidArgumentException("Could not find a \"{$name}\" stream inside the .xls file — it may not be a genuine Excel workbook.");
        }

        if ($entry['size'] >= $this->miniStreamCutoff) {
            return $this->readFatChain($entry['start'], $entry['size']);
        }
        return $this->readMiniStream($entry['start'], $entry['size']);
    }

    private function parseHeader(): void
    {
        $sectorShift = self::u16(substr($this->data, 30, 2));
        $miniSectorShift = self::u16(substr($this->data, 32, 2));
        $this->sectorSize = 1 << $sectorShift;
        $this->miniSectorSize = 1 << $miniSectorShift;
        $this->dirStartSector = self::u32(substr($this->data, 48, 4));
        $this->miniStreamCutoff = self::u32(substr($this->data, 56, 4));
        $this->miniFatStartSector = self::u32(substr($this->data, 60, 4));
        $this->miniFatSectorCount = self::u32(substr($this->data, 64, 4));

        $this->difatFirstSector = self::u32(substr($this->data, 68, 4));
        $this->difatSectorCount = self::u32(substr($this->data, 72, 4));
    }

    /** Reads the DIFAT (the array of FAT-sector locations) then loads every FAT sector it points to into $this->fat. */
    private function parseFat(): void
    {
        // The header itself holds the first 109 DIFAT entries directly.
        $fatSectorLocations = [];
        for ($i = 0; $i < 109; $i++) {
            $value = self::u32(substr($this->data, 76 + $i * 4, 4));
            if ($value === self::FREESECT || $value === self::ENDOFCHAIN) {
                break;
            }
            $fatSectorLocations[] = $value;
        }

        // Extra DIFAT sectors (only present for very large files) chain
        // together via their own last-4-bytes "next DIFAT sector" pointer.
        $difatSector = $this->difatFirstSector;
        $remaining = $this->difatSectorCount;
        while ($remaining > 0 && $difatSector !== self::ENDOFCHAIN && $difatSector !== self::FREESECT) {
            $sectorData = $this->readRawSector($difatSector);
            $entriesPerSector = intdiv($this->sectorSize, 4) - 1; // last slot is the chain pointer
            for ($i = 0; $i < $entriesPerSector; $i++) {
                $value = self::u32(substr($sectorData, $i * 4, 4));
                if ($value === self::FREESECT || $value === self::ENDOFCHAIN) {
                    break 2;
                }
                $fatSectorLocations[] = $value;
            }
            $difatSector = self::u32(substr($sectorData, $entriesPerSector * 4, 4));
            $remaining--;
        }

        $entriesPerFatSector = intdiv($this->sectorSize, 4);
        $sectorIndex = 0;
        foreach ($fatSectorLocations as $fatSector) {
            $sectorData = $this->readRawSector($fatSector);
            for ($i = 0; $i < $entriesPerFatSector; $i++) {
                $this->fat[$sectorIndex] = self::u32(substr($sectorData, $i * 4, 4));
                $sectorIndex++;
            }
        }
    }

    private function parseMiniFat(): void
    {
        $miniFatBytes = $this->readFatChain($this->miniFatStartSector, $this->miniFatSectorCount * $this->sectorSize);
        $entries = intdiv(strlen($miniFatBytes), 4);
        for ($i = 0; $i < $entries; $i++) {
            $this->miniFat[$i] = self::u32(substr($miniFatBytes, $i * 4, 4));
        }
    }

    private function parseDirectory(): void
    {
        $dirBytes = $this->readFatChain($this->dirStartSector);
        $entrySize = 128;
        $count = intdiv(strlen($dirBytes), $entrySize);
        for ($i = 0; $i < $count; $i++) {
            $raw = substr($dirBytes, $i * $entrySize, $entrySize);
            $nameLenBytes = self::u16(substr($raw, 64, 2));
            $type = ord($raw[66]);
            if ($type === 0) {
                continue; // unused slot
            }
            $nameLen = max(0, $nameLenBytes - 2); // stored length includes a trailing null character
            $name = $nameLen > 0 ? self::utf16le(substr($raw, 0, $nameLen)) : '';
            $start = self::u32(substr($raw, 116, 4));
            $size = self::u32(substr($raw, 120, 4)); // low 32 bits — sufficient for any realistic spreadsheet size
            $this->directory[] = ['name' => $name, 'type' => $type, 'start' => $start, 'size' => $size];
            if ($type === 5) {
                $this->rootStartSector = $start;
            }
        }
    }

    private function readRawSector(int $sector): string
    {
        $offset = self::HEADER_SIZE + $sector * $this->sectorSize;
        return substr($this->data, $offset, $this->sectorSize);
    }

    /** Follows the regular FAT chain starting at $startSector, concatenating sectors until ENDOFCHAIN (or $maxBytes collected, if given). */
    private function readFatChain(int $startSector, ?int $maxBytes = null): string
    {
        $out = '';
        $sector = $startSector;
        $guard = 0;
        while ($sector !== self::ENDOFCHAIN && $sector !== self::FREESECT && $sector >= 0) {
            $out .= $this->readRawSector($sector);
            if ($maxBytes !== null && strlen($out) >= $maxBytes) {
                break;
            }
            $sector = $this->fat[$sector] ?? self::ENDOFCHAIN;
            // A malformed/truncated file could produce a cyclic chain — this
            // guard exists purely so a corrupted upload fails fast with a
            // clear error (below) instead of hanging the request.
            if (++$guard > 1_000_000) {
                throw new \InvalidArgumentException('The .xls file appears to be corrupted (FAT sector chain never terminates).');
            }
        }
        return $maxBytes !== null ? substr($out, 0, $maxBytes) : $out;
    }

    /** Reads a small stream via the Mini FAT — the mini-stream itself is the Root Entry's regular-FAT stream, chunked into miniSectorSize blocks. */
    private function readMiniStream(int $startMiniSector, int $size): string
    {
        $miniStreamData = $this->readFatChain($this->rootStartSector);

        $out = '';
        $miniSector = $startMiniSector;
        $guard = 0;
        while ($miniSector !== self::ENDOFCHAIN && $miniSector !== self::FREESECT && strlen($out) < $size) {
            $offset = $miniSector * $this->miniSectorSize;
            $out .= substr($miniStreamData, $offset, $this->miniSectorSize);
            $miniSector = $this->miniFat[$miniSector] ?? self::ENDOFCHAIN;
            if (++$guard > 1_000_000) {
                throw new \InvalidArgumentException('The .xls file appears to be corrupted (Mini FAT sector chain never terminates).');
            }
        }
        return substr($out, 0, $size);
    }

    private static function u16(string $bytes): int
    {
        return unpack('v', $bytes)[1];
    }

    private static function u32(string $bytes): int
    {
        return unpack('V', $bytes)[1];
    }

    /** Directory entry names are stored as UTF-16LE; every realistic stream name ("Workbook", "Book", "Root Entry") is pure ASCII, so a byte-skipping decode is sufficient. */
    private static function utf16le(string $bytes): string
    {
        $out = '';
        for ($i = 0; $i < strlen($bytes); $i += 2) {
            $out .= $bytes[$i];
        }
        return $out;
    }
}
