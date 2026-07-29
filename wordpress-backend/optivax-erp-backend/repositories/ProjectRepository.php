<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Middleware\AuthMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/projects/*. Mirrors src/types's Project interface exactly. */
final class ProjectRepository extends AbstractRepository
{
    protected bool $softDeletes = true;

    protected function tableName(): string
    {
        return 'projects';
    }

    /**
     * Overridden for the same reason as ClientRepository::list() — `assignedTo`
     * needs JSON_CONTAINS against the `assigned_to` column, not plain equality.
     * Still supports the same opt-in pagination/search contract as
     * AbstractRepository::list() (see its doc comment).
     *
     * @param array $filters supports 'id', 'client_id' (plain equality) and
     * 'assigned_to' (JSON membership) keys.
     */
    public function list(array $filters = [], string $orderBy = null, ?array $pagination = null, ?array $search = null): array
    {
        global $wpdb;
        $table = $this->table();
        [$where, $values] = $this->buildProjectWhere($filters, $search);

        $sql = "SELECT * FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        if ($pagination !== null) {
            $sql .= sprintf(' LIMIT %d OFFSET %d', (int) ($pagination['limit'] ?? 20), (int) ($pagination['offset'] ?? 0));
        }

        $rows = empty($values)
            ? $wpdb->get_results($sql, ARRAY_A)
            : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** Mirrors AbstractRepository::count() — needed because list() is overridden here for the JSON_CONTAINS case. */
    public function count(array $filters = [], ?array $search = null): int
    {
        global $wpdb;
        [$where, $values] = $this->buildProjectWhere($filters, $search);

        $sql = "SELECT COUNT(*) FROM {$this->table()}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        return (int) (empty($values) ? $wpdb->get_var($sql) : $wpdb->get_var($wpdb->prepare($sql, $values)));
    }

    /** @return array{0: string[], 1: array} shared by list() and count() above. */
    private function buildProjectWhere(array $filters, ?array $search): array
    {
        global $wpdb;
        $where = [];
        $values = [];

        if (!empty($filters['id'])) {
            $where[] = 'id = %s';
            $values[] = $filters['id'];
        }
        if (!empty($filters['client_id'])) {
            $where[] = 'client_id = %s';
            $values[] = $filters['client_id'];
        }
        if (!empty($filters['assigned_to'])) {
            $where[] = 'JSON_CONTAINS(assigned_to, JSON_QUOTE(%s))';
            $values[] = (string) $filters['assigned_to'];
        }
        if ($search && !empty($search['columns']) && isset($search['term']) && $search['term'] !== '') {
            $like = '%' . $wpdb->esc_like((string) $search['term']) . '%';
            $searchClauses = [];
            foreach ($search['columns'] as $column) {
                $searchClauses[] = "{$column} LIKE %s";
                $values[] = $like;
            }
            $where[] = '(' . implode(' OR ', $searchClauses) . ')';
        }

        if ($this->softDeletes) {
            $where[] = 'deleted_at IS NULL';
        }

        return [$where, $values];
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'clientId' => $row['client_id'],
            'name' => $row['name'],
            'description' => $row['description'] ?? '',
            'status' => $row['status'] ?? 'not-started',
            'priority' => $row['priority'] ?? 'medium',
            'startDate' => $row['start_date'] ?: null,
            'deadline' => $row['deadline'] ?: null,
            'assignedTo' => Sanitize::jsonDecode($row['assigned_to'] ?? null),
            'progress' => (int) ($row['progress'] ?? 0),
            'budget' => $row['budget'] !== null ? (float) $row['budget'] : null,
            'spent' => $row['spent'] !== null ? (float) $row['spent'] : null,
            'files' => Sanitize::jsonDecode($row['files'] ?? null),
            'createdAt' => $row['created_at'] ?: null,
            'createdBy' => $row['created_by'] ?? null,
            'updatedAt' => $row['updated_at'] ?: null,
            'updatedBy' => $row['updated_by'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        $actorId = AuthMiddleware::currentUserId();
        return [
            'client_id' => Sanitize::text($data['clientId'] ?? ''),
            'name' => Sanitize::text($data['name'] ?? ''),
            'description' => Sanitize::textarea($data['description'] ?? ''),
            'status' => Sanitize::text($data['status'] ?? 'not-started'),
            'priority' => Sanitize::text($data['priority'] ?? 'medium'),
            'start_date' => Sanitize::text($data['startDate'] ?? null),
            'deadline' => Sanitize::text($data['deadline'] ?? null),
            'assigned_to' => Sanitize::json($data['assignedTo'] ?? []),
            'progress' => Sanitize::int($data['progress'] ?? 0),
            'budget' => isset($data['budget']) ? Sanitize::float($data['budget']) : null,
            'spent' => isset($data['spent']) ? Sanitize::float($data['spent']) : null,
            'files' => Sanitize::json($data['files'] ?? []),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?: current_time('mysql', true),
            'created_by' => $actorId !== null ? (string) $actorId : null,
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null) ?: current_time('mysql', true),
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('clientId', $data)) {
            $row['client_id'] = Sanitize::text($data['clientId']);
        }
        if (array_key_exists('name', $data)) {
            $row['name'] = Sanitize::text($data['name']);
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
        if (array_key_exists('startDate', $data)) {
            $row['start_date'] = Sanitize::text($data['startDate']);
        }
        if (array_key_exists('deadline', $data)) {
            $row['deadline'] = Sanitize::text($data['deadline']);
        }
        if (array_key_exists('assignedTo', $data)) {
            $row['assigned_to'] = Sanitize::json($data['assignedTo']);
        }
        if (array_key_exists('progress', $data)) {
            $row['progress'] = Sanitize::int($data['progress']);
        }
        if (array_key_exists('budget', $data)) {
            $row['budget'] = $data['budget'] !== null ? Sanitize::float($data['budget']) : null;
        }
        if (array_key_exists('spent', $data)) {
            $row['spent'] = $data['spent'] !== null ? Sanitize::float($data['spent']) : null;
        }
        if (array_key_exists('files', $data)) {
            $row['files'] = Sanitize::json($data['files']);
        }
        $row['updated_at'] = current_time('mysql', true);
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
