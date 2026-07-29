<?php
/**
 * Page-level HTTP security headers for the theme's own HTML responses.
 * This is deliberately a separate, narrower concern from the plugin's
 * helpers/SecurityHeaders.php, which only hooks `rest_api_init` and so
 * never fires for a normal page load — there is no overlap/duplication
 * between the two: the plugin secures REST JSON responses, this secures
 * the HTML shell page.
 *
 * Content-Security-Policy is scoped to this deployment's known production
 * origin (optivaxglobal.com — the SPA and its REST API share this origin,
 * per the "deploy inside the WordPress theme" path): 'self' covers the
 * same-origin API calls, js.stripe.com/api.stripe.com are allow-listed for
 * the real Stripe.js payment flow (src/pages/Client/Billing.tsx). Safe to
 * set unconditionally here — templates/template-app.php never calls
 * wp_head()/wp_footer(), so this page never renders the WP admin bar or any
 * other core/plugin-injected inline script this policy could break.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

function optivax_theme_security_headers(): void
{
    if (is_admin()) {
        return; // wp-admin has its own headers; don't interfere with it.
    }
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header(
        "Content-Security-Policy: default-src 'self'; " .
        "script-src 'self' https://js.stripe.com; " .
        "style-src 'self' 'unsafe-inline'; " .
        "img-src 'self' data: blob:; " .
        "font-src 'self' data:; " .
        "connect-src 'self' https://optivaxglobal.com https://api.stripe.com; " .
        "frame-src https://js.stripe.com; " .
        "object-src 'none'; base-uri 'self'; form-action 'self'"
    );
}
add_action('send_headers', 'optivax_theme_security_headers');
