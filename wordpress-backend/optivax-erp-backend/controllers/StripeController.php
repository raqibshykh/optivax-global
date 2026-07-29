<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Repositories\InvoiceRepository;
use OptivaxERP\Repositories\StripeSettingsRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/config/stripe, /saas/v1/settings/stripe, and
 * /saas/v1/create-payment-intent. Split from CompanySettingsController on
 * purpose: that controller's get() returns its whole DTO to anyone with
 * 'system' VIEW, which must never include a live Stripe secret key — this
 * controller is the only code path that ever reads or writes the secret,
 * and getConfig() only ever returns the publishable key.
 */
final class StripeController
{
    private StripeSettingsRepository $repo;

    public function __construct()
    {
        $this->repo = new StripeSettingsRepository();
    }

    /** GET /config/stripe — safe for any authenticated user (publishable key only). */
    public function getConfig(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }
        return ApiResponse::ok($this->repo->getPublicConfig());
    }

    /** POST /settings/stripe — super_admin only; handles live payment credentials. */
    public function saveConfig(\WP_REST_Request $request): \WP_REST_Response
    {
        if (AuthMiddleware::currentRole() !== 'super_admin') {
            return ApiResponse::forbidden('Stripe settings are restricted to Super Admin');
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'publishableKey' => ['required'],
        ]);

        // Only live keys are supported — there is no Test Mode toggle in
        // this UI, so a test/sandbox key here would silently misconfigure
        // production payments. secretKey/webhookSecret are optional on a
        // save that only touches `enabled` (see saveConfig()'s doc comment),
        // so their prefix is only checked when actually submitted.
        if (!empty($data['publishableKey']) && !str_starts_with((string) $data['publishableKey'], 'pk_live_')) {
            $errors['publishableKey'] = 'Publishable Key must be a live key starting with "pk_live_"';
        }
        if (!empty($data['secretKey']) && !str_starts_with((string) $data['secretKey'], 'sk_live_')) {
            $errors['secretKey'] = 'Secret Key must be a live key starting with "sk_live_"';
        }
        if (!empty($data['webhookSecret']) && !str_starts_with((string) $data['webhookSecret'], 'whsec_')) {
            $errors['webhookSecret'] = 'Webhook Secret must start with "whsec_"';
        }
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $this->repo->saveConfig($data);
        return ApiResponse::ok(null);
    }

    /**
     * POST /create-payment-intent — any authenticated user (client portal
     * checkout). The secret key never leaves the server; only Stripe's own
     * client_secret (safe for the browser) is returned. Amount is
     * cross-checked against the invoice's own outstanding balance rather
     * than trusted verbatim from the request body.
     */
    public function createPaymentIntent(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'invoiceId' => ['required'],
            'amount' => ['required', 'numeric', ['min', 0.01]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        if (!$this->repo->isEnabled()) {
            return ApiResponse::error('Stripe payments are not enabled', 409);
        }
        $secretKey = $this->repo->getSecretKey();
        if (!$secretKey) {
            return ApiResponse::error('Stripe is not configured', 409);
        }

        $invoice = (new InvoiceRepository())->find((string) $data['invoiceId']);
        if (!$invoice) {
            return ApiResponse::notFound('Invoice not found');
        }

        // A `client`-role caller must only ever be able to pay their own
        // invoice — never trust the request; resolve the caller's own
        // clientId server-side and compare it against the invoice's actual
        // owner before disclosing its balance or creating a PaymentIntent.
        $claims = AuthMiddleware::currentClaims();
        if (($claims['role'] ?? '') === 'client') {
            $ownClientId = ClientScopeMiddleware::resolveOwnClientId((int) $claims['sub'], (string) $claims['email']);
            if (!$ownClientId || $invoice['clientId'] !== $ownClientId) {
                return ApiResponse::forbidden();
            }
        }

        $amount = Sanitize::float($data['amount']);
        $outstanding = (float) $invoice['amount'] - (float) ($invoice['amountPaid'] ?? 0);
        if ($amount > $outstanding + 0.01) {
            return ApiResponse::validationError('Amount exceeds the invoice\'s outstanding balance');
        }

        $response = wp_remote_post('https://api.stripe.com/v1/payment_intents', [
            'timeout' => 15,
            'headers' => [
                'Authorization' => 'Bearer ' . $secretKey,
                'Content-Type' => 'application/x-www-form-urlencoded',
            ],
            'body' => [
                // Stripe expects the smallest currency unit (cents for usd).
                'amount' => (int) round($amount * 100),
                'currency' => Sanitize::text($data['currency'] ?? 'usd'),
                'metadata' => ['invoiceId' => (string) $data['invoiceId']],
            ],
        ]);

        if (is_wp_error($response)) {
            return ApiResponse::error('Unable to reach Stripe: ' . $response->get_error_message(), 502);
        }

        $status = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($status >= 400 || !is_array($body) || empty($body['client_secret'])) {
            $message = is_array($body) ? ($body['error']['message'] ?? 'Stripe rejected the request') : 'Stripe rejected the request';
            return ApiResponse::error($message, 502);
        }

        return ApiResponse::ok([
            'clientSecret' => $body['client_secret'],
            'paymentIntentId' => $body['id'],
        ], [], 201);
    }
}
