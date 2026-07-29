<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Table: files. Backs /saas/v1/files/* and is the exact schema
 * uploads/UploadService.php reads/writes — column names here MUST stay in
 * lockstep with UploadService::handleUpload()/deleteFile()/toFileRecord().
 */
final class FileMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'files' => "CREATE TABLE {$p}files (
                id VARCHAR(36) NOT NULL,
                attachment_id BIGINT UNSIGNED NULL,
                name VARCHAR(255) NOT NULL,
                size BIGINT UNSIGNED NOT NULL DEFAULT 0,
                type VARCHAR(120) NULL,
                uploaded_by VARCHAR(191) NULL,
                uploaded_by_id VARCHAR(36) NULL,
                uploader_dept VARCHAR(60) NULL,
                upload_date DATETIME NULL,
                project_id VARCHAR(36) NULL,
                client_id VARCHAR(36) NULL,
                url TEXT NULL,
                visibility VARCHAR(20) NOT NULL DEFAULT 'private',
                visible_to TEXT NULL,
                PRIMARY KEY  (id),
                KEY project_id (project_id),
                KEY client_id (client_id),
                KEY uploaded_by_id (uploaded_by_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
