<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\AutomationEngine;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\ClientRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Every route uses permission_callback => '__return_true' — see AuthRoutes's
 * doc comment for why (RBAC happens inside BaseCrudController so 401/403
 * responses use our exact envelope shape).
 */
final class ClientRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new ClientRepository(), 'clients');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/clients/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                // A `client`-role caller must never be able to list another
                // client's row via ?id=/?email= — force the 'id' filter to
                // their own resolved clientId regardless of what was requested.
                $claims = AuthMiddleware::currentClaims();
                $forced = $claims
                    ? ClientScopeMiddleware::forcedFilter('id', (string) ($claims['role'] ?? ''), (int) ($claims['sub'] ?? 0), (string) ($claims['email'] ?? ''))
                    : [];

                // 'assignedTo' -> 'assigned_to' is recognized by ClientRepository::list()'s
                // JSON_CONTAINS override, not treated as a plain equality column.
                // Opt-in extras (all backward compatible — a request that sends
                // none of ?q=/?page=/?perPage=/?sortBy= behaves exactly as before):
                // ?q=<term> free-text searches name/email; ?page=&perPage=
                // paginates (adds `meta`); ?sortBy=<id|email> re-orders.
                return $controller->listHandler($request, [
                    'id' => 'id',
                    'email' => 'email',
                    'assignedTo' => 'assigned_to',
                ], null, $forced, ['name', 'email']);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/clients/create', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $data = $request->get_json_params() ?: [];
                $errors = Validator::check($data, [
                    'name' => ['required'],
                    'email' => ['required', 'email'],
                    'status' => [['in', ['active', 'inactive']]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }

                $guard = RbacMiddleware::authorize('clients', 'CREATE');
                if ($guard) {
                    return $guard;
                }

                // Upsert-by-email: a row for this email may already exist —
                // UserProfileRepository::create() now provisions the clients
                // row atomically as part of creating a role=client account
                // (POST /profiles/create), and the frontend still calls this
                // endpoint right afterward with the fuller client form data.
                // Treat that as "enrich the row that already exists" rather
                // than inserting a second row for the same account.
                $repo = new ClientRepository();
                $existing = $repo->list(['email' => $data['email'] ?? '']);
                if (!empty($existing)) {
                    $updated = $repo->update((string) $existing[0]['id'], $data);
                    return ApiResponse::ok($updated, [], 200);
                }

                return $controller->createHandler($request, static function (array $created): void {
                    AutomationEngine::fire('new_client', $created);
                });
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/clients/update', [
            'methods' => 'PUT',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'id' => ['required'],
                    'email' => ['email'],
                    'status' => [['in', ['active', 'inactive']]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }

                // A `client`-role caller may only ever edit their own client
                // record — never trust the body's "id" for that check; the
                // target row's real id must equal their server-resolved own
                // clientId, checked via BaseCrudController::checkOwnership().
                $claims = AuthMiddleware::currentClaims();
                $ownershipCheck = null;
                if ($claims && ($claims['role'] ?? '') === 'client') {
                    $ownClientId = ClientScopeMiddleware::resolveOwnClientId((int) $claims['sub'], (string) $claims['email']);
                    $ownershipCheck = ['id' => $ownClientId ?? ClientScopeMiddleware::NO_MATCH_SENTINEL];
                }

                return $controller->updateByBodyIdHandler($request, $ownershipCheck);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/clients/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
