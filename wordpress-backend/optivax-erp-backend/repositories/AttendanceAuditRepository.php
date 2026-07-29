<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs GET/POST /attendance/audit — the before/after trail of super_admin's
 * manual attendance edits (src/domain/attendance/calculations.ts AuditEntry).
 * List + create only, no update/delete route is exposed for this sub-resource.
 */
final class AttendanceAuditRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'attendance_audit';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'editedAt' => $row['edited_at'],
            'editedBy' => $row['edited_by'],
            'editedByRole' => $row['edited_by_role'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'attendanceDate' => $row['attendance_date'],
            'previousStatus' => $row['previous_status'],
            'newStatus' => $row['new_status'],
            'previousCheckIn' => $row['previous_check_in'] ?? null,
            'previousCheckOut' => $row['previous_check_out'] ?? null,
            'newCheckIn' => $row['new_check_in'] ?? null,
            'newCheckOut' => $row['new_check_out'] ?? null,
            'reason' => $row['reason'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'edited_at' => Sanitize::text($data['editedAt'] ?? current_time('mysql', true)),
            'edited_by' => Sanitize::text($data['editedBy'] ?? ''),
            'edited_by_role' => Sanitize::text($data['editedByRole'] ?? ''),
            'employee_id' => Sanitize::text($data['employeeId'] ?? ''),
            'employee_name' => Sanitize::text($data['employeeName'] ?? ''),
            'attendance_date' => Sanitize::text($data['attendanceDate'] ?? ''),
            'previous_status' => Sanitize::text($data['previousStatus'] ?? ''),
            'new_status' => Sanitize::text($data['newStatus'] ?? ''),
            'previous_check_in' => Sanitize::text($data['previousCheckIn'] ?? null),
            'previous_check_out' => Sanitize::text($data['previousCheckOut'] ?? null),
            'new_check_in' => Sanitize::text($data['newCheckIn'] ?? null),
            'new_check_out' => Sanitize::text($data['newCheckOut'] ?? null),
            'reason' => Sanitize::textarea($data['reason'] ?? ''),
        ];
    }
}
