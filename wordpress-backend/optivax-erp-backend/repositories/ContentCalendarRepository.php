<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/content-calendar/* (src/services/contentCalendarService.ts).
 * `createdAt`/`updatedAt` are stored exactly as sent by the client when
 * present (client-generated timestamps), falling back to the server clock
 * only when the field is entirely absent from the request body.
 */
final class ContentCalendarRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'content_calendar';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'description' => $row['description'] ?? '',
            'platform' => $row['platform'],
            'contentType' => $row['content_type'],
            'scheduledDate' => $row['scheduled_date'],
            'scheduledTime' => $row['scheduled_time'],
            'status' => $row['status'],
            'productionSupportRequired' => (bool) ($row['production_support_required'] ?? 0),
            'productionRequirementType' => $row['production_requirement_type'] ?? null,
            'productionStatus' => $row['production_status'] ?? null,
            'createdBy' => $row['created_by'],
            'createdByName' => $row['created_by_name'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'title' => Sanitize::text($data['title'] ?? ''),
            'description' => Sanitize::textarea($data['description'] ?? ''),
            'platform' => Sanitize::text($data['platform'] ?? ''),
            'content_type' => Sanitize::text($data['contentType'] ?? ''),
            'scheduled_date' => Sanitize::text($data['scheduledDate'] ?? null),
            'scheduled_time' => Sanitize::text($data['scheduledTime'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'Planned'),
            'production_support_required' => Sanitize::bool($data['productionSupportRequired'] ?? false) ? 1 : 0,
            'production_requirement_type' => Sanitize::text($data['productionRequirementType'] ?? null),
            'production_status' => Sanitize::text($data['productionStatus'] ?? null),
            'created_by' => Sanitize::text($data['createdBy'] ?? null),
            'created_by_name' => Sanitize::text($data['createdByName'] ?? null),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?? current_time('mysql', true),
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null),
        ];
    }

    /** Only touches columns actually present in the patch, so a partial PUT can't blank out unrelated fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('title', $data)) {
            $row['title'] = Sanitize::text($data['title']);
        }
        if (array_key_exists('description', $data)) {
            $row['description'] = Sanitize::textarea($data['description']);
        }
        if (array_key_exists('platform', $data)) {
            $row['platform'] = Sanitize::text($data['platform']);
        }
        if (array_key_exists('contentType', $data)) {
            $row['content_type'] = Sanitize::text($data['contentType']);
        }
        if (array_key_exists('scheduledDate', $data)) {
            $row['scheduled_date'] = Sanitize::text($data['scheduledDate']);
        }
        if (array_key_exists('scheduledTime', $data)) {
            $row['scheduled_time'] = Sanitize::text($data['scheduledTime']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('productionSupportRequired', $data)) {
            $row['production_support_required'] = Sanitize::bool($data['productionSupportRequired']) ? 1 : 0;
        }
        if (array_key_exists('productionRequirementType', $data)) {
            $row['production_requirement_type'] = Sanitize::text($data['productionRequirementType']);
        }
        if (array_key_exists('productionStatus', $data)) {
            $row['production_status'] = Sanitize::text($data['productionStatus']);
        }
        if (array_key_exists('createdBy', $data)) {
            $row['created_by'] = Sanitize::text($data['createdBy']);
        }
        if (array_key_exists('createdByName', $data)) {
            $row['created_by_name'] = Sanitize::text($data['createdByName']);
        }
        if (array_key_exists('updatedAt', $data)) {
            $row['updated_at'] = Sanitize::text($data['updatedAt']);
        } else {
            $row['updated_at'] = current_time('mysql', true);
        }
        return $row;
    }
}
