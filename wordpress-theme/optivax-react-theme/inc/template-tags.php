<?php
/**
 * Shared markup used by every template that mounts the React app
 * (front-page.php, page.php, index.php, templates/template-app.php) — kept
 * in one place so the mount point is defined exactly once rather than
 * copy-pasted across every template file.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Outputs the React mount point, matching the div#root the compiled bundle
 * (src/main.tsx: createRoot(document.getElementById("root"))) expects
 * exactly. The placeholder text inside it is replaced the instant React
 * mounts — React's render() replaces #root's entire contents — so this
 * never needs separate JS to hide a "loading" spinner.
 */
function optivax_theme_render_app_mount(): void
{
    ?>
    <div id="root"><div id="optivax-root-loading">
        <?php if (optivax_theme_has_build()) : ?>
            <?php esc_html_e('Loading OptiVax Global…', 'optivax-react-theme'); ?>
        <?php else : ?>
            <?php esc_html_e('The React application build has not been deployed to this theme yet. See build/README.md.', 'optivax-react-theme'); ?>
        <?php endif; ?>
    </div></div>
    <?php
}
