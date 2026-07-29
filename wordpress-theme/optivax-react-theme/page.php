<?php
/**
 * Default template for ordinary WordPress Pages (e.g. a privacy policy or
 * terms page an admin creates in wp-admin, outside the app). To mount the
 * React app on a specific page instead, assign it the "React Application"
 * page template (templates/template-app.php) from the Page Attributes
 * panel — this file intentionally renders normal page content, not the app,
 * so both use cases stay available without one silently overriding the
 * other.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<main id="primary" class="site-main" style="max-width:800px;margin:2rem auto;padding:0 1rem;">
    <?php
    while (have_posts()) :
        the_post();
        ?>
        <article <?php post_class(); ?>>
            <header class="entry-header">
                <?php the_title('<h1 class="entry-title">', '</h1>'); ?>
            </header>
            <div class="entry-content">
                <?php the_content(); ?>
            </div>
        </article>
        <?php
    endwhile;
    ?>
</main>
<?php
get_footer();
