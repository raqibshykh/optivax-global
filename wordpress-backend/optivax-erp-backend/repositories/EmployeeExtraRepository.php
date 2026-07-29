<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/hr/employee-extra. Deliberately NOT an AbstractRepository —
 * the frontend (src/services/employeeExtraService.ts) expects the whole table
 * as a `Record<userId, EmployeeExtraData>` map from GET, not an array of rows,
 * plus a per-user upsert-by-id PUT and a bulk-overwrite PUT with no id in the
 * path. AbstractRepository's list()/create()/update() shapes don't fit any of
 * that, so this repository talks to $wpdb directly.
 */
final class EmployeeExtraRepository
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'employee_extra';
    }

    public function getAllAsMap(): array
    {
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM {$this->table()}", ARRAY_A);
        $map = [];
        foreach ($rows ?: [] as $row) {
            $map[$row['user_id']] = $this->toDto($row);
        }
        return $map;
    }

    /**
     * Single-row counterpart to getAllAsMap() — used by GET /profile/me so a
     * user can see their own read-only salary figure without the endpoint
     * ever loading (or being able to leak) every other employee's row.
     */
    public function getOne(string $userId): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->table()} WHERE user_id = %s", $userId), ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }

    /** Upserts one user's row — the row may not exist yet if this is the first time HR touches that employee. */
    public function updateOne(string $userId, array $patch): void
    {
        global $wpdb;
        $table = $this->table();
        $exists = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE user_id = %s", $userId));

        $row = [];
        if (array_key_exists('leavesTaken', $patch)) {
            $row['leaves_taken'] = Sanitize::int($patch['leavesTaken']);
        }
        if (array_key_exists('salary', $patch)) {
            $row['salary'] = Sanitize::float($patch['salary']);
        }
        if (array_key_exists('extraDeduction', $patch)) {
            $row['extra_deduction'] = Sanitize::float($patch['extraDeduction']);
        }
        if (array_key_exists('salaryStatus', $patch)) {
            $row['salary_status'] = Sanitize::text($patch['salaryStatus']);
        }
        if (array_key_exists('workMode', $patch)) {
            $row['work_mode'] = Sanitize::text($patch['workMode']);
        }

        if ($exists > 0) {
            if (!empty($row)) {
                $wpdb->update($table, $row, ['user_id' => $userId]);
            }
            return;
        }

        $row['user_id'] = $userId;
        $row += [
            'leaves_taken' => 0,
            'salary' => null,
            'extra_deduction' => null,
            'salary_status' => 'Unpaid',
            'work_mode' => 'Onsite',
        ];
        $wpdb->insert($table, $row);
    }

    /** PUT /hr/employee-extra (no id) overwrites the whole Record<userId, EmployeeExtraData> map — used by "Mark All Paid". */
    public function overwriteAll(array $map): void
    {
        Transaction::run(function () use ($map) {
            global $wpdb;
            $table = $this->table();
            $wpdb->query("DELETE FROM {$table}");
            foreach ($map as $userId => $data) {
                if (!is_array($data)) {
                    continue;
                }
                $wpdb->insert($table, [
                    'user_id' => (string) $userId,
                    'leaves_taken' => Sanitize::int($data['leavesTaken'] ?? 0),
                    'salary' => array_key_exists('salary', $data) ? Sanitize::float($data['salary']) : null,
                    'extra_deduction' => array_key_exists('extraDeduction', $data) ? Sanitize::float($data['extraDeduction']) : null,
                    'salary_status' => Sanitize::text($data['salaryStatus'] ?? 'Unpaid'),
                    'work_mode' => Sanitize::text($data['workMode'] ?? 'Onsite'),
                ]);
            }
        });
    }

    private function toDto(array $row): array
    {
        return [
            'userId' => $row['user_id'],
            'leavesTaken' => (int) $row['leaves_taken'],
            'salary' => $row['salary'] !== null ? (float) $row['salary'] : 0,
            'extraDeduction' => $row['extra_deduction'] !== null ? (float) $row['extra_deduction'] : null,
            'salaryStatus' => $row['salary_status'],
            'workMode' => $row['work_mode'],
        ];
    }
}
