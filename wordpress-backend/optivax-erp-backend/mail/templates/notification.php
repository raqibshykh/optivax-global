<?php
/** @var string $title */
/** @var string $message */
/** @var string|null $actionUrl */
/** @var string|null $actionLabel */
if (!defined('ABSPATH')) {
    exit;
}
?>
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <h2><?php echo esc_html($title); ?></h2>
  <p><?php echo nl2br(esc_html($message)); ?></p>
  <?php if (!empty($actionUrl)) : ?>
    <p><a href="<?php echo esc_url($actionUrl); ?>" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;"><?php echo esc_html($actionLabel ?: 'View'); ?></a></p>
  <?php endif; ?>
</div>
