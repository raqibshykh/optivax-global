<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Notifications\NotificationService;
use OptivaxERP\Repositories\ClientOwnershipRepository;
use OptivaxERP\Repositories\InvoiceRepository;
use OptivaxERP\Repositories\PaymentRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/invoices/*. Wraps InvoiceRepository for plain CRUD (named
 * generate() instead of create() because InvoiceService.create() posts to
 * /invoices/generate) plus the bespoke stripeConfirm() bookkeeping step.
 */
final class InvoiceController
{
    private InvoiceRepository $repo;
    private PaymentRepository $payments;
    private ClientOwnershipRepository $ownership;

    public function __construct()
    {
        $this->repo = new InvoiceRepository();
        $this->payments = new PaymentRepository();
        $this->ownership = new ClientOwnershipRepository();
    }

    /**
     * 'billing' CREATE/EDIT is held only by sales_admin among department
     * roles (see RbacMatrix) — but a real org can have multiple sales_admin
     * accounts, each managing their own portfolio via the client_ownership
     * table (Production/ClientOwnership.tsx, Sales assign flows). Without
     * this, any sales_admin could edit/create invoices for any client
     * company-wide, the same class of gap Phase 9 closed for commissions.
     * Unassigned clients (no ownership row yet) are intentionally left
     * unblocked, matching BudgetController::ownDepartmentOrNull()'s
     * permissive-when-unset precedent — this must never lock out a
     * legitimate invoice for a client nobody has claimed yet.
     */
    private function ensureInvoiceClientScope(string $clientId): ?\WP_REST_Response
    {
        $callerRole = AuthMiddleware::currentRole() ?? '';
        if (in_array($callerRole, ['super_admin', 'management'], true) || $clientId === '') {
            return null;
        }

        $owned = $this->ownership->findByClientId($clientId);
        if (!$owned) {
            return null;
        }

        $claims = AuthMiddleware::currentClaims();
        $callerId = (string) ($claims['sub'] ?? '');
        if ((string) ($owned['owner_id'] ?? '') !== $callerId) {
            return ApiResponse::forbidden('You can only manage invoices for clients you own');
        }
        return null;
    }

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'VIEW');
        if ($guard) {
            return $guard;
        }

        $filters = [];
        if ($request->get_param('id')) {
            $filters['id'] = sanitize_text_field($request->get_param('id'));
        }
        if ($request->get_param('clientId')) {
            $filters['clientId'] = sanitize_text_field($request->get_param('clientId'));
        }
        // 'assignedTo' has no backing column on invoices — accepted but ignored (see InvoiceRepository::list()).

        // A `client`-role caller must never see another client's invoices
        // (amounts, line items, payment status) — force 'clientId' to their
        // own resolved id regardless of what the request asked for.
        $claims = AuthMiddleware::currentClaims();
        if ($claims && ($claims['role'] ?? '') === 'client') {
            $ownClientId = ClientScopeMiddleware::resolveOwnClientId((int) $claims['sub'], (string) $claims['email']);
            $filters['clientId'] = $ownClientId ?? ClientScopeMiddleware::NO_MATCH_SENTINEL;
        }

        return ApiResponse::ok($this->repo->list($filters));
    }

    /** POST /invoices/generate — a plain create, named to match InvoiceService.create()'s endpoint. */
    public function generate(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'clientId' => ['required'],
            'amount' => ['required', 'numeric', ['min', 0]],
            'issueDate' => ['date'],
            'dueDate' => ['date'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $scopeGuard = $this->ensureInvoiceClientScope((string) $data['clientId']);
        if ($scopeGuard) {
            return $scopeGuard;
        }

        $created = $this->repo->create($data);
        $this->notifyClientOfNewInvoice($created);
        return ApiResponse::ok($created, [], 201);
    }

    /**
     * Phase 8 M3: "notifications are never triggered server-side by real
     * business events ... invoice creation" — a client only has a login (and
     * therefore a `notifications` row to receive) if their client-record
     * email matches a real WP user, resolved the same way
     * ClientScopeMiddleware does it in reverse. Silently does nothing for a
     * client with no portal account yet — this must never fail invoice
     * creation itself (see BaseCrudController::runSideEffect for the same
     * reasoning; this call site isn't routed through that helper because
     * InvoiceController is bespoke, not a BaseCrudController, so it wraps
     * its own try/catch here instead).
     */
    private function notifyClientOfNewInvoice(array $invoice): void
    {
        try {
            $clientEmail = $this->clientEmailFor((string) ($invoice['clientId'] ?? ''));
            if (!$clientEmail) {
                return;
            }
            $user = get_user_by('email', $clientEmail);
            if (!$user) {
                return;
            }
            NotificationService::create([
                'userId' => (string) $user->ID,
                'type' => 'invoice',
                'module' => 'billing',
                'title' => 'New invoice',
                'message' => 'A new invoice' . (!empty($invoice['number']) ? " ({$invoice['number']})" : '') . ' for ' . number_format((float) ($invoice['amount'] ?? 0), 2) . ' has been issued.',
                'actionUrl' => null,
                'actionLabel' => null,
            ]);
        } catch (\Throwable $e) {
            Logger::error('automation', 'Invoice-creation notification failed: ' . $e->getMessage());
        }
    }

    private function clientEmailFor(string $clientId): ?string
    {
        if ($clientId === '') {
            return null;
        }
        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'clients';
        $email = $wpdb->get_var($wpdb->prepare("SELECT email FROM {$table} WHERE id = %s", $clientId));
        return $email ?: null;
    }

    /**
     * A handful of fields describe the money itself (amount/status/paid
     * amount/balance) — once an invoice has any payment recorded against it,
     * editing these would desync the ledger (the "paid" status and remaining
     * balance are only ever recomputed by stripeConfirm()'s own arithmetic,
     * never by a general update). Metadata fields (description, dates,
     * notes, the generated invoice URL) remain freely editable regardless of
     * payment status.
     */
    private const FINANCIAL_FIELDS = ['amount', 'amountPaid', 'remainingBalance', 'status'];

    public function update(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $existing = $this->repo->find((string) $id);
        if (!$existing) {
            return ApiResponse::notFound();
        }

        $scopeGuard = $this->ensureInvoiceClientScope((string) ($existing['clientId'] ?? ''));
        if ($scopeGuard) {
            return $scopeGuard;
        }

        if ($existing['status'] !== 'pending' && $existing['status'] !== 'overdue') {
            foreach (self::FINANCIAL_FIELDS as $field) {
                if (array_key_exists($field, $data)) {
                    return ApiResponse::error(
                        'This invoice already has payment activity recorded — its amount/status can no longer be edited directly. Use the Stripe payment flow or a refund/credit process instead.',
                        409
                    );
                }
            }
        }

        $updated = $this->repo->update((string) $id, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($updated);
    }

    public function delete(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'DELETE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $this->repo->delete((string) $id);
        return ApiResponse::ok(null);
    }

    /**
     * POST /invoices/stripe-confirm — records a completed Stripe charge as a
     * `payments` row and rolls it into the invoice's amount_paid/remaining_balance/
     * status fields. That roll-up arithmetic (amount_paid += amount; remaining_balance
     * = amount - amount_paid; status = paid once remaining_balance <= 0) is the
     * one bookkeeping step the module spec explicitly allows here — it is not
     * a derived business rule, just persisting what the Stripe charge implies.
     */
    public function stripeConfirm(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('billing', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'invoiceId' => ['required'],
            'amount' => ['required', 'numeric', ['min', 0]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        $invoiceId = $data['invoiceId'];

        $invoice = $this->repo->find((string) $invoiceId);
        if (!$invoice) {
            return ApiResponse::notFound('Invoice not found');
        }

        $scopeGuard = $this->ensureInvoiceClientScope((string) ($invoice['clientId'] ?? ''));
        if ($scopeGuard) {
            return $scopeGuard;
        }

        $amount = Sanitize::float($data['amount'] ?? 0);

        // StripeController::createPaymentIntent() already checks the
        // requested amount against the invoice's outstanding balance before
        // Stripe ever charges a card — but that and this endpoint are two
        // separate, unlinked calls (nothing here re-verifies the amount
        // actually matches what Stripe confirmed for stripePaymentIntentId).
        // Re-checking here too means a client can never push amountPaid
        // past the invoice total or drive remainingBalance negative, even by
        // calling this endpoint directly with a fabricated amount.
        $outstanding = (float) $invoice['amount'] - (float) ($invoice['amountPaid'] ?? 0);
        if ($amount > $outstanding + 0.01) {
            return ApiResponse::validationError(
                "Amount ({$amount}) exceeds the invoice's outstanding balance ({$outstanding})."
            );
        }

        // The payment row and the invoice's amount_paid/status roll-up must
        // land together — a crash between the two would either record a
        // payment against an invoice that still shows as unpaid, or (worse)
        // mark an invoice paid with no payment row backing it.
        [$payment, $updatedInvoice] = Transaction::run(function () use ($data, $invoiceId, $invoice, $amount) {
            $payment = $this->payments->create([
                'invoiceId' => $invoiceId,
                'amount' => $amount,
                'currency' => $data['currency'] ?? 'usd',
                'date' => current_time('mysql', true),
                'paidAt' => current_time('mysql', true),
                'paidByUserId' => $data['paidByUserId'] ?? null,
                'method' => 'credit-card',
                'transactionId' => $data['stripeChargeId'] ?? Uuid::v4(),
                'stripePaymentIntentId' => $data['stripePaymentIntentId'] ?? null,
                'stripeChargeId' => $data['stripeChargeId'] ?? null,
                'notes' => isset($data['cardholderName']) ? ('Cardholder: ' . $data['cardholderName']) : null,
            ]);

            $amountPaid = (float) ($invoice['amountPaid'] ?? 0) + $amount;
            $remainingBalance = (float) $invoice['amount'] - $amountPaid;
            $status = $remainingBalance <= 0 ? 'paid' : 'partially_paid';

            $updatedInvoice = $this->repo->update((string) $invoiceId, [
                'amountPaid' => $amountPaid,
                'remainingBalance' => $remainingBalance,
                'status' => $status,
            ]);

            return [$payment, $updatedInvoice];
        });

        return ApiResponse::ok(['invoice' => $updatedInvoice, 'payment' => $payment]);
    }
}
