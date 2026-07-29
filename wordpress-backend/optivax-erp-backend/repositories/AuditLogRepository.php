<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/audit-logs/* (auditLogService.ts). Bespoke rather than
 * AbstractRepository-based: list() needs entityType/performedBy/limit
 * filters with a fixed `timestamp DESC` ordering, and search() needs a
 * multi-column LIKE scan plus a date range — neither fits the generic
 * single-column-equality shape.
 */
final class AuditLogRepository
{
    /** Safety cap for list()/search() calls that don't specify their own limit — see list()'s comment. */
    private const DEFAULT_LIST_LIMIT = 1000;

    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'audit_logs';
    }

    /**
     * @param array $filters supports 'entityType', 'performedBy', 'limit'
     * (matches AuditLogService.getByEntityType/getByUser/getRecent, all of
     * which hit GET /audit-logs/list with different query params), plus
     * 'department' — server-resolved only (see AuditLogController::list()),
     * never accepted as a raw client-supplied filter.
     */
    public function list(array $filters = []): array
    {
        global $wpdb;
        $table = $this->table();
        $where = [];
        $values = [];

        if (!empty($filters['entityType'])) {
            $where[] = 'entity_type = %s';
            $values[] = $filters['entityType'];
        }
        if (!empty($filters['performedBy'])) {
            $where[] = 'performed_by = %s';
            $values[] = $filters['performedBy'];
        }
        if (!empty($filters['department'])) {
            $where[] = 'department = %s';
            $values[] = $filters['department'];
        }

        $sql = "SELECT * FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY timestamp DESC';

        // Append-only table with no ceiling on growth — always cap, even
        // when the caller didn't ask for a specific limit, so a full
        // unfiltered list() never materializes the entire audit history.
        $sql .= ' LIMIT %d';
        $values[] = !empty($filters['limit']) ? (int) $filters['limit'] : self::DEFAULT_LIST_LIMIT;

        $rows = $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map([$this, 'toDto'], $rows ?: []);
    }

    public function listRecent(int $limit): array
    {
        return $this->list(['limit' => $limit]);
    }

    public function create(array $data): array
    {
        global $wpdb;
        $id = Uuid::v4();
        $wpdb->insert($this->table(), [
            'id' => $id,
            'action' => Sanitize::text($data['action'] ?? ''),
            'entity_type' => Sanitize::text($data['entityType'] ?? ''),
            'entity_id' => Sanitize::text($data['entityId'] ?? ''),
            'entity_name' => Sanitize::text($data['entityName'] ?? ''),
            'performed_by' => Sanitize::text($data['performedBy'] ?? ''),
            'performed_by_name' => Sanitize::text($data['performedByName'] ?? ''),
            'performed_by_role' => Sanitize::text($data['performedByRole'] ?? ''),
            // Honor a client-supplied timestamp (AuditLogService.add() never
            // sends one today, but the contract allows it) rather than
            // always forcing NOW().
            'timestamp' => Sanitize::text($data['timestamp'] ?? null) ?: current_time('mysql', true),
            'description' => Sanitize::textarea($data['description'] ?? ''),
            'department' => Sanitize::text($data['department'] ?? null),
            'old_value' => array_key_exists('oldValue', $data) ? Sanitize::json($data['oldValue']) : null,
            'new_value' => array_key_exists('newValue', $data) ? Sanitize::json($data['newValue']) : null,
        ]);

        return $this->find($id);
    }

    /**
     * @param array $params supports 'q' (LIKE across description/entity_name),
     * 'entityType', 'action', 'performedByRole', 'dateFrom', 'dateTo'
     * (matches AuditLogService.search()'s AuditLogSearchFilters).
     */
    public function search(array $params): array
    {
        global $wpdb;
        $table = $this->table();
        $where = [];
        $values = [];

        if (!empty($params['q'])) {
            $like = '%' . $wpdb->esc_like($params['q']) . '%';
            $where[] = '(description LIKE %s OR entity_name LIKE %s)';
            $values[] = $like;
            $values[] = $like;
        }
        if (!empty($params['entityType'])) {
            $where[] = 'entity_type = %s';
            $values[] = $params['entityType'];
        }
        if (!empty($params['action'])) {
            $where[] = 'action = %s';
            $values[] = $params['action'];
        }
        if (!empty($params['performedByRole'])) {
            $where[] = 'performed_by_role = %s';
            $values[] = $params['performedByRole'];
        }
        if (!empty($params['dateFrom'])) {
            $where[] = 'timestamp >= %s';
            $values[] = $params['dateFrom'];
        }
        if (!empty($params['dateTo'])) {
            $where[] = 'timestamp <= %s';
            $values[] = $params['dateTo'];
        }
        if (!empty($params['department'])) {
            $where[] = 'department = %s';
            $values[] = $params['department'];
        }

        $sql = "SELECT * FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY timestamp DESC LIMIT %d';
        $values[] = !empty($params['limit']) ? (int) $params['limit'] : self::DEFAULT_LIST_LIMIT;

        $rows = $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map([$this, 'toDto'], $rows ?: []);
    }

    private function find(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM " . $this->table() . " WHERE id = %s", $id), ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }

    private function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'action' => $row['action'],
            'entityType' => $row['entity_type'],
            'entityId' => $row['entity_id'],
            'entityName' => $row['entity_name'],
            'performedBy' => $row['performed_by'],
            'performedByName' => $row['performed_by_name'],
            'performedByRole' => $row['performed_by_role'],
            'timestamp' => $row['timestamp'],
            'description' => $row['description'],
            'department' => $row['department'] ?: null,
            'oldValue' => !empty($row['old_value']) ? Sanitize::jsonDecode($row['old_value']) : null,
            'newValue' => !empty($row['new_value']) ? Sanitize::jsonDecode($row['new_value']) : null,
        ];
    }
}
