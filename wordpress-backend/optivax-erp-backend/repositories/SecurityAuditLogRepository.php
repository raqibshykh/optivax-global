<?php

namespace OptivaxERP\Repositories;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs the super-admin-only /saas/v1/security-audit-logs/list endpoint.
 * There is deliberately no create()-via-REST path — rows are written only
 * by helpers/SecurityAuditLog.php, directly from PHP call sites, so this
 * table is immutable through the normal application UI.
 */
final class SecurityAuditLogRepository
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'security_audit_logs';
    }

    public function create(array $row): void
    {
        global $wpdb;
        $wpdb->insert($this->table(), $row);
    }

    /** @param array $filters supports 'action', 'actorUserId', 'targetUserId', 'dateFrom', 'dateTo', 'limit' */
    public function list(array $filters = []): array
    {
        global $wpdb;
        $where = [];
        $values = [];

        if (!empty($filters['action'])) {
            $where[] = 'action = %s';
            $values[] = $filters['action'];
        }
        if (!empty($filters['actorUserId'])) {
            $where[] = 'actor_user_id = %d';
            $values[] = (int) $filters['actorUserId'];
        }
        if (!empty($filters['targetUserId'])) {
            $where[] = 'target_user_id = %d';
            $values[] = (int) $filters['targetUserId'];
        }
        if (!empty($filters['dateFrom'])) {
            $where[] = 'created_at >= %s';
            $values[] = $filters['dateFrom'];
        }
        if (!empty($filters['dateTo'])) {
            $where[] = 'created_at <= %s';
            $values[] = $filters['dateTo'];
        }

        $sql = "SELECT * FROM {$this->table()}";
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY created_at DESC';
        if (!empty($filters['limit'])) {
            $sql .= ' LIMIT %d';
            $values[] = (int) $filters['limit'];
        }

        $rows = $values
            ? $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A)
            : $wpdb->get_results($sql, ARRAY_A);

        return array_map([$this, 'toDto'], $rows ?: []);
    }

    private function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'action' => $row['action'],
            'actorUserId' => $row['actor_user_id'] !== null ? (string) $row['actor_user_id'] : null,
            'actorRole' => $row['actor_role'],
            'targetUserId' => $row['target_user_id'] !== null ? (string) $row['target_user_id'] : null,
            'status' => $row['status'],
            'oldValue' => $row['old_value'] ? json_decode($row['old_value'], true) : null,
            'newValue' => $row['new_value'] ? json_decode($row['new_value'], true) : null,
            'ipAddress' => $row['ip_address'],
            'userAgent' => $row['user_agent'],
            'metadata' => $row['metadata'] ? json_decode($row['metadata'], true) : null,
            'createdAt' => $row['created_at'],
        ];
    }
}
