<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/company-settings — a singleton row (id always 1), matching
 * companySettingsService.ts's getCompanySettings()/saveCompanySettings()
 * shape (no id, list, or create — just get/put the one row). get() merges
 * the stored row over hardcoded defaults so a fresh install without a
 * seeded row (or a row missing newer columns) still renders sane branding,
 * mirroring COMPANY_DEFAULTS in companySettingsService.ts. Not an
 * AbstractRepository subclass since there is no list/find-by-id/delete
 * surface for a singleton.
 */
final class CompanySettingsRepository
{
    private const ROW_ID = 1;
    private const CACHE_GROUP = 'optivax_erp';
    private const CACHE_KEY = 'company_settings';

    private const DEFAULTS = [
        'name' => 'Optivax Global',
        'tagline' => '',
        'address' => '',
        'city' => 'Karachi',
        'country' => 'Pakistan',
        'phone' => '',
        'email' => 'info@optivaxglobal.com',
        'website' => 'www.optivaxglobal.com',
        'logo_data_url' => '',
    ];

    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'company_settings';
    }

    public function get(): array
    {
        $cached = wp_cache_get(self::CACHE_KEY, self::CACHE_GROUP);
        if ($cached !== false) {
            return $cached;
        }

        global $wpdb;
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM " . $this->table() . " WHERE id = %d", self::ROW_ID),
            ARRAY_A
        );
        $merged = array_merge(self::DEFAULTS, array_filter($row ?: [], fn ($v) => $v !== null && $v !== ''));
        $dto = $this->toDto($merged);

        // Branding/company info changes rarely and is read on nearly every
        // page load — cache it (object cache; a no-op fallback to a single
        // request-scoped array if no persistent cache backend is configured,
        // still saving repeat lookups within the same request).
        wp_cache_set(self::CACHE_KEY, $dto, self::CACHE_GROUP, 5 * MINUTE_IN_SECONDS);
        return $dto;
    }

    public function put(array $data): void
    {
        global $wpdb;
        $row = [
            'name' => Sanitize::text($data['name'] ?? self::DEFAULTS['name']),
            'tagline' => Sanitize::text($data['tagline'] ?? self::DEFAULTS['tagline']),
            'address' => Sanitize::text($data['address'] ?? self::DEFAULTS['address']),
            'city' => Sanitize::text($data['city'] ?? self::DEFAULTS['city']),
            'country' => Sanitize::text($data['country'] ?? self::DEFAULTS['country']),
            'phone' => Sanitize::text($data['phone'] ?? self::DEFAULTS['phone']),
            'email' => Sanitize::email($data['email'] ?? self::DEFAULTS['email']),
            'website' => Sanitize::text($data['website'] ?? self::DEFAULTS['website']),
            // Not passed through Sanitize::url — it's a base64 data: URL, and
            // esc_url_raw() strips the "data" scheme by default (not in WP's
            // allowed protocol list), which would silently blank every logo.
            'logo_data_url' => $data['logoDataUrl'] ?? self::DEFAULTS['logo_data_url'],
        ];

        $exists = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM " . $this->table() . " WHERE id = %d", self::ROW_ID));
        if ($exists) {
            $wpdb->update($this->table(), $row, ['id' => self::ROW_ID]);
        } else {
            $row['id'] = self::ROW_ID;
            $wpdb->insert($this->table(), $row);
        }
        wp_cache_delete(self::CACHE_KEY, self::CACHE_GROUP);
    }

    private function toDto(array $row): array
    {
        return [
            'name' => $row['name'],
            'tagline' => $row['tagline'],
            'address' => $row['address'],
            'city' => $row['city'],
            'country' => $row['country'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'website' => $row['website'],
            'logoDataUrl' => $row['logo_data_url'],
        ];
    }
}
