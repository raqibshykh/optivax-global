<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Uploads\UploadService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/files/*. Real uploads (multipart) are created via
 * UploadService::handleUpload() directly from FileRoutes, not through
 * create() here — this repository's create()/fromDtoForCreate() only backs
 * the metadata-only fallback path (see FileRoutes doc comment) and the
 * inherited list()/find()/delete() used for everything else. toDto reuses
 * UploadService::toFileRecord() so both paths produce an identical shape.
 */
final class FileRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'files';
    }

    protected function toDto(array $row): array
    {
        return UploadService::toFileRecord($row) ?? [];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'attachment_id' => null,
            'name' => Sanitize::text($data['name'] ?? ''),
            'size' => Sanitize::int($data['size'] ?? 0),
            'type' => Sanitize::text($data['type'] ?? null),
            'uploaded_by' => Sanitize::text($data['uploadedBy'] ?? ''),
            'uploaded_by_id' => Sanitize::text($data['uploadedById'] ?? null),
            'uploader_dept' => Sanitize::text($data['uploaderDept'] ?? null),
            'upload_date' => Sanitize::text($data['uploadDate'] ?? null) ?: current_time('mysql', true),
            'project_id' => Sanitize::text($data['projectId'] ?? null),
            'client_id' => Sanitize::text($data['clientId'] ?? null),
            // Not run through Sanitize::url(): the frontend may send a client-only
            // blob: URL (see src/hooks/useFiles.ts uploadFile()) which esc_url_raw
            // would mangle — stored verbatim per the "store as given" rule.
            'url' => !empty($data['url']) ? (string) $data['url'] : null,
            'visibility' => Sanitize::text($data['visibility'] ?? 'private'),
            'visible_to' => Sanitize::json($data['visibleTo'] ?? []),
        ];
    }
}
