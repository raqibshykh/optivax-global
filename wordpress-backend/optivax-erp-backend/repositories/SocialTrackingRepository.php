<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/social-links/* and /saas/v1/social-analytics/*
 * (src/services/socialTrackingService.ts). Bespoke (doesn't extend
 * AbstractRepository) because it spans three tables — social_links,
 * social_click_events, social_account_metrics — behind one frontend service.
 *
 * Judgment calls (see final report for detail):
 *  - `tracking_id` isn't sent by SocialTrackingService::createLink(), so it's
 *    generated server-side here.
 *  - social_click_events stores the frontend's `timestamp` field in an
 *    `occurred_at` column (see MarketingMigration doc comment); toDto() maps
 *    it back to `timestamp`.
 *  - The frontend's AccountMetric shape {linkId, platform, followers,
 *    engagement, reach, lastSync} doesn't line up with the endpoint-inventory
 *    schema for social_account_metrics {link_id, metric_date, impressions,
 *    clicks, extra_json} — the exact sync schema wasn't in scope for Phase
 *    2A. getAccountMetrics() reads `platform` back via a join to social_links
 *    (display-only, not a calculated value) and reads followers/engagement/
 *    reach out of the extra_json catch-all if a future sync job populates it.
 *  - syncAccountMetrics() is a Phase 2A stub: it inserts a placeholder row
 *    with today's date and null impressions/clicks. Real third-party sync
 *    integration is Phase 2B.
 */
final class SocialTrackingRepository
{
    private function linksTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'social_links';
    }

    private function clicksTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'social_click_events';
    }

    private function metricsTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'social_account_metrics';
    }

    // ── Links ─────────────────────────────────────────────────────────────

    public function listLinks(): array
    {
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM {$this->linksTable()} ORDER BY created_at DESC", ARRAY_A);
        return array_map([$this, 'linkToDto'], $rows ?: []);
    }

    public function createLink(array $data): array
    {
        global $wpdb;
        $id = $data['id'] ?? Uuid::v4();
        $trackingId = Sanitize::text($data['trackingId'] ?? null) ?? $this->generateTrackingId();

        $wpdb->insert($this->linksTable(), [
            'id' => $id,
            'platform' => Sanitize::text($data['platform'] ?? ''),
            'label' => Sanitize::text($data['label'] ?? ''),
            'url' => Sanitize::url($data['url'] ?? ''),
            'tracking_id' => $trackingId,
            'status' => Sanitize::text($data['status'] ?? 'active'),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?? current_time('mysql', true),
            'created_by' => Sanitize::text($data['createdBy'] ?? null),
        ]);

        return $this->findLink($id);
    }

    public function updateLink(string $id, array $patch): ?array
    {
        global $wpdb;
        $row = [];
        if (array_key_exists('platform', $patch)) {
            $row['platform'] = Sanitize::text($patch['platform']);
        }
        if (array_key_exists('label', $patch)) {
            $row['label'] = Sanitize::text($patch['label']);
        }
        if (array_key_exists('url', $patch)) {
            $row['url'] = Sanitize::url($patch['url']);
        }
        if (array_key_exists('trackingId', $patch)) {
            $row['tracking_id'] = Sanitize::text($patch['trackingId']);
        }
        if (array_key_exists('status', $patch)) {
            $row['status'] = Sanitize::text($patch['status']);
        }
        if (array_key_exists('createdBy', $patch)) {
            $row['created_by'] = Sanitize::text($patch['createdBy']);
        }

        if (!empty($row)) {
            $wpdb->update($this->linksTable(), $row, ['id' => $id]);
        }

        return $this->findLink($id);
    }

    public function deleteLink(string $id): bool
    {
        global $wpdb;
        return (bool) $wpdb->delete($this->linksTable(), ['id' => $id]);
    }

    public function findLink(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->linksTable()} WHERE id = %s", $id), ARRAY_A);
        return $row ? $this->linkToDto($row) : null;
    }

    private function linkToDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'platform' => $row['platform'],
            'label' => $row['label'],
            'url' => $row['url'],
            'trackingId' => $row['tracking_id'],
            'status' => $row['status'],
            'createdAt' => $row['created_at'],
            'createdBy' => $row['created_by'] ?? null,
        ];
    }

    /** Short, URL-friendly identifier for a tracked link; uniqueness is enforced by the DB's UNIQUE KEY. */
    private function generateTrackingId(): string
    {
        return substr(str_replace('-', '', Uuid::v4()), 0, 10);
    }

    // ── Click tracking ────────────────────────────────────────────────────

    public function trackClick(array $eventData): array
    {
        global $wpdb;
        $id = $eventData['id'] ?? Uuid::v4();

        $wpdb->insert($this->clicksTable(), [
            'id' => $id,
            'link_id' => Sanitize::text($eventData['linkId'] ?? ''),
            'tracking_id' => Sanitize::text($eventData['trackingId'] ?? ''),
            'platform' => Sanitize::text($eventData['platform'] ?? ''),
            'occurred_at' => Sanitize::text($eventData['timestamp'] ?? null) ?? current_time('mysql', true),
            'visitor_id' => Sanitize::text($eventData['visitorId'] ?? ''),
            'referrer' => Sanitize::text($eventData['referrer'] ?? null),
            'device' => Sanitize::text($eventData['device'] ?? null),
            'browser' => Sanitize::text($eventData['browser'] ?? null),
            'source_url' => Sanitize::url($eventData['sourceUrl'] ?? null),
        ]);

        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->clicksTable()} WHERE id = %s", $id), ARRAY_A);
        return $row ? $this->clickToDto($row) : [];
    }

    private function clickToDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'linkId' => $row['link_id'],
            'trackingId' => $row['tracking_id'],
            'platform' => $row['platform'],
            'timestamp' => $row['occurred_at'],
            'visitorId' => $row['visitor_id'],
            'referrer' => $row['referrer'] ?? '',
            'device' => $row['device'] ?? '',
            'browser' => $row['browser'] ?? '',
            'sourceUrl' => $row['source_url'] ?? '',
        ];
    }

    // ── Analytics ─────────────────────────────────────────────────────────

    /**
     * Builds the SocialAnalytics {totalClicks, byPlatform, byLink, links, clicks}
     * shape. byPlatform/byLink are plain GROUP BY counts — read-only
     * aggregation, not a calculated business metric.
     */
    /** Cap on the raw `clicks` array embedded in the analytics payload — the aggregates above it (totalClicks/byPlatform/byLink) already cover full history. */
    private const ANALYTICS_RECENT_CLICKS_LIMIT = 500;

    public function getAnalytics(): array
    {
        $cached = wp_cache_get('social_analytics', 'optivax_erp');
        if ($cached !== false) {
            return $cached;
        }

        global $wpdb;
        $clicksTable = $this->clicksTable();

        $totalClicks = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$clicksTable}");

        $byPlatform = [];
        $platformRows = $wpdb->get_results("SELECT platform, COUNT(*) AS cnt FROM {$clicksTable} GROUP BY platform", ARRAY_A);
        foreach ($platformRows ?: [] as $r) {
            $byPlatform[$r['platform']] = (int) $r['cnt'];
        }

        $byLink = [];
        $linkRows = $wpdb->get_results("SELECT link_id, COUNT(*) AS cnt FROM {$clicksTable} GROUP BY link_id", ARRAY_A);
        foreach ($linkRows ?: [] as $r) {
            $byLink[$r['link_id']] = (int) $r['cnt'];
        }

        $clickRows = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$clicksTable} ORDER BY occurred_at DESC LIMIT %d", self::ANALYTICS_RECENT_CLICKS_LIMIT),
            ARRAY_A
        );

        $result = [
            'totalClicks' => $totalClicks,
            'byPlatform' => $byPlatform,
            'byLink' => $byLink,
            'links' => $this->listLinks(),
            'clicks' => array_map([$this, 'clickToDto'], $clickRows ?: []),
        ];

        // Dashboard-style aggregate recomputed from a click-tracking table
        // that only grows — cache briefly rather than re-scanning/re-grouping
        // on every request.
        wp_cache_set('social_analytics', $result, 'optivax_erp', MINUTE_IN_SECONDS);
        return $result;
    }

    /** List of AccountMetric-shaped rows for /social-analytics/account-metrics. */
    public function getAccountMetrics(): array
    {
        global $wpdb;
        $sql = "SELECT m.*, l.platform AS link_platform
                FROM {$this->metricsTable()} m
                LEFT JOIN {$this->linksTable()} l ON l.id = m.link_id
                ORDER BY m.metric_date DESC";
        $rows = $wpdb->get_results($sql, ARRAY_A);
        return array_map([$this, 'metricToDto'], $rows ?: []);
    }

    private function metricToDto(array $row): array
    {
        $extra = Sanitize::jsonDecode($row['extra_json'] ?? null);
        return [
            'linkId' => $row['link_id'],
            'platform' => $row['link_platform'] ?? ($extra['platform'] ?? null),
            'followers' => $extra['followers'] ?? null,
            'engagement' => $extra['engagement'] ?? null,
            'reach' => $extra['reach'] ?? null,
            'impressions' => isset($row['impressions']) ? (int) $row['impressions'] : null,
            'clicks' => isset($row['clicks']) ? (int) $row['clicks'] : null,
            'lastSync' => $row['metric_date'],
        ];
    }

    /**
     * Phase 2A stub: inserts a placeholder row with today's date and null
     * impressions/clicks so the UI has something to list. Real third-party
     * follower/engagement/reach sync is Phase 2B, out of scope here.
     */
    public function syncAccountMetrics(string $linkId): array
    {
        global $wpdb;
        $wpdb->insert($this->metricsTable(), [
            'link_id' => $linkId,
            'metric_date' => current_time('Y-m-d'),
            'impressions' => null,
            'clicks' => null,
            'extra_json' => null,
        ]);

        $insertId = (int) $wpdb->insert_id;
        $row = $wpdb->get_row($wpdb->prepare("SELECT m.*, l.platform AS link_platform FROM {$this->metricsTable()} m LEFT JOIN {$this->linksTable()} l ON l.id = m.link_id WHERE m.id = %d", $insertId), ARRAY_A);
        return $row ? $this->metricToDto($row) : [];
    }
}
