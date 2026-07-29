<?php
/** @var string $employeeName */
/** @var string $salaryMonth */
/** @var float $netSalary */
if (!defined('ABSPATH')) {
    exit;
}
?>
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <h2>Salary Slip — <?php echo esc_html($salaryMonth); ?></h2>
  <p>Hi <?php echo esc_html($employeeName); ?>, your salary slip for <?php echo esc_html($salaryMonth); ?> is ready.</p>
  <p>Net salary: <strong><?php echo esc_html(number_format((float) $netSalary, 2)); ?></strong></p>
  <p style="color:#777;font-size:12px;">Sign in to your dashboard to view the full breakdown.</p>
</div>
