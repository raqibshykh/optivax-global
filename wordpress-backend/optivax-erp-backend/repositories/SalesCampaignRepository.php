<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs `sales_campaigns` (src/types.ts CampaignBudget, src/services/salesOpsService.ts
 * CampaignService), a member-assignment budget tracker distinct from the
 * MarketingCampaign module. `assigned_members` is stored as a JSON-encoded
 * array of user-id strings; list() supports an `assignedTo` membership filter
 * via JSON_CONTAINS since AbstractRepository::list() only does plain equality.
 */
final class SalesCampaignRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'sales_campaigns';
    }

    /**
     * @param array $filters supports 'id' (equality, handled by the base list())
     * and 'assignedTo' (JSON membership, handled here). Still supports the
     * same opt-in pagination/search contract as AbstractRepository::list()
     * (see its doc comment) — needed so `?page=`/`?perPage=`/`?q=` behave
     * consistently whether or not a request happens to also filter by
     * assignedTo.
     */
    public function list(array $filters = [], string $orderBy = null, ?array $pagination = null, ?array $search = null): array
    {
        $assignedTo = $filters['assignedTo'] ?? null;
        unset($filters['assignedTo']);

        if ($assignedTo === null || $assignedTo === '') {
            return parent::list($filters, $orderBy, $pagination, $search);
        }

        global $wpdb;
        $table = $this->table();
        [$where, $values] = $this->buildAssignedToWhere($assignedTo, $filters, $search);

        $sql = "SELECT * FROM {$table} WHERE " . implode(' AND ', $where);
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        if ($pagination !== null) {
            $sql .= sprintf(' LIMIT %d OFFSET %d', (int) ($pagination['limit'] ?? 20), (int) ($pagination['offset'] ?? 0));
        }

        $rows = $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);
        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** Mirrors AbstractRepository::count() for the assignedTo-filtered branch above; falls back to the parent's count() otherwise. */
    public function count(array $filters = [], ?array $search = null): int
    {
        $assignedTo = $filters['assignedTo'] ?? null;
        unset($filters['assignedTo']);

        if ($assignedTo === null || $assignedTo === '') {
            return parent::count($filters, $search);
        }

        global $wpdb;
        [$where, $values] = $this->buildAssignedToWhere($assignedTo, $filters, $search);
        $sql = "SELECT COUNT(*) FROM {$this->table()} WHERE " . implode(' AND ', $where);

        return (int) $wpdb->get_var($wpdb->prepare($sql, $values));
    }

    /** @return array{0: string[], 1: array} shared by the assignedTo branches of list() and count() above. */
    private function buildAssignedToWhere(string $assignedTo, array $filters, ?array $search): array
    {
        global $wpdb;
        $where = ['JSON_CONTAINS(assigned_members, JSON_QUOTE(%s))'];
        $values = [$assignedTo];

        foreach ($filters as $column => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $where[] = "{$column} = %s";
            $values[] = $value;
        }

        if ($search && !empty($search['columns']) && isset($search['term']) && $search['term'] !== '') {
            $like = '%' . $wpdb->esc_like((string) $search['term']) . '%';
            $searchClauses = [];
            foreach ($search['columns'] as $column) {
                $searchClauses[] = "{$column} LIKE %s";
                $values[] = $like;
            }
            $where[] = '(' . implode(' OR ', $searchClauses) . ')';
        }

        return [$where, $values];
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'campaignName' => $row['campaign_name'],
            'totalBudget' => (float) $row['total_budget'],
            'budgetSpent' => (float) $row['budget_spent'],
            'startDate' => $row['start_date'],
            'endDate' => $row['end_date'],
            'assignedMembers' => Sanitize::jsonDecode($row['assigned_members'] ?? null),
            'status' => $row['status'],
            'notes' => $row['notes'] ?? null,
            'createdAt' => $row['created_at'],
            'createdBy' => $row['created_by'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'campaign_name' => Sanitize::text($data['campaignName'] ?? ''),
            'total_budget' => Sanitize::float($data['totalBudget'] ?? 0),
            'budget_spent' => Sanitize::float($data['budgetSpent'] ?? 0),
            'start_date' => Sanitize::text($data['startDate'] ?? null),
            'end_date' => Sanitize::text($data['endDate'] ?? null),
            'assigned_members' => Sanitize::json($data['assignedMembers'] ?? []),
            'status' => Sanitize::text($data['status'] ?? 'planned'),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
            'created_at' => $data['createdAt'] ?? current_time('mysql', true),
            'created_by' => Sanitize::text($data['createdBy'] ?? ''),
        ];
    }

    protected function fromDtoForUpdate(array $data): array
    {
        $map = [
            'campaignName' => 'campaign_name',
            'totalBudget' => 'total_budget',
            'budgetSpent' => 'budget_spent',
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'status' => 'status',
            'notes' => 'notes',
        ];

        $row = [];
        foreach ($map as $dtoKey => $column) {
            if (!array_key_exists($dtoKey, $data)) {
                continue;
            }
            $row[$column] = in_array($column, ['total_budget', 'budget_spent'], true)
                ? Sanitize::float($data[$dtoKey])
                : ($column === 'notes' ? Sanitize::textarea($data[$dtoKey]) : Sanitize::text($data[$dtoKey]));
        }
        if (array_key_exists('assignedMembers', $data)) {
            $row['assigned_members'] = Sanitize::json($data['assignedMembers']);
        }
        return $row;
    }
}
