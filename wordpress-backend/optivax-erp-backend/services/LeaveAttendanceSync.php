<?php

namespace OptivaxERP\Services;

use OptivaxERP\Repositories\AttendanceRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * The missing link between leave approval and attendance: previously, approving a leave
 * request (either leave_requests_hr or leave_requests_employee — see LeaveRequestController's
 * own doc comment on why two independent leave features exist) never touched
 * attendance_records at all, so an employee on approved leave still showed as "absent" on
 * every attendance dashboard/report/payroll calculation. This upserts a 'leave' status row for
 * every day in the approved range, reusing AttendanceRepository's own createSelf()/updateSelf()
 * so the result is byte-identical in shape to any other attendance row.
 *
 * Per the night-shift rules (ShiftResolver.php), a leave date is already a shift date — "taking
 * 26-Jul off" means not working the shift that starts the night of 26-Jul (shift_date=26-Jul by
 * definition), so no date translation happens here, the range is applied as-is.
 *
 * Idempotent: upserts by (userId, date) via AttendanceRepository::findByUserAndDate(), so
 * re-approving (or a later biometric sync — BiometricAttendanceService::
 * NON_OVERRIDABLE_STATUSES already refuses to overwrite a 'leave' row) never double-applies.
 */
final class LeaveAttendanceSync
{
    public static function applyApprovedLeave(string $userId, string $userName, string $userRole, string $startDate, string $endDate): void
    {
        $start = \DateTimeImmutable::createFromFormat('Y-m-d', $startDate);
        $end = \DateTimeImmutable::createFromFormat('Y-m-d', $endDate);
        if (!$start || !$end || $end < $start) {
            return;
        }

        $attendance = new AttendanceRepository();
        $cursor = $start;
        while ($cursor <= $end) {
            $shiftDate = $cursor->format('Y-m-d');
            $existing = $attendance->findByUserAndDate($userId, $shiftDate);
            if ($existing) {
                $attendance->updateSelf($existing['id'], ['status' => 'leave']);
            } else {
                $attendance->createSelf([
                    'userId' => $userId,
                    'userName' => $userName,
                    'userRole' => $userRole,
                    'date' => $shiftDate,
                    'status' => 'leave',
                ]);
            }
            $cursor = $cursor->modify('+1 day');
        }
    }
}
