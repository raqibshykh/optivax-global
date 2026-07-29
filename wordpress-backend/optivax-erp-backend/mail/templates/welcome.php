<?php
/** @var string $fullName */
/** @var string $email */
/** @var string $password */
/** @var string $loginUrl */
if (!defined('ABSPATH')) {
    exit;
}
?>
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <h2>Welcome to OptiVax Global, <?php echo esc_html($fullName); ?></h2>
  <p>An account has been created for you. Here are your sign-in details:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:6px 0;color:#555;">Email</td><td style="padding:6px 0;"><strong><?php echo esc_html($email); ?></strong></td></tr>
    <tr><td style="padding:6px 0;color:#555;">Temporary password</td><td style="padding:6px 0;"><strong><?php echo esc_html($password); ?></strong></td></tr>
  </table>
  <p><a href="<?php echo esc_url($loginUrl); ?>" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Sign in</a></p>
  <p style="color:#777;font-size:12px;">For security, please change your password after your first sign-in.</p>
</div>
