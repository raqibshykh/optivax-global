<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs GET/POST /payroll/advance-audit. Field shape is taken directly from
 * src/services/payrollService.ts's AdvanceSalaryAuditEntry (action, requestId,
 * employeeId, employeeName, employeeRole, department, amount, performedById,
 * performedByName, performedByRole, timestamp, notes) — the frontend posts
 * `Omit<AdvanceSalaryAuditEntry, "id" | "timestamp">`, so both id and
 * timestamp are generated server-side (id via AbstractRepository::create(),
 * timestamp via the column default / current_time() fallback below).
 */
final class AdvanceSalaryAuditRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'advance_salary_audit';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'action' => $row['action'],
            'requestId' => $row['request_id'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'employeeRole' => $row['employee_role'],
            'department' => $row['department'],
            'amount' => (float) $row['amount'],
            'performedById' => $row['performed_by_id'],
            'performedByName' => $row['performed_by_name'],
            'performedByRole' => $row['performed_by_role'],
            'timestamp' => $row['timestamp'],
            'notes' => $row['notes'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'action' => Sanitize::text($data['action'] ?? ''),
            'request_id' => Sanitize::text($data['requestId'] ?? ''),
            'employee_id' => Sanitize::text($data['employeeId'] ?? ''),
            'employee_name' => Sanitize::text($data['employeeName'] ?? ''),
            'employee_role' => Sanitize::text($data['employeeRole'] ?? ''),
            'department' => Sanitize::text($data['department'] ?? ''),
            'amount' => Sanitize::float($data['amount'] ?? 0),
            'performed_by_id' => Sanitize::text($data['performedById'] ?? ''),
            'performed_by_name' => Sanitize::text($data['performedByName'] ?? ''),
            'performed_by_role' => Sanitize::text($data['performedByRole'] ?? ''),
            'timestamp' => Sanitize::text($data['timestamp'] ?? current_time('mysql', true)),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
        ];
    }
}
