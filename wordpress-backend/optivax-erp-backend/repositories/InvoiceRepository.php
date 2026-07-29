<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;
use OptivaxERP\Middleware\AuthMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/invoices/*. Bespoke (not AbstractRepository): Invoice.items
 * lives in a child `invoice_items` table rather than a JSON column, so every
 * create/update/find has to fan out to a second table. `number` is never
 * sent by the frontend (see InvoiceService.create()'s Omit<Invoice,"id"|"number">)
 * so it is always server-generated here — a simple sequential-looking id
 * string, not a billing calculation.
 */
final class InvoiceRepository
{
    private function invoicesTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'invoices';
    }

    private function itemsTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'invoice_items';
    }

    /**
     * @param array $filters supports 'id' and 'clientId' (-> client_id). An
     * 'assignedTo' filter has no backing column on invoices in the frontend
     * contract, so it is silently ignored if present.
     */
    public function list(array $filters = []): array
    {
        global $wpdb;
        $table = $this->invoicesTable();
        $where = [];
        $values = [];

        if (!empty($filters['id'])) {
            $where[] = 'id = %s';
            $values[] = $filters['id'];
        }
        if (!empty($filters['clientId'])) {
            $where[] = 'client_id = %s';
            $values[] = $filters['clientId'];
        }
        $where[] = 'deleted_at IS NULL';

        $sql = "SELECT * FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY issue_date DESC';

        $rows = empty($values)
            ? $wpdb->get_results($sql, ARRAY_A)
            : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);
        $rows = $rows ?: [];

        // Batch-fetch every row's line items in one query (keyed by
        // invoice_id) instead of toDto() querying per-row — the original
        // per-row itemsForInvoice() call here meant listing N invoices ran
        // 1 + N queries every time.
        $itemsByInvoice = $this->itemsForInvoices(array_column($rows, 'id'));

        return array_map(function (array $row) use ($itemsByInvoice): array {
            return $this->toDto($row, $itemsByInvoice[$row['id']] ?? []);
        }, $rows);
    }

    public function find(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$this->invoicesTable()} WHERE id = %s AND deleted_at IS NULL", $id),
            ARRAY_A
        );
        return $row ? $this->toDto($row, $this->itemsForInvoice($id)) : null;
    }

    public function create(array $data): array
    {
        global $wpdb;
        $id = $data['id'] ?? Uuid::v4();
        $number = $data['number'] ?? self::generateNumber();

        $wpdb->insert($this->invoicesTable(), array_merge(
            ['id' => $id, 'number' => $number],
            $this->invoiceRowFromDto($data)
        ));

        $this->replaceItems($id, $data['items'] ?? []);

        return $this->find($id);
    }

    public function update(string $id, array $data): ?array
    {
        global $wpdb;
        $row = $this->invoiceRowFromDtoPartial($data);
        if (!empty($row)) {
            $wpdb->update($this->invoicesTable(), $row, ['id' => $id]);
        }

        if (array_key_exists('items', $data)) {
            $this->replaceItems($id, $data['items'] ?? []);
        }

        return $this->find($id);
    }

    /**
     * Soft-delete: stamps deleted_at/deleted_by rather than removing the row
     * (and deliberately leaves invoice_items alone — a soft-deleted invoice
     * is hidden, not gone, so its line items must still exist if it's ever
     * restored directly in the database).
     */
    public function delete(string $id): bool
    {
        global $wpdb;
        $actorId = AuthMiddleware::currentUserId();
        return (bool) $wpdb->update($this->invoicesTable(), [
            'deleted_at' => current_time('mysql', true),
            'deleted_by' => $actorId !== null ? (string) $actorId : null,
        ], ['id' => $id]);
    }

    /** Deletes all existing line items for the invoice and re-inserts the given set — simplest correct sync, no diffing. */
    private function replaceItems(string $invoiceId, array $items): void
    {
        global $wpdb;
        $wpdb->delete($this->itemsTable(), ['invoice_id' => $invoiceId]);
        foreach ($items as $item) {
            $wpdb->insert($this->itemsTable(), [
                'id' => $item['id'] ?? Uuid::v4(),
                'invoice_id' => $invoiceId,
                'description' => Sanitize::text($item['description'] ?? ''),
                'quantity' => Sanitize::int($item['quantity'] ?? 1),
                'rate' => Sanitize::float($item['rate'] ?? 0),
                'total' => Sanitize::float($item['total'] ?? 0),
            ]);
        }
    }

    private function itemsForInvoice(string $invoiceId): array
    {
        global $wpdb;
        $rows = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$this->itemsTable()} WHERE invoice_id = %s", $invoiceId),
            ARRAY_A
        );
        return array_map([$this, 'itemToDto'], $rows ?: []);
    }

    /**
     * Batch equivalent of itemsForInvoice() — one query for every invoice id
     * given, grouped back into a $invoiceId => items[] map. Used by list()
     * to avoid querying line items once per row.
     */
    private function itemsForInvoices(array $invoiceIds): array
    {
        $invoiceIds = array_values(array_unique(array_filter($invoiceIds)));
        if (empty($invoiceIds)) {
            return [];
        }

        global $wpdb;
        $placeholders = implode(',', array_fill(0, count($invoiceIds), '%s'));
        $rows = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$this->itemsTable()} WHERE invoice_id IN ({$placeholders})", $invoiceIds),
            ARRAY_A
        ) ?: [];

        $grouped = [];
        foreach ($rows as $row) {
            $grouped[$row['invoice_id']][] = $this->itemToDto($row);
        }
        return $grouped;
    }

    private function itemToDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'description' => $row['description'] ?? '',
            'quantity' => (int) $row['quantity'],
            'rate' => (float) $row['rate'],
            'total' => (float) $row['total'],
        ];
    }

    private function toDto(array $row, array $items = []): array
    {
        return [
            'id' => $row['id'],
            'number' => $row['number'],
            'clientId' => $row['client_id'],
            'projectId' => $row['project_id'] ?: null,
            'description' => $row['description'] ?? '',
            'amount' => (float) $row['amount'],
            'amountPaid' => $row['amount_paid'] !== null ? (float) $row['amount_paid'] : null,
            'remainingBalance' => $row['remaining_balance'] !== null ? (float) $row['remaining_balance'] : null,
            'status' => $row['status'] ?? 'pending',
            'issueDate' => $row['issue_date'] ?: null,
            'dueDate' => $row['due_date'] ?: null,
            'paidDate' => $row['paid_date'] ?: null,
            'items' => $items,
            'notes' => $row['notes'] ?: null,
            'invoice_url' => $row['invoice_url'] ?: null,
            'createdBy' => $row['created_by'] ?? null,
            'updatedBy' => $row['updated_by'] ?? null,
        ];
    }

    private function invoiceRowFromDto(array $data): array
    {
        $actorId = AuthMiddleware::currentUserId();
        return [
            'client_id' => Sanitize::text($data['clientId'] ?? ''),
            'project_id' => Sanitize::text($data['projectId'] ?? null),
            'description' => Sanitize::textarea($data['description'] ?? ''),
            'amount' => Sanitize::float($data['amount'] ?? 0),
            'amount_paid' => Sanitize::float($data['amountPaid'] ?? 0),
            'remaining_balance' => isset($data['remainingBalance']) ? Sanitize::float($data['remainingBalance']) : null,
            'status' => Sanitize::text($data['status'] ?? 'pending'),
            'issue_date' => Sanitize::text($data['issueDate'] ?? null),
            'due_date' => Sanitize::text($data['dueDate'] ?? null),
            'paid_date' => Sanitize::text($data['paidDate'] ?? null),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
            'invoice_url' => Sanitize::url($data['invoice_url'] ?? null),
            'created_by' => $actorId !== null ? (string) $actorId : null,
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    private function invoiceRowFromDtoPartial(array $data): array
    {
        $row = [];
        if (array_key_exists('clientId', $data)) {
            $row['client_id'] = Sanitize::text($data['clientId']);
        }
        if (array_key_exists('projectId', $data)) {
            $row['project_id'] = Sanitize::text($data['projectId']);
        }
        if (array_key_exists('description', $data)) {
            $row['description'] = Sanitize::textarea($data['description']);
        }
        if (array_key_exists('amount', $data)) {
            $row['amount'] = Sanitize::float($data['amount']);
        }
        if (array_key_exists('amountPaid', $data)) {
            $row['amount_paid'] = Sanitize::float($data['amountPaid']);
        }
        if (array_key_exists('remainingBalance', $data)) {
            $row['remaining_balance'] = $data['remainingBalance'] !== null ? Sanitize::float($data['remainingBalance']) : null;
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('issueDate', $data)) {
            $row['issue_date'] = Sanitize::text($data['issueDate']);
        }
        if (array_key_exists('dueDate', $data)) {
            $row['due_date'] = Sanitize::text($data['dueDate']);
        }
        if (array_key_exists('paidDate', $data)) {
            $row['paid_date'] = Sanitize::text($data['paidDate']);
        }
        if (array_key_exists('notes', $data)) {
            $row['notes'] = Sanitize::textarea($data['notes']);
        }
        if (array_key_exists('invoice_url', $data)) {
            $row['invoice_url'] = Sanitize::url($data['invoice_url']);
        }
        // Server-stamped from the authenticated caller — never trusted from
        // the request body, unlike created_by (an established, separate
        // pattern in this repository for the original author).
        $actorId = AuthMiddleware::currentUserId();
        if ($actorId !== null) {
            $row['updated_by'] = (string) $actorId;
        }
        return $row;
    }

    private static function generateNumber(): string
    {
        return 'INV-' . gmdate('Ymd') . '-' . strtoupper(substr(str_replace('-', '', Uuid::v4()), 0, 6));
    }
}
