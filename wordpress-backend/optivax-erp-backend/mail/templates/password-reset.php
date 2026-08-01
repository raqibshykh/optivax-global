<?php
/** @var string $fullName */
/** @var string $resetUrl */
/** @var string $token */
/** @var string $expiresIn */
if (!defined('ABSPATH')) {
    exit;
}
?>
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <h2>Reset your password</h2>
  <p>Hi <?php echo esc_html($fullName); ?>, we received a request to reset your OptiVax Global password.</p>
  <p><a href="<?php echo esc_url($resetUrl); ?>" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Reset password</a></p>
  <p style="color:#777;font-size:12px;">If the button doesn't work, use this token on the reset page: <code><?php echo esc_html($token); ?></code></p>
  <p style="color:#777;font-size:12px;">This link expires in <?php echo esc_html($expiresIn ?? '1 hour'); ?> and can only be used once.</p>
  <p style="color:#777;font-size:12px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
</div>
