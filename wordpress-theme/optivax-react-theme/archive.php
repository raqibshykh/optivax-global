<?php
/**
 * Standard archive template — included for WordPress template-hierarchy
 * completeness. Not part of the ERP app's own navigation.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<main id="primary" class="site-main" style="max-width:800px;margin:2rem auto;padding:0 1rem;">
    <header class="page-header">
        <?php the_archive_title('<h1 class="page-title">', '</h1>'); ?>
        <?php the_archive_description('<div class="archive-description">', '</div>'); ?>
    </header>

    <?php if (have_posts()) : ?>
        <?php
        while (have_posts()) :
            the_post();
            ?>
            <article <?php post_class(); ?>>
                <header class="entry-header">
                    <?php the_title(sprintf('<h2 class="entry-title"><a href="%s">', esc_url(get_permalink())), '</a></h2>'); ?>
                </header>
                <div class="entry-summary">
                    <?php the_excerpt(); ?>
                </div>
            </article>
            <?php
        endwhile;

        the_posts_navigation();
    else :
        ?>
        <p><?php esc_html_e('Nothing found.', 'optivax-react-theme'); ?></p>
        <?php
    endif;
    ?>
</main>
<?php
get_footer();
