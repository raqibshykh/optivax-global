<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/hr/employee-leave-requests — the employee self-submitted
 * leave feature (src/services/leaveRequestService.ts LeaveRequest, submitted
 * from src/pages/Client/Profile.tsx, reviewed from HRPanel.tsx/SuperAdminPanel.tsx).
 * No delete endpoint exists for this sub-resource per the frontend contract.
 */
final class LeaveRequestEmployeeRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'leave_requests_employee';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'role' => $row['role'],
            'department' => $row['department'],
            'type' => $row['type'],
            'startDate' => $row['start_date'],
            'endDate' => $row['end_date'],
            'days' => (int) $row['days'],
            'reason' => $row['reason'],
            'status' => $row['status'],
            'submittedAt' => $row['submitted_at'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'employee_id' => Sanitize::text($data['employeeId'] ?? ''),
            'employee_name' => Sanitize::text($data['employeeName'] ?? ''),
            'role' => Sanitize::text($data['role'] ?? ''),
            'department' => Sanitize::text($data['department'] ?? ''),
            'type' => Sanitize::text($data['type'] ?? ''),
            'start_date' => Sanitize::text($data['startDate'] ?? ''),
            'end_date' => Sanitize::text($data['endDate'] ?? ''),
            'days' => Sanitize::int($data['days'] ?? 0),
            'reason' => Sanitize::textarea($data['reason'] ?? ''),
            'status' => Sanitize::text($data['status'] ?? 'Pending'),
            'submitted_at' => Sanitize::text($data['submittedAt'] ?? current_time('mysql', true)),
        ];
    }

    /** PUT /hr/employee-leave-requests/{id} body is { status } only. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        return $row;
    }
}
