<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/revisions/*. Mirrors src/services/revisionService.ts's
 * Revision interface exactly — note the DTO key is `created_at` (snake_case),
 * not `createdAt`, matching that interface verbatim. clientId/projectId are
 * plain equality filters, so the inherited AbstractRepository::list() is
 * used as-is (no JSON_CONTAINS-style override needed here).
 */
final class RevisionRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'revisions';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'projectId' => $row['project_id'],
            'clientId' => $row['client_id'],
            'comment' => $row['comment'],
            'status' => $row['status'] ?? 'pending',
            'created_at' => $row['created_at'] ?: null,
            'type' => $row['type'] ?: null,
            'updatedBy' => $row['updated_by'] ?: null,
        ];
    }

    /** created_at is never sent by the frontend (see Revision's create() Omit<...,"created_at">) — always server-set. */
    protected function fromDtoForCreate(array $data): array
    {
        return [
            'project_id' => Sanitize::text($data['projectId'] ?? ''),
            'client_id' => Sanitize::text($data['clientId'] ?? ''),
            'comment' => Sanitize::textarea($data['comment'] ?? ''),
            'status' => Sanitize::text($data['status'] ?? 'pending'),
            'created_at' => current_time('mysql', true),
            'type' => Sanitize::text($data['type'] ?? null),
            'updated_by' => Sanitize::text($data['updatedBy'] ?? null),
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('projectId', $data)) {
            $row['project_id'] = Sanitize::text($data['projectId']);
        }
        if (array_key_exists('clientId', $data)) {
            $row['client_id'] = Sanitize::text($data['clientId']);
        }
        if (array_key_exists('comment', $data)) {
            $row['comment'] = Sanitize::textarea($data['comment']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('type', $data)) {
            $row['type'] = Sanitize::text($data['type']);
        }
        if (array_key_exists('updatedBy', $data)) {
            $row['updated_by'] = Sanitize::text($data['updatedBy']);
        }
        return $row;
    }
}
