<?php

namespace OptivaxERP\Mail;

use OptivaxERP\Helpers\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Wraps wp_mail(). SMTP transport is applied via the phpmailer_init hook
 * (configureSmtp, registered in the plugin bootstrap) using the smtp_* keys
 * from plugin_settings — the only mail-related settings requiring manual
 * admin configuration (item 9 of the plan).
 */
final class MailService
{
    private const OPT_HOST = 'optivax_erp_smtp_host';
    private const OPT_PORT = 'optivax_erp_smtp_port';
    private const OPT_ENCRYPTION = 'optivax_erp_smtp_encryption'; // '', 'ssl', 'tls'
    private const OPT_USERNAME = 'optivax_erp_smtp_username';
    private const OPT_PASSWORD = 'optivax_erp_smtp_password';
    private const OPT_FROM_EMAIL = 'optivax_erp_smtp_from_email';
    private const OPT_FROM_NAME = 'optivax_erp_smtp_from_name';

    public static function configureSmtp(\PHPMailer\PHPMailer\PHPMailer $phpmailer): void
    {
        $host = get_option(self::OPT_HOST);
        if (!$host) {
            return; // Not configured yet — fall back to PHP mail() (default WP behavior).
        }

        $phpmailer->isSMTP();
        $phpmailer->Host = $host;
        $phpmailer->Port = (int) (get_option(self::OPT_PORT) ?: 587);
        $encryption = get_option(self::OPT_ENCRYPTION) ?: 'tls';
        if ($encryption) {
            $phpmailer->SMTPSecure = $encryption;
        }
        $username = get_option(self::OPT_USERNAME);
        if ($username) {
            $phpmailer->SMTPAuth = true;
            $phpmailer->Username = $username;
            $phpmailer->Password = get_option(self::OPT_PASSWORD);
        }

        $fromEmail = get_option(self::OPT_FROM_EMAIL);
        if ($fromEmail) {
            $phpmailer->setFrom($fromEmail, get_option(self::OPT_FROM_NAME) ?: get_bloginfo('name'));
        }
    }

    /** Renders one of mail/templates/*.php with $vars in scope, returns the HTML string. */
    public static function render(string $template, array $vars = []): string
    {
        $path = OPTIVAX_ERP_DIR . 'mail/templates/' . $template . '.php';
        if (!file_exists($path)) {
            Logger::error('mail', "Template not found: {$template}");
            return '';
        }
        extract($vars, EXTR_SKIP);
        ob_start();
        include $path;
        return (string) ob_get_clean();
    }

    /** Sends immediately (used for auth-critical mail: welcome/credentials, password reset). */
    public static function sendNow(string $to, string $subject, string $template, array $vars = []): bool
    {
        $html = self::render($template, $vars);
        $headers = ['Content-Type: text/html; charset=UTF-8'];
        $sent = wp_mail($to, $subject, $html, $headers);
        if (!$sent) {
            Logger::error('mail', 'wp_mail() returned false', ['to' => $to, 'subject' => $subject]);
        }
        return $sent;
    }

    /** Queues for async delivery with retry (used for bulk/non-critical notification mail). */
    public static function queue(string $to, string $subject, string $template, array $vars = [], int $maxAttempts = 5): void
    {
        self::enqueue($to, $subject, self::render($template, $vars), $maxAttempts);
    }

    /**
     * Same delivery mechanism as queue() (drained by cron\EmailQueueWorker
     * with the same retry/backoff), but for HTML that's already been
     * rendered — e.g. a marketing campaign's rich-text body, which is
     * user-authored content stored directly in the DB, not one of the
     * mail/templates/*.php files render() expects.
     */
    public static function queueRaw(string $to, string $subject, string $html, int $maxAttempts = 5): void
    {
        self::enqueue($to, $subject, $html, $maxAttempts);
    }

    private static function enqueue(string $to, string $subject, string $html, int $maxAttempts): void
    {
        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'email_queue';

        $wpdb->insert($table, [
            'to_email' => $to,
            'subject' => $subject,
            'body_html' => $html,
            'attempts' => 0,
            'max_attempts' => $maxAttempts,
            'status' => 'pending',
            'next_attempt_at' => current_time('mysql', true),
            'created_at' => current_time('mysql', true),
        ]);
    }
}
