<?php
/**
 * Standard single-post template — included for WordPress template-hierarchy
 * completeness. The React ERP app has no concept of WordPress posts; this
 * only renders if a site admin creates a regular post outside the app.
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
                <div class="entry-meta">
                    <?php echo esc_html(get_the_date()); ?>
                </div>
            </header>
            <?php if (has_post_thumbnail()) : ?>
                <div class="post-thumbnail"><?php the_post_thumbnail('large'); ?></div>
            <?php endif; ?>
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
