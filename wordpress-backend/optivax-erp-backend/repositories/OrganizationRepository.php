<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/organizations/* (organizationService.ts) — list-only per
 * the frontend contract (OrganizationService only exposes getAll()), so
 * create/update/delete are unreachable via any registered route but are
 * still implemented to satisfy AbstractRepository's abstract methods.
 * toDto() intentionally mirrors the DB column names verbatim (owner_id,
 * created_at) since that's the exact shape organizationService.ts's
 * `Organization` interface expects — no camelCase translation here, unlike
 * DepartmentRepository.
 */
final class OrganizationRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'organizations';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'owner_id' => (string) $row['owner_id'],
            'created_at' => $row['created_at'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'owner_id' => Sanitize::int($data['owner_id'] ?? 0),
            'created_at' => Sanitize::text($data['created_at'] ?? null) ?: current_time('mysql', true),
        ];
    }
}
