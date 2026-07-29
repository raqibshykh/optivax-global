<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/email/campaigns/* (src/services/emailService.ts EmailCampaign).
 * The frontend's `stats: {sent, opened, clicked}` is a nested object on the
 * wire but flat `stats_sent`/`stats_opened`/`stats_clicked` columns in the
 * DB — toDto() reassembles it, fromDtoForCreate()/fromDtoForUpdate() flatten
 * it back down. This is pure shape translation, not a calculated metric: the
 * three numbers are stored/returned exactly as given, never derived here.
 */
final class EmailCampaignRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'email_campaigns';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'subject' => $row['subject'],
            'templateId' => $row['template_id'],
            'status' => $row['status'],
            'scheduleDate' => $row['schedule_date'] ?? null,
            'sentDate' => $row['sent_date'] ?? null,
            'audienceTags' => Sanitize::jsonDecode($row['audience_tags'] ?? null),
            'stats' => [
                'sent' => (int) ($row['stats_sent'] ?? 0),
                'opened' => (int) ($row['stats_opened'] ?? 0),
                'clicked' => (int) ($row['stats_clicked'] ?? 0),
            ],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        $stats = is_array($data['stats'] ?? null) ? $data['stats'] : [];
        $now = current_time('mysql', true);
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'subject' => Sanitize::text($data['subject'] ?? ''),
            'template_id' => Sanitize::text($data['templateId'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'draft'),
            'schedule_date' => Sanitize::text($data['scheduleDate'] ?? null),
            'sent_date' => Sanitize::text($data['sentDate'] ?? null),
            'audience_tags' => Sanitize::json($data['audienceTags'] ?? []),
            'stats_sent' => Sanitize::int($stats['sent'] ?? 0),
            'stats_opened' => Sanitize::int($stats['opened'] ?? 0),
            'stats_clicked' => Sanitize::int($stats['clicked'] ?? 0),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?? $now,
            'updated_at' => Sanitize::text($data['updatedAt'] ?? null) ?? $now,
        ];
    }

    /** Only touches columns actually present in the patch, so a partial PUT can't blank out unrelated fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('name', $data)) {
            $row['name'] = Sanitize::text($data['name']);
        }
        if (array_key_exists('subject', $data)) {
            $row['subject'] = Sanitize::text($data['subject']);
        }
        if (array_key_exists('templateId', $data)) {
            $row['template_id'] = Sanitize::text($data['templateId']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('scheduleDate', $data)) {
            $row['schedule_date'] = Sanitize::text($data['scheduleDate']);
        }
        if (array_key_exists('sentDate', $data)) {
            $row['sent_date'] = Sanitize::text($data['sentDate']);
        }
        if (array_key_exists('audienceTags', $data)) {
            $row['audience_tags'] = Sanitize::json($data['audienceTags']);
        }
        if (array_key_exists('stats', $data) && is_array($data['stats'])) {
            $stats = $data['stats'];
            if (array_key_exists('sent', $stats)) {
                $row['stats_sent'] = Sanitize::int($stats['sent']);
            }
            if (array_key_exists('opened', $stats)) {
                $row['stats_opened'] = Sanitize::int($stats['opened']);
            }
            if (array_key_exists('clicked', $stats)) {
                $row['stats_clicked'] = Sanitize::int($stats['clicked']);
            }
        }
        $row['updated_at'] = Sanitize::text($data['updatedAt'] ?? null) ?? current_time('mysql', true);
        return $row;
    }
}
