<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Transaction;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/payroll/salary-slips. Deliberately NOT an AbstractRepository —
 * the frontend's PUT is a whole-list bulk save (src/services/payrollService.ts
 * PayrollService.saveSalarySlips) rather than an update-by-id, alongside a
 * separate single-slip POST (appendSalarySlip). No deduction/net-salary math
 * happens here — the frontend computes every number and this just stores it.
 */
final class SalarySlipRepository
{
    private function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'salary_slips';
    }

    /** @param string|null $employeeId when given, restricts to that employee's own slips. */
    public function list(?string $employeeId = null): array
    {
        global $wpdb;
        $table = $this->table();
        if ($employeeId !== null) {
            $rows = $wpdb->get_results(
                $wpdb->prepare("SELECT * FROM {$table} WHERE employee_id = %s ORDER BY generated_at DESC", $employeeId),
                ARRAY_A
            );
        } else {
            $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY generated_at DESC", ARRAY_A);
        }
        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** PUT /payroll/salary-slips replaces the whole list — the frontend always sends the full SalarySlip[] snapshot. */
    public function bulkSave(array $slips): void
    {
        Transaction::run(function () use ($slips) {
            global $wpdb;
            $table = $this->table();
            $wpdb->query("DELETE FROM {$table}");
            foreach ($slips as $slip) {
                if (is_array($slip)) {
                    $wpdb->insert($table, $this->fromDto($slip));
                }
            }
        });
    }

    /** POST /payroll/salary-slips appends one already-fully-computed slip. */
    public function createOne(array $slip): array
    {
        global $wpdb;
        $row = $this->fromDto($slip);
        $wpdb->insert($this->table(), $row);
        return $this->toDto($row);
    }

    private function fromDto(array $data): array
    {
        return [
            'id' => $data['id'] ?? Uuid::v4(),
            'employee_id' => Sanitize::text($data['employeeId'] ?? ''),
            'employee_name' => Sanitize::text($data['employeeName'] ?? ''),
            'employee_email' => Sanitize::email($data['employeeEmail'] ?? ''),
            'department' => Sanitize::text($data['department'] ?? ''),
            'designation' => Sanitize::text($data['designation'] ?? ''),
            'salary_month' => Sanitize::text($data['salaryMonth'] ?? ''),
            'basic_salary' => Sanitize::float($data['basicSalary'] ?? 0),
            'allowances' => Sanitize::json($data['allowances'] ?? []),
            'bonuses' => Sanitize::json($data['bonuses'] ?? []),
            'deductions' => Sanitize::json($data['deductions'] ?? []),
            'advance_salary_deduction' => Sanitize::float($data['advanceSalaryDeduction'] ?? 0),
            'unpaid_leave_days' => array_key_exists('unpaidLeaveDays', $data) ? Sanitize::int($data['unpaidLeaveDays']) : null,
            'unpaid_leave_deduction' => array_key_exists('unpaidLeaveDeduction', $data) ? Sanitize::float($data['unpaidLeaveDeduction']) : null,
            'half_day_deduction' => array_key_exists('halfDayDeduction', $data) ? Sanitize::float($data['halfDayDeduction']) : null,
            'late_penalty_count' => array_key_exists('latePenaltyCount', $data) ? Sanitize::int($data['latePenaltyCount']) : null,
            'late_penalty_days' => array_key_exists('latePenaltyDays', $data) ? Sanitize::int($data['latePenaltyDays']) : null,
            'late_penalty_deduction' => array_key_exists('latePenaltyDeduction', $data) ? Sanitize::float($data['latePenaltyDeduction']) : null,
            'gross_salary' => Sanitize::float($data['grossSalary'] ?? 0),
            'total_deductions' => Sanitize::float($data['totalDeductions'] ?? 0),
            'net_salary' => Sanitize::float($data['netSalary'] ?? 0),
            'generated_at' => Sanitize::text($data['generatedAt'] ?? current_time('mysql', true)),
            'generated_by_id' => Sanitize::text($data['generatedById'] ?? ''),
            'generated_by_name' => Sanitize::text($data['generatedByName'] ?? ''),
            'generated_by_role' => Sanitize::text($data['generatedByRole'] ?? ''),
            'notes' => Sanitize::textarea($data['notes'] ?? null),
        ];
    }

    private function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'employeeEmail' => $row['employee_email'],
            'department' => $row['department'],
            'designation' => $row['designation'],
            'salaryMonth' => $row['salary_month'],
            'basicSalary' => (float) $row['basic_salary'],
            'allowances' => Sanitize::jsonDecode($row['allowances'] ?? null),
            'bonuses' => Sanitize::jsonDecode($row['bonuses'] ?? null),
            'deductions' => Sanitize::jsonDecode($row['deductions'] ?? null),
            'advanceSalaryDeduction' => (float) $row['advance_salary_deduction'],
            'unpaidLeaveDays' => $row['unpaid_leave_days'] !== null ? (int) $row['unpaid_leave_days'] : null,
            'unpaidLeaveDeduction' => $row['unpaid_leave_deduction'] !== null ? (float) $row['unpaid_leave_deduction'] : null,
            'halfDayDeduction' => $row['half_day_deduction'] !== null ? (float) $row['half_day_deduction'] : null,
            'latePenaltyCount' => $row['late_penalty_count'] !== null ? (int) $row['late_penalty_count'] : null,
            'latePenaltyDays' => $row['late_penalty_days'] !== null ? (int) $row['late_penalty_days'] : null,
            'latePenaltyDeduction' => $row['late_penalty_deduction'] !== null ? (float) $row['late_penalty_deduction'] : null,
            'grossSalary' => (float) $row['gross_salary'],
            'totalDeductions' => (float) $row['total_deductions'],
            'netSalary' => (float) $row['net_salary'],
            'generatedAt' => $row['generated_at'],
            'generatedById' => $row['generated_by_id'],
            'generatedByName' => $row['generated_by_name'],
            'generatedByRole' => $row['generated_by_role'],
            'notes' => $row['notes'] ?? null,
        ];
    }
}
