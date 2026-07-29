<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Repositories\InvoiceRepository;
use OptivaxERP\Repositories\PaymentRepository;

if (!defined('ABSPATH')) {
    exit;
}

/** Read-only — payments are only ever created server-side via POST /invoices/stripe-confirm. */
final class PaymentRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new PaymentRepository(), 'billing');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/payments/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                // A `client`-role caller must never see another client's
                // payment records. Payments have no direct clientId column
                // (only invoice_id), so — unlike the other client-scoped list
                // endpoints — the check is against the referenced invoice's
                // own clientId rather than a forced equality filter.
                $claims = AuthMiddleware::currentClaims();
                if ($claims && ($claims['role'] ?? '') === 'client') {
                    $invoiceId = $request->get_param('invoiceId');
                    $ownClientId = ClientScopeMiddleware::resolveOwnClientId((int) $claims['sub'], (string) $claims['email']);
                    $invoice = $invoiceId ? (new InvoiceRepository())->find((string) $invoiceId) : null;
                    if (!$invoiceId || !$invoice || !$ownClientId || $invoice['clientId'] !== $ownClientId) {
                        // No invoiceId, an invoice that doesn't exist, or one
                        // that isn't theirs — never fall through to "return
                        // every payment", just return an empty list.
                        return ApiResponse::ok([]);
                    }
                }

                return $controller->listHandler($request, [
                    'invoiceId' => 'invoice_id',
                ]);
            },
            'permission_callback' => '__return_true',
        ]);
    }
}
