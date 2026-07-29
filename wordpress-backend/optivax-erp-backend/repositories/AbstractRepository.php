<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Uuid;
use OptivaxERP\Middleware\AuthMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Shared $wpdb plumbing for every per-table repository. Concrete
 * repositories implement toDto()/fromDto() to translate between the SQL row
 * shape and the exact wire shape the frontend service file expects.
 */
abstract class AbstractRepository
{
    abstract protected function tableName(): string;

    /**
     * Set true (in the concrete repository's own property declaration) only
     * for tables that actually have `deleted_at`/`deleted_by` columns —
     * false (the default) preserves the original hard-delete behavior for
     * every repository that doesn't opt in, so this is purely additive.
     * When true: list()/count() exclude soft-deleted rows via buildWhere(),
     * find() returns null for a soft-deleted row (matching "not found" from
     * the API's perspective), and delete() stamps deleted_at/deleted_by
     * instead of issuing a real DELETE.
     */
    protected bool $softDeletes = false;

    /**
     * Runaway-query guard: applied only when a caller does NOT opt into real
     * pagination (`$pagination === null`), which today is every existing
     * call site. This is deliberately generous — it never changes the rows
     * returned for any table with realistic current volumes — it only stops
     * a naturally-growing table (audit logs, activity sessions, clicks)
     * from one day materializing every row, every column, on every request.
     * Override in a concrete repository to raise/lower for that table.
     */
    protected int $defaultSafetyLimit = 1000;

    /** Column used as the public id (almost always 'id', a UUID string). */
    protected function idColumn(): string
    {
        return 'id';
    }

    protected function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . $this->tableName();
    }

    /** Maps a DB row (assoc array) to the frontend-facing DTO shape. Override per-repository. */
    abstract protected function toDto(array $row): array;

    /** Maps an incoming request body (already-sanitized assoc array) to a DB row for INSERT. Override per-repository. */
    abstract protected function fromDtoForCreate(array $data): array;

    /** Maps a partial update body to DB columns for UPDATE. Override per-repository (defaults to fromDtoForCreate's keys, filtered). */
    protected function fromDtoForUpdate(array $data): array
    {
        return $this->fromDtoForCreate($data);
    }

    /**
     * @param array $filters column => value equality filters (already validated/sanitized by the caller)
     * @param string|null $orderBy raw "column DIRECTION" fragment (caller-controlled, never user input directly — see BaseCrudController's sort whitelist)
     * @param array|null $pagination ['limit' => int, 'offset' => int] — omit (the default) for the original, unpaginated full-list behavior every existing caller relies on.
     * @param array|null $search ['columns' => string[], 'term' => string] — adds a `(col1 LIKE %term% OR col2 LIKE %term% ...)` clause. Omit for no search filtering.
     */
    public function list(array $filters = [], string $orderBy = null, ?array $pagination = null, ?array $search = null): array
    {
        global $wpdb;
        $table = $this->table();
        [$where, $values] = $this->buildWhere($filters, $search);

        $sql = "SELECT * FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        if ($pagination !== null) {
            $sql .= sprintf(' LIMIT %d OFFSET %d', (int) ($pagination['limit'] ?? 20), (int) ($pagination['offset'] ?? 0));
        } elseif ($this->defaultSafetyLimit > 0) {
            $sql .= sprintf(' LIMIT %d', $this->defaultSafetyLimit);
        }

        $rows = empty($values)
            ? $wpdb->get_results($sql, ARRAY_A)
            : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** Total row count for the same filters/search a paginated list() call would use — needed to compute meta.total/totalPages. */
    public function count(array $filters = [], ?array $search = null): int
    {
        global $wpdb;
        $table = $this->table();
        [$where, $values] = $this->buildWhere($filters, $search);

        $sql = "SELECT COUNT(*) FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        return (int) (empty($values) ? $wpdb->get_var($sql) : $wpdb->get_var($wpdb->prepare($sql, $values)));
    }

    /** @return array{0: string[], 1: array} [$whereClauses, $preparedValues] shared by list() and count(). */
    private function buildWhere(array $filters, ?array $search): array
    {
        global $wpdb;
        $where = [];
        $values = [];

        foreach ($filters as $column => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $where[] = "{$column} = %s";
            $values[] = $value;
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

    public function find(string $id): ?array
    {
        global $wpdb;
        $table = $this->table();
        $idColumn = $this->idColumn();
        $sql = "SELECT * FROM {$table} WHERE {$idColumn} = %s";
        if ($this->softDeletes) {
            $sql .= ' AND deleted_at IS NULL';
        }
        $row = $wpdb->get_row($wpdb->prepare($sql, $id), ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }

    public function create(array $data): array
    {
        global $wpdb;
        $id = $data['id'] ?? Uuid::v4();
        $row = $this->fromDtoForCreate($data);
        $row[$this->idColumn()] = $id;
        $wpdb->insert($this->table(), $row);
        return $this->find($id);
    }

    public function update(string $id, array $data): ?array
    {
        global $wpdb;
        $row = $this->fromDtoForUpdate($data);
        unset($row[$this->idColumn()]);
        if (empty($row)) {
            return $this->find($id);
        }
        $wpdb->update($this->table(), $row, [$this->idColumn() => $id]);
        return $this->find($id);
    }

    public function delete(string $id): bool
    {
        global $wpdb;
        if ($this->softDeletes) {
            $actorId = AuthMiddleware::currentUserId();
            return (bool) $wpdb->update($this->table(), [
                'deleted_at' => current_time('mysql', true),
                'deleted_by' => $actorId !== null ? (string) $actorId : null,
            ], [$this->idColumn() => $id]);
        }
        return (bool) $wpdb->delete($this->table(), [$this->idColumn() => $id]);
    }
}
