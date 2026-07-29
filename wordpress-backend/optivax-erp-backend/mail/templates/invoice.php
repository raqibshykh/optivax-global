<?php
/** @var string $clientName */
/** @var string $invoiceNumber */
/** @var float $amount */
/** @var string $dueDate */
/** @var string|null $invoiceUrl */
if (!defined('ABSPATH')) {
    exit;
}
?>
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <h2>Invoice <?php echo esc_html($invoiceNumber); ?></h2>
  <p>Hi <?php echo esc_html($clientName); ?>, a new invoice has been issued to your account.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:6px 0;color:#555;">Amount</td><td style="padding:6px 0;"><strong><?php echo esc_html(number_format((float) $amount, 2)); ?></strong></td></tr>
    <tr><td style="padding:6px 0;color:#555;">Due date</td><td style="padding:6px 0;"><strong><?php echo esc_html($dueDate); ?></strong></td></tr>
  </table>
  <?php if (!empty($invoiceUrl)) : ?>
    <p><a href="<?php echo esc_url($invoiceUrl); ?>" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">View invoice</a></p>
  <?php endif; ?>
</div>
