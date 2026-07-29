<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Middleware\AuthMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/tasks. Mirrors src/types's Task interface exactly. */
final class TaskRepository extends AbstractRepository
{
    protected bool $softDeletes = true;

    protected function tableName(): string
    {
        return 'tasks';
    }

    protected function idColumn(): string
    {
        return 'id';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'description' => $row['description'] ?: null,
            'status' => $row['status'] ?? 'todo',
            'priority' => $row['priority'] ?? 'medium',
            'assignee' => $row['assignee'] ?? '',
            'assigneeId' => $row['assignee_id'] ?: null,
            'assignedTo' => $row['assigned_to'] ?: null,
            'dueDate' => $row['due_date'] ?: null,
            'budget' => $row['budget'] !== null ? (float) $row['budget'] : null,
            'budgetUsed' => $row['budget_used'] !== null ? (float) $row['budget_used'] : null,
            'category' => $row['category'] ?: null,
            'projectId' => $row['project_id'] ?: null,
            'projectName' => $row['project_name'] ?: null,
            'assigneeDept' => $row['assignee_dept'] ?: null,
            'assigneeRole' => $row['assignee_role'] ?: null,
            'createdBy' => $row['created_by'] ?: null,
            'createdAt' => $row['created_at'] ?: null,
            'updatedAt' => $row['updated_at'] ?: null,
            'updatedBy' => $row['updated_by'] ?? null,
        ];
    }

    /** Client-generated timestamps (createdAt/updatedAt) are stored as sent, never overwritten with NOW(). */
    protected function fromDtoForCreate(array $data): array
    {
        return [
            'title' => Sanitize::text($data['title'] ?? ''),
            'description' => Sanitize::textarea($data['description'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'todo'),
            'priority' => Sanitize::text($data['priority'] ?? 'medium'),
            'assignee' => Sanitize::text($data['assignee'] ?? ''),
            'assignee_id' => Sanitize::text($data['assigneeId'] ?? null),
            'assigned_to' => Sanitize::text($data['assignedTo'] ?? null),
            'due_date' => Sanitize::text($data['dueDate'] ?? null),
            'budget' => isset($data['budget']) ? Sanitize::float($data['budget']) : null,
            'budget_used' => isset($data['budgetUsed']) ? Sanitize::float($data['budgetUsed']) : null,
            'category' => Sanitize::text($data['category'] ?? null),
            'project_id' => Sanitize::text($data['projectId'] ?? null),
            'project_name' => Sanitize::text($data['projectName'] ?? null),
            'assignee_dept' => Sanitize::text($data['assigneeDept'] ?? null),
            'assignee_role' => Sanitize::text($data['assigneeRole'] ?? null),
            'created_by' => Sanitize::text($data['createdBy'] ?? null),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?: current_time('mysql', true),
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null),
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('title', $data)) {
            $row['title'] = Sanitize::text($data['title']);
        }
        if (array_key_exists('description', $data)) {
            $row['description'] = Sanitize::textarea($data['description']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('priority', $data)) {
            $row['priority'] = Sanitize::text($data['priority']);
        }
        if (array_key_exists('assignee', $data)) {
            $row['assignee'] = Sanitize::text($data['assignee']);
        }
        if (array_key_exists('assigneeId', $data)) {
            $row['assignee_id'] = Sanitize::text($data['assigneeId']);
        }
        if (array_key_exists('assignedTo', $data)) {
            $row['assigned_to'] = Sanitize::text($data['assignedTo']);
        }
        if (array_key_exists('dueDate', $data)) {
            $row['due_date'] = Sanitize::text($data['dueDate']);
        }
        if (array_key_exists('budget', $data)) {
            $row['budget'] = $data['budget'] !== null ? Sanitize::float($data['budget']) : null;
        }
        if (array_key_exists('budgetUsed', $data)) {
            $row['budget_used'] = $data['budgetUsed'] !== null ? Sanitize::float($data['budgetUsed']) : null;
        }
        if (array_key_exists('category', $data)) {
            $row['category'] = Sanitize::text($data['category']);
        }
        if (array_key_exists('projectId', $data)) {
            $row['project_id'] = Sanitize::text($data['projectId']);
        }
        if (array_key_exists('projectName', $data)) {
            $row['project_name'] = Sanitize::text($data['projectName']);
        }
        if (array_key_exists('assigneeDept', $data)) {
            $row['assignee_dept'] = Sanitize::text($data['assigneeDept']);
        }
        if (array_key_exists('assigneeRole', $data)) {
            $row['assignee_role'] = Sanitize::text($data['assigneeRole']);
        }
        if (array_key_exists('createdBy', $data)) {
            $row['created_by'] = Sanitize::text($data['createdBy']);
        }
        if (array_key_exists('updatedAt', $data)) {
            $row['updated_at'] = Sanitize::text($data['updatedAt']);
        }
        // Server-stamped from the authenticated caller — never trusted from
        // the request body, unlike createdBy (an established, separate
        // pattern in this repository for the original author).
        $actorId = AuthMiddleware::currentUserId();
        if ($actorId !== null) {
            $row['updated_by'] = (string) $actorId;
        }
        return $row;
    }
}
