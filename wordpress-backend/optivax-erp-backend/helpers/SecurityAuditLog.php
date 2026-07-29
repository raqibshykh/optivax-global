<?php

namespace OptivaxERP\Helpers;

use OptivaxERP\Repositories\SecurityAuditLogRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * One-line facade every auth/user-management call site uses to write a
 * security_audit_logs row. Captures IP/user-agent/timestamp automatically so
 * call sites never repeat that boilerplate. See SecurityAuditLogRepository's
 * doc comment: there is no REST write path for this table, only this helper.
 */
final class SecurityAuditLog
{
    public static function record(
        string $action,
        ?int $actorUserId,
        ?string $actorRole,
        ?int $targetUserId = null,
        string $status = 'success',
        $oldValue = null,
        $newValue = null,
        array $metadata = []
    ): void {
        (new SecurityAuditLogRepository())->create([
            'id' => Uuid::v4(),
            'action' => $action,
            'actor_user_id' => $actorUserId,
            'actor_role' => $actorRole,
            'target_user_id' => $targetUserId,
            'status' => $status,
            'old_value' => $oldValue !== null ? wp_json_encode($oldValue) : null,
            'new_value' => $newValue !== null ? wp_json_encode($newValue) : null,
            'ip_address' => isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : null,
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT'])
                ? substr(sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])), 0, 255)
                : null,
            'metadata' => $metadata ? wp_json_encode($metadata) : null,
            'created_at' => current_time('mysql', true),
        ]);
    }
}
