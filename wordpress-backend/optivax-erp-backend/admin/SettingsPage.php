<?php

namespace OptivaxERP\Admin;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * The only WP Admin screen this plugin ships. Per the plan's item 9, JWT and
 * SMTP are the only settings requiring manual configuration — everything
 * else (RBAC matrix, table schema, mail templates, queue behavior) works
 * from defaults immediately after activation.
 */
final class SettingsPage
{
    private const GROUP = 'optivax_erp_settings';
    private const SLUG = 'optivax-erp-settings';

    private const FIELDS = [
        'optivax_erp_allowed_origins' => ['label' => 'Allowed Frontend Origins (comma-separated, e.g. https://app.optivaxglobal.com)', 'type' => 'text'],
        'optivax_erp_jwt_secret' => ['label' => 'JWT Signing Secret', 'type' => 'password'],
        'optivax_erp_jwt_access_ttl' => ['label' => 'Access Token TTL (seconds)', 'type' => 'number'],
        'optivax_erp_jwt_refresh_ttl' => ['label' => 'Refresh Token TTL (seconds)', 'type' => 'number'],
        'optivax_erp_smtp_host' => ['label' => 'SMTP Host', 'type' => 'text'],
        'optivax_erp_smtp_port' => ['label' => 'SMTP Port', 'type' => 'number'],
        'optivax_erp_smtp_encryption' => ['label' => 'SMTP Encryption (tls/ssl/blank)', 'type' => 'text'],
        'optivax_erp_smtp_username' => ['label' => 'SMTP Username', 'type' => 'text'],
        'optivax_erp_smtp_password' => ['label' => 'SMTP Password', 'type' => 'password'],
        'optivax_erp_smtp_from_email' => ['label' => 'SMTP From Address', 'type' => 'text'],
        'optivax_erp_smtp_from_name' => ['label' => 'SMTP From Name', 'type' => 'text'],
        // Bridge-Ready architecture: OFF by default. This ERP's normal
        // deployment (e.g. Hostinger shared hosting) cannot open a TCP
        // socket to a biometric device on an office LAN — punches are meant
        // to arrive via POST /it/devices/{deviceId}/punches/import, pushed
        // by a Local Bridge Application inside that LAN. Only check this box
        // if the ERP server itself genuinely runs inside the device's own
        // network (a self-hosted/on-premise install) — see
        // DeviceSyncService's doc comment.
        'optivax_erp_enable_lan_device_sync' => ['label' => 'Allow direct LAN device sync (legacy — only if this server is on the same network as the biometric device)', 'type' => 'checkbox'],
    ];

    public static function registerMenu(): void
    {
        add_options_page(
            'OptiVax ERP Backend',
            'OptiVax ERP',
            'manage_options',
            self::SLUG,
            [self::class, 'render']
        );
        add_action('admin_init', [self::class, 'registerSettings']);
    }

    public static function registerSettings(): void
    {
        foreach (self::FIELDS as $option => $field) {
            $sanitizeCallback = $field['type'] === 'checkbox'
                ? static fn ($value): string => $value ? '1' : ''
                : 'sanitize_text_field';
            register_setting(self::GROUP, $option, ['sanitize_callback' => $sanitizeCallback]);
        }
    }

    public static function render(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1>OptiVax ERP Backend — JWT &amp; SMTP Settings</h1>
            <p>Every other setting (database schema, RBAC matrix, mail templates, queue/retry behavior) is configured automatically on plugin activation and requires no manual setup here.</p>
            <form method="post" action="options.php">
                <?php settings_fields(self::GROUP); ?>
                <table class="form-table">
                    <?php foreach (self::FIELDS as $option => $field) : ?>
                        <tr>
                            <th scope="row"><label for="<?php echo esc_attr($option); ?>"><?php echo esc_html($field['label']); ?></label></th>
                            <td>
                                <?php if ($field['type'] === 'checkbox') : ?>
                                    <?php /* Hidden fallback so an unchecked box still posts '' — WP's Settings API only calls update_option() for keys present in $_POST, so without this, unchecking the box and saving would silently do nothing. */ ?>
                                    <input type="hidden" name="<?php echo esc_attr($option); ?>" value="" />
                                    <input
                                        type="checkbox"
                                        id="<?php echo esc_attr($option); ?>"
                                        name="<?php echo esc_attr($option); ?>"
                                        value="1"
                                        <?php checked((bool) get_option($option)); ?>
                                    />
                                <?php else : ?>
                                    <input
                                        type="<?php echo esc_attr($field['type']); ?>"
                                        id="<?php echo esc_attr($option); ?>"
                                        name="<?php echo esc_attr($option); ?>"
                                        value="<?php echo esc_attr(get_option($option)); ?>"
                                        class="regular-text"
                                        autocomplete="off"
                                    />
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}
