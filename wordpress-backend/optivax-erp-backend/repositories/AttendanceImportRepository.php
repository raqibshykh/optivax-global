<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/attendance/import/*. Two tables: attendance_imports (one
 * row per upload, the summary history list) and attendance_import_rows (one
 * row per sheet row, the append-only ledger record_hash-based duplicate
 * detection is checked against — see findExistingHashes()).
 */
final class AttendanceImportRepository
{
    private function importsTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'attendance_imports';
    }

    private function rowsTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'attendance_import_rows';
    }

    /** @return array<int,string> the subset of $hashes that already exist in attendance_import_rows (i.e. genuine duplicates, possibly from an earlier import). */
    public function findExistingHashes(array $hashes): array
    {
        $hashes = array_values(array_filter($hashes, static fn ($h) => $h !== null && $h !== ''));
        if (empty($hashes)) {
            return [];
        }
        global $wpdb;
        $placeholders = implode(', ', array_fill(0, count($hashes), '%s'));
        return $wpdb->get_col($wpdb->prepare(
            "SELECT record_hash FROM {$this->rowsTable()} WHERE record_hash IN ({$placeholders})",
            $hashes
        )) ?: [];
    }

    /**
     * @param array $rows each: id?,importId,rowNumber,biometricUserId,employeeId,recordDate,recordTime,punchType,rawStatus,recordHash,status,errorMessage
     * @throws \RuntimeException if a row's insert fails for any reason other than a duplicate
     * record_hash — a repeat hash is expected here (buildPreviewRows()'s own duplicate-detection
     * already marked that row 'duplicate' upstream; this ledger still records it, same as the
     * INSERT IGNORE this replaced tolerated), so it's skipped rather than treated as a failure.
     * Any other failure is unexpected and must not be swallowed.
     *
     * Per-row $wpdb->insert() instead of one hand-built multi-row VALUES statement: wpdb's own
     * insert helper always wraps every column name (and the table name) in backticks
     * internally, so a column that happens to collide with a MariaDB/MySQL reserved word (e.g.
     * `row_number`, reserved since MariaDB 10.2 / MySQL 8.0 for the ROW_NUMBER() window
     * function) can never again produce malformed SQL the way the old bare, unquoted column
     * list did.
     */
    public function bulkInsertRows(array $rows): void
    {
        if (empty($rows)) {
            return;
        }

        global $wpdb;
        $now = current_time('mysql', true);
        $insertedCount = 0;
        $skippedDuplicates = 0;

        foreach ($rows as $row) {
            $data = [
                'id' => $row['id'] ?? Uuid::v4(),
                'import_id' => $row['importId'],
                'row_number' => (int) $row['rowNumber'],
                'biometric_user_id' => $row['biometricUserId'] ?? null,
                'employee_id' => $row['employeeId'] ?? null,
                'record_date' => $row['recordDate'] ?? null,
                'record_time' => $row['recordTime'] ?? null,
                'punch_type' => $row['punchType'] ?? null,
                'raw_status' => $row['rawStatus'] ?? null,
                'record_hash' => $row['recordHash'] ?? null,
                'status' => $row['status'],
                'error_message' => $row['errorMessage'] ?? null,
                'created_at' => $now,
            ];

            $result = $wpdb->insert($this->rowsTable(), $data);

            if ($result === false) {
                if ($wpdb->last_error !== '' && str_contains($wpdb->last_error, 'Duplicate entry')) {
                    $skippedDuplicates++;
                    continue;
                }

                error_log(sprintf(
                    '[ATTENDANCE-IMPORT] bulkInsertRows() row insert failed — employeeId=%s importId=%s rowNumber=%s recordHash=%s last_error=%s',
                    (string) ($row['employeeId'] ?? 'NULL'),
                    (string) ($row['importId'] ?? 'NULL'),
                    (string) ($row['rowNumber'] ?? 'NULL'),
                    (string) ($row['recordHash'] ?? 'NULL'),
                    $wpdb->last_error
                ));
                throw new \RuntimeException($wpdb->last_error);
            }

            $insertedCount++;
        }

        error_log("[ATTENDANCE-IMPORT] bulkInsertRows() complete — inserted={$insertedCount} skippedDuplicates={$skippedDuplicates} totalRows=" . count($rows));
    }

    /** @return array<int, array{recordTime:string, punchType:string}> successfully-imported rows for one employee+day, ordered by time — used by AttendanceImportService::aggregateDay(). */
    public function forEmployeeAndDate(string $employeeId, string $date): array
    {
        global $wpdb;
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT record_time, punch_type FROM {$this->rowsTable()} WHERE employee_id = %s AND record_date = %s AND status = 'imported' ORDER BY record_time ASC",
                $employeeId,
                $date
            ),
            ARRAY_A
        );
        return array_map(static fn (array $r): array => ['recordTime' => $r['record_time'], 'punchType' => $r['punch_type']], $rows ?: []);
    }

    public function createImportRecord(array $data): array
    {
        global $wpdb;
        $row = [
            'id' => Uuid::v4(),
            'file_name' => Sanitize::text($data['fileName']),
            'total_records' => (int) $data['totalRecords'],
            'imported_records' => (int) $data['importedRecords'],
            'duplicate_records' => (int) $data['duplicateRecords'],
            'failed_records' => (int) $data['failedRecords'],
            'error_summary' => $data['errorSummary'] !== null ? Sanitize::textarea($data['errorSummary']) : null,
            'uploaded_by' => Sanitize::text($data['uploadedBy']),
            'uploaded_at' => current_time('mysql', true),
        ];
        $wpdb->insert($this->importsTable(), $row);
        return $this->toDto($row);
    }

    /** @return array{0: array, 1: int} [rows, totalCount] */
    public function listImports(int $page, int $perPage): array
    {
        global $wpdb;
        $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->importsTable()}");
        $offset = max(0, ($page - 1) * $perPage);
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->importsTable()} ORDER BY uploaded_at DESC LIMIT %d OFFSET %d",
                $perPage,
                $offset
            ),
            ARRAY_A
        );
        return [array_map([$this, 'toDto'], $rows ?: []), $total];
    }

    private function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'fileName' => $row['file_name'],
            'totalRecords' => (int) $row['total_records'],
            'importedRecords' => (int) $row['imported_records'],
            'duplicateRecords' => (int) $row['duplicate_records'],
            'failedRecords' => (int) $row['failed_records'],
            'errorSummary' => $row['error_summary'] ?? null,
            'uploadedBy' => $row['uploaded_by'],
            'uploadedAt' => $row['uploaded_at'],
        ];
    }
}
