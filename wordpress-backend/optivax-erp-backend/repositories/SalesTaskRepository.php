<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs `sales_tasks` (src/types.ts SalesTask, salesOpsService.ts SalesTaskService)
 * — a sales-specific task list, separate from the generic Task/`tasks` table
 * owned by another module. `assigned_to` here is a plain single-user string
 * column (equality filter), not a JSON array like SalesCampaignRepository's
 * `assigned_members`.
 */
final class SalesTaskRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'sales_tasks';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'description' => $row['description'] ?? '',
            'assignedTo' => $row['assigned_to'],
            'assignedName' => $row['assigned_name'],
            'priority' => $row['priority'],
            'dueDate' => $row['due_date'],
            'status' => $row['status'],
            'estimatedValue' => (float) $row['estimated_value'],
            'notes' => $row['notes'] ?? null,
            'createdAt' => $row['created_at'],
            'createdBy' => $row['created_by'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'title' => Sanitize::text($data['title'] ?? ''),
            'description' => Sanitize::textarea($data['description'] ?? null),
            'assigned_to' => Sanitize::text($data['assignedTo'] ?? ''),
            'assigned_name' => Sanitize::text($data['assignedName'] ?? ''),
            'priority' => Sanitize::text($data['priority'] ?? ''),
            'due_date' => Sanitize::text($data['dueDate'] ?? null),
            'status' => Sanitize::text($data['status'] ?? ''),
            'estimated_value' => Sanitize::float($data['estimatedValue'] ?? 0),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
            'created_at' => $data['createdAt'] ?? current_time('mysql', true),
            'created_by' => Sanitize::text($data['createdBy'] ?? ''),
        ];
    }

    protected function fromDtoForUpdate(array $data): array
    {
        $map = [
            'title' => 'title',
            'description' => 'description',
            'assignedTo' => 'assigned_to',
            'assignedName' => 'assigned_name',
            'priority' => 'priority',
            'dueDate' => 'due_date',
            'status' => 'status',
            'notes' => 'notes',
        ];

        $row = [];
        foreach ($map as $dtoKey => $column) {
            if (!array_key_exists($dtoKey, $data)) {
                continue;
            }
            $row[$column] = in_array($column, ['description', 'notes'], true)
                ? Sanitize::textarea($data[$dtoKey])
                : Sanitize::text($data[$dtoKey]);
        }
        if (array_key_exists('estimatedValue', $data)) {
            $row['estimated_value'] = Sanitize::float($data['estimatedValue']);
        }
        return $row;
    }
}
