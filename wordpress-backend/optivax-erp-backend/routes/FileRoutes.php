<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\FileRepository;
use OptivaxERP\Repositories\ProjectRepository;
use OptivaxERP\Services\AuthService;
use OptivaxERP\Uploads\UploadService;

if (!defined('ABSPATH')) {
    exit;
}

final class FileRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new FileRepository(), 'files');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/files/list', [
            'methods' => 'GET',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                // A `client`-role caller must never see another client's
                // uploaded files via ?clientId= — force it to their own resolved id.
                $claims = AuthMiddleware::currentClaims();
                $forced = $claims
                    ? ClientScopeMiddleware::forcedFilter('client_id', (string) ($claims['role'] ?? ''), (int) ($claims['sub'] ?? 0), (string) ($claims['email'] ?? ''))
                    : [];

                $response = $controller->listHandler($request, [
                    'id' => 'id',
                    'projectId' => 'project_id',
                    'clientId' => 'client_id',
                ], null, $forced);

                // The client_id scoping above only protects the `client`
                // role. Every internal role previously saw every file
                // regardless of its `visibility` setting (private/
                // department/specific/project-team/client) — the field was
                // stored at upload time but nothing on the read path ever
                // checked it. Applied post-fetch (not as a SQL filter)
                // because project-team membership needs a project lookup,
                // not a plain column comparison.
                if ($claims && $response->get_status() === 200) {
                    $data = $response->get_data();
                    if (is_array($data['data'] ?? null)) {
                        $data['data'] = self::filterByVisibility($data['data'], $claims);
                        $response->set_data($data);
                    }
                }

                return $response;
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/files/create', [
            'methods' => 'POST',
            'callback' => [self::class, 'create'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/files/delete', [
            'methods' => 'DELETE',
            'callback' => [self::class, 'delete'],
            'permission_callback' => '__return_true',
        ]);
    }

    /**
     * POST /files/create handles two shapes:
     *  - A real multipart upload (a $_FILES entry present) -> routed through
     *    UploadService::handleUpload() so a Media Library attachment backs it.
     *  - The current frontend contract (src/hooks/useFiles.ts's uploadFile()),
     *    which posts plain JSON metadata only — no real file bytes, just a
     *    client-side blob: URL — handled via FileRepository::create() so that
     *    still works without a WP attachment behind it.
     */
    public static function create(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('files', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $fileParams = $request->get_file_params();
        if (!empty($fileParams)) {
            $file = reset($fileParams);
            $meta = $request->get_body_params();
            $result = UploadService::handleUpload($file, $meta);
            if (is_wp_error($result)) {
                return ApiResponse::error($result->get_error_message());
            }
            return ApiResponse::ok($result, [], 201);
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'name' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return ApiResponse::ok((new FileRepository())->create($data), [], 201);
    }

    /** DELETE /files/delete — goes through UploadService::deleteFile() (not the raw repository) so the Media Library attachment is cleaned up too. */
    public static function delete(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('files', 'DELETE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        UploadService::deleteFile((string) $id);
        return ApiResponse::ok(null);
    }

    /**
     * @param array $files FileRecord DTOs (id/name/.../visibility/visibleTo/uploadedById/uploaderDept/projectId/clientId)
     * @param array $claims Decoded JWT claims for the requesting user (sub/role/email)
     */
    private static function filterByVisibility(array $files, array $claims): array
    {
        $role = (string) ($claims['role'] ?? '');
        // Matches SYSTEM_DOCUMENTATION.md's documented design: company-wide
        // roles bypass per-file visibility, same as they bypass department
        // scoping everywhere else in the app.
        if (in_array($role, ['super_admin', 'management'], true)) {
            return $files;
        }

        $userId = (string) ($claims['sub'] ?? '');
        $mapping = AuthService::mappingFor((int) $userId);
        $userDept = (string) ($mapping['department_id'] ?? '');

        // Batch-resolve project.assignedTo only for the files that actually
        // need it (project-team visibility) — most files won't, and this
        // avoids a per-row project lookup.
        $projectIds = [];
        foreach ($files as $f) {
            if (($f['visibility'] ?? null) === 'project-team' && !empty($f['projectId'])) {
                $projectIds[(string) $f['projectId']] = true;
            }
        }
        $projectAssignees = [];
        if (!empty($projectIds)) {
            $projectRepo = new ProjectRepository();
            foreach (array_keys($projectIds) as $pid) {
                $project = $projectRepo->find($pid);
                $projectAssignees[$pid] = array_map('strval', is_array($project['assignedTo'] ?? null) ? $project['assignedTo'] : []);
            }
        }

        return array_values(array_filter($files, function (array $f) use ($role, $userId, $userDept, $projectAssignees) {
            switch ($f['visibility'] ?? null) {
                case 'private':
                    return (string) ($f['uploadedById'] ?? '') === $userId;
                case 'department':
                    return $userDept !== '' && (string) ($f['uploaderDept'] ?? '') === $userDept;
                case 'specific':
                    $visibleTo = array_map('strval', is_array($f['visibleTo'] ?? null) ? $f['visibleTo'] : []);
                    return in_array($userId, $visibleTo, true);
                case 'project-team':
                    $pid = $f['projectId'] ?? null;
                    return $pid !== null && in_array($userId, $projectAssignees[(string) $pid] ?? [], true);
                case 'client':
                    // Already scoped to the caller's own client_id upstream
                    // (ClientScopeMiddleware::forcedFilter) for the `client`
                    // role — nothing else should see a client-visibility file.
                    return $role === 'client';
                default:
                    // No visibility set (legacy rows, or the metadata-only
                    // create path which defaults to 'private' — so this is
                    // effectively unreached today, kept for defensiveness):
                    // visible to internal staff, never to a client.
                    return $role !== 'client';
            }
        }));
    }
}
