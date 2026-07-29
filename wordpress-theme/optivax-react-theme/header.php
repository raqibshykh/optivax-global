<?php
/**
 * The header for the theme's shell page. Deliberately minimal — nearly
 * everything a visitor sees is rendered by the React app itself once it
 * mounts into #root (see footer.php / inc/template-tags.php).
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="<?php echo esc_url(get_template_directory_uri() . '/build/favicon.png'); ?>">
    <?php wp_head(); ?>
</head>
<body <?php body_class('dark:bg-gray-900'); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#root"><?php esc_html_e('Skip to app content', 'optivax-react-theme'); ?></a>
