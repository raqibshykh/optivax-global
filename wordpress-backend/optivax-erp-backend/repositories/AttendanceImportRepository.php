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

    /** @param array $rows each: id?,importId,rowNumber,biometricUserId,employeeId,recordDate,recordTime,punchType,rawStatus,recordHash,status,errorMessage */
    public function bulkInsertRows(array $rows): void
    {
        if (empty($rows)) {
            return;
        }
        global $wpdb;
        $columns = ['id', 'import_id', 'row_number', 'biometric_user_id', 'employee_id', 'record_date', 'record_time', 'punch_type', 'raw_status', 'record_hash', 'status', 'error_message', 'created_at'];
        $now = current_time('mysql', true);

        $flatValues = [];
        foreach ($rows as $row) {
            $mapped = [
                $row['id'] ?? Uuid::v4(),
                $row['importId'],
                (int) $row['rowNumber'],
                $row['biometricUserId'] ?? null,
                $row['employeeId'] ?? null,
                $row['recordDate'] ?? null,
                $row['recordTime'] ?? null,
                $row['punchType'] ?? null,
                $row['rawStatus'] ?? null,
                $row['recordHash'] ?? null,
                $row['status'],
                $row['errorMessage'] ?? null,
                $now,
            ];
            foreach ($mapped as $value) {
                $flatValues[] = $value;
            }
        }

        $placeholderRow = '(' . implode(', ', array_fill(0, count($columns), '%s')) . ')';
        $placeholders = implode(', ', array_fill(0, count($rows), $placeholderRow));
        $columnList = implode(', ', $columns);

        $sql = "INSERT IGNORE INTO {$this->rowsTable()} ({$columnList}) VALUES {$placeholders}";
        $wpdb->query($wpdb->prepare($sql, $flatValues));
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
