<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: projects, tasks, deliverables, revisions, production_assignments.
 * Maps to /saas/v1/projects/*, /saas/v1/tasks*, /saas/v1/deliverables/*,
 * /saas/v1/revisions/*, /saas/v1/production-assignments.
 * `production_assignments` is a pure member_user_id<->client_id join table —
 * no toDto/repository pattern, read/written directly by
 * ProductionAssignmentController.
 */
final class ProjectTaskMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'projects' => "CREATE TABLE {$p}projects (
                id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                description TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'not-started',
                priority VARCHAR(10) NOT NULL DEFAULT 'medium',
                start_date DATE NULL,
                deadline DATE NULL,
                assigned_to TEXT NULL,
                progress INT UNSIGNED NOT NULL DEFAULT 0,
                budget DECIMAL(12,2) NULL,
                spent DECIMAL(12,2) NULL,
                files TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(36) NULL,
                updated_at DATETIME NULL,
                updated_by VARCHAR(36) NULL,
                deleted_at DATETIME NULL,
                deleted_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY client_id (client_id),
                KEY status (status),
                KEY deleted_at (deleted_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'tasks' => "CREATE TABLE {$p}tasks (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'todo',
                priority VARCHAR(10) NOT NULL DEFAULT 'medium',
                assignee VARCHAR(191) NULL,
                assignee_id VARCHAR(36) NULL,
                assigned_to VARCHAR(191) NULL,
                due_date DATE NULL,
                budget DECIMAL(12,2) NULL,
                budget_used DECIMAL(12,2) NULL,
                category VARCHAR(20) NULL,
                project_id VARCHAR(36) NULL,
                project_name VARCHAR(191) NULL,
                assignee_dept VARCHAR(60) NULL,
                assignee_role VARCHAR(32) NULL,
                created_by VARCHAR(36) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                updated_by VARCHAR(36) NULL,
                deleted_at DATETIME NULL,
                deleted_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY project_id (project_id),
                KEY status (status),
                KEY assignee_id (assignee_id),
                KEY deleted_at (deleted_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'deliverables' => "CREATE TABLE {$p}deliverables (
                id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                client_name VARCHAR(191) NOT NULL,
                project_id VARCHAR(36) NULL,
                project_name VARCHAR(191) NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Pending',
                due_date DATE NULL,
                uploaded_by VARCHAR(36) NULL,
                uploaded_by_name VARCHAR(191) NULL,
                uploaded_at DATETIME NULL,
                reviewed_by VARCHAR(36) NULL,
                reviewed_by_name VARCHAR(191) NULL,
                reviewed_at DATETIME NULL,
                approved_by VARCHAR(36) NULL,
                approved_by_name VARCHAR(191) NULL,
                approved_at DATETIME NULL,
                file_url TEXT NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY client_id (client_id),
                KEY project_id (project_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'revisions' => "CREATE TABLE {$p}revisions (
                id VARCHAR(36) NOT NULL,
                project_id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                comment TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                type VARCHAR(60) NULL,
                updated_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY project_id (project_id),
                KEY client_id (client_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'production_assignments' => "CREATE TABLE {$p}production_assignments (
                member_user_id BIGINT UNSIGNED NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                PRIMARY KEY  (member_user_id, client_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
