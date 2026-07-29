<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/attendance/mapping/*. One employee <-> one biometric id,
 * global (no device scoping) — deliberately simpler than
 * ItBiometricEmployeeMapRepository's device-scoped model, per this feature's
 * own spec. `employeeId` is a WP user id (as a string), matching
 * `attendance_records.user_id` and every other attendance table in this
 * plugin — not the `employees` table's own UUID.
 */
final class AttendanceBiometricMappingRepository
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'attendance_biometric_mapping';
    }

    public function list(): array
    {
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM {$this->table()} ORDER BY created_at DESC", ARRAY_A);
        return array_map([$this, 'toDto'], $rows ?: []);
    }

    public function find(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->table()} WHERE id = %s", $id), ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }

    /** @return array<string, string> biometricUserId => employeeId, for every mapping whose biometricUserId is in $biometricUserIds */
    public function resolveMany(array $biometricUserIds): array
    {
        if (empty($biometricUserIds)) {
            return [];
        }
        global $wpdb;
        $placeholders = implode(', ', array_fill(0, count($biometricUserIds), '%s'));
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT biometric_user_id, employee_id FROM {$this->table()} WHERE biometric_user_id IN ({$placeholders})",
                $biometricUserIds
            ),
            ARRAY_A
        );
        $map = [];
        foreach ($rows ?: [] as $row) {
            $map[$row['biometric_user_id']] = $row['employee_id'];
        }
        return $map;
    }

    /** @return string|null a friendly validation message, or null if $employeeId/$biometricUserId are free to use (optionally excluding one existing row id, for edits) */
    public function findConflict(string $employeeId, string $biometricUserId, ?string $excludeId = null): ?string
    {
        global $wpdb;
        $table = $this->table();

        $employeeSql = "SELECT id FROM {$table} WHERE employee_id = %s";
        $employeeParams = [$employeeId];
        if ($excludeId !== null) {
            $employeeSql .= ' AND id != %s';
            $employeeParams[] = $excludeId;
        }
        if ($wpdb->get_var($wpdb->prepare($employeeSql, $employeeParams)) !== null) {
            return 'This employee already has a biometric mapping.';
        }

        $bioSql = "SELECT id FROM {$table} WHERE biometric_user_id = %s";
        $bioParams = [$biometricUserId];
        if ($excludeId !== null) {
            $bioSql .= ' AND id != %s';
            $bioParams[] = $excludeId;
        }
        if ($wpdb->get_var($wpdb->prepare($bioSql, $bioParams)) !== null) {
            return 'This biometric ID is already mapped to another employee.';
        }

        return null;
    }

    public function create(array $data): array
    {
        global $wpdb;
        $now = current_time('mysql', true);
        $row = [
            'id' => Uuid::v4(),
            'employee_id' => Sanitize::text($data['employeeId']),
            'biometric_user_id' => Sanitize::text($data['biometricUserId']),
            'device_name' => Sanitize::text($data['deviceName'] ?? null),
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $wpdb->insert($this->table(), $row);
        return $this->toDto($row);
    }

    public function update(string $id, array $data): void
    {
        global $wpdb;
        $patch = ['updated_at' => current_time('mysql', true)];
        if (array_key_exists('employeeId', $data)) {
            $patch['employee_id'] = Sanitize::text($data['employeeId']);
        }
        if (array_key_exists('biometricUserId', $data)) {
            $patch['biometric_user_id'] = Sanitize::text($data['biometricUserId']);
        }
        if (array_key_exists('deviceName', $data)) {
            $patch['device_name'] = Sanitize::text($data['deviceName']);
        }
        $wpdb->update($this->table(), $patch, ['id' => $id]);
    }

    public function delete(string $id): void
    {
        global $wpdb;
        $wpdb->delete($this->table(), ['id' => $id]);
    }

    private function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'employeeId' => $row['employee_id'],
            'biometricUserId' => $row['biometric_user_id'],
            'deviceName' => $row['device_name'] ?? null,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }
}
