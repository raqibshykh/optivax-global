<?php
/**
 * Exposes WordPress-side configuration to the React app via
 * wp_localize_script(), as `window.optivaxWpConfig`. No secrets are ever
 * placed here — JWT signing secrets and SMTP credentials live only in the
 * plugin's wp_options (see wordpress-backend/optivax-erp-backend/admin/SettingsPage.php)
 * and are never read by this theme at all.
 *
 * IMPORTANT — read before assuming this changes the app's API calls: the
 * existing frontend (src/config/environment.ts) resolves its API base URL
 * exclusively from Vite build-time env vars (`import.meta.env.VITE_API_URL`),
 * baked into the compiled bundle at `npm run build` time. It does not read
 * any `window` global. So `restUrl`/`apiBaseUrl` below do NOT retroactively
 * redirect the already-built bundle's fetch calls — that's still controlled
 * by the `.env`/`.env.production` file used for the Vite build being
 * deployed here. This object is provided per the Phase 3A spec and is
 * available for any future/optional use (e.g. a later, explicitly-requested
 * change to have the app read `window.optivaxWpConfig` as a fallback), and
 * is genuinely useful today for the REST nonce and current-user fields.
 * Documented in THEME_IMPLEMENTATION_REPORT.md rather than silently assumed
 * to "just work."
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

function optivax_theme_localize_config(): void
{
    if (!wp_script_is('optivax-react-app', 'enqueued')) {
        return;
    }

    $current_user = null;
    if (is_user_logged_in()) {
        $user = wp_get_current_user();
        $current_user = [
            'id'          => $user->ID,
            'displayName' => $user->display_name,
            'email'       => $user->user_email,
            'roles'       => array_values($user->roles),
        ];
    }

    $config = [
        // Never hardcoded — every URL below is resolved through WordPress's
        // own URL functions so it stays correct across environments
        // (localhost, staging, production, subdirectory installs, multisite).
        'siteUrl'     => home_url('/'),
        'themeUrl'    => get_template_directory_uri() . '/',
        'pluginUrl'   => plugins_url('/', trailingslashit(WP_PLUGIN_DIR) . 'optivax-erp-backend/optivax-erp-backend.php'),
        'uploadUrl'   => wp_get_upload_dir()['baseurl'] ?? '',
        'restUrl'     => esc_url_raw(rest_url()),
        'restNonce'   => wp_create_nonce('wp_rest'),
        // The ERP REST namespace the plugin registers (see
        // OPTIVAX_ERP_NAMESPACE in optivax-erp-backend.php) — informational;
        // the compiled app still uses its own build-time VITE_API_URL.
        'apiNamespace' => 'saas/v1',
        'environment' => function_exists('wp_get_environment_type') ? wp_get_environment_type() : 'production',
        'themeVersion' => wp_get_theme()->get('Version'),
        'locale'      => get_locale(),
        'currentUser' => $current_user,
    ];

    wp_localize_script('optivax-react-app', 'optivaxWpConfig', $config);
}
add_action('wp_enqueue_scripts', 'optivax_theme_localize_config', 20);
