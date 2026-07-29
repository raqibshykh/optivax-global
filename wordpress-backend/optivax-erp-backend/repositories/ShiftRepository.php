<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/shifts/* (ShiftMasterMigration's `department_shifts` table). */
final class ShiftRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'department_shifts';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'departmentId' => $row['department_id'],
            'shiftName' => $row['shift_name'],
            'startTime' => substr((string) $row['start_time'], 0, 5),
            'endTime' => substr((string) $row['end_time'], 0, 5),
            'graceMinutes' => (int) $row['grace_minutes'],
            'status' => $row['status'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'department_id' => Sanitize::text($data['departmentId'] ?? ''),
            'shift_name' => Sanitize::text($data['shiftName'] ?? ''),
            'start_time' => Sanitize::text($data['startTime'] ?? '') . ':00',
            'end_time' => Sanitize::text($data['endTime'] ?? '') . ':00',
            'grace_minutes' => (int) ($data['graceMinutes'] ?? 30),
            'status' => Sanitize::text($data['status'] ?? 'active'),
            'created_at' => current_time('mysql', true),
        ];
    }

    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('shiftName', $data)) {
            $row['shift_name'] = Sanitize::text($data['shiftName']);
        }
        if (array_key_exists('startTime', $data)) {
            $row['start_time'] = Sanitize::text($data['startTime']) . ':00';
        }
        if (array_key_exists('endTime', $data)) {
            $row['end_time'] = Sanitize::text($data['endTime']) . ':00';
        }
        if (array_key_exists('graceMinutes', $data)) {
            $row['grace_minutes'] = (int) $data['graceMinutes'];
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (!empty($row)) {
            $row['updated_at'] = current_time('mysql', true);
        }
        return $row;
    }
}
