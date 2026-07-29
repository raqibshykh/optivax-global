<?php

namespace OptivaxERP\Uploads;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Image-only upload path for profile photos / company logos — deliberately
 * separate from UploadService (the Files-module uploader): an avatar isn't a
 * `files` table row (no project/client/visibility dimension applies to it),
 * and this enforces a tighter image-only allow-list and a 5MB cap instead of
 * the Files module's 25MB/multi-type one. Mirrors UploadService's exact
 * security pattern (wp_handle_upload()'s extension/content-type cross-check
 * + an independent finfo byte-sniff) rather than reinventing it.
 */
final class AvatarUploadService
{
    private const ALLOWED_MIMES = [
        'jpg|jpeg|jpe' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
    ];

    private const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    /** Anything larger in either dimension is downscaled server-side — an avatar never needs to ship a multi-megapixel original to every page that renders it. */
    private const MAX_DIMENSION_PX = 512;

    /**
     * @param array $file A normalized $_FILES entry (single file, not multi).
     * @return array{id:int,url:string}|\WP_Error
     */
    public static function handleUpload(array $file)
    {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        if (($file['size'] ?? 0) > self::MAX_FILE_SIZE_BYTES) {
            return new \WP_Error('upload_failed', sprintf('Image exceeds the %dMB upload limit.', self::MAX_FILE_SIZE_BYTES / (1024 * 1024)));
        }

        // wp_handle_upload() itself already refuses to write outside the
        // configured uploads directory and generates a collision-safe,
        // sanitized filename (sanitize_file_name() + wp_unique_filename()) —
        // no user-supplied path/filename is ever concatenated directly, so
        // directory traversal isn't reachable through this path.
        $overrides = ['test_form' => false, 'mimes' => self::ALLOWED_MIMES];
        $uploaded = wp_handle_upload($file, $overrides);

        if (isset($uploaded['error'])) {
            return new \WP_Error('upload_failed', $uploaded['error']);
        }

        // Defense-in-depth beyond wp_handle_upload()'s own extension/content
        // check: independently sniff the actual bytes on disk and confirm
        // they match one of our allow-listed image types — catches a file
        // that slips through with a spoofed Content-Type/extension pairing
        // WP core's check didn't already reject. Same rationale as
        // UploadService::handleUpload().
        $sniffed = function_exists('finfo_open') ? (new \finfo(FILEINFO_MIME_TYPE))->file($uploaded['file']) : null;
        if ($sniffed && !in_array($sniffed, self::ALLOWED_MIMES, true)) {
            @unlink($uploaded['file']);
            return new \WP_Error('upload_failed', 'File content does not match an allowed image type.');
        }

        self::resizeIfNeeded($uploaded['file']);

        $attachmentId = wp_insert_attachment([
            'post_mime_type' => $uploaded['type'],
            'post_title' => sanitize_file_name(basename($uploaded['file'])),
            'post_content' => '',
            'post_status' => 'inherit',
        ], $uploaded['file']);

        if (is_wp_error($attachmentId)) {
            @unlink($uploaded['file']);
            return $attachmentId;
        }

        $attachmentData = wp_generate_attachment_metadata($attachmentId, $uploaded['file']);
        wp_update_attachment_metadata($attachmentId, $attachmentData);

        return ['id' => $attachmentId, 'url' => wp_get_attachment_url($attachmentId)];
    }

    /** Downscales in place (aspect ratio preserved) only when needed — a best-effort step, the already-validated/size-capped original still stands if the image editor is unavailable. */
    private static function resizeIfNeeded(string $path): void
    {
        $size = @getimagesize($path);
        if (!$size || ($size[0] <= self::MAX_DIMENSION_PX && $size[1] <= self::MAX_DIMENSION_PX)) {
            return;
        }

        $editor = wp_get_image_editor($path);
        if (is_wp_error($editor)) {
            return;
        }
        $editor->resize(self::MAX_DIMENSION_PX, self::MAX_DIMENSION_PX, false);
        $editor->save($path);
    }

    /**
     * Safely removes the attachment currently backing $avatarUrl (if one is
     * resolvable) — called both when replacing an avatar and when explicitly
     * removing one, so old images never pile up in the uploads directory.
     * No attachment-id column is stored anywhere; the id is re-resolved from
     * the URL already on file, keeping this additive to the existing
     * avatar_url/avatar columns rather than requiring a new one.
     */
    public static function deleteByUrl(?string $avatarUrl): void
    {
        if (!$avatarUrl) {
            return;
        }
        $attachmentId = attachment_url_to_postid($avatarUrl);
        if ($attachmentId) {
            wp_delete_attachment($attachmentId, true);
        }
    }
}
