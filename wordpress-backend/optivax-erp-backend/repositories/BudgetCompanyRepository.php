<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/budget/company (+ /budget/company/reset). Singleton row
 * (id always 1), same pattern as company_settings — bespoke, not
 * AbstractRepository, since there is exactly one row and no list/id-routing.
 * Frontend id is always the literal string "master" (CompanyBudget.id: "master"),
 * mapped to/from the DB's fixed id=1.
 */
final class BudgetCompanyRepository
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'budget_company';
    }

    public function get(): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row("SELECT * FROM {$this->table()} WHERE id = 1", ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }

    /** Full-object upsert — the frontend always PUTs the whole CompanyBudget. */
    public function put(array $data): void
    {
        global $wpdb;
        $table = $this->table();
        $existing = $this->get();

        $row = [
            'total_amount' => Sanitize::float($data['totalAmount'] ?? 0),
            'fiscal_year' => Sanitize::text($data['fiscalYear'] ?? ''),
            'description' => Sanitize::textarea($data['description'] ?? ''),
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null),
            'created_by_id' => Sanitize::text($data['createdById'] ?? ($existing['createdById'] ?? '')),
            'created_by_name' => Sanitize::text($data['createdByName'] ?? ($existing['createdByName'] ?? '')),
        ];

        if ($existing) {
            $wpdb->update($table, $row, ['id' => 1]);
            return;
        }

        $row['id'] = 1;
        $row['created_at'] = Sanitize::text($data['createdAt'] ?? current_time('mysql', true));
        $wpdb->insert($table, $row);
    }

    /** Deletes the singleton row — pairs with BudgetController wiping departments/members too. */
    public function reset(): void
    {
        global $wpdb;
        $wpdb->delete($this->table(), ['id' => 1]);
    }

    private function toDto(array $row): array
    {
        return [
            'id' => 'master',
            'totalAmount' => (float) $row['total_amount'],
            'fiscalYear' => $row['fiscal_year'],
            'description' => $row['description'] ?? '',
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? null,
            'createdById' => $row['created_by_id'],
            'createdByName' => $row['created_by_name'],
        ];
    }
}
