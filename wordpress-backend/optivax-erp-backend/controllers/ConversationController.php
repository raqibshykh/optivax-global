<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\ConversationRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/conversations/* (conversationService.ts). Generic CRUD
 * passthrough gated on the 'conversations' RBAC domain — role/department
 * visibility filtering (getVisibleConversations in
 * domain/conversations/visibility.ts) stays client-side per the existing
 * frontend contract; this only enforces the coarse domain-level gate.
 */
final class ConversationController
{
    private ConversationRepository $repo;

    public function __construct()
    {
        $this->repo = new ConversationRepository();
    }

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('conversations', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->repo->list());
    }

    /** PUT /conversations/save — full-list replace, mirrors the previous mock's saveConversations(). */
    public function save(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('conversations', 'EDIT');
        if ($guard) {
            return $guard;
        }
        $data = $request->get_json_params() ?: [];
        $this->repo->saveAll($data['conversations'] ?? []);
        return ApiResponse::ok(null);
    }

    public function create(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('conversations', 'CREATE');
        if ($guard) {
            return $guard;
        }
        $data = $request->get_json_params() ?: [];
        return ApiResponse::ok($this->repo->create($data), [], 201);
    }

    /** POST /conversations/{conversationId}/messages. */
    public function addMessage(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('conversations', 'CREATE');
        if ($guard) {
            return $guard;
        }
        $conversationId = (string) $request->get_param('conversationId');
        $message = $request->get_json_params() ?: [];
        $this->repo->addMessage($conversationId, $message);
        return ApiResponse::ok(null, [], 201);
    }

    /** PUT /conversations/{conversationId}/status. */
    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('conversations', 'EDIT');
        if ($guard) {
            return $guard;
        }
        $conversationId = (string) $request->get_param('conversationId');
        $data = $request->get_json_params() ?: [];
        $status = (string) ($data['status'] ?? '');
        if (!$status) {
            return ApiResponse::validationError('Missing "status" in request body');
        }
        $this->repo->updateStatus($conversationId, $status);
        return ApiResponse::ok(null);
    }
}
