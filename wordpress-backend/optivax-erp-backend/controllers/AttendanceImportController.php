<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Repositories\AttendanceBiometricMappingRepository;
use OptivaxERP\Repositories\AttendanceImportRepository;
use OptivaxERP\Services\AttendanceImportService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/attendance/import/* and /attendance/mapping/*.
 *
 * Every method hand-checks the caller's role against exactly
 * ['super_admin', 'hr_admin'] rather than going through a plain RBAC domain
 * grant — this feature's own spec explicitly excludes even a general
 * `hr_member` ("Not allowed: ... Other department members"), which a plain
 * 'hr' domain VIEW/CREATE check would not exclude (hr_member has 'hr' =>
 * ['VIEW'] in RbacMatrix). Same narrower-than-domain pattern already used
 * elsewhere in this plugin (e.g. device-key rotation in ItSupportRoutes.php).
 */
final class AttendanceImportController
{
    private const ALLOWED_ROLES = ['super_admin', 'hr_admin'];

    private AttendanceImportService $service;
    private AttendanceImportRepository $imports;
    private AttendanceBiometricMappingRepository $mapping;

    public function __construct()
    {
        $this->service = new AttendanceImportService();
        $this->imports = new AttendanceImportRepository();
        $this->mapping = new AttendanceBiometricMappingRepository();
    }

    private static function guard(): ?\WP_REST_Response
    {
        if (!in_array(AuthMiddleware::currentRole(), self::ALLOWED_ROLES, true)) {
            return ApiResponse::forbidden('Only Super Admin and HR Admin can access attendance import.');
        }
        return null;
    }

    /** A file bigger than this (before base64 decoding) is rejected — same 8MB cap the existing punches/import endpoint uses for a single request body. */
    private const MAX_FILE_BYTES = 8 * 1024 * 1024;

    /**
     * POST /attendance/import/preview — body: {fileName, fileContent
     * (base64-encoded file bytes)}. JSON, not multipart/form-data — this
     * plugin's REST surface and the frontend's shared `api` client are
     * JSON-only throughout (see src/lib/client.ts), so the browser reads the
     * file as base64 via FileReader rather than this feature introducing the
     * only multipart upload path in the app. No DB writes besides read-only
     * hash/mapping lookups.
     */
    public function preview(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = self::guard();
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'fileName' => ['required'],
            'fileContent' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $decoded = base64_decode((string) $data['fileContent'], true);
        if ($decoded === false) {
            return ApiResponse::validationError('"fileContent" is not valid base64.');
        }
        if (strlen($decoded) > self::MAX_FILE_BYTES) {
            return ApiResponse::error('File exceeds the maximum allowed size (' . self::MAX_FILE_BYTES . ' bytes).', 413);
        }

        $tmpPath = wp_tempnam('attendance-import');
        if ($tmpPath === false || file_put_contents($tmpPath, $decoded) === false) {
            return ApiResponse::serverError('Could not stage the uploaded file for processing.');
        }

        try {
            $rows = $this->service->preview($tmpPath, (string) $data['fileName']);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::validationError($e->getMessage());
        } catch (\Throwable $e) {
            return ApiResponse::exceptionError('Could not process the uploaded file.', $e, 500);
        } finally {
            @unlink($tmpPath);
        }

        return ApiResponse::ok([
            'fileName' => (string) $data['fileName'],
            'rows' => $rows,
            'summary' => self::summarize($rows),
        ]);
    }

    /** POST /attendance/import/confirm — body: {fileName, rows: [...exactly what preview() returned]}. */
    public function confirm(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = self::guard();
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'fileName' => ['required'],
            'rows' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        if (!is_array($data['rows'])) {
            return ApiResponse::validationError('"rows" must be an array.');
        }
        if (empty($data['rows'])) {
            return ApiResponse::validationError('No rows to import.');
        }

        try {
            $result = $this->service->confirmImport((string) $data['fileName'], $data['rows'], (string) AuthMiddleware::currentUserId());
        } catch (\Throwable $e) {
            return ApiResponse::exceptionError('Could not complete the import.', $e, 500);
        }

        return ApiResponse::ok($result, [], 201);
    }

    /** GET /attendance/import/history */
    public function history(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = self::guard();
        if ($guard) {
            return $guard;
        }

        $page = max(1, (int) $request->get_param('page') ?: 1);
        $perPage = min(100, max(1, (int) $request->get_param('perPage') ?: 20));
        [$rows, $total] = $this->imports->listImports($page, $perPage);

        return ApiResponse::ok($rows, ['total' => $total, 'page' => $page, 'perPage' => $perPage]);
    }

    /** GET /attendance/mapping */
    public function mappingList(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = self::guard();
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->mapping->list());
    }

    /** POST /attendance/mapping */
    public function mappingCreate(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = self::guard();
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'employeeId' => ['required'],
            'biometricUserId' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $conflict = $this->mapping->findConflict((string) $data['employeeId'], (string) $data['biometricUserId']);
        if ($conflict) {
            return ApiResponse::validationError($conflict);
        }

        $created = $this->mapping->create($data);
        return ApiResponse::ok($created, [], 201);
    }

    /** PUT /attendance/mapping/{id} */
    public function mappingUpdate(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = self::guard();
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $existing = $this->mapping->find($id);
        if (!$existing) {
            return ApiResponse::notFound();
        }

        $data = $request->get_json_params() ?: [];
        $employeeId = (string) ($data['employeeId'] ?? $existing['employeeId']);
        $biometricUserId = (string) ($data['biometricUserId'] ?? $existing['biometricUserId']);

        $conflict = $this->mapping->findConflict($employeeId, $biometricUserId, $id);
        if ($conflict) {
            return ApiResponse::validationError($conflict);
        }

        $this->mapping->update($id, $data);
        return ApiResponse::ok($this->mapping->find($id));
    }

    /** DELETE /attendance/mapping/{id} */
    public function mappingDelete(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = self::guard();
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $this->mapping->delete($id);
        return ApiResponse::ok(null);
    }

    private static function summarize(array $rows): array
    {
        $counts = ['total' => count($rows), 'imported' => 0, 'duplicates' => 0, 'failed' => 0];
        foreach ($rows as $row) {
            if ($row['status'] === 'ready') {
                $counts['imported']++;
            } elseif ($row['status'] === 'duplicate') {
                $counts['duplicates']++;
            } else {
                $counts['failed']++;
            }
        }
        return $counts;
    }
}
