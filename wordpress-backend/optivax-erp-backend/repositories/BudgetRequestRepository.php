<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs GET/POST/PUT /budget/requests (BudgetRequest[]). PUT is overloaded on
 * the frontend (src/services/budgetService.ts): saveBudgetRequests() sends
 * `{ requests: [...] }` to bulk-replace the whole list, while
 * updateBudgetRequest() sends `{ id, ...patch }` to patch one record.
 * BudgetController inspects the body shape and calls bulkSave() or the
 * inherited update() accordingly — see fromDtoForUpdate() for the patch path.
 */
final class BudgetRequestRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'budget_requests';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'department' => $row['department'],
            'adminId' => $row['admin_id'],
            'adminName' => $row['admin_name'],
            'adminRole' => $row['admin_role'],
            'requestedAmount' => (float) $row['requested_amount'],
            'approvedAmount' => $row['approved_amount'] !== null ? (float) $row['approved_amount'] : null,
            'status' => $row['status'],
            'priority' => $row['priority'],
            'justification' => $row['justification'],
            'notes' => $row['notes'] ?? null,
            'actionedById' => $row['actioned_by_id'] ?? null,
            'actionedByName' => $row['actioned_by_name'] ?? null,
            'actionNotes' => $row['action_notes'] ?? null,
            'submittedAt' => $row['submitted_at'],
            'actionedAt' => $row['actioned_at'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'department' => Sanitize::text($data['department'] ?? ''),
            'admin_id' => Sanitize::text($data['adminId'] ?? ''),
            'admin_name' => Sanitize::text($data['adminName'] ?? ''),
            'admin_role' => Sanitize::text($data['adminRole'] ?? ''),
            'requested_amount' => Sanitize::float($data['requestedAmount'] ?? 0),
            'approved_amount' => array_key_exists('approvedAmount', $data) ? Sanitize::float($data['approvedAmount']) : null,
            'status' => Sanitize::text($data['status'] ?? 'Pending'),
            'priority' => Sanitize::text($data['priority'] ?? 'Medium'),
            'justification' => Sanitize::textarea($data['justification'] ?? ''),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
            'actioned_by_id' => Sanitize::text($data['actionedById'] ?? null),
            'actioned_by_name' => Sanitize::text($data['actionedByName'] ?? null),
            'action_notes' => Sanitize::textarea($data['actionNotes'] ?? null),
            'submitted_at' => Sanitize::text($data['submittedAt'] ?? current_time('mysql', true)),
            'actioned_at' => Sanitize::text($data['actionedAt'] ?? null),
        ];
    }

    /** Patch-by-id branch of the dual-mode PUT /budget/requests dispatch — only touches supplied fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('department', $data)) {
            $row['department'] = Sanitize::text($data['department']);
        }
        if (array_key_exists('requestedAmount', $data)) {
            $row['requested_amount'] = Sanitize::float($data['requestedAmount']);
        }
        if (array_key_exists('approvedAmount', $data)) {
            $row['approved_amount'] = Sanitize::float($data['approvedAmount']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('priority', $data)) {
            $row['priority'] = Sanitize::text($data['priority']);
        }
        if (array_key_exists('justification', $data)) {
            $row['justification'] = Sanitize::textarea($data['justification']);
        }
        if (array_key_exists('notes', $data)) {
            $row['notes'] = Sanitize::textarea($data['notes']);
        }
        if (array_key_exists('actionedById', $data)) {
            $row['actioned_by_id'] = Sanitize::text($data['actionedById']);
        }
        if (array_key_exists('actionedByName', $data)) {
            $row['actioned_by_name'] = Sanitize::text($data['actionedByName']);
        }
        if (array_key_exists('actionNotes', $data)) {
            $row['action_notes'] = Sanitize::textarea($data['actionNotes']);
        }
        if (array_key_exists('actionedAt', $data)) {
            $row['actioned_at'] = Sanitize::text($data['actionedAt']);
        }
        return $row;
    }

    /**
     * Bulk-save branch of the dual-mode PUT /budget/requests dispatch — the
     * frontend sends the full snapshot.
     *
     * @param string|null $scopeDepartment same department-scoping contract as
     * BudgetDepartmentRepository::replaceAll() — restricts the delete+reinsert
     * to one department and forces every incoming item onto it.
     */
    public function bulkSave(array $requests, ?string $scopeDepartment = null): void
    {
        Transaction::run(function () use ($requests, $scopeDepartment) {
            global $wpdb;
            $table = $this->table();
            if ($scopeDepartment !== null) {
                $wpdb->delete($table, ['department' => $scopeDepartment]);
            } else {
                $wpdb->query("DELETE FROM {$table}");
            }
            foreach ($requests as $item) {
                if (!is_array($item)) {
                    continue;
                }
                if ($scopeDepartment !== null) {
                    $item['department'] = $scopeDepartment;
                }
                $row = $this->fromDtoForCreate($item);
                $row['id'] = $item['id'] ?? Uuid::v4();
                $wpdb->insert($table, $row);
            }
        });
    }
}
