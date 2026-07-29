<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/company-holidays/* (IdentityOrgMigration's `company_holidays` table — defined
 * since the original migration but never wired to any route/repository until now; the
 * frontend's COMPANY_HOLIDAYS_2026/_2025 hardcoded arrays were the only holiday source in
 * practice. Migrator::seedCompanyHolidaysFromDefaults() seeds this table from those exact
 * values so the DB becomes the live source without losing any previously-relied-on dates.
 */
final class HolidayRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'company_holidays';
    }

    protected function idColumn(): string
    {
        return 'id';
    }

    /**
     * `id` is a real AUTO_INCREMENT BIGINT here (unlike every other table's UUID `id`) — the
     * inherited AbstractRepository::create() always stamps a generated UUID onto the id
     * column, which would corrupt this one. Override to let MySQL assign it instead.
     */
    public function create(array $data): array
    {
        global $wpdb;
        $row = $this->fromDtoForCreate($data);
        $wpdb->insert($this->table(), $row);
        return $this->find((string) $wpdb->insert_id);
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'date' => $row['holiday_date'],
            'year' => (int) $row['year'],
            'label' => $row['label'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        $date = Sanitize::text($data['date'] ?? '');
        return [
            'holiday_date' => $date,
            'year' => (int) ($data['year'] ?? substr($date, 0, 4)),
            'label' => Sanitize::text($data['label'] ?? ''),
        ];
    }

    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('date', $data)) {
            $row['holiday_date'] = Sanitize::text($data['date']);
        }
        if (array_key_exists('year', $data)) {
            $row['year'] = (int) $data['year'];
        }
        if (array_key_exists('label', $data)) {
            $row['label'] = Sanitize::text($data['label']);
        }
        return $row;
    }
}
