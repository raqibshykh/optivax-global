<?php

namespace OptivaxERP\Helpers;

use OptivaxERP\Helpers\Xls\BiffWorkbookReader;
use OptivaxERP\Helpers\Xls\CompoundFileReader;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Reads an uploaded attendance export (.xls, .xlsx, or .csv) into flat rows
 * and auto-detects which column is which — different ZKTeco Attendance
 * Management export configurations use different header names/orders (e.g.
 * "User ID | Date | Time | Status" vs "Employee ID | Biometric ID | Date |
 * Punch Type"), so headers are matched against a synonym list rather than
 * assumed to be in a fixed position. Covers both Attendance Management 2011
 * and current ZKTeco Attendance Software exports, which use either format.
 *
 * Every reader here is dependency-free (no Composer/PhpSpreadsheet):
 *  - .xlsx is a zip of XML parts, read with PHP's built-in ZipArchive + SimpleXML.
 *  - .xls (legacy Excel 97-2003 binary format) is read via CompoundFileReader
 *    (the OLE2 container) + BiffWorkbookReader (the BIFF8 record parser),
 *    both in helpers/xls/ — see their doc comments for format details and
 *    the deliberate scope limits of a "lightweight" BIFF reader.
 * Neither resolves formulas, merged cells, or styling — a flat attendance
 * export never needs them.
 */
final class AttendanceImportFileParser
{
    /** Data rows (excluding header) above this are rejected rather than attempted, mirroring the existing punches/import endpoint's MAX_PUNCHES_PER_REQUEST=5000 safety cap. */
    private const MAX_ROWS = 5000;

    private const COLUMN_SYNONYMS = [
        'biometricUserId' => ['employee id', 'user id', 'biometric id', 'biometric user id', 'employeeid', 'userid', 'no',' No.','enroll no', 'enrollno', 'pin', 'badge number', 'id number'],
        'employeeName' => ['name', 'employee name', 'user name'],
        'timestamp' => ['date time', 'Date/Time', 'date time', 'datetime', 'timestamp', 'punch time', 'date time', 'date time'],
        'time' => ['time'],
        'status' => ['punch type', 'status', 'type', 'verifycode', 'verify code'],
    ];

    /**
     * @return array<int, array{rowNumber:int, biometricUserId:?string, date:?string, time:?string, rawStatus:?string}>
     * @throws \InvalidArgumentException on an unsupported/empty/malformed file, or a header missing a required column
     */
    public static function parse(string $tmpPath, string $originalName): array
    {
        return self::parseWithMetadata($tmpPath, $originalName)['rows'];
    }

    /**
     * @return array{rows: array<int, array{rowNumber:int, biometricUserId:?string, date:?string, time:?string, rawStatus:?string}>, employeeNames: array<int, ?string>}
     * @throws \InvalidArgumentException on an unsupported/empty/malformed file, or a header missing a required column
     */
    public static function parseWithMetadata(string $tmpPath, string $originalName): array
    {
        $ext = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
        $rawRows = match ($ext) {
            'csv' => self::parseCsv($tmpPath),
            'xlsx' => self::parseXlsx($tmpPath),
            'xls' => self::parseXls($tmpPath),
            default => throw new \InvalidArgumentException("Unsupported file type '.{$ext}' — only .xls, .xlsx, and .csv are supported."),
        };

        if (empty($rawRows)) {
            throw new \InvalidArgumentException('File is empty or could not be read.');
        }

        $header = array_map([self::class, 'normalizeHeader'], array_shift($rawRows));
        if (count($rawRows) > self::MAX_ROWS) {
            throw new \InvalidArgumentException('Too many rows in file (max ' . self::MAX_ROWS . ' data rows per import) — split into multiple files.');
        }

        $columnMap = self::detectColumns($header);
        if ($columnMap['biometricUserId'] === null) {
            throw new \InvalidArgumentException('Could not find an Employee ID / User ID / Biometric ID column in the file header.');
        }
        if ($columnMap['timestamp'] === null) {
            throw new \InvalidArgumentException('Could not find a timestamp column in the file header.');
        }

        $records = [];
        $employeeNames = [];
        foreach ($rawRows as $i => $row) {
            // Skip fully blank trailing rows some spreadsheet exports leave behind.
            if (empty(array_filter($row, static fn ($v): bool => trim((string) $v) !== ''))) {
                continue;
            }
            $records[] = [
                'rowNumber' => $i + 2, // +1 for the header row, +1 to make it 1-based
                'biometricUserId' => self::cell($row, $columnMap['biometricUserId']),
                'date' => self::cell($row, $columnMap['timestamp']),
                'time' => null,
                'rawStatus' => $columnMap['status'] !== null ? self::cell($row, $columnMap['status']) : null,
            ];
            $employeeNames[] = $columnMap['employeeName'] !== null ? self::cell($row, $columnMap['employeeName']) : null;
        }
        return ['rows' => $records, 'employeeNames' => $employeeNames];
    }

    private static function cell(array $row, int $index): ?string
    {
        $value = $row[$index] ?? null;
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);
        return $trimmed === '' ? null : $trimmed;
    }

    private static function normalizeHeader(?string $header): string
    {
        $normalized = trim((string) $header);
        $normalized = strtolower($normalized);
        $normalized = str_replace('/', ' ', $normalized);
        $normalized = preg_replace('/[._-]+/', '', $normalized);
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        return trim($normalized);
    }

    /** @return array{biometricUserId:?int, employeeName:?int, timestamp:?int, time:?int, status:?int} */
    private static function detectColumns(array $header): array
    {
        $map = ['biometricUserId' => null, 'employeeName' => null, 'timestamp' => null, 'time' => null, 'status' => null];
        foreach (self::COLUMN_SYNONYMS as $field => $candidates) {
            foreach ($header as $index => $col) {
                $normalized = self::normalizeHeader($col);
                if (in_array($normalized, $candidates, true)) {
                    $map[$field] = $index;
                    break;
                }
            }
        }
        return $map;
    }

    private static function parseCsv(string $path): array
    {
        $handle = @fopen($path, 'r');
        if ($handle === false) {
            throw new \InvalidArgumentException('Could not open uploaded CSV file.');
        }

        // Strip a UTF-8 BOM if present, so the header's first column matches correctly.
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }
        fclose($handle);
        return $rows;
    }

    private static function parseXlsx(string $path): array
    {
        if (!class_exists(\ZipArchive::class)) {
            throw new \RuntimeException('The PHP ZipArchive extension is required to read .xlsx files.');
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            throw new \InvalidArgumentException('Could not open .xlsx file — it may be corrupted.');
        }

        $sharedStrings = self::readSharedStrings($zip);
        $sheetXml = self::findFirstWorksheetXml($zip);
        $zip->close();

        if ($sheetXml === null) {
            throw new \InvalidArgumentException('Could not find worksheet data inside the .xlsx file.');
        }

        $xml = @simplexml_load_string($sheetXml);
        if ($xml === false || !isset($xml->sheetData)) {
            throw new \InvalidArgumentException('Worksheet XML in the .xlsx file could not be parsed.');
        }

        $rows = [];
        foreach ($xml->sheetData->row as $rowXml) {
            $cells = [];
            $lastColIndex = -1;
            foreach ($rowXml->c as $cellXml) {
                $colIndex = self::columnIndexFromRef((string) $cellXml['r']);
                $lastColIndex = max($lastColIndex, $colIndex);
                $cells[$colIndex] = self::cellValue($cellXml, $sharedStrings);
            }
            $line = [];
            for ($i = 0; $i <= $lastColIndex; $i++) {
                $line[] = $cells[$i] ?? null;
            }
            $rows[] = $line;
        }
        return $rows;
    }

    /** OLE2 Compound File Binary Format signature — the container genuine Excel 97-2003 .xls files are normally wrapped in. */
    private const OLE2_SIGNATURE = "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1";

    /**
     * Legacy Excel 97-2003 binary format — used by Attendance Management
     * 2011 and still emitted as an export option by current ZKTeco
     * Attendance Software. Most exports are wrapped in an OLE2 Compound File
     * container (CompoundFileReader unwraps it to get at the raw "Workbook"
     * stream); some ZKTeco Attendance Software builds instead write a bare
     * BIFF8 stream with no container at all, which is detected up front and
     * handed to BiffWorkbookReader directly. Either way, BiffWorkbookReader
     * parses the resulting BIFF8 records into the same row/column shape
     * parseXlsx() produces. See helpers/xls/ for both classes' doc comments.
     */
    private static function parseXls(string $path): array
    {
        $data = @file_get_contents($path);
        if ($data === false) {
            throw new \InvalidArgumentException('Could not open .xls file.');
        }

        if (self::isCompoundFileFormat($data)) {
            $workbookStream = self::extractWorkbookStream($data);
        } elseif (self::isRawBiffFormat($data)) {
            $workbookStream = $data;
        } else {
            throw new \InvalidArgumentException('Could not find workbook data inside the .xls file — it may not be a genuine Excel 97-2003 file.');
        }

        $rows = (new BiffWorkbookReader($workbookStream))->readFirstSheetRows();

        // Numeric cells representing a date/time arrive as raw Excel serial
        // floats (BIFF8 has no cell-level "this is a date" flag this
        // lightweight reader interprets). Two distinct shapes need separate
        // handling: a full date(+time) serial (> 25569, parseXlsx()'s own
        // heuristic, reused here) and a pure time-of-day value — a fraction
        // strictly between 0 and 1, with no date component at all, which a
        // "Time" column exported as a real Excel time cell produces.
        foreach ($rows as &$line) {
            foreach ($line as &$cell) {
                if (!is_float($cell)) {
                    continue;
                }
                if ($cell > 25569 && $cell < 60000) {
                    $converted = self::excelSerialToDate($cell);
                    if ($converted !== null) {
                        $cell = $converted;
                    }
                } elseif ($cell > 0 && $cell < 1) {
                    $cell = self::excelTimeFractionToTime($cell);
                }
            }
        }
        unset($line, $cell);

        return $rows;
    }

    /** True if the file starts with the OLE2 Compound File signature (D0 CF 11 E0 A1 B1 1A E1). */
    private static function isCompoundFileFormat(string $data): bool
    {
        return substr($data, 0, 8) === self::OLE2_SIGNATURE;
    }

    /** True if the file starts directly with a BIFF BOF record (type 0x0809, stored little-endian as bytes 09 08) — i.e. a bare Workbook stream with no OLE2 container around it. */
    private static function isRawBiffFormat(string $data): bool
    {
        return strlen($data) >= 2 && ord($data[0]) === 0x09 && ord($data[1]) === 0x08;
    }

    /** Unwraps the OLE2 container to get at the raw "Workbook" (or legacy "Book") stream. */
    private static function extractWorkbookStream(string $data): string
    {
        $container = new CompoundFileReader($data);
        foreach (['Workbook', 'Book'] as $streamName) {
            try {
                return $container->getStream($streamName);
            } catch (\InvalidArgumentException $e) {
                continue;
            }
        }
        throw new \InvalidArgumentException('Could not find workbook data inside the .xls file — it may not be a genuine Excel 97-2003 file.');
    }

    /** Tries the conventional 'sheet1.xml' first, falling back to whatever worksheet file actually exists in the archive. */
    private static function findFirstWorksheetXml(\ZipArchive $zip): ?string
    {
        $direct = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($direct !== false) {
            return $direct;
        }
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if ($name !== false && preg_match('#^xl/worksheets/sheet\d+\.xml$#', $name)) {
                $content = $zip->getFromName($name);
                return $content === false ? null : $content;
            }
        }
        return null;
    }

    /** @return string[] shared string pool, index-aligned with the "s"-type cell values that reference it */
    private static function readSharedStrings(\ZipArchive $zip): array
    {
        $xmlRaw = $zip->getFromName('xl/sharedStrings.xml');
        if ($xmlRaw === false) {
            return [];
        }
        $xml = @simplexml_load_string($xmlRaw);
        if ($xml === false) {
            return [];
        }
        $strings = [];
        foreach ($xml->si as $si) {
            if (isset($si->t)) {
                $strings[] = (string) $si->t;
            } else {
                $text = '';
                foreach ($si->r as $run) {
                    $text .= (string) $run->t;
                }
                $strings[] = $text;
            }
        }
        return $strings;
    }

    private static function cellValue(\SimpleXMLElement $cellXml, array $sharedStrings): ?string
    {
        $type = (string) $cellXml['t'];

        if ($type === 'inlineStr') {
            return isset($cellXml->is->t) ? (string) $cellXml->is->t : null;
        }
        if (!isset($cellXml->v)) {
            return null;
        }
        $value = (string) $cellXml->v;

        if ($type === 's') {
            $index = (int) $value;
            return $sharedStrings[$index] ?? null;
        }

        // A plain numeric cell formatted as a date in Excel arrives here as
        // just a day-serial number (cell styling isn't parsed) — if it falls
        // in a plausible date range, convert it; otherwise leave it as a raw
        // number string.
        if ($type === '' && is_numeric($value) && (float) $value > 25569 && (float) $value < 60000) {
            $converted = self::excelSerialToDate((float) $value);
            if ($converted !== null) {
                return $converted;
            }
        }
        return $value;
    }

    /** Excel's day-0 is 1899-12-30 (including its historical 1900-leap-year bug), hence the 25569-day offset to Unix epoch. */
    private static function excelSerialToDate(float $serial): ?string
    {
        $days = (int) floor($serial);
        $fraction = $serial - $days;
        $timestamp = ($days - 25569) * 86400 + (int) round($fraction * 86400);
        if ($timestamp <= 0) {
            return null;
        }
        return gmdate($fraction > 0 ? 'Y-m-d H:i:s' : 'Y-m-d', $timestamp);
    }

    /** A pure time-of-day cell (no date component) is stored as a fraction of a 24-hour day — e.g. 0.375 = 09:00:00. */
    private static function excelTimeFractionToTime(float $fraction): string
    {
        $totalSeconds = (int) round($fraction * 86400);
        return gmdate('H:i:s', $totalSeconds);
    }

    private static function columnIndexFromRef(string $ref): int
    {
        preg_match('/^([A-Z]+)/', $ref, $matches);
        $letters = $matches[1] ?? 'A';
        $index = 0;
        foreach (str_split($letters) as $char) {
            $index = $index * 26 + (ord($char) - ord('A') + 1);
        }
        return $index - 1;
    }
}
