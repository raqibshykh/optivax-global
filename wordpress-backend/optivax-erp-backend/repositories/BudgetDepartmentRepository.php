<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs GET/PUT /budget/departments (DeptAllocation[]). PUT replaces the
 * whole list (src/services/budgetService.ts saveDeptAllocations sends
 * `{ allocations }` for the full snapshot), so this adds a bespoke
 * replaceAll() alongside the inherited list().
 */
final class BudgetDepartmentRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'budget_departments';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'department' => $row['department'],
            'adminId' => $row['admin_id'],
            'adminName' => $row['admin_name'],
            'allocatedAmount' => (float) $row['allocated_amount'],
            'purpose' => $row['purpose'] ?? null,
            'effectiveDate' => $row['effective_date'] ?? null,
            'allocatedAt' => $row['allocated_at'],
            'updatedAt' => $row['updated_at'] ?? null,
            'allocatedById' => $row['allocated_by_id'],
            'allocatedByName' => $row['allocated_by_name'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'department' => Sanitize::text($data['department'] ?? ''),
            'admin_id' => Sanitize::text($data['adminId'] ?? ''),
            'admin_name' => Sanitize::text($data['adminName'] ?? ''),
            'allocated_amount' => Sanitize::float($data['allocatedAmount'] ?? 0),
            'purpose' => Sanitize::text($data['purpose'] ?? null),
            'effective_date' => Sanitize::text($data['effectiveDate'] ?? null),
            'allocated_at' => Sanitize::text($data['allocatedAt'] ?? current_time('mysql', true)),
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null),
            'allocated_by_id' => Sanitize::text($data['allocatedById'] ?? ''),
            'allocated_by_name' => Sanitize::text($data['allocatedByName'] ?? ''),
        ];
    }

    /**
     * PUT /budget/departments replaces the whole list — the frontend always
     * sends the full DeptAllocation[] snapshot.
     *
     * @param string|null $scopeDepartment when given (a department-scoped
     * caller, i.e. anyone without DepartmentScopeMiddleware::hasAllDepartmentAccess()),
     * only that department's rows are deleted/replaced and every incoming
     * item is forced onto that department, so a single admin's save can
     * never wipe or overwrite another department's allocation. Null (the
     * default) preserves the original whole-table replace for full-access
     * callers (super_admin/management/hr_admin/hr_member).
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
