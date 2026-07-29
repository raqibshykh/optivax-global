<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/it/attendance-exceptions/* (src/services/itSupportService.ts
 * AttendanceException). List/update only from the route's perspective — no
 * create/delete endpoint, since exceptions are presumably detected
 * automatically by a real attendance-sync process (out of scope for this
 * foundation tier). fromDtoForCreate() is implemented for completeness/future use.
 */
final class ItAttendanceExceptionRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'it_attendance_exceptions';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'department' => $row['department'],
            'date' => $row['date'],
            'exceptionType' => $row['exception_type'],
            'checkIn' => $row['check_in'] ?? null,
            'checkOut' => $row['check_out'] ?? null,
            'expectedCheckIn' => $row['expected_check_in'],
            'status' => $row['status'],
            'notes' => $row['notes'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'employee_id' => Sanitize::text($data['employeeId'] ?? ''),
            'employee_name' => Sanitize::text($data['employeeName'] ?? null),
            'department' => Sanitize::text($data['department'] ?? null),
            'date' => Sanitize::text($data['date'] ?? null),
            'exception_type' => Sanitize::text($data['exceptionType'] ?? ''),
            'check_in' => Sanitize::text($data['checkIn'] ?? null),
            'check_out' => Sanitize::text($data['checkOut'] ?? null),
            'expected_check_in' => Sanitize::text($data['expectedCheckIn'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'pending'),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
        ];
    }

    /** Only touches columns actually present in the patch, so a partial PUT can't blank out unrelated fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('employeeId', $data)) {
            $row['employee_id'] = Sanitize::text($data['employeeId']);
        }
        if (array_key_exists('employeeName', $data)) {
            $row['employee_name'] = Sanitize::text($data['employeeName']);
        }
        if (array_key_exists('department', $data)) {
            $row['department'] = Sanitize::text($data['department']);
        }
        if (array_key_exists('date', $data)) {
            $row['date'] = Sanitize::text($data['date']);
        }
        if (array_key_exists('exceptionType', $data)) {
            $row['exception_type'] = Sanitize::text($data['exceptionType']);
        }
        if (array_key_exists('checkIn', $data)) {
            $row['check_in'] = Sanitize::text($data['checkIn']);
        }
        if (array_key_exists('checkOut', $data)) {
            $row['check_out'] = Sanitize::text($data['checkOut']);
        }
        if (array_key_exists('expectedCheckIn', $data)) {
            $row['expected_check_in'] = Sanitize::text($data['expectedCheckIn']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('notes', $data)) {
            $row['notes'] = Sanitize::textarea($data['notes']);
        }
        return $row;
    }
}
