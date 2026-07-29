<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\AbstractRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Generic list/create/update/delete against one repository, gated by
 * RbacMiddleware on the given PermissionDomain. No business rules — this is
 * the "generic CRUD passthrough" foundation tier every non-auth module uses
 * in Phase 2A (see the plan's "Stub depth" decision). Route files wire this
 * to the exact path/method/query-param shape each frontend service expects;
 * this class only needs to know the repository and the RBAC domain.
 */
class BaseCrudController
{
    protected AbstractRepository $repo;
    protected string $domain;

    public function __construct(AbstractRepository $repo, string $domain)
    {
        $this->repo = $repo;
        $this->domain = $domain;
    }

    /**
     * @param array $filterParamMap query-param name => DB column name, e.g. ['clientId' => 'client_id']
     * @param array $forcedFilters column => value equality filters resolved server-side
     * (e.g. from ClientScopeMiddleware::forcedFilter()) that always override
     * whatever the request itself supplied for that column — this is the
     * mechanism route files use to make ownership scoping non-bypassable.
     * @param string[] $searchableColumns DB columns a `?q=`/`?search=` param may
     * free-text-search across (LIKE, OR'd together). Empty (the default)
     * means this endpoint has no search capability — pass column names to
     * opt a resource into it.
     *
     * Pagination (`?page=`/`?perPage=`) and sorting (`?sortBy=`/`?sortDir=`)
     * are always available on every list endpoint, but are strictly opt-in
     * from the caller's side: when the request sends none of these params,
     * behavior is byte-for-byte identical to before (full unpaginated list,
     * the caller-supplied default order, `meta` omitted from the envelope)
     * — existing frontend calls are unaffected. `sortBy` is only honored
     * when it names a column already exposed via $filterParamMap, so a
     * client can never inject an arbitrary ORDER BY expression.
     */
    public function listHandler(
        \WP_REST_Request $request,
        array $filterParamMap = [],
        string $orderBy = null,
        array $forcedFilters = [],
        array $searchableColumns = []
    ): \WP_REST_Response {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $filters = [];
        foreach ($filterParamMap as $queryParam => $column) {
            $value = $request->get_param($queryParam);
            if ($value !== null && $value !== '') {
                $filters[$column] = sanitize_text_field($value);
            }
        }
        foreach ($forcedFilters as $column => $value) {
            $filters[$column] = $value;
        }

        $search = null;
        if (!empty($searchableColumns)) {
            $term = $request->get_param('q') ?? $request->get_param('search');
            if ($term !== null && $term !== '') {
                $search = ['columns' => $searchableColumns, 'term' => sanitize_text_field($term)];
            }
        }

        $sortBy = $request->get_param('sortBy');
        if ($sortBy && in_array($sortBy, array_values($filterParamMap), true)) {
            $sortDir = strtoupper((string) $request->get_param('sortDir')) === 'ASC' ? 'ASC' : 'DESC';
            $orderBy = "{$sortBy} {$sortDir}";
        }

        $meta = [];
        $pagination = null;
        $page = $request->get_param('page');
        $perPage = $request->get_param('perPage') ?? $request->get_param('per_page');
        if ($page !== null || $perPage !== null) {
            $perPageInt = max(1, min(100, (int) ($perPage ?: 20)));
            $pageInt = max(1, (int) ($page ?: 1));
            $pagination = ['limit' => $perPageInt, 'offset' => ($pageInt - 1) * $perPageInt];
            $total = $this->repo->count($filters, $search);
            $meta = [
                'page' => $pageInt,
                'perPage' => $perPageInt,
                'total' => $total,
                'totalPages' => $perPageInt > 0 ? (int) ceil($total / $perPageInt) : 0,
            ];
        }

        return ApiResponse::ok($this->repo->list($filters, $orderBy, $pagination, $search), $meta);
    }

    public function findHandler(\WP_REST_Request $request, string $idParamName = 'id'): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $id = $request->get_param($idParamName);
        $item = $id ? $this->repo->find((string) $id) : null;
        if (!$item) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($item);
    }

    /**
     * @param array|null $ownershipCheck dtoField => requiredValue. When given,
     * the row (fetched by id via the repository's own find(), i.e. the DTO
     * shape) must match every key/value or a 403 is returned instead of
     * touching the row. Pass null (the default) for endpoints with no
     * per-row ownership dimension.
     * @return \WP_REST_Response|null null if the check passes; the response
     * to return immediately otherwise.
     */
    protected function checkOwnership(string $id, ?array $ownershipCheck): ?\WP_REST_Response
    {
        if ($ownershipCheck === null) {
            return null;
        }
        $existing = $this->repo->find($id);
        if (!$existing) {
            return ApiResponse::notFound();
        }
        foreach ($ownershipCheck as $field => $required) {
            if (($existing[$field] ?? null) !== $required) {
                return ApiResponse::forbidden();
            }
        }
        return null;
    }

    /**
     * @param callable|null $afterCreate optional (row: array) => void side
     * effect run after a successful create — e.g. firing an automation event
     * or a business-event notification. Exceptions are caught and logged,
     * never allowed to fail the request the side effect was attached to.
     */
    public function createHandler(\WP_REST_Request $request, ?callable $afterCreate = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $created = $this->repo->create($data);
        $this->runSideEffect($afterCreate, [$created]);
        return ApiResponse::ok($created, [], 201);
    }

    /**
     * @param callable|null $afterUpdate optional (existing: array, updated:
     * array) => void side effect run after a successful update. $existing is
     * fetched once, before the write, only when a callback is supplied.
     */
    public function updateByRouteIdHandler(\WP_REST_Request $request, ?array $ownershipCheck = null, ?callable $afterUpdate = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $ownGuard = $this->checkOwnership($id, $ownershipCheck);
        if ($ownGuard) {
            return $ownGuard;
        }

        $before = $afterUpdate ? $this->repo->find($id) : null;
        $data = $request->get_json_params() ?: [];
        $updated = $this->repo->update($id, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        $this->runSideEffect($afterUpdate, [$before, $updated]);
        return ApiResponse::ok($updated);
    }

    /** For RPC-suffix-style routes: PUT /module/update with { id, ...patch } in the body. */
    public function updateByBodyIdHandler(\WP_REST_Request $request, ?array $ownershipCheck = null, ?callable $afterUpdate = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }
        $ownGuard = $this->checkOwnership((string) $id, $ownershipCheck);
        if ($ownGuard) {
            return $ownGuard;
        }

        $before = $afterUpdate ? $this->repo->find((string) $id) : null;
        $updated = $this->repo->update((string) $id, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        $this->runSideEffect($afterUpdate, [$before, $updated]);
        return ApiResponse::ok($updated);
    }

    /** Runs an optional post-write side effect without ever letting it turn a successful write into a failed response. */
    private function runSideEffect(?callable $callback, array $args): void
    {
        if (!$callback) {
            return;
        }
        try {
            $callback(...$args);
        } catch (\Throwable $e) {
            Logger::error('automation', 'Post-write side effect failed: ' . $e->getMessage(), ['domain' => $this->domain]);
        }
    }

    /** For REST-verb-style routes: DELETE /module/{id}. */
    public function deleteByRouteIdHandler(\WP_REST_Request $request, ?array $ownershipCheck = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'DELETE');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $ownGuard = $this->checkOwnership($id, $ownershipCheck);
        if ($ownGuard) {
            return $ownGuard;
        }

        $this->repo->delete($id);
        return ApiResponse::ok(null);
    }

    /** For RPC-suffix-style routes: DELETE /module/delete with { id } in the body. */
    public function deleteByBodyIdHandler(\WP_REST_Request $request, ?array $ownershipCheck = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'DELETE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }
        $ownGuard = $this->checkOwnership((string) $id, $ownershipCheck);
        if ($ownGuard) {
            return $ownGuard;
        }

        $this->repo->delete((string) $id);
        return ApiResponse::ok(null);
    }
}
