<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/payroll/advance-requests. Deliberately NOT an
 * AbstractRepository — the frontend only ever reads the whole list and
 * bulk-saves the whole list back (src/services/payrollService.ts
 * getAdvanceRequests/saveAdvanceRequests); there is no single-record create
 * or update-by-id route for this sub-resource.
 */
final class AdvanceSalaryRepository
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'advance_salary_requests';
    }

    /** @param string|null $employeeId when given, restricts to that employee's own requests. */
    public function list(?string $employeeId = null): array
    {
        global $wpdb;
        $table = $this->table();
        if ($employeeId !== null) {
            $rows = $wpdb->get_results(
                $wpdb->prepare("SELECT * FROM {$table} WHERE employee_id = %s ORDER BY request_date DESC", $employeeId),
                ARRAY_A
            );
        } else {
            $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY request_date DESC", ARRAY_A);
        }
        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** PUT /payroll/advance-requests replaces the whole list — the frontend always sends the full AdvanceSalaryRequest[] snapshot. */
    public function bulkSave(array $requests): void
    {
        Transaction::run(function () use ($requests) {
            global $wpdb;
            $table = $this->table();
            $wpdb->query("DELETE FROM {$table}");
            foreach ($requests as $req) {
                if (is_array($req)) {
                    $wpdb->insert($table, $this->fromDto($req));
                }
            }
        });
    }

    private function fromDto(array $data): array
    {
        return [
            'id' => $data['id'] ?? Uuid::v4(),
            'employee_id' => Sanitize::text($data['employeeId'] ?? ''),
            'employee_name' => Sanitize::text($data['employeeName'] ?? ''),
            'employee_role' => Sanitize::text($data['employeeRole'] ?? ''),
            'department' => Sanitize::text($data['department'] ?? ''),
            'requested_amount' => Sanitize::float($data['requestedAmount'] ?? 0),
            'reason' => Sanitize::textarea($data['reason'] ?? ''),
            'request_date' => Sanitize::text($data['requestDate'] ?? ''),
            'status' => Sanitize::text($data['status'] ?? 'pending'),
            'approved_by_id' => Sanitize::text($data['approvedById'] ?? null),
            'approved_by_name' => Sanitize::text($data['approvedByName'] ?? null),
            'approved_at' => Sanitize::text($data['approvedAt'] ?? null),
            'rejection_reason' => Sanitize::textarea($data['rejectionReason'] ?? null),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
        ];
    }

    private function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'employeeRole' => $row['employee_role'],
            'department' => $row['department'],
            'requestedAmount' => (float) $row['requested_amount'],
            'reason' => $row['reason'],
            'requestDate' => $row['request_date'],
            'status' => $row['status'],
            'approvedById' => $row['approved_by_id'] ?? null,
            'approvedByName' => $row['approved_by_name'] ?? null,
            'approvedAt' => $row['approved_at'] ?? null,
            'rejectionReason' => $row['rejection_reason'] ?? null,
            'notes' => $row['notes'] ?? null,
        ];
    }
}
