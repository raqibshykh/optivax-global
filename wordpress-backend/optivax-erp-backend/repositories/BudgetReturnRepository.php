<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs GET/POST /budget/returns (BudgetReturn[]) — list + create only, no update/delete route. */
final class BudgetReturnRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'budget_returns';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'department' => $row['department'],
            'adminId' => $row['admin_id'],
            'adminName' => $row['admin_name'],
            'adminRole' => $row['admin_role'],
            'previousAllocated' => (float) $row['previous_allocated'],
            'returnedAmount' => (float) $row['returned_amount'],
            'newAllocated' => (float) $row['new_allocated'],
            'reason' => $row['reason'],
            'notes' => $row['notes'] ?? null,
            'timestamp' => $row['timestamp'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'department' => Sanitize::text($data['department'] ?? ''),
            'admin_id' => Sanitize::text($data['adminId'] ?? ''),
            'admin_name' => Sanitize::text($data['adminName'] ?? ''),
            'admin_role' => Sanitize::text($data['adminRole'] ?? ''),
            'previous_allocated' => Sanitize::float($data['previousAllocated'] ?? 0),
            'returned_amount' => Sanitize::float($data['returnedAmount'] ?? 0),
            'new_allocated' => Sanitize::float($data['newAllocated'] ?? 0),
            'reason' => Sanitize::textarea($data['reason'] ?? ''),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
            'timestamp' => Sanitize::text($data['timestamp'] ?? current_time('mysql', true)),
        ];
    }
}
