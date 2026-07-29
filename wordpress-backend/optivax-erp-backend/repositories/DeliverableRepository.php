<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/deliverables/*. Mirrors src/types's Deliverable interface exactly. */
final class DeliverableRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'deliverables';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'clientId' => $row['client_id'],
            'clientName' => $row['client_name'],
            'projectId' => $row['project_id'] ?: null,
            'projectName' => $row['project_name'] ?: null,
            'title' => $row['title'],
            'description' => $row['description'] ?? '',
            'status' => $row['status'] ?? 'Pending',
            'dueDate' => $row['due_date'] ?: null,
            'uploadedBy' => $row['uploaded_by'] ?? '',
            'uploadedByName' => $row['uploaded_by_name'] ?? '',
            'uploadedAt' => $row['uploaded_at'] ?: null,
            'reviewedBy' => $row['reviewed_by'] ?: null,
            'reviewedByName' => $row['reviewed_by_name'] ?: null,
            'reviewedAt' => $row['reviewed_at'] ?: null,
            'approvedBy' => $row['approved_by'] ?: null,
            'approvedByName' => $row['approved_by_name'] ?: null,
            'approvedAt' => $row['approved_at'] ?: null,
            'fileUrl' => $row['file_url'] ?: null,
            'notes' => $row['notes'] ?: null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'client_id' => Sanitize::text($data['clientId'] ?? ''),
            'client_name' => Sanitize::text($data['clientName'] ?? ''),
            'project_id' => Sanitize::text($data['projectId'] ?? null),
            'project_name' => Sanitize::text($data['projectName'] ?? null),
            'title' => Sanitize::text($data['title'] ?? ''),
            'description' => Sanitize::textarea($data['description'] ?? ''),
            'status' => Sanitize::text($data['status'] ?? 'Pending'),
            'due_date' => Sanitize::text($data['dueDate'] ?? null),
            'uploaded_by' => Sanitize::text($data['uploadedBy'] ?? ''),
            'uploaded_by_name' => Sanitize::text($data['uploadedByName'] ?? ''),
            'uploaded_at' => Sanitize::text($data['uploadedAt'] ?? null) ?: current_time('mysql', true),
            'reviewed_by' => Sanitize::text($data['reviewedBy'] ?? null),
            'reviewed_by_name' => Sanitize::text($data['reviewedByName'] ?? null),
            'reviewed_at' => Sanitize::text($data['reviewedAt'] ?? null),
            'approved_by' => Sanitize::text($data['approvedBy'] ?? null),
            'approved_by_name' => Sanitize::text($data['approvedByName'] ?? null),
            'approved_at' => Sanitize::text($data['approvedAt'] ?? null),
            'file_url' => Sanitize::url($data['fileUrl'] ?? null),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('clientId', $data)) {
            $row['client_id'] = Sanitize::text($data['clientId']);
        }
        if (array_key_exists('clientName', $data)) {
            $row['client_name'] = Sanitize::text($data['clientName']);
        }
        if (array_key_exists('projectId', $data)) {
            $row['project_id'] = Sanitize::text($data['projectId']);
        }
        if (array_key_exists('projectName', $data)) {
            $row['project_name'] = Sanitize::text($data['projectName']);
        }
        if (array_key_exists('title', $data)) {
            $row['title'] = Sanitize::text($data['title']);
        }
        if (array_key_exists('description', $data)) {
            $row['description'] = Sanitize::textarea($data['description']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('dueDate', $data)) {
            $row['due_date'] = Sanitize::text($data['dueDate']);
        }
        if (array_key_exists('uploadedBy', $data)) {
            $row['uploaded_by'] = Sanitize::text($data['uploadedBy']);
        }
        if (array_key_exists('uploadedByName', $data)) {
            $row['uploaded_by_name'] = Sanitize::text($data['uploadedByName']);
        }
        if (array_key_exists('uploadedAt', $data)) {
            $row['uploaded_at'] = Sanitize::text($data['uploadedAt']);
        }
        if (array_key_exists('reviewedBy', $data)) {
            $row['reviewed_by'] = Sanitize::text($data['reviewedBy']);
        }
        if (array_key_exists('reviewedByName', $data)) {
            $row['reviewed_by_name'] = Sanitize::text($data['reviewedByName']);
        }
        if (array_key_exists('reviewedAt', $data)) {
            $row['reviewed_at'] = Sanitize::text($data['reviewedAt']);
        }
        if (array_key_exists('approvedBy', $data)) {
            $row['approved_by'] = Sanitize::text($data['approvedBy']);
        }
        if (array_key_exists('approvedByName', $data)) {
            $row['approved_by_name'] = Sanitize::text($data['approvedByName']);
        }
        if (array_key_exists('approvedAt', $data)) {
            $row['approved_at'] = Sanitize::text($data['approvedAt']);
        }
        if (array_key_exists('fileUrl', $data)) {
            $row['file_url'] = Sanitize::url($data['fileUrl']);
        }
        if (array_key_exists('notes', $data)) {
            $row['notes'] = Sanitize::textarea($data['notes']);
        }
        return $row;
    }
}
