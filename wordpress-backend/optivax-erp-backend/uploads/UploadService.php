<?php

namespace OptivaxERP\Uploads;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Wraps the WordPress Media Library (wp_insert_attachment +
 * wp_generate_attachment_metadata) and mirrors a metadata row into the
 * `files` table so FileService's /saas/v1/files/* contract (list/create/delete,
 * filterable by projectId/clientId, with a visibility enum) has real data
 * behind it. No per-file-type business validation — generic mime-typed
 * upload only, per the Phase 2A foundation scope.
 */
final class UploadService
{
    /**
     * Explicit allow-list, narrower than WordPress core's default
     * `get_allowed_mime_types()` (which includes dozens of formats this ERP
     * has no business need for). Deliberately excludes anything
     * script-capable or content-sniff-ambiguous — notably `.svg` (can embed
     * `<script>`, and browsers will execute it if ever viewed directly) and
     * every executable/archive-with-executable-payload type. Passed to
     * `wp_handle_upload()`'s `mimes` override, which also drives its
     * extension↔content-type cross-check (`wp_check_filetype_and_ext()`).
     */
    private const ALLOWED_MIMES = [
        'jpg|jpeg|jpe' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'pdf' => 'application/pdf',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls' => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt' => 'application/vnd.ms-powerpoint',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'csv' => 'text/csv',
        'txt' => 'text/plain',
        'zip' => 'application/zip',
    ];

    /** Application-level cap, independent of (and typically tighter than) the server's php.ini upload_max_filesize/post_max_size. */
    private const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

    /**
     * @param array $file A normalized $_FILES entry (single file, not multi).
     * @param array $meta Optional projectId/clientId/visibility/visibleTo/uploadedBy context.
     * @return array|\WP_Error The created FileRecord-shaped row, or WP_Error on failure.
     */
    public static function handleUpload(array $file, array $meta = [])
    {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        if (($file['size'] ?? 0) > self::MAX_FILE_SIZE_BYTES) {
            return new \WP_Error('upload_failed', sprintf('File exceeds the %dMB upload limit.', self::MAX_FILE_SIZE_BYTES / (1024 * 1024)));
        }

        $overrides = ['test_form' => false, 'mimes' => self::ALLOWED_MIMES];
        $uploaded = wp_handle_upload($file, $overrides);

        if (isset($uploaded['error'])) {
            return new \WP_Error('upload_failed', $uploaded['error']);
        }

        // Defense-in-depth beyond wp_handle_upload()'s own extension/content
        // check: independently sniff the actual bytes on disk and confirm
        // they match one of our allow-listed MIME types — catches a file
        // that slips through with a spoofed Content-Type/extension pairing
        // WP core's check didn't already reject.
        $sniffed = function_exists('finfo_open') ? (new \finfo(FILEINFO_MIME_TYPE))->file($uploaded['file']) : null;
        if ($sniffed && !in_array($sniffed, self::ALLOWED_MIMES, true)) {
            @unlink($uploaded['file']);
            return new \WP_Error('upload_failed', 'File content does not match an allowed type.');
        }

        $attachmentId = wp_insert_attachment([
            'post_mime_type' => $uploaded['type'],
            'post_title' => sanitize_file_name(basename($uploaded['file'])),
            'post_content' => '',
            'post_status' => 'inherit',
        ], $uploaded['file']);

        if (is_wp_error($attachmentId)) {
            return $attachmentId;
        }

        $attachmentData = wp_generate_attachment_metadata($attachmentId, $uploaded['file']);
        wp_update_attachment_metadata($attachmentId, $attachmentData);

        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'files';
        $id = Uuid::v4();

        $wpdb->insert($table, [
            'id' => $id,
            'attachment_id' => $attachmentId,
            'name' => sanitize_file_name(basename($uploaded['file'])),
            'size' => filesize($uploaded['file']) ?: 0,
            'type' => $uploaded['type'],
            'uploaded_by' => Sanitize::text($meta['uploadedBy'] ?? ''),
            'uploaded_by_id' => Sanitize::text($meta['uploadedById'] ?? ''),
            'uploader_dept' => Sanitize::text($meta['uploaderDept'] ?? null),
            'upload_date' => current_time('mysql', true),
            'project_id' => Sanitize::text($meta['projectId'] ?? null),
            'client_id' => Sanitize::text($meta['clientId'] ?? null),
            'url' => wp_get_attachment_url($attachmentId),
            'visibility' => Sanitize::text($meta['visibility'] ?? 'private'),
            'visible_to' => Sanitize::json($meta['visibleTo'] ?? []),
        ]);

        return self::toFileRecord($wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $id), ARRAY_A));
    }

    public static function deleteFile(string $fileId): bool
    {
        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'files';
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $fileId), ARRAY_A);
        if (!$row) {
            return false;
        }
        if (!empty($row['attachment_id'])) {
            wp_delete_attachment((int) $row['attachment_id'], true);
        }
        $wpdb->delete($table, ['id' => $fileId]);
        return true;
    }

    public static function toFileRecord(?array $row): ?array
    {
        if (!$row) {
            return null;
        }
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'size' => (int) $row['size'],
            'type' => $row['type'],
            'uploadedBy' => $row['uploaded_by'],
            'uploadedById' => $row['uploaded_by_id'] ?: null,
            'uploaderDept' => $row['uploader_dept'] ?: null,
            'uploadDate' => $row['upload_date'],
            'projectId' => $row['project_id'] ?: null,
            'clientId' => $row['client_id'] ?: null,
            'url' => $row['url'],
            'visibility' => $row['visibility'],
            'visibleTo' => Sanitize::jsonDecode($row['visible_to']),
        ];
    }
}
