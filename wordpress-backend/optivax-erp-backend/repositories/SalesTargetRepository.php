<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs `sales_targets` (src/types.ts SalesTarget, salesOpsService.ts SalesTargetService). */
final class SalesTargetRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'sales_targets';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'memberId' => $row['member_id'],
            'memberName' => $row['member_name'],
            'monthlyTarget' => (float) $row['monthly_target'],
            'quarterlyTarget' => (float) $row['quarterly_target'],
            'annualTarget' => (float) $row['annual_target'],
            'achievedAmount' => (float) $row['achieved_amount'],
            'period' => $row['period'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'member_id' => Sanitize::text($data['memberId'] ?? ''),
            'member_name' => Sanitize::text($data['memberName'] ?? ''),
            'monthly_target' => Sanitize::float($data['monthlyTarget'] ?? 0),
            'quarterly_target' => Sanitize::float($data['quarterlyTarget'] ?? 0),
            'annual_target' => Sanitize::float($data['annualTarget'] ?? 0),
            'achieved_amount' => Sanitize::float($data['achievedAmount'] ?? 0),
            'period' => Sanitize::text($data['period'] ?? ''),
            'created_at' => $data['createdAt'] ?? current_time('mysql', true),
            'updated_at' => $data['updatedAt'] ?? null,
        ];
    }

    protected function fromDtoForUpdate(array $data): array
    {
        $map = [
            'memberId' => 'member_id',
            'memberName' => 'member_name',
            'monthlyTarget' => 'monthly_target',
            'quarterlyTarget' => 'quarterly_target',
            'annualTarget' => 'annual_target',
            'achievedAmount' => 'achieved_amount',
            'period' => 'period',
        ];

        $numericColumns = ['monthly_target', 'quarterly_target', 'annual_target', 'achieved_amount'];

        $row = [];
        foreach ($map as $dtoKey => $column) {
            if (!array_key_exists($dtoKey, $data)) {
                continue;
            }
            $row[$column] = in_array($column, $numericColumns, true)
                ? Sanitize::float($data[$dtoKey])
                : Sanitize::text($data[$dtoKey]);
        }
        // Preserve a client-supplied updatedAt verbatim; otherwise stamp "now" on every edit.
        $row['updated_at'] = $data['updatedAt'] ?? current_time('mysql', true);
        return $row;
    }
}
