<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/payments/*. Read-only from the route layer (payments are
 * only ever created server-side by InvoiceController::stripeConfirm(), via
 * this repository's inherited create()) — filtering by invoiceId is a plain
 * equality match, so the inherited AbstractRepository::list() is used as-is
 * (PaymentRoutes maps its ?invoiceId= query param to the invoice_id column).
 */
final class PaymentRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'payments';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'invoiceId' => $row['invoice_id'],
            'amount' => (float) $row['amount'],
            'currency' => $row['currency'] ?? 'usd',
            'date' => $row['date'] ?: null,
            'paidAt' => $row['paid_at'] ?: null,
            'paidByUserId' => $row['paid_by_user_id'] ?: null,
            'method' => $row['method'] ?? 'credit-card',
            'transactionId' => $row['transaction_id'] ?? '',
            'stripePaymentIntentId' => $row['stripe_payment_intent_id'] ?: null,
            'stripeChargeId' => $row['stripe_charge_id'] ?: null,
            'notes' => $row['notes'] ?: null,
            'checkImageUrl' => $row['check_image_url'] ?: null,
            'created_at' => $row['created_at'] ?: null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'invoice_id' => Sanitize::text($data['invoiceId'] ?? ''),
            'amount' => Sanitize::float($data['amount'] ?? 0),
            'currency' => Sanitize::text($data['currency'] ?? 'usd'),
            'date' => Sanitize::text($data['date'] ?? null) ?: current_time('mysql', true),
            'paid_at' => Sanitize::text($data['paidAt'] ?? null) ?: current_time('mysql', true),
            'paid_by_user_id' => Sanitize::text($data['paidByUserId'] ?? null),
            'method' => Sanitize::text($data['method'] ?? 'credit-card'),
            'transaction_id' => Sanitize::text($data['transactionId'] ?? ''),
            'stripe_payment_intent_id' => Sanitize::text($data['stripePaymentIntentId'] ?? null),
            'stripe_charge_id' => Sanitize::text($data['stripeChargeId'] ?? null),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
            'check_image_url' => Sanitize::url($data['checkImageUrl'] ?? null),
            'created_at' => current_time('mysql', true),
        ];
    }
}
