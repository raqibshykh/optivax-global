<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Services\DepartmentAutoAssignService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/profiles/* (UserProfile — the fuller admin-facing shape,
 * distinct from the slim SessionUserDto). Joins wp_users with the plugin's
 * users_mapping table; account creation/deletion touches both.
 */
final class UserProfileRepository
{
    private function mappingTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping';
    }

    /**
     * @param array $filters supports 'id' and 'email' keys (matches
     * /profiles/list?id=, ?email= — both take-first-result on the frontend).
     */
    public function list(array $filters = []): array
    {
        global $wpdb;
        $mappingTable = $this->mappingTable();

        $where = [];
        $values = [];
        if (!empty($filters['id'])) {
            $where[] = 'u.ID = %d';
            $values[] = (int) $filters['id'];
        }
        if (!empty($filters['email'])) {
            $where[] = 'u.user_email = %s';
            $values[] = $filters['email'];
        }

        $sql = "SELECT u.ID, u.user_email, u.display_name, u.user_registered, m.*
                FROM {$wpdb->users} u
                LEFT JOIN {$mappingTable} m ON m.user_id = u.ID";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY u.ID DESC';

        $rows = empty($values) ? $wpdb->get_results($sql, ARRAY_A) : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);
        return array_map([$this, 'toDto'], $rows ?: []);
    }

    public function findById(int $userId): ?array
    {
        $rows = $this->list(['id' => $userId]);
        return $rows[0] ?? null;
    }

    /**
     * wp_insert_user() + the mapping-table insert (+ the clients-table row,
     * for role=client) must succeed together — an orphaned wp_users row with
     * no role/department mapping would silently break every RBAC/department
     * check for that account, and a `client`-role account with no matching
     * `clients` row is invisible to Clients/Production/every screen that
     * reads via ClientRepository despite being able to log in. All three
     * writes go through the same $wpdb connection, so wrapping in
     * Transaction::run() rolls back everything if any one of them fails.
     */
    public function create(array $data): array
    {
        $email = Sanitize::email($data['email'] ?? '');
        $password = (string) ($data['password'] ?? wp_generate_password(16));
        $fullName = Sanitize::text($data['full_name'] ?? '');
        $role = Sanitize::key($data['role'] ?? 'client');
        $effectiveRole = \OptivaxERP\Helpers\RbacMatrix::isValidRole($role) ? $role : 'client';

        // The department-auto-assignment fix: a caller-supplied departmentId is normalized (it
        // may be a legacy "dept-<domain>" slug rather than a real row, e.g. "dept-management",
        // which never resolved correctly before — see DepartmentAutoAssignService's own doc
        // comment); an EMPTY departmentId is resolved/auto-created from the role instead of
        // being left null, which is what previously left every "management" role user
        // unassigned (no role->department mapping existed for it at all).
        $rawDepartmentId = Sanitize::text($data['departmentId'] ?? null);
        $departmentId = $rawDepartmentId
            ? DepartmentAutoAssignService::normalizeSlug($rawDepartmentId)
            : DepartmentAutoAssignService::resolveOrCreateDepartmentId($effectiveRole);

        $userId = Transaction::run(function () use ($email, $password, $fullName, $effectiveRole, $departmentId, $data) {
            $userId = wp_insert_user([
                'user_login' => $email,
                'user_email' => $email,
                'user_pass' => $password,
                'display_name' => $fullName,
                'nickname' => $fullName,
            ]);

            if (is_wp_error($userId)) {
                throw new \RuntimeException($userId->get_error_message());
            }

            global $wpdb;
            $inserted = $wpdb->insert($this->mappingTable(), [
                'user_id' => $userId,
                'role' => $effectiveRole,
                'status' => 'active',
                'must_change_password' => 1,
                'department_id' => $departmentId,
                'designation' => Sanitize::text($data['designation'] ?? null),
                'avatar_url' => Sanitize::url($data['avatar_url'] ?? null),
                'company' => Sanitize::text($data['company'] ?? null),
                'created_by' => AuthMiddleware::currentUserId() !== null ? (string) AuthMiddleware::currentUserId() : null,
                'created_at' => current_time('mysql', true),
            ]);
            if ($inserted === false) {
                throw new \RuntimeException('Failed to create user role mapping');
            }

            // This used to be left entirely to a second, independent
            // frontend call (POST /clients/create) made right after this
            // endpoint returned — any failure or interruption between the
            // two requests left a wp_users row with a fully working login
            // and no client record anywhere the rest of the app could see.
            // Creating it here, inside the same transaction, makes the
            // account and its client record atomic. /clients/create still
            // exists and is still called by the frontend afterward — see
            // its own upsert-by-email handling in ClientRoutes.php, which
            // enriches this row (phone/address/tags/createdByName/...)
            // instead of inserting a duplicate for the same email.
            if ($effectiveRole === 'client') {
                $clientRow = (new ClientRepository())->create([
                    'name' => $fullName,
                    'email' => $email,
                    'company' => $data['company'] ?? null,
                    'status' => 'active',
                    'avatar' => $data['avatar_url'] ?? null,
                    'createdAt' => $data['created_at'] ?? null,
                    'createdBy' => AuthMiddleware::currentUserId() !== null ? (string) AuthMiddleware::currentUserId() : null,
                ]);
                if (!$clientRow) {
                    throw new \RuntimeException('Failed to create client record');
                }
            }

            return $userId;
        });

        \OptivaxERP\Mail\MailService::sendNow($email, 'Welcome to OptiVax Global', 'welcome', [
            'fullName' => $fullName,
            'email' => $email,
            'password' => $password,
            'loginUrl' => home_url('/'),
        ]);

        return $this->findById((int) $userId);
    }

    public function update(int $userId, array $data): ?array
    {
        $userUpdate = [];
        if (isset($data['full_name'])) {
            $userUpdate['display_name'] = Sanitize::text($data['full_name']);
        }
        if (!empty($userUpdate)) {
            wp_update_user(array_merge(['ID' => $userId], $userUpdate));
        }

        $newRole = array_key_exists('role', $data) ? Sanitize::key($data['role']) : null;

        // Same department-auto-assignment fix as create(): an explicitly-supplied departmentId
        // is normalized (legacy slug -> real row); if the role is changing and the caller did
        // NOT also explicitly choose a department in the same request, auto-fill the new
        // role's canonical department instead of leaving it whatever it was (or unset) — this
        // is what makes promoting an existing employee to "management" also fix their
        // department, not just brand-new management accounts.
        $departmentId = null;
        if (array_key_exists('departmentId', $data)) {
            $raw = Sanitize::text($data['departmentId']);
            $departmentId = $raw ? DepartmentAutoAssignService::normalizeSlug($raw) : $raw;
        } elseif ($newRole !== null) {
            $departmentId = DepartmentAutoAssignService::resolveOrCreateDepartmentId($newRole);
        }

        $mappingUpdate = array_filter([
            'department_id' => $departmentId,
            'designation' => array_key_exists('designation', $data) ? Sanitize::text($data['designation']) : null,
            'avatar_url' => array_key_exists('avatar_url', $data) ? Sanitize::url($data['avatar_url']) : null,
            'company' => array_key_exists('company', $data) ? Sanitize::text($data['company']) : null,
            'role' => $newRole,
            'status' => array_key_exists('status', $data) ? Sanitize::key($data['status']) : null,
        ], fn ($v) => $v !== null);

        if (!empty($mappingUpdate)) {
            global $wpdb;
            $wpdb->update($this->mappingTable(), $mappingUpdate, ['user_id' => $userId]);
        }

        return $this->findById($userId);
    }

    /**
     * Self-service field whitelist for PUT /profile/me — deliberately
     * narrower than update() above (the admin-facing /profiles/update): a
     * caller editing their OWN profile may only ever touch this exact set of
     * columns, regardless of what other keys the request body contains.
     * role/department/designation/company/status/etc. are never read from
     * $data here at all, so there's no key a self-edit request could add to
     * escalate beyond contact/personal details.
     */
    public function updateSelf(int $userId, array $data): ?array
    {
        $row = array_filter([
            'phone' => array_key_exists('phone', $data) ? Sanitize::text($data['phone']) : null,
            'alt_phone' => array_key_exists('altPhone', $data) ? Sanitize::text($data['altPhone']) : null,
            'address' => array_key_exists('address', $data) ? Sanitize::text($data['address']) : null,
            'city' => array_key_exists('city', $data) ? Sanitize::text($data['city']) : null,
            'country' => array_key_exists('country', $data) ? Sanitize::text($data['country']) : null,
            'postal_code' => array_key_exists('postalCode', $data) ? Sanitize::text($data['postalCode']) : null,
            'emergency_contact_name' => array_key_exists('emergencyContactName', $data) ? Sanitize::text($data['emergencyContactName']) : null,
            'emergency_contact_number' => array_key_exists('emergencyContactNumber', $data) ? Sanitize::text($data['emergencyContactNumber']) : null,
            'bio' => array_key_exists('bio', $data) ? Sanitize::textarea($data['bio']) : null,
            'gender' => array_key_exists('gender', $data) ? Sanitize::key($data['gender']) : null,
            'date_of_birth' => array_key_exists('dateOfBirth', $data) ? Sanitize::text($data['dateOfBirth']) : null,
            'timezone' => array_key_exists('timezone', $data) ? Sanitize::text($data['timezone']) : null,
            'language' => array_key_exists('language', $data) ? Sanitize::text($data['language']) : null,
        ], fn ($v) => $v !== null);

        if (!empty($row)) {
            global $wpdb;
            $wpdb->update($this->mappingTable(), $row, ['user_id' => $userId]);
        }

        return $this->findById($userId);
    }

    /** Used only by the POST/DELETE /profile/me/avatar handlers — never touches any other column. */
    public function updateAvatar(int $userId, ?string $avatarUrl): void
    {
        global $wpdb;
        $wpdb->update($this->mappingTable(), ['avatar_url' => $avatarUrl], ['user_id' => $userId]);
    }

    public function delete(int $userId): void
    {
        require_once ABSPATH . 'wp-admin/includes/user.php';
        global $wpdb;
        $wpdb->delete($this->mappingTable(), ['user_id' => $userId]);
        wp_delete_user($userId);
    }

    private function toDto(array $row): array
    {
        return [
            'id' => (string) $row['ID'],
            'email' => $row['user_email'],
            'full_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'] ?? '',
            'company' => $row['company'] ?? '',
            'role' => $row['role'] ?? 'client',
            'status' => $row['status'] ?? 'active',
            'departmentId' => $row['department_id'] ?? null,
            'designation' => $row['designation'] ?? null,
            'phone' => $row['phone'] ?? '',
            'altPhone' => $row['alt_phone'] ?? '',
            'address' => $row['address'] ?? '',
            'city' => $row['city'] ?? '',
            'country' => $row['country'] ?? '',
            'postalCode' => $row['postal_code'] ?? '',
            'emergencyContactName' => $row['emergency_contact_name'] ?? '',
            'emergencyContactNumber' => $row['emergency_contact_number'] ?? '',
            'bio' => $row['bio'] ?? '',
            'gender' => $row['gender'] ?? '',
            'dateOfBirth' => $row['date_of_birth'] ?? null,
            'timezone' => $row['timezone'] ?? '',
            'language' => $row['language'] ?? '',
            'createdBy' => $row['created_by'] ?? null,
            'createdAt' => $row['created_at'] ?? $row['user_registered'],
            'created_at' => $row['created_at'] ?? $row['user_registered'],
            'lastLogin' => $row['last_login'] ?? null,
            'notificationPreferences' => [
                'emailNotifs' => (bool) ($row['notification_prefs_email'] ?? true),
                'paymentReminders' => (bool) ($row['notification_prefs_payment_reminders'] ?? true),
            ],
        ];
    }
}
