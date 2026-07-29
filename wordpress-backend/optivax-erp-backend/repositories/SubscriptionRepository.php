<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/subscriptions/* (subscriptionService.ts) — list-only per
 * the frontend contract (SubscriptionService only exposes getAll()), so
 * create/update/delete are unreachable via any registered route but are
 * still implemented to satisfy AbstractRepository's abstract methods.
 * toDto() mirrors the DB column names verbatim, matching the `Subscription`
 * interface in subscriptionService.ts exactly.
 */
final class SubscriptionRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'subscriptions';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'organization_id' => $row['organization_id'],
            'plan_name' => $row['plan_name'],
            'status' => $row['status'],
            'billing_cycle' => $row['billing_cycle'],
            'current_period_end' => $row['current_period_end'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'organization_id' => Sanitize::text($data['organization_id'] ?? ''),
            'plan_name' => Sanitize::text($data['plan_name'] ?? ''),
            'status' => Sanitize::text($data['status'] ?? ''),
            'billing_cycle' => Sanitize::text($data['billing_cycle'] ?? ''),
            'current_period_end' => Sanitize::text($data['current_period_end'] ?? null),
        ];
    }
}
