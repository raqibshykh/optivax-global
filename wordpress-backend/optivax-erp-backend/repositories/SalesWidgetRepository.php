<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs the three small "at a glance" widget tables behind
 * src/services/salesWidgetService.ts (SalesLead/SalesDeal/SalesCommission) —
 * deliberately separate from the full `leads` CRM table (LeadRepository).
 * Spans three tables, so unlike the rest of the module this does not extend
 * AbstractRepository; it copies that class's `$wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX`
 * table-naming convention directly. Deals and commissions are read-only —
 * the frontend has no create/update/delete call for either.
 */
final class SalesWidgetRepository
{
    private function leadsTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'sales_widget_leads';
    }

    private function dealsTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'sales_widget_deals';
    }

    private function commissionsTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'sales_widget_commissions';
    }

    public function listLeads(): array
    {
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM {$this->leadsTable()} ORDER BY id DESC", ARRAY_A);
        return array_map([$this, 'leadToDto'], $rows ?: []);
    }

    public function createLead(array $data): array
    {
        global $wpdb;
        $id = $data['id'] ?? Uuid::v4();
        $wpdb->insert($this->leadsTable(), [
            'id' => $id,
            'name' => Sanitize::text($data['name'] ?? ''),
            'email' => Sanitize::email($data['email'] ?? ''),
            'company' => Sanitize::text($data['company'] ?? null),
            'status' => Sanitize::text($data['status'] ?? ''),
            'estimated_value' => Sanitize::float($data['estimated_value'] ?? 0),
        ]);

        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->leadsTable()} WHERE id = %s", $id), ARRAY_A);
        return $this->leadToDto($row);
    }

    public function listDeals(): array
    {
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM {$this->dealsTable()} ORDER BY id DESC", ARRAY_A);
        return array_map([$this, 'dealToDto'], $rows ?: []);
    }

    public function listCommissions(): array
    {
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM {$this->commissionsTable()} ORDER BY id DESC", ARRAY_A);
        return array_map([$this, 'commissionToDto'], $rows ?: []);
    }

    private function leadToDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'company' => $row['company'] ?? null,
            'status' => $row['status'],
            'estimated_value' => (float) $row['estimated_value'],
        ];
    }

    private function dealToDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'client' => $row['client'],
            'amount' => (float) $row['amount'],
            'stage' => $row['stage'],
        ];
    }

    private function commissionToDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'amount' => (float) $row['amount'],
            'deal_id' => $row['deal_id'] ?? null,
            'status' => $row['status'],
            'date' => $row['date'],
        ];
    }
}
