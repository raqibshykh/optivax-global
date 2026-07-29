<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\ClientOwnershipRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/client-ownership/*. Wraps ClientOwnershipRepository —
 * viewing is gated on 'clients' VIEW, assign/remove (both of which mutate
 * who "owns" a client) on 'clients' ASSIGN.
 */
final class ClientOwnershipController
{
    private ClientOwnershipRepository $repo;

    public function __construct()
    {
        $this->repo = new ClientOwnershipRepository();
    }

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('clients', 'VIEW');
        if ($guard) {
            return $guard;
        }

        $filters = [];
        if ($request->get_param('clientId')) {
            $filters['clientId'] = sanitize_text_field($request->get_param('clientId'));
        }
        if ($request->get_param('ownerId')) {
            $filters['ownerId'] = sanitize_text_field($request->get_param('ownerId'));
        }

        // A `client`-role caller must never see who "owns" another client —
        // force clientId to their own resolved id regardless of the request.
        $claims = AuthMiddleware::currentClaims();
        if ($claims && ($claims['role'] ?? '') === 'client') {
            $ownClientId = ClientScopeMiddleware::resolveOwnClientId((int) $claims['sub'], (string) $claims['email']);
            $filters['clientId'] = $ownClientId ?? ClientScopeMiddleware::NO_MATCH_SENTINEL;
        }

        return ApiResponse::ok($this->repo->list($filters));
    }

    public function history(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('clients', 'VIEW');
        if ($guard) {
            return $guard;
        }

        $clientId = $request->get_param('clientId');

        // Same client-ownership restriction as list() above.
        $claims = AuthMiddleware::currentClaims();
        if ($claims && ($claims['role'] ?? '') === 'client') {
            $ownClientId = ClientScopeMiddleware::resolveOwnClientId((int) $claims['sub'], (string) $claims['email']);
            $clientId = $ownClientId ?? ClientScopeMiddleware::NO_MATCH_SENTINEL;
        }

        return ApiResponse::ok($this->repo->history($clientId ? sanitize_text_field($clientId) : null));
    }

    public function assign(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('clients', 'ASSIGN');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'clientId' => ['required'],
            'ownerId' => ['required'],
            'ownerEmail' => ['email'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        return ApiResponse::ok($this->repo->assign($data), [], 201);
    }

    public function remove(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('clients', 'ASSIGN');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        if (empty($data['clientId'])) {
            return ApiResponse::validationError('Missing "clientId" in request body');
        }

        return ApiResponse::ok($this->repo->remove($data));
    }
}
