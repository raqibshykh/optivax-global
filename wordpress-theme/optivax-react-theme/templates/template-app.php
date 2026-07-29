<?php
/**
 * Template Name: React Application
 * Template Post Type: page
 *
 * Assignable alternative mount point: if a site's homepage is used for
 * something else (a marketing page, a blog), create a WordPress Page (e.g.
 * at /app/) and assign it this template from the Page Attributes panel to
 * mount the React app there instead of on front-page.php.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
optivax_theme_render_app_mount();
get_footer();
