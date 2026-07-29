<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Repositories\ClientRepository;
use OptivaxERP\Repositories\DepartmentRepository;
use OptivaxERP\Repositories\EmployeeExtraRepository;
use OptivaxERP\Repositories\UserProfileRepository;
use OptivaxERP\Uploads\AvatarUploadService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/profile/me* — the self-service counterpart to
 * ProfileController (admin-managed employee CRUD) and ClientRoutes
 * (admin-managed client CRUD), neither of which this controller touches or
 * changes. Every method here resolves the acting user exclusively from
 * AuthMiddleware::currentClaims() (the JWT/session cookie) — no endpoint
 * ever reads a userId/clientId/id from the request body or query string, so
 * there is no parameter an attacker could substitute to reach another
 * account. That's what makes "users can only modify their own profile" true
 * structurally, not just by a permission check that could be gotten wrong.
 *
 * Gated on authentication only (no RbacMatrix domain/action check) — editing
 * your own contact details isn't a business-data permission, matching the
 * existing precedent in ProfileController::update()'s `$isSelf` branch and
 * AuditLogController::create().
 */
final class ProfileMeController
{
    public function getMe(\WP_REST_Request $request): \WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $shaped = $this->loadSelf($claims);
        if ($shaped === null) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($shaped);
    }

    public function updateMe(\WP_REST_Request $request): \WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'phone' => ['phone'],
            'altPhone' => ['phone'],
            'emergencyContactNumber' => ['phone'],
            'dateOfBirth' => ['date'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $role = (string) ($claims['role'] ?? '');
        $userId = (int) ($claims['sub'] ?? 0);
        $email = (string) ($claims['email'] ?? '');

        if ($role === 'client') {
            $clientId = ClientScopeMiddleware::resolveOwnClientId($userId, $email);
            if (!$clientId) {
                return ApiResponse::notFound();
            }
            // Whitelist, built here rather than trusted from
            // ClientRepository::fromDtoForUpdate() alone — that method is
            // shared with the admin-facing /clients/update endpoint and also
            // accepts email/status/assignedProductionMembers/etc., none of
            // which a client may ever set on their own record.
            $patch = array_intersect_key($data, array_flip([
                'phone', 'address', 'city', 'country', 'companyLogo', 'contactName', 'website', 'bio',
            ]));
            $updated = (new ClientRepository())->update($clientId, $patch);
            if (!$updated) {
                return ApiResponse::notFound();
            }
            return ApiResponse::ok($this->shapeClient($updated));
        }

        // UserProfileRepository::updateSelf() applies its own whitelist
        // internally (only phone/altPhone/address/city/country/postalCode/
        // emergencyContact*/bio/gender/dateOfBirth/timezone/language are ever
        // read from $data) — role/department/designation/company/status are
        // never reachable through this path regardless of what's in the body.
        $updated = (new UserProfileRepository())->updateSelf($userId, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($this->shapeEmployee($updated));
    }

    public function uploadAvatar(\WP_REST_Request $request): \WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $files = $request->get_file_params();
        if (empty($files)) {
            return ApiResponse::validationError('Validation failed', ['avatar' => 'An image file is required']);
        }

        $result = AvatarUploadService::handleUpload(reset($files));
        if (is_wp_error($result)) {
            return ApiResponse::error($result->get_error_message(), 400);
        }

        $role = (string) ($claims['role'] ?? '');
        $userId = (int) ($claims['sub'] ?? 0);
        $email = (string) ($claims['email'] ?? '');

        if ($role === 'client') {
            $clientId = ClientScopeMiddleware::resolveOwnClientId($userId, $email);
            if (!$clientId) {
                return ApiResponse::notFound();
            }
            $existing = (new ClientRepository())->find($clientId);
            (new ClientRepository())->update($clientId, ['avatar' => $result['url']]);
            AvatarUploadService::deleteByUrl($existing['avatar'] ?? null);
        } else {
            $existing = (new UserProfileRepository())->findById($userId);
            (new UserProfileRepository())->updateAvatar($userId, $result['url']);
            AvatarUploadService::deleteByUrl($existing['avatar_url'] ?? null);
        }

        return ApiResponse::ok(['avatarUrl' => $result['url']], [], 201);
    }

    public function removeAvatar(\WP_REST_Request $request): \WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $role = (string) ($claims['role'] ?? '');
        $userId = (int) ($claims['sub'] ?? 0);
        $email = (string) ($claims['email'] ?? '');

        if ($role === 'client') {
            $clientId = ClientScopeMiddleware::resolveOwnClientId($userId, $email);
            if (!$clientId) {
                return ApiResponse::notFound();
            }
            $existing = (new ClientRepository())->find($clientId);
            (new ClientRepository())->update($clientId, ['avatar' => null]);
            AvatarUploadService::deleteByUrl($existing['avatar'] ?? null);
        } else {
            $existing = (new UserProfileRepository())->findById($userId);
            (new UserProfileRepository())->updateAvatar($userId, null);
            AvatarUploadService::deleteByUrl($existing['avatar_url'] ?? null);
        }

        return ApiResponse::ok(null);
    }

    private function loadSelf(array $claims): ?array
    {
        $role = (string) ($claims['role'] ?? '');
        $userId = (int) ($claims['sub'] ?? 0);
        $email = (string) ($claims['email'] ?? '');

        if ($role === 'client') {
            $clientId = ClientScopeMiddleware::resolveOwnClientId($userId, $email);
            if (!$clientId) {
                return null;
            }
            $client = (new ClientRepository())->find($clientId);
            return $client ? $this->shapeClient($client) : null;
        }

        $employee = (new UserProfileRepository())->findById($userId);
        return $employee ? $this->shapeEmployee($employee) : null;
    }

    /**
     * Splits the ClientRepository DTO into editable/readOnly groups so the
     * frontend never has to hardcode which fields it's allowed to send back
     * on save — it only ever echoes `editable` in the PUT body.
     */
    private function shapeClient(array $client): array
    {
        return [
            'kind' => 'client',
            'editable' => [
                'avatar' => $client['avatar'] ?? null,
                'phone' => $client['phone'] ?? '',
                'address' => $client['address'] ?? '',
                'city' => $client['city'] ?? '',
                'country' => $client['country'] ?? '',
                'companyLogo' => $client['companyLogo'] ?? null,
                'contactName' => $client['contactName'] ?: ($client['name'] ?? ''),
                'website' => $client['website'] ?? '',
                'bio' => $client['bio'] ?? '',
            ],
            'readOnly' => [
                'clientId' => $client['id'],
                'email' => $client['email'],
                'status' => $client['status'],
                'company' => $client['companyName'] ?: ($client['company'] ?? ''),
                'createdBy' => $client['createdByName'] ?: ($client['createdBy'] ?? null),
                'createdAt' => $client['createdAt'] ?? null,
                'joinDate' => $client['joinDate'] ?? null,
            ],
        ];
    }

    /**
     * Salary is looked up one row at a time (EmployeeExtraRepository::getOne(),
     * never getAllAsMap()) so this endpoint can only ever see the caller's
     * own figure, not the whole company's payroll data.
     */
    private function shapeEmployee(array $profile): array
    {
        $extra = (new EmployeeExtraRepository())->getOne($profile['id']);

        return [
            'kind' => 'employee',
            'editable' => [
                'avatar' => $profile['avatar_url'] ?: null,
                'phone' => $profile['phone'] ?? '',
                'altPhone' => $profile['altPhone'] ?? '',
                'address' => $profile['address'] ?? '',
                'city' => $profile['city'] ?? '',
                'country' => $profile['country'] ?? '',
                'postalCode' => $profile['postalCode'] ?? '',
                'emergencyContactName' => $profile['emergencyContactName'] ?? '',
                'emergencyContactNumber' => $profile['emergencyContactNumber'] ?? '',
                'bio' => $profile['bio'] ?? '',
                'gender' => $profile['gender'] ?? '',
                'dateOfBirth' => $profile['dateOfBirth'] ?? null,
                'timezone' => $profile['timezone'] ?? '',
                'language' => $profile['language'] ?? '',
            ],
            'readOnly' => [
                'employeeId' => $profile['id'],
                'email' => $profile['email'],
                'role' => $profile['role'],
                'departmentId' => $profile['departmentId'] ?? null,
                'designation' => $profile['designation'] ?? null,
                // Derived from the employee's CURRENT department's head_user_id, not a
                // separate stored manager_id — no manager-assignment feature exists (or is
                // needed), so this can never go stale: a department transfer changes the
                // employee's departmentId, and the next read of this endpoint automatically
                // reflects the new department's head with zero extra state to keep in sync.
                'reportingManager' => $this->resolveReportingManagerName($profile['departmentId'] ?? null),
                'salary' => $extra['salary'] ?? null,
                'joiningDate' => $profile['createdAt'] ?? null,
                'status' => $profile['status'],
                'company' => $profile['company'] ?? '',
                'createdBy' => $profile['createdBy'] ?? null,
                'createdAt' => $profile['createdAt'] ?? null,
                'lastLogin' => $profile['lastLogin'] ?? null,
            ],
        ];
    }

    /** Null when the employee has no department, the department has no head assigned, or the head account no longer resolves — never invented, matches the prior "Not assigned" contract. */
    private function resolveReportingManagerName(?string $departmentId): ?string
    {
        if (!$departmentId) {
            return null;
        }
        $dept = (new DepartmentRepository())->find($departmentId);
        if (!$dept || empty($dept['headUserId'])) {
            return null;
        }
        $head = (new UserProfileRepository())->findById((int) $dept['headUserId']);
        return $head['full_name'] ?? null;
    }
}
