<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/client-ownership/*. Bespoke (not a plain per-row CRUD
 * table): `client_ownership` holds only the *current* owner per client
 * (upserted, unique on client_id); every assign/remove also appends an
 * immutable row to `client_ownership_history`, which is what /assign and
 * /remove actually return to the frontend (a ClientOwnershipHistoryEntry,
 * not the ownership record itself — see src/services/clientOwnershipService.ts).
 */
final class ClientOwnershipRepository
{
    private function ownershipTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'client_ownership';
    }

    private function historyTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'client_ownership_history';
    }

    /**
     * @param array $filters supports 'clientId' and 'ownerId' keys.
     */
    public function list(array $filters = []): array
    {
        global $wpdb;
        $table = $this->ownershipTable();
        $where = [];
        $values = [];

        if (!empty($filters['clientId'])) {
            $where[] = 'client_id = %s';
            $values[] = $filters['clientId'];
        }
        if (!empty($filters['ownerId'])) {
            $where[] = 'owner_id = %s';
            $values[] = $filters['ownerId'];
        }

        $sql = "SELECT * FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY assigned_at DESC';

        $rows = empty($values)
            ? $wpdb->get_results($sql, ARRAY_A)
            : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map([$this, 'toOwnershipDto'], $rows ?: []);
    }

    public function findByClientId(string $clientId): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$this->ownershipTable()} WHERE client_id = %s", $clientId),
            ARRAY_A
        );
        return $row ?: null;
    }

    /** @param string|null $clientId when omitted, returns the full audit trail across all clients. */
    public function history(?string $clientId = null): array
    {
        global $wpdb;
        $table = $this->historyTable();
        $sql = "SELECT * FROM {$table}";
        $values = [];
        if (!empty($clientId)) {
            $sql .= ' WHERE client_id = %s';
            $values[] = $clientId;
        }
        $sql .= ' ORDER BY assigned_at DESC';

        $rows = empty($values)
            ? $wpdb->get_results($sql, ARRAY_A)
            : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map([$this, 'toHistoryDto'], $rows ?: []);
    }

    /**
     * Upserts the current-owner row for the client (unique on client_id) and
     * appends a history entry — 'assigned' if the client had no prior owner,
     * 'reassigned' otherwise. $data is the full ClientOwnership shape posted
     * by ClientOwnershipService.assign().
     */
    /**
     * Upserting the current-owner row and appending the history entry must
     * succeed together — a crash between the two would either lose the audit
     * trail for a real ownership change, or (worse) record a "reassigned"
     * history entry for an ownership change that never actually took effect.
     */
    public function assign(array $data): array
    {
        return Transaction::run(function () use ($data) {
            global $wpdb;
            $clientId = (string) ($data['clientId'] ?? '');
            $previous = $this->findByClientId($clientId);

            $ownerRow = [
                'client_id' => $clientId,
                'client_name' => Sanitize::text($data['clientName'] ?? ''),
                'owner_id' => Sanitize::text($data['ownerId'] ?? ''),
                'owner_name' => Sanitize::text($data['ownerName'] ?? ''),
                'owner_email' => Sanitize::email($data['ownerEmail'] ?? null),
                'assigned_by_id' => Sanitize::text($data['assignedById'] ?? null),
                'assigned_by_name' => Sanitize::text($data['assignedByName'] ?? null),
                'assigned_by_role' => Sanitize::text($data['assignedByRole'] ?? null),
                'assigned_at' => Sanitize::text($data['assignedAt'] ?? null) ?: current_time('mysql', true),
                'notes' => Sanitize::textarea($data['notes'] ?? null),
            ];

            if ($previous) {
                $wpdb->update($this->ownershipTable(), $ownerRow, ['client_id' => $clientId]);
            } else {
                $insertRow = $ownerRow;
                $insertRow['id'] = Uuid::v4();
                $wpdb->insert($this->ownershipTable(), $insertRow);
            }

            $historyId = Uuid::v4();
            $wpdb->insert($this->historyTable(), [
                'id' => $historyId,
                'client_id' => $clientId,
                'client_name' => $ownerRow['client_name'],
                'action' => $previous ? 'reassigned' : 'assigned',
                'previous_owner_id' => $previous['owner_id'] ?? null,
                'previous_owner_name' => $previous['owner_name'] ?? null,
                'new_owner_id' => $ownerRow['owner_id'],
                'new_owner_name' => $ownerRow['owner_name'],
                'assigned_by_id' => $ownerRow['assigned_by_id'],
                'assigned_by_name' => $ownerRow['assigned_by_name'],
                'assigned_by_role' => $ownerRow['assigned_by_role'],
                'assigned_at' => $ownerRow['assigned_at'],
                'notes' => $ownerRow['notes'],
            ]);

            return $this->findHistoryById($historyId);
        });
    }

    /**
     * Clears the current-owner row (if any) and appends a 'removed' history
     * entry. $data carries removedById/removedByName/removedByRole (the
     * "assigned by" fields for this action) per ClientOwnershipService.remove().
     * Returns null if the client had no ownership row to remove.
     */
    public function remove(array $data): ?array
    {
        $clientId = (string) ($data['clientId'] ?? '');
        $previous = $this->findByClientId($clientId);
        if (!$previous) {
            return null;
        }

        return Transaction::run(function () use ($data, $clientId, $previous) {
            global $wpdb;
            $wpdb->delete($this->ownershipTable(), ['client_id' => $clientId]);

            $historyId = Uuid::v4();
            $wpdb->insert($this->historyTable(), [
                'id' => $historyId,
                'client_id' => $clientId,
                'client_name' => Sanitize::text($data['clientName'] ?? $previous['client_name']),
                'action' => 'removed',
                'previous_owner_id' => $previous['owner_id'],
                'previous_owner_name' => $previous['owner_name'],
                'new_owner_id' => null,
                'new_owner_name' => null,
                'assigned_by_id' => Sanitize::text($data['removedById'] ?? null),
                'assigned_by_name' => Sanitize::text($data['removedByName'] ?? null),
                'assigned_by_role' => Sanitize::text($data['removedByRole'] ?? null),
                'assigned_at' => current_time('mysql', true),
                'notes' => Sanitize::textarea($data['notes'] ?? null),
            ]);

            return $this->findHistoryById($historyId);
        });
    }

    private function findHistoryById(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$this->historyTable()} WHERE id = %s", $id),
            ARRAY_A
        );
        return $row ? $this->toHistoryDto($row) : null;
    }

    private function toOwnershipDto(array $row): array
    {
        return [
            'clientId' => $row['client_id'],
            'clientName' => $row['client_name'],
            'ownerId' => $row['owner_id'],
            'ownerName' => $row['owner_name'],
            'ownerEmail' => $row['owner_email'] ?: '',
            'assignedById' => $row['assigned_by_id'] ?: null,
            'assignedByName' => $row['assigned_by_name'] ?: null,
            'assignedByRole' => $row['assigned_by_role'] ?: null,
            'assignedAt' => $row['assigned_at'],
            'notes' => $row['notes'] ?: null,
        ];
    }

    private function toHistoryDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'clientId' => $row['client_id'],
            'clientName' => $row['client_name'],
            'action' => $row['action'],
            'previousOwnerId' => $row['previous_owner_id'] ?: null,
            'previousOwnerName' => $row['previous_owner_name'] ?: null,
            'newOwnerId' => $row['new_owner_id'] ?: null,
            'newOwnerName' => $row['new_owner_name'] ?: null,
            'assignedById' => $row['assigned_by_id'] ?: null,
            'assignedByName' => $row['assigned_by_name'] ?: null,
            'assignedByRole' => $row['assigned_by_role'] ?: null,
            'assignedAt' => $row['assigned_at'],
            'notes' => $row['notes'] ?: null,
        ];
    }
}
