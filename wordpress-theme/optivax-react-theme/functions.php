<?php
/**
 * OptiVax React Theme bootstrap.
 *
 * This theme contains no business logic, REST endpoints, JWT/SMTP handling,
 * RBAC, payroll, attendance, budget, notifications, or database queries —
 * every one of those lives in the companion "OptiVax ERP Backend" plugin
 * (wordpress-backend/optivax-erp-backend/) and stays there untouched. This
 * theme's only responsibility is loading the React app's compiled build and
 * getting out of its way, per the Phase 3A scope.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

define('OPTIVAX_THEME_VERSION', '1.0.0');
define('OPTIVAX_THEME_DIR', get_template_directory());
define('OPTIVAX_THEME_URI', get_template_directory_uri());

require_once OPTIVAX_THEME_DIR . '/inc/theme-setup.php';
require_once OPTIVAX_THEME_DIR . '/inc/assets.php';
require_once OPTIVAX_THEME_DIR . '/inc/localize.php';
require_once OPTIVAX_THEME_DIR . '/inc/seo.php';
require_once OPTIVAX_THEME_DIR . '/inc/security.php';
require_once OPTIVAX_THEME_DIR . '/inc/template-tags.php';
