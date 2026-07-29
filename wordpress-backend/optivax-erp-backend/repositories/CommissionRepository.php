<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/commissions. Mirrors src/services/commissionService.ts's Commission interface exactly. */
final class CommissionRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'commissions';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'userId' => $row['user_id'],
            'userName' => $row['user_name'] ?? '',
            'type' => $row['type'] ?? 'percentage',
            'value' => (float) $row['value'],
            'projectId' => $row['project_id'] ?: null,
            'projectName' => $row['project_name'] ?: null,
            'invoiceId' => $row['invoice_id'] ?: null,
            'amount' => (float) $row['amount'],
            'status' => $row['status'] ?? 'pending',
            'notes' => $row['notes'] ?: null,
            'createdAt' => $row['created_at'] ?: null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'user_id' => Sanitize::text($data['userId'] ?? ''),
            'user_name' => Sanitize::text($data['userName'] ?? ''),
            'type' => Sanitize::text($data['type'] ?? 'percentage'),
            'value' => Sanitize::float($data['value'] ?? 0),
            'project_id' => Sanitize::text($data['projectId'] ?? null),
            'project_name' => Sanitize::text($data['projectName'] ?? null),
            'invoice_id' => Sanitize::text($data['invoiceId'] ?? null),
            'amount' => Sanitize::float($data['amount'] ?? 0),
            'status' => Sanitize::text($data['status'] ?? 'pending'),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?: current_time('mysql', true),
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('userId', $data)) {
            $row['user_id'] = Sanitize::text($data['userId']);
        }
        if (array_key_exists('userName', $data)) {
            $row['user_name'] = Sanitize::text($data['userName']);
        }
        if (array_key_exists('type', $data)) {
            $row['type'] = Sanitize::text($data['type']);
        }
        if (array_key_exists('value', $data)) {
            $row['value'] = Sanitize::float($data['value']);
        }
        if (array_key_exists('projectId', $data)) {
            $row['project_id'] = Sanitize::text($data['projectId']);
        }
        if (array_key_exists('projectName', $data)) {
            $row['project_name'] = Sanitize::text($data['projectName']);
        }
        if (array_key_exists('invoiceId', $data)) {
            $row['invoice_id'] = Sanitize::text($data['invoiceId']);
        }
        if (array_key_exists('amount', $data)) {
            $row['amount'] = Sanitize::float($data['amount']);
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
