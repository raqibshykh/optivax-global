<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/email/templates/* (src/services/emailService.ts EmailTemplate). */
final class EmailTemplateRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'email_templates';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'subject' => $row['subject'],
            'content' => $row['content'] ?? '',
            'type' => $row['type'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        $now = current_time('mysql', true);
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'subject' => Sanitize::text($data['subject'] ?? ''),
            'content' => $data['content'] ?? '',
            'type' => Sanitize::text($data['type'] ?? 'custom'),
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
        if (array_key_exists('subject', $data)) {
            $row['subject'] = Sanitize::text($data['subject']);
        }
        if (array_key_exists('content', $data)) {
            $row['content'] = $data['content'];
        }
        if (array_key_exists('type', $data)) {
            $row['type'] = Sanitize::text($data['type']);
        }
        $row['updated_at'] = Sanitize::text($data['updatedAt'] ?? null) ?? current_time('mysql', true);
        return $row;
    }
}
