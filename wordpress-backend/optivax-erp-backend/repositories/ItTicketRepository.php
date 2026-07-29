<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/it/tickets/* (src/services/itSupportService.ts ITTicket). */
final class ItTicketRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'it_tickets';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'description' => $row['description'] ?? '',
            'category' => $row['category'],
            'priority' => $row['priority'],
            'status' => $row['status'],
            'requestedBy' => $row['requested_by'],
            'requestedByName' => $row['requested_by_name'],
            'requestedByDept' => $row['requested_by_dept'],
            'assignedTo' => $row['assigned_to'] ?? null,
            'assignedToName' => $row['assigned_to_name'] ?? null,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
            'resolvedAt' => $row['resolved_at'] ?? null,
            'slaDeadline' => $row['sla_deadline'],
            'notes' => $row['notes'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        $now = current_time('mysql', true);
        return [
            'title' => Sanitize::text($data['title'] ?? ''),
            'description' => Sanitize::textarea($data['description'] ?? ''),
            'category' => Sanitize::text($data['category'] ?? 'other'),
            'priority' => Sanitize::text($data['priority'] ?? 'medium'),
            'status' => Sanitize::text($data['status'] ?? 'open'),
            'requested_by' => Sanitize::text($data['requestedBy'] ?? ''),
            'requested_by_name' => Sanitize::text($data['requestedByName'] ?? null),
            'requested_by_dept' => Sanitize::text($data['requestedByDept'] ?? null),
            'assigned_to' => Sanitize::text($data['assignedTo'] ?? null),
            'assigned_to_name' => Sanitize::text($data['assignedToName'] ?? null),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?? $now,
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null) ?? $now,
            'resolved_at' => Sanitize::text($data['resolvedAt'] ?? null),
            'sla_deadline' => Sanitize::text($data['slaDeadline'] ?? null),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
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
        if (array_key_exists('category', $data)) {
            $row['category'] = Sanitize::text($data['category']);
        }
        if (array_key_exists('priority', $data)) {
            $row['priority'] = Sanitize::text($data['priority']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('requestedBy', $data)) {
            $row['requested_by'] = Sanitize::text($data['requestedBy']);
        }
        if (array_key_exists('requestedByName', $data)) {
            $row['requested_by_name'] = Sanitize::text($data['requestedByName']);
        }
        if (array_key_exists('requestedByDept', $data)) {
            $row['requested_by_dept'] = Sanitize::text($data['requestedByDept']);
        }
        if (array_key_exists('assignedTo', $data)) {
            $row['assigned_to'] = Sanitize::text($data['assignedTo']);
        }
        if (array_key_exists('assignedToName', $data)) {
            $row['assigned_to_name'] = Sanitize::text($data['assignedToName']);
        }
        if (array_key_exists('resolvedAt', $data)) {
            $row['resolved_at'] = Sanitize::text($data['resolvedAt']);
        }
        if (array_key_exists('slaDeadline', $data)) {
            $row['sla_deadline'] = Sanitize::text($data['slaDeadline']);
        }
        if (array_key_exists('notes', $data)) {
            $row['notes'] = Sanitize::textarea($data['notes']);
        }
        $row['updated_at'] = Sanitize::text($data['updatedAt'] ?? null) ?? current_time('mysql', true);
        return $row;
    }
}
