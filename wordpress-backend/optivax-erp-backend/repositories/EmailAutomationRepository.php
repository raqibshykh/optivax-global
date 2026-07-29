<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/email/automations/* (src/services/emailService.ts EmailAutomation). */
final class EmailAutomationRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'email_automations';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'triggerType' => $row['trigger_type'],
            'templateId' => $row['template_id'],
            'status' => $row['status'],
            'delayHours' => isset($row['delay_hours']) ? (int) $row['delay_hours'] : 0,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        $now = current_time('mysql', true);
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'trigger_type' => Sanitize::text($data['triggerType'] ?? ''),
            'template_id' => Sanitize::text($data['templateId'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'active'),
            'delay_hours' => Sanitize::int($data['delayHours'] ?? 0),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?? $now,
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null) ?? $now,
        ];
    }

    /** Only touches columns actually present in the patch, so a partial PUT can't blank out unrelated fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('name', $data)) {
            $row['name'] = Sanitize::text($data['name']);
        }
        if (array_key_exists('triggerType', $data)) {
            $row['trigger_type'] = Sanitize::text($data['triggerType']);
        }
        if (array_key_exists('templateId', $data)) {
            $row['template_id'] = Sanitize::text($data['templateId']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('delayHours', $data)) {
            $row['delay_hours'] = Sanitize::int($data['delayHours']);
        }
        $row['updated_at'] = Sanitize::text($data['updatedAt'] ?? null) ?? current_time('mysql', true);
        return $row;
    }
}
