<?php
/**
 * Baseline meta tags for the shell page itself. WordPress core already
 * outputs the <title> tag (add_theme_support('title-tag') in
 * inc/theme-setup.php) and the rel="canonical" link (core's default
 * wp_head hooks) — this file only adds what core doesn't: a fallback meta
 * description, Open Graph tags, and a sane robots default. This is an
 * internal admin ERP tool behind auth, not a marketing site, so the robots
 * default is conservative (noindex) rather than assuming public SEO is
 * wanted — sites that do want it can override via a real SEO plugin, which
 * this theme does not attempt to replace.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

function optivax_theme_meta_tags(): void
{
    $description = get_bloginfo('description');
    $site_name = get_bloginfo('name');
    $url = home_url(add_query_arg([], $_SERVER['REQUEST_URI'] ?? '/'));

    if ($description) {
        printf('<meta name="description" content="%s">' . "\n", esc_attr($description));
    }

    // Conservative default: an internal ERP app has nothing worth indexing,
    // and every screen after login is a private dashboard. Left filterable
    // so a specific deployment can opt in if a marketing/public page is
    // ever built on top of this theme.
    $robots = apply_filters('optivax_theme_robots_content', 'noindex, nofollow');
    printf('<meta name="robots" content="%s">' . "\n", esc_attr($robots));

    printf('<meta property="og:site_name" content="%s">' . "\n", esc_attr($site_name));
    printf('<meta property="og:title" content="%s">' . "\n", esc_attr(wp_get_document_title()));
    if ($description) {
        printf('<meta property="og:description" content="%s">' . "\n", esc_attr($description));
    }
    printf('<meta property="og:type" content="website">' . "\n");
    printf('<meta property="og:url" content="%s">' . "\n", esc_url($url));

    if (has_custom_logo()) {
        $logo_id = get_theme_mod('custom_logo');
        $logo_src = $logo_id ? wp_get_attachment_image_url((int) $logo_id, 'full') : false;
        if ($logo_src) {
            printf('<meta property="og:image" content="%s">' . "\n", esc_url($logo_src));
        }
    }

    printf('<meta name="twitter:card" content="summary">' . "\n");
}
add_action('wp_head', 'optivax_theme_meta_tags', 1);
