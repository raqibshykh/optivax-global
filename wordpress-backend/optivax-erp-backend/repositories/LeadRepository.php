<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs the full CRM `leads` table (src/services/leadService.ts, src/types.ts
 * Lead). Plain per-row DTO shape here — LeadController is the one that wraps
 * list()/create()/update() results in {leads:[...]} / {lead:{...}} to match
 * the frontend's response envelopes.
 */
final class LeadRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'leads';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone'] ?? null,
            'company' => $row['company'] ?? null,
            'source' => $row['source'] ?? null,
            'status' => $row['status'] ?? null,
            'estimated_value' => isset($row['estimated_value']) ? (float) $row['estimated_value'] : null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    /** Client-generated created_at/updated_at (if present) are stored as given, not overwritten with NOW(). */
    protected function fromDtoForCreate(array $data): array
    {
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'email' => Sanitize::email($data['email'] ?? ''),
            'phone' => Sanitize::text($data['phone'] ?? null),
            'company' => Sanitize::text($data['company'] ?? null),
            'source' => Sanitize::text($data['source'] ?? null),
            'status' => Sanitize::text($data['status'] ?? null),
            'estimated_value' => Sanitize::float($data['estimated_value'] ?? null),
            'created_at' => $data['created_at'] ?? current_time('mysql', true),
            'updated_at' => $data['updated_at'] ?? null,
        ];
    }

    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        foreach (['name', 'email', 'phone', 'company', 'source', 'status'] as $field) {
            if (array_key_exists($field, $data)) {
                $row[$field] = $field === 'email' ? Sanitize::email($data[$field]) : Sanitize::text($data[$field]);
            }
        }
        if (array_key_exists('estimated_value', $data)) {
            $row['estimated_value'] = Sanitize::float($data['estimated_value']);
        }
        // Preserve a client-supplied updated_at verbatim; otherwise stamp "now" on every edit.
        $row['updated_at'] = $data['updated_at'] ?? current_time('mysql', true);
        return $row;
    }
}
