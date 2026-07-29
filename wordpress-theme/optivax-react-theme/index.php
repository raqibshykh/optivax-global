<?php
/**
 * The mandatory fallback template every WordPress theme must have. This
 * theme has exactly one job — mount the React app — so, like
 * front-page.php, it does that unconditionally for any request that
 * reaches here without a more specific template (single.php, page.php,
 * archive.php, 404.php) taking over first.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
optivax_theme_render_app_mount();
get_footer();
