<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/conversations/* (conversationService.ts, whose Conversation/
 * ConvMessage shapes come from domain/conversations/visibility.ts). Bespoke
 * rather than AbstractRepository-based: a Conversation is a header row plus
 * a nested `messages` array that actually lives in the child
 * `conversation_messages` table, so every read/write has to
 * assemble/explode across two tables — not a fit for the generic
 * single-table CRUD shape.
 */
final class ConversationRepository
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'conversations';
    }

    private function messagesTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'conversation_messages';
    }

    /** GET /conversations/list — visibility filtering by role/department stays client-side (visibility.ts). */
    public function list(): array
    {
        global $wpdb;
        $rows = $wpdb->get_results(
            "SELECT * FROM " . $this->table() . " ORDER BY last_activity DESC, created_at DESC",
            ARRAY_A
        );
        $rows = $rows ?: [];

        // Batch-fetch every conversation's messages in one query instead of
        // toDto() querying per-row — the original per-row messagesFor() call
        // here meant listing N conversations ran 1 + N queries every time.
        $messagesByConversation = $this->messagesForMany(array_column($rows, 'id'));

        return array_map(function (array $row) use ($messagesByConversation): array {
            return $this->toDto($row, $messagesByConversation[$row['id']] ?? []);
        }, $rows);
    }

    public function find(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM " . $this->table() . " WHERE id = %s", $id), ARRAY_A);
        return $row ? $this->toDto($row, $this->messagesFor($id)) : null;
    }

    public function create(array $data): array
    {
        global $wpdb;
        $id = $data['id'] ?? Uuid::v4();
        $wpdb->insert($this->table(), $this->headerRow($id, $data));

        foreach ($data['messages'] ?? [] as $message) {
            $this->insertMessage($id, $message);
        }

        return $this->find($id);
    }

    /** POST /conversations/{conversationId}/messages. */
    public function addMessage(string $conversationId, array $message): void
    {
        global $wpdb;
        $this->insertMessage($conversationId, $message);
        $wpdb->update($this->table(), [
            'last_activity' => Sanitize::text($message['sentAt'] ?? null) ?: current_time('mysql', true),
        ], ['id' => $conversationId]);
    }

    /** PUT /conversations/{conversationId}/status. */
    public function updateStatus(string $conversationId, string $status): void
    {
        global $wpdb;
        $wpdb->update($this->table(), ['status' => Sanitize::text($status)], ['id' => $conversationId]);
    }

    /**
     * PUT /conversations/save — replaces the entire data set in one call,
     * mirroring the previous mock's saveConversations(). Delete-all then
     * bulk-reinsert both tables is acceptable at this foundation-phase scale.
     */
    public function saveAll(array $conversations): void
    {
        global $wpdb;
        $wpdb->query("DELETE FROM " . $this->messagesTable());
        $wpdb->query("DELETE FROM " . $this->table());

        foreach ($conversations as $conversation) {
            $id = $conversation['id'] ?? Uuid::v4();
            $wpdb->insert($this->table(), $this->headerRow($id, $conversation));
            foreach ($conversation['messages'] ?? [] as $message) {
                $this->insertMessage($id, $message);
            }
        }
    }

    private function headerRow(string $id, array $data): array
    {
        return [
            'id' => $id,
            'subject' => Sanitize::text($data['subject'] ?? ''),
            'client_id' => Sanitize::text($data['clientId'] ?? ''),
            'client_name' => Sanitize::text($data['clientName'] ?? ''),
            'client_email' => Sanitize::email($data['clientEmail'] ?? null),
            'assigned_dept' => Sanitize::text($data['assignedDept'] ?? ''),
            'assigned_user_id' => Sanitize::text($data['assignedUserId'] ?? null),
            'assigned_user_name' => Sanitize::text($data['assignedUserName'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'open'),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?: current_time('mysql', true),
            'last_activity' => Sanitize::text($data['lastActivity'] ?? null) ?: current_time('mysql', true),
            'unread_by_client' => Sanitize::int($data['unreadByClient'] ?? 0),
            'unread_by_team' => Sanitize::int($data['unreadByTeam'] ?? 0),
        ];
    }

    private function insertMessage(string $conversationId, array $message): void
    {
        global $wpdb;
        $wpdb->insert($this->messagesTable(), [
            'id' => $message['id'] ?? Uuid::v4(),
            'conversation_id' => $conversationId,
            'sender_id' => Sanitize::text($message['senderId'] ?? ''),
            'sender_name' => Sanitize::text($message['senderName'] ?? ''),
            'sender_role' => Sanitize::text($message['senderRole'] ?? null),
            'body' => Sanitize::textarea($message['body'] ?? ''),
            'sent_at' => Sanitize::text($message['sentAt'] ?? null) ?: current_time('mysql', true),
            'read_by' => Sanitize::json($message['readBy'] ?? []),
        ]);
    }

    private function messagesFor(string $conversationId): array
    {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM " . $this->messagesTable() . " WHERE conversation_id = %s ORDER BY sent_at ASC",
            $conversationId
        ), ARRAY_A);
        return array_map([$this, 'messageToDto'], $rows ?: []);
    }

    /**
     * Batch equivalent of messagesFor() — one query for every conversation id
     * given, grouped back into a $conversationId => messages[] map (each
     * still ordered oldest-first within its group). Used by list() to avoid
     * querying messages once per conversation.
     */
    private function messagesForMany(array $conversationIds): array
    {
        $conversationIds = array_values(array_unique(array_filter($conversationIds)));
        if (empty($conversationIds)) {
            return [];
        }

        global $wpdb;
        $placeholders = implode(',', array_fill(0, count($conversationIds), '%s'));
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM " . $this->messagesTable() . " WHERE conversation_id IN ({$placeholders}) ORDER BY sent_at ASC",
            $conversationIds
        ), ARRAY_A) ?: [];

        $grouped = [];
        foreach ($rows as $row) {
            $grouped[$row['conversation_id']][] = $this->messageToDto($row);
        }
        return $grouped;
    }

    private function toDto(array $row, array $messages = []): array
    {
        return [
            'id' => $row['id'],
            'subject' => $row['subject'],
            'clientId' => $row['client_id'],
            'clientName' => $row['client_name'],
            'clientEmail' => $row['client_email'] ?: null,
            'assignedDept' => $row['assigned_dept'],
            'assignedUserId' => $row['assigned_user_id'] ?: null,
            'assignedUserName' => $row['assigned_user_name'] ?: null,
            'status' => $row['status'],
            'createdAt' => $row['created_at'],
            'lastActivity' => $row['last_activity'],
            'unreadByClient' => (int) $row['unread_by_client'],
            'unreadByTeam' => (int) $row['unread_by_team'],
            'messages' => $messages,
        ];
    }

    private function messageToDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'conversationId' => $row['conversation_id'],
            'senderId' => $row['sender_id'],
            'senderName' => $row['sender_name'],
            'senderRole' => $row['sender_role'] ?: null,
            'body' => $row['body'],
            'sentAt' => $row['sent_at'],
            'readBy' => Sanitize::jsonDecode($row['read_by'] ?? null),
        ];
    }
}
