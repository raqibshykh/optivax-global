<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/departments/* (IdentityOrgMigration's `departments` table).
 * `memberCount` is computed per-row from users_mapping via a plain COUNT
 * query — fine at this foundation-phase scale; revisit with a JOIN if
 * department lists grow large.
 */
final class DepartmentRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'departments';
    }

    private function usersMappingTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping';
    }

    private function memberCount(string $departmentId): int
    {
        global $wpdb;
        $table = $this->usersMappingTable();
        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table} WHERE department_id = %s",
            $departmentId
        ));
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'domain' => $row['domain'],
            'code' => $row['code'] ?? null,
            'status' => $row['status'] ?? 'active',
            'defaultShiftId' => $row['default_shift_id'] ?? null,
            'headUserId' => $row['head_user_id'] !== null && $row['head_user_id'] !== ''
                ? (string) $row['head_user_id']
                : null,
            'description' => $row['description'] ?: null,
            'createdAt' => $row['created_at'],
            'memberCount' => $this->memberCount($row['id']),
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'domain' => Sanitize::text($data['domain'] ?? ''),
            'code' => Sanitize::text($data['code'] ?? null) ?: null,
            'status' => Sanitize::text($data['status'] ?? 'active') ?: 'active',
            'default_shift_id' => Sanitize::text($data['defaultShiftId'] ?? null) ?: null,
            'head_user_id' => Sanitize::int($data['headUserId'] ?? null),
            'description' => Sanitize::textarea($data['description'] ?? null),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?: current_time('mysql', true),
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('name', $data)) {
            $row['name'] = Sanitize::text($data['name']);
        }
        if (array_key_exists('domain', $data)) {
            $row['domain'] = Sanitize::text($data['domain']);
        }
        if (array_key_exists('code', $data)) {
            $row['code'] = Sanitize::text($data['code']) ?: null;
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']) ?: 'active';
        }
        if (array_key_exists('defaultShiftId', $data)) {
            $row['default_shift_id'] = Sanitize::text($data['defaultShiftId']) ?: null;
        }
        if (array_key_exists('headUserId', $data)) {
            $row['head_user_id'] = Sanitize::int($data['headUserId']);
        }
        if (array_key_exists('description', $data)) {
            $row['description'] = Sanitize::textarea($data['description']);
        }
        return $row;
    }
}
