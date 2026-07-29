<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/it/biometric-mapping/* — the biometric device's own
 * numeric/card user id has no relationship to our UUID employee ids, so this
 * table is the one place that link is recorded. `deviceId` empty string
 * (`''`, never NULL) means "applies to any device" — see
 * BiometricAttendanceMigration.php's doc comment for why NULL couldn't be
 * used for that sentinel given the UNIQUE KEY.
 */
final class ItBiometricEmployeeMapRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'it_biometric_employee_map';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'deviceId' => $row['device_id'] !== '' ? $row['device_id'] : null,
            'biometricUserId' => $row['biometric_user_id'],
            'internalUserId' => $row['internal_user_id'],
            'employeeName' => $row['employee_name'] ?: null,
            'status' => $row['status'],
            'createdAt' => $row['created_at'],
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'device_id' => Sanitize::text($data['deviceId'] ?? '') ?? '',
            'biometric_user_id' => Sanitize::text($data['biometricUserId'] ?? ''),
            'internal_user_id' => Sanitize::text($data['internalUserId'] ?? ''),
            'employee_name' => Sanitize::text($data['employeeName'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'active'),
        ];
    }

    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('deviceId', $data)) {
            $row['device_id'] = Sanitize::text($data['deviceId']) ?? '';
        }
        if (array_key_exists('biometricUserId', $data)) {
            $row['biometric_user_id'] = Sanitize::text($data['biometricUserId']);
        }
        if (array_key_exists('internalUserId', $data)) {
            $row['internal_user_id'] = Sanitize::text($data['internalUserId']);
        }
        if (array_key_exists('employeeName', $data)) {
            $row['employee_name'] = Sanitize::text($data['employeeName']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        return $row;
    }

    /**
     * Resolves a device's raw punch identity to our internal employee id —
     * tries the device-scoped mapping first, falls back to the global
     * (deviceId = '') mapping, returns null if genuinely unmapped (the
     * punch is still stored raw, just never aggregated into attendance).
     */
    public function resolve(string $deviceId, string $biometricUserId): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->table()} WHERE biometric_user_id = %s AND status = 'active' AND device_id IN (%s, '') ORDER BY (device_id = %s) DESC LIMIT 1",
            $biometricUserId,
            $deviceId,
            $deviceId
        ), ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }

    /**
     * Batch form of resolve() — one query for every distinct biometric id in
     * an entire incoming punch batch, instead of one query per punch (the
     * per-punch version was the N+1 pattern that doesn't scale to
     * 100,000+ punches). Device-scoped mappings win over a global (deviceId
     * = '') mapping for the same biometric id, same precedence as resolve().
     *
     * @return array<string, array> keyed by biometricUserId
     */
    public function resolveMany(string $deviceId, array $biometricUserIds): array
    {
        if (empty($biometricUserIds)) {
            return [];
        }
        global $wpdb;
        $placeholders = implode(', ', array_fill(0, count($biometricUserIds), '%s'));
        $sql = "SELECT * FROM {$this->table()}
                WHERE status = 'active' AND device_id IN (%s, '') AND biometric_user_id IN ({$placeholders})";
        $values = array_merge([$deviceId], $biometricUserIds);
        $rows = $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        $result = [];
        foreach ($rows ?: [] as $row) {
            $bioId = $row['biometric_user_id'];
            $isDeviceScoped = $row['device_id'] === $deviceId;
            $alreadyDeviceScoped = isset($result[$bioId]) && $result[$bioId]['deviceId'] === $deviceId;
            if (!isset($result[$bioId]) || ($isDeviceScoped && !$alreadyDeviceScoped)) {
                $result[$bioId] = $this->toDto($row);
            }
        }
        return $result;
    }

    /** Distinct mapped employees currently active — feeds the cron sweep's missing-punch/no-record exception detection. */
    public function activeMappedEmployees(): array
    {
        global $wpdb;
        $rows = $wpdb->get_results(
            "SELECT DISTINCT internal_user_id, employee_name FROM {$this->table()} WHERE status = 'active'",
            ARRAY_A
        );
        return array_map(static function (array $row): array {
            return ['userId' => (string) $row['internal_user_id'], 'name' => $row['employee_name'] ?? null];
        }, $rows ?: []);
    }
}
