<?php
/**
 * The site's front page: the primary mount point for the React app. Since
 * the app uses HashRouter (src/App.tsx), every in-app "route" is a
 * client-side `#/...` fragment that never leaves the browser — this one
 * WordPress URL is the only page WordPress ever needs to serve for the
 * entire app, and reloading on any in-app screen re-requests this exact
 * same URL, which is why no BrowserRouter-style rewrite/fallback rules are
 * needed for "direct URL access"/"refresh" to work.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
optivax_theme_render_app_mount();
get_footer();
