<?php
/**
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

if (is_active_sidebar('footer-1')) : ?>
    <footer id="colophon" class="site-footer">
        <?php dynamic_sidebar('footer-1'); ?>
    </footer>
<?php endif; ?>

<?php wp_footer(); ?>
</body>
</html>
