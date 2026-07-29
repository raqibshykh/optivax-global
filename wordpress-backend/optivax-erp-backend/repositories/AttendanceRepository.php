<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/attendance/year/{year} and /attendance/self/*. Deliberately
 * NOT an AbstractRepository — it exposes a year-scoped read and a distinct
 * "self" CRUD surface (both against the same attendance_records table; the
 * frontend treats them as two independent features per
 * src/services/attendanceService.ts's own doc comments).
 */
final class AttendanceRepository
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'attendance_records';
    }

    public function getYear(int $year): array
    {
        global $wpdb;
        $rows = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$this->table()} WHERE YEAR(date) = %d ORDER BY date ASC", $year),
            ARRAY_A
        );
        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /**
     * Backs GET /attendance/self. Despite the "self" naming (mirroring the
     * frontend's self-check-in page), this returns every row in the table,
     * not just the caller's own: src/pages/HR/Attendance.tsx does a single
     * unscoped fetch that it then uses both to find "my today" row for
     * self-check-in AND to list every employee's row for super_admin's
     * manage/edit/delete actions — there is no userId query param on this
     * route in the frontend contract.
     */
    public function getSelf(): array
    {
        global $wpdb;
        // No natural bound like getYear()'s YEAR() filter — cap defensively
        // (most-recent-first, per the existing ORDER BY) so this never scans
        // every employee's entire attendance history in one request as the
        // table grows. If admin tooling ever needs older rows than this,
        // that's a sign it should call getYear() instead of this endpoint.
        $rows = $wpdb->get_results("SELECT * FROM {$this->table()} ORDER BY date DESC LIMIT 2000", ARRAY_A);
        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** Same shape as getSelf(), scoped to one employee's own rows — used for every non-HR-privileged caller. */
    public function getSelfForUser(string $userId): array
    {
        global $wpdb;
        $rows = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$this->table()} WHERE user_id = %s ORDER BY date DESC", $userId),
            ARRAY_A
        );
        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** Used by the controller to check row ownership before allowing a non-admin edit/delete. */
    public function findSelf(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->table()} WHERE id = %s", $id), ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }

    /**
     * Used only by BiometricAttendanceService::aggregateDay() to decide
     * createSelf() (no row yet) vs updateSelf($id, ...) (row exists) for a
     * given (user, date) — createSelf() always INSERTs, which would collide
     * with this table's own UNIQUE KEY (user_id, date) on a second
     * aggregation run for the same day, and updateSelf() needs an id it
     * doesn't otherwise have.
     */
    public function findByUserAndDate(string $userId, string $date): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$this->table()} WHERE user_id = %s AND date = %s LIMIT 1", $userId, $date),
            ARRAY_A
        );
        return $row ? $this->toDto($row) : null;
    }

    public function createSelf(array $data): array
    {
        global $wpdb;
        $row = $this->fromDto($data);
        $wpdb->insert($this->table(), $row);
        return $this->toDto($row);
    }

    public function updateSelf(string $id, array $patch): void
    {
        global $wpdb;
        $map = [
            'userId' => 'user_id',
            'userName' => 'user_name',
            'userRole' => 'user_role',
            'date' => 'date',
            'checkIn' => 'check_in',
            'checkOut' => 'check_out',
            'status' => 'status',
            'notes' => 'notes',
            'shiftId' => 'shift_id',
            'workedMinutes' => 'worked_minutes',
            'breakMinutes' => 'break_minutes',
            'overtimeMinutes' => 'overtime_minutes',
            'punchCount' => 'punch_count',
        ];
        $intColumns = ['worked_minutes', 'break_minutes', 'overtime_minutes', 'punch_count'];
        $row = [];
        foreach ($map as $key => $column) {
            if (!array_key_exists($key, $patch)) {
                continue;
            }
            if ($column === 'notes') {
                $row[$column] = Sanitize::textarea($patch[$key]);
            } elseif (in_array($column, $intColumns, true)) {
                $row[$column] = $patch[$key] === null ? null : (int) $patch[$key];
            } else {
                $row[$column] = Sanitize::text($patch[$key]);
            }
        }
        if (!empty($row)) {
            $wpdb->update($this->table(), $row, ['id' => $id]);
        }
    }

    public function deleteSelf(string $id): void
    {
        global $wpdb;
        $wpdb->delete($this->table(), ['id' => $id]);
    }

    private function fromDto(array $data): array
    {
        return [
            'id' => $data['id'] ?? Uuid::v4(),
            'user_id' => Sanitize::text($data['userId'] ?? ''),
            'user_name' => Sanitize::text($data['userName'] ?? ''),
            'user_role' => Sanitize::text($data['userRole'] ?? ''),
            'date' => Sanitize::text($data['date'] ?? ''),
            'check_in' => Sanitize::text($data['checkIn'] ?? null),
            'check_out' => Sanitize::text($data['checkOut'] ?? null),
            'status' => Sanitize::text($data['status'] ?? ''),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
            'shift_id' => Sanitize::text($data['shiftId'] ?? null) ?: null,
            'worked_minutes' => isset($data['workedMinutes']) ? (int) $data['workedMinutes'] : null,
            'break_minutes' => isset($data['breakMinutes']) ? (int) $data['breakMinutes'] : null,
            'overtime_minutes' => isset($data['overtimeMinutes']) ? (int) $data['overtimeMinutes'] : null,
            'punch_count' => isset($data['punchCount']) ? (int) $data['punchCount'] : null,
        ];
    }

    private function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'userId' => $row['user_id'],
            'userName' => $row['user_name'],
            'userRole' => $row['user_role'],
            'date' => $row['date'],
            'checkIn' => $row['check_in'] ?? null,
            'checkOut' => $row['check_out'] ?? null,
            'status' => $row['status'],
            'notes' => $row['notes'] ?? null,
            'shiftId' => $row['shift_id'] ?? null,
            'workedMinutes' => isset($row['worked_minutes']) ? (int) $row['worked_minutes'] : null,
            'breakMinutes' => isset($row['break_minutes']) ? (int) $row['break_minutes'] : null,
            'overtimeMinutes' => isset($row['overtime_minutes']) ? (int) $row['overtime_minutes'] : null,
            'punchCount' => isset($row['punch_count']) ? (int) $row['punch_count'] : null,
        ];
    }
}
