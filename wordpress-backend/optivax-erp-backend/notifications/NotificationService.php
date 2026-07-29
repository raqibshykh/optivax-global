<?php

namespace OptivaxERP\Notifications;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;
use OptivaxERP\Mail\MailService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CRUD + broadcast for the `notifications` table, matching /saas/v1/notifications/*
 * exactly. The ~60 role-based "notify on X business event" triggers from the
 * frontend's notificationHelpers.ts are Phase 2B business logic — this class
 * only provides the infrastructure they'll eventually call into.
 */
final class NotificationService
{
    private static function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'notifications';
    }

    public static function list(?string $userId = null): array
    {
        global $wpdb;
        $table = self::table();
        if ($userId) {
            $rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table} WHERE user_id = %s ORDER BY created_at DESC", $userId), ARRAY_A);
        } else {
            $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY created_at DESC", ARRAY_A);
        }
        return array_map([self::class, 'toDto'], $rows ?: []);
    }

    public static function create(array $data, bool $emailToo = false): array
    {
        global $wpdb;
        $id = Uuid::v4();
        $wpdb->insert(self::table(), [
            'id' => $id,
            'user_id' => Sanitize::text($data['userId']),
            'type' => Sanitize::text($data['type']),
            'module' => Sanitize::text($data['module'] ?? null),
            'title' => Sanitize::text($data['title']),
            'message' => Sanitize::textarea($data['message']),
            'is_read' => 0,
            'created_at' => current_time('mysql', true),
            'action_url' => Sanitize::url($data['actionUrl'] ?? null),
            'action_label' => Sanitize::text($data['actionLabel'] ?? null),
        ]);

        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM " . self::table() . " WHERE id = %s", $id), ARRAY_A);

        if ($emailToo && !empty($data['recipientEmail'])) {
            MailService::queue(
                $data['recipientEmail'],
                $data['title'],
                'notification',
                [
                    'title' => $data['title'],
                    'message' => $data['message'],
                    'actionUrl' => $data['actionUrl'] ?? null,
                    'actionLabel' => $data['actionLabel'] ?? null,
                ]
            );
        }

        return self::toDto($row);
    }

    /** Used by the /notifications/stream SSE endpoint to poll for rows newer than the last one it already sent. */
    public static function listSince(string $userId, ?string $sinceCreatedAt): array
    {
        global $wpdb;
        $table = self::table();
        if ($sinceCreatedAt) {
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$table} WHERE user_id = %s AND created_at > %s ORDER BY created_at ASC",
                $userId,
                $sinceCreatedAt
            ), ARRAY_A);
        } else {
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$table} WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                $userId
            ), ARRAY_A);
        }
        return array_map([self::class, 'toDto'], $rows ?: []);
    }

    /** Used by NotificationRoutes to check row ownership before allowing a self-service mark-read/delete. */
    public static function find(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM " . self::table() . " WHERE id = %s", $id), ARRAY_A);
        return $row ? self::toDto($row) : null;
    }

    public static function markRead(string $id): void
    {
        global $wpdb;
        $wpdb->update(self::table(), ['is_read' => 1], ['id' => $id]);
    }

    public static function markAllRead(string $userId): void
    {
        global $wpdb;
        $wpdb->update(self::table(), ['is_read' => 1], ['user_id' => $userId]);
    }

    public static function delete(string $id): void
    {
        global $wpdb;
        $wpdb->delete(self::table(), ['id' => $id]);
    }

    public static function deleteAll(string $userId): void
    {
        global $wpdb;
        $wpdb->delete(self::table(), ['user_id' => $userId]);
    }

    /** Sends the same notification to every user in a department (users_mapping.department_id). */
    public static function broadcastToDepartment(string $departmentId, array $data): int
    {
        global $wpdb;
        $usersTable = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping';
        $userIds = $wpdb->get_col($wpdb->prepare("SELECT user_id FROM {$usersTable} WHERE department_id = %s", $departmentId));

        foreach ($userIds as $userId) {
            self::create(array_merge($data, ['userId' => (string) $userId]));
        }

        return count($userIds);
    }

    private static function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'userId' => $row['user_id'],
            'type' => $row['type'],
            'module' => $row['module'] ?: null,
            'title' => $row['title'],
            'message' => $row['message'],
            'read' => (bool) $row['is_read'],
            'createdAt' => $row['created_at'],
            'actionUrl' => $row['action_url'] ?: null,
            'actionLabel' => $row['action_label'] ?: null,
        ];
    }
}
