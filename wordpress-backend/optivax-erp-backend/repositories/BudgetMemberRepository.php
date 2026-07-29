<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs GET/PUT /budget/members (MemberAllocation[]). Same replace-whole-list
 * pattern as BudgetDepartmentRepository — src/services/budgetService.ts
 * saveMemberAllocations sends `{ allocations }` for the full snapshot.
 */
final class BudgetMemberRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'budget_members';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'employeeRole' => $row['employee_role'],
            'department' => $row['department'],
            'allocatedAmount' => (float) $row['allocated_amount'],
            'usedAmount' => (float) $row['used_amount'],
            'allocatedById' => $row['allocated_by_id'],
            'allocatedByName' => $row['allocated_by_name'],
            'allocatedAt' => $row['allocated_at'],
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'employee_id' => Sanitize::text($data['employeeId'] ?? ''),
            'employee_name' => Sanitize::text($data['employeeName'] ?? ''),
            'employee_role' => Sanitize::text($data['employeeRole'] ?? ''),
            'department' => Sanitize::text($data['department'] ?? ''),
            'allocated_amount' => Sanitize::float($data['allocatedAmount'] ?? 0),
            'used_amount' => Sanitize::float($data['usedAmount'] ?? 0),
            'allocated_by_id' => Sanitize::text($data['allocatedById'] ?? ''),
            'allocated_by_name' => Sanitize::text($data['allocatedByName'] ?? ''),
            'allocated_at' => Sanitize::text($data['allocatedAt'] ?? current_time('mysql', true)),
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null),
        ];
    }

    /**
     * PUT /budget/members replaces the whole list — the frontend always sends
     * the full MemberAllocation[] snapshot.
     *
     * @param string|null $scopeDepartment same department-scoping contract as
     * BudgetDepartmentRepository::replaceAll() — restricts the delete+reinsert
     * to one department and forces every incoming item onto it.
     */
    public function replaceAll(array $allocations, ?string $scopeDepartment = null): void
    {
        Transaction::run(function () use ($allocations, $scopeDepartment) {
            global $wpdb;
            $table = $this->table();
            if ($scopeDepartment !== null) {
                $wpdb->delete($table, ['department' => $scopeDepartment]);
            } else {
                $wpdb->query("DELETE FROM {$table}");
            }
            foreach ($allocations as $item) {
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
