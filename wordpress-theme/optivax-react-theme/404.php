<?php
/**
 * Genuine 404 for URLs WordPress itself cannot resolve to anything (no
 * matching page/post/rewrite rule). Deliberately NOT the React app: since
 * the app uses HashRouter (see front-page.php's doc comment), every real
 * in-app route lives after a `#` fragment on the one WordPress URL that
 * hosts the app — the browser never sends that fragment to the server, so
 * this template only ever runs for URLs that are wrong at the WordPress
 * level (typos, stale links to since-deleted pages, etc.), which should
 * stay a real, correctly-coded 404 rather than silently return 200 with the
 * whole app for every bad URL.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<main id="primary" class="site-main" style="max-width:640px;margin:4rem auto;padding:0 1rem;text-align:center;">
    <h1><?php esc_html_e('Page not found', 'optivax-react-theme'); ?></h1>
    <p><?php esc_html_e('The page you are looking for does not exist.', 'optivax-react-theme'); ?></p>
    <p>
        <a href="<?php echo esc_url(home_url('/')); ?>">
            <?php esc_html_e('Return to the application', 'optivax-react-theme'); ?>
        </a>
    </p>
</main>
<?php
get_footer();
