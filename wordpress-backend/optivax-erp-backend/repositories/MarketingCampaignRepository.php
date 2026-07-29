<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/marketing-campaigns — generic CRUD passthrough. Budget/spent
 * are stored and returned exactly as given; no derived totals are computed
 * here (the frontend owns any rollups).
 */
final class MarketingCampaignRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'marketing_campaigns';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'platform' => $row['platform'],
            'status' => $row['status'],
            'budget' => isset($row['budget']) ? (float) $row['budget'] : 0.0,
            'spent' => isset($row['spent']) ? (float) $row['spent'] : 0.0,
            'createdBy' => $row['created_by'] ?? null,
            'linkedTaskId' => $row['linked_task_id'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'platform' => Sanitize::text($data['platform'] ?? ''),
            'status' => Sanitize::text($data['status'] ?? 'Draft'),
            'budget' => Sanitize::float($data['budget'] ?? 0),
            'spent' => Sanitize::float($data['spent'] ?? 0),
            'created_by' => Sanitize::text($data['createdBy'] ?? null),
            'linked_task_id' => Sanitize::text($data['linkedTaskId'] ?? null),
        ];
    }

    /** Only touches columns actually present in the patch, so a partial PUT can't blank out unrelated fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('name', $data)) {
            $row['name'] = Sanitize::text($data['name']);
        }
        if (array_key_exists('platform', $data)) {
            $row['platform'] = Sanitize::text($data['platform']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('budget', $data)) {
            $row['budget'] = Sanitize::float($data['budget']);
        }
        if (array_key_exists('spent', $data)) {
            $row['spent'] = Sanitize::float($data['spent']);
        }
        if (array_key_exists('createdBy', $data)) {
            $row['created_by'] = Sanitize::text($data['createdBy']);
        }
        if (array_key_exists('linkedTaskId', $data)) {
            $row['linked_task_id'] = Sanitize::text($data['linkedTaskId']);
        }
        return $row;
    }
}
