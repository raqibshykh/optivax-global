<?php
/**
 * Core WordPress theme-support registration: title-tag, post-thumbnails,
 * custom-logo, menus, widget areas, localization. No ERP/business logic
 * lives here — this file only satisfies WordPress theme standards so the
 * theme activates cleanly and behaves like any other theme in wp-admin.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Theme setup: runs on `after_setup_theme`, the standard hook for
 * add_theme_support()/register_nav_menus() calls per the Theme Handbook.
 */
function optivax_theme_setup(): void
{
    // Translations (theme is translation-ready even though the React app,
    // which renders 100% of the actual UI, manages its own i18n separately).
    load_theme_textdomain('optivax-react-theme', get_template_directory() . '/languages');

    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('automatic-feed-links');
    add_theme_support('html5', [
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
        'navigation-widgets',
    ]);
    add_theme_support('responsive-embeds');
    add_theme_support('align-wide');
    add_theme_support('custom-logo', [
        'height'      => 80,
        'width'       => 240,
        'flex-height' => true,
        'flex-width'  => true,
    ]);
    add_theme_support('custom-background', [
        'default-color' => 'ffffff',
    ]);

    // Standard WP menu locations. Not consumed by the React app (which has
    // its own role-driven sidebar/menu built from src/config/menuConfig.ts),
    // but registered so the theme fully satisfies WP menu standards — e.g.
    // a "Marketing Site Footer" menu for any static/marketing pages that
    // aren't part of the ERP app.
    register_nav_menus([
        'primary' => __('Primary Menu', 'optivax-react-theme'),
        'footer'  => __('Footer Menu', 'optivax-react-theme'),
    ]);
}
add_action('after_setup_theme', 'optivax_theme_setup');

/**
 * Standard sidebar/widget areas. Unused by the React-rendered app screens
 * (which don't call dynamic_sidebar() anywhere), but registered so the
 * theme fully satisfies "Widgets" support for any classic WP page/post
 * content that might use them outside the app shell.
 */
function optivax_theme_widgets_init(): void
{
    register_sidebar([
        'name'          => __('Footer Widget Area', 'optivax-react-theme'),
        'id'            => 'footer-1',
        'description'   => __('Widgets added here appear in the site footer, outside the React app mount point.', 'optivax-react-theme'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ]);
}
add_action('widgets_init', 'optivax_theme_widgets_init');
