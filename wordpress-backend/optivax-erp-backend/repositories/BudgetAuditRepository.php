<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs GET/POST /budget/audit (BudgetAuditEntry[]) — list + create only, no update/delete route. */
final class BudgetAuditRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'budget_audit';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'action' => $row['action'],
            'previousAmount' => $row['previous_amount'] !== null ? (float) $row['previous_amount'] : null,
            'newAmount' => $row['new_amount'] !== null ? (float) $row['new_amount'] : null,
            'performedById' => $row['performed_by_id'],
            'performedByName' => $row['performed_by_name'],
            'performedByRole' => $row['performed_by_role'],
            'targetName' => $row['target_name'] ?? null,
            'department' => $row['department'] ?? null,
            'fromDepartment' => $row['from_department'] ?? null,
            'toDepartment' => $row['to_department'] ?? null,
            'purpose' => $row['purpose'] ?? null,
            'previousPurpose' => $row['previous_purpose'] ?? null,
            'timestamp' => $row['timestamp'],
            'notes' => $row['notes'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'action' => Sanitize::text($data['action'] ?? ''),
            'previous_amount' => array_key_exists('previousAmount', $data) ? Sanitize::float($data['previousAmount']) : null,
            'new_amount' => array_key_exists('newAmount', $data) ? Sanitize::float($data['newAmount']) : null,
            'performed_by_id' => Sanitize::text($data['performedById'] ?? ''),
            'performed_by_name' => Sanitize::text($data['performedByName'] ?? ''),
            'performed_by_role' => Sanitize::text($data['performedByRole'] ?? ''),
            'target_name' => Sanitize::text($data['targetName'] ?? null),
            'department' => Sanitize::text($data['department'] ?? null),
            'from_department' => Sanitize::text($data['fromDepartment'] ?? null),
            'to_department' => Sanitize::text($data['toDepartment'] ?? null),
            'purpose' => Sanitize::text($data['purpose'] ?? null),
            'previous_purpose' => Sanitize::text($data['previousPurpose'] ?? null),
            'timestamp' => Sanitize::text($data['timestamp'] ?? current_time('mysql', true)),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
        ];
    }
}
