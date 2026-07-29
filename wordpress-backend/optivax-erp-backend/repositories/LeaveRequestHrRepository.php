<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/leave-requests — the HR full-lifecycle leave feature
 * (src/services/leaveRequestService.ts HRLeaveRequest / HR/LeaveRequests.tsx).
 * Kept fully separate from LeaveRequestEmployeeRepository's table — the two
 * features grew independently on the frontend with different shapes/vocab
 * and were never unified there, so they are not unified here either.
 */
final class LeaveRequestHrRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'leave_requests_hr';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'userId' => $row['user_id'],
            'userName' => $row['user_name'],
            'userRole' => $row['user_role'],
            'departmentId' => $row['department_id'] ?? null,
            'type' => $row['type'],
            'startDate' => $row['start_date'],
            'endDate' => $row['end_date'],
            'days' => (int) $row['days'],
            'reason' => $row['reason'],
            'status' => $row['status'],
            'reviewedBy' => $row['reviewed_by'] ?? null,
            'reviewNote' => $row['review_note'] ?? null,
            'createdAt' => $row['created_at'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'user_id' => Sanitize::text($data['userId'] ?? ''),
            'user_name' => Sanitize::text($data['userName'] ?? ''),
            'user_role' => Sanitize::text($data['userRole'] ?? ''),
            'department_id' => Sanitize::text($data['departmentId'] ?? null),
            'type' => Sanitize::text($data['type'] ?? ''),
            'start_date' => Sanitize::text($data['startDate'] ?? ''),
            'end_date' => Sanitize::text($data['endDate'] ?? ''),
            'days' => Sanitize::int($data['days'] ?? 0),
            'reason' => Sanitize::textarea($data['reason'] ?? ''),
            'status' => Sanitize::text($data['status'] ?? 'pending'),
            'reviewed_by' => Sanitize::text($data['reviewedBy'] ?? null),
            'review_note' => Sanitize::textarea($data['reviewNote'] ?? null),
            'created_at' => Sanitize::text($data['createdAt'] ?? current_time('mysql', true)),
        ];
    }

    /** PUT /leave-requests/{id} body is { status, reviewedBy, reviewNote? } — only touch supplied fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('reviewedBy', $data)) {
            $row['reviewed_by'] = Sanitize::text($data['reviewedBy']);
        }
        if (array_key_exists('reviewNote', $data)) {
            $row['review_note'] = Sanitize::textarea($data['reviewNote']);
        }
        return $row;
    }
}
