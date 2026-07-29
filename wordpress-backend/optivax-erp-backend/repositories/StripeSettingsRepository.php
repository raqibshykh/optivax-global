<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Stripe credentials live in the same singleton `company_settings` row (id=1)
 * CompanySettingsRepository manages, but are deliberately never exposed
 * through that repository's DTO — getPublicConfig() below is the only read
 * path safe to return to any authenticated client (publishable key only,
 * never the secret key), and getSecretKey() is for server-side use only
 * (StripeController::createPaymentIntent()).
 */
final class StripeSettingsRepository
{
    private const ROW_ID = 1;

    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'company_settings';
    }

    private function row(): array
    {
        global $wpdb;
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM " . $this->table() . " WHERE id = %d", self::ROW_ID),
            ARRAY_A
        );
        return $row ?: [
            'stripe_enabled' => 0,
            'stripe_publishable_key' => '',
            'stripe_secret_key' => '',
            'stripe_webhook_secret' => '',
        ];
    }

    public function isEnabled(): bool
    {
        return (bool) ($this->row()['stripe_enabled'] ?? false);
    }

    public function getSecretKey(): string
    {
        return (string) ($this->row()['stripe_secret_key'] ?? '');
    }

    /** Safe to return to any authenticated client — never includes the secret key. */
    public function getPublicConfig(): array
    {
        $row = $this->row();
        return [
            'enabled' => (bool) $row['stripe_enabled'],
            'publishableKey' => (string) $row['stripe_publishable_key'],
        ];
    }

    /**
     * secretKey/webhookSecret are only overwritten when a non-empty value is
     * actually submitted — the admin form has no "load existing settings"
     * step, so a save that only toggles `enabled` must not silently wipe an
     * already-configured secret with an empty string.
     */
    public function saveConfig(array $data): void
    {
        global $wpdb;

        $update = [
            'id' => self::ROW_ID,
            'stripe_enabled' => !empty($data['enabled']) ? 1 : 0,
            'stripe_publishable_key' => Sanitize::text($data['publishableKey'] ?? ''),
        ];
        if (!empty($data['secretKey'])) {
            $update['stripe_secret_key'] = Sanitize::text($data['secretKey']);
        }
        if (!empty($data['webhookSecret'])) {
            $update['stripe_webhook_secret'] = Sanitize::text($data['webhookSecret']);
        }

        $exists = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM " . $this->table() . " WHERE id = %d", self::ROW_ID));
        if ($exists) {
            unset($update['id']);
            $wpdb->update($this->table(), $update, ['id' => self::ROW_ID]);
        } else {
            // Fresh row with no company profile saved yet — fill the
            // non-stripe columns' NOT NULL defaults explicitly since this
            // repository doesn't own CompanySettingsRepository::DEFAULTS.
            $wpdb->insert($this->table(), array_merge([
                'name' => 'Optivax Global',
                'city' => 'Karachi',
                'country' => 'Pakistan',
                'email' => 'info@optivaxglobal.com',
                'website' => 'www.optivaxglobal.com',
            ], $update));
        }
    }
}
