<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/production-assignments. `production_assignments` is a pure
 * member_user_id<->client_id join table with no frontend-facing "row" shape
 * of its own (see ProjectTaskMigration's doc comment) — the wire format is a
 * Record<memberUserId, clientId[]> map, assembled/flattened directly here
 * rather than through a repository's list/toDto pattern.
 */
final class ProductionAssignmentController
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'production_assignments';
    }

    /**
     * GET /production-assignments -> Record<memberUserId, clientId[]>.
     * 'production' VIEW is held by production_member as well as
     * production_admin — but the full member->client map discloses every
     * other member's client assignments, so a plain member is restricted to
     * only their own entry. Holding 'production' ASSIGN (only
     * production_admin/super_admin) is what distinguishes the admin tier
     * that legitimately needs to see the whole map to manage it.
     */
    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('production', 'VIEW');
        if ($guard) {
            return $guard;
        }

        global $wpdb;
        $isAdmin = RbacMiddleware::authorize('production', 'ASSIGN') === null;
        if ($isAdmin) {
            $rows = $wpdb->get_results("SELECT member_user_id, client_id FROM {$this->table()}", ARRAY_A) ?: [];
        } else {
            $ownId = AuthMiddleware::currentUserId();
            $rows = $wpdb->get_results(
                $wpdb->prepare("SELECT member_user_id, client_id FROM {$this->table()} WHERE member_user_id = %d", $ownId),
                ARRAY_A
            ) ?: [];
        }

        $map = [];
        foreach ($rows as $row) {
            $memberId = (string) $row['member_user_id'];
            $map[$memberId][] = $row['client_id'];
        }

        // Force a JSON object ({}) rather than an array ([]) when there are no
        // assignments yet — Record<string, string[]> must never serialize as [].
        return ApiResponse::ok(empty($map) ? new \stdClass() : $map);
    }

    /** PUT /production-assignments — replaces the entire map (delete-all-then-bulk-insert, no diffing). */
    public function save(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('production', 'ASSIGN');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params();
        if (!is_array($data)) {
            return ApiResponse::validationError('Request body must be a { memberId: clientId[] } map');
        }

        // Delete-all-then-bulk-insert must be atomic — without a transaction, a
        // failure partway through the insert loop would leave the table wiped
        // with only some assignments restored.
        Transaction::run(function () use ($data) {
            global $wpdb;
            $table = $this->table();
            $wpdb->query("DELETE FROM {$table}");

            foreach ($data as $memberId => $clientIds) {
                if (!is_array($clientIds)) {
                    continue;
                }
                foreach ($clientIds as $clientId) {
                    $wpdb->insert($table, [
                        'member_user_id' => (int) $memberId,
                        'client_id' => (string) $clientId,
                    ]);
                }
            }
        });

        return ApiResponse::ok(null);
    }
}
