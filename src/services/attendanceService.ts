import { api } from "../lib/client";
import { UserService } from "./userService";
import {
  computeMonthlyReport,
  computeYearlyReport,
  computePayrollEntry,
  calcWorkingHours,
  calcWorkingHoursForRecord,
  isLateArrival,
  isCompanyHoliday,
  isWorkingDay,
  monthLabel,
  fmtRs,
  getAccessibleDepts,
  MONTHS,
  STATUS_COLORS,
  DEPT_LABELS,
  DEPT_IDS,
  ROLE_TO_DEPT,
  COMPANY_HOLIDAYS_2026,
  COMPANY_HOLIDAYS_2025,
  STANDARD_CHECKIN,
  LATE_THRESHOLD,
  STANDARD_CHECKOUT,
  EARLY_THRESHOLD,
  type AttendanceStatus,
  type AttendanceRecord,
  type MonthlyReport,
  type YearlyReport,
  type PayrollEntry,
  type AuditEntry,
} from "../domain/attendance/calculations";

// Re-export types + pure calculation helpers so consumers only need one import
// (`services/attendanceService`) instead of reaching into `domain/attendance/calculations`.
export {
  computeMonthlyReport,
  computeYearlyReport,
  computePayrollEntry,
  calcWorkingHours,
  calcWorkingHoursForRecord,
  isLateArrival,
  isCompanyHoliday,
  isWorkingDay,
  monthLabel,
  fmtRs,
  getAccessibleDepts,
  MONTHS,
  STATUS_COLORS,
  DEPT_LABELS,
  DEPT_IDS,
  ROLE_TO_DEPT,
  COMPANY_HOLIDAYS_2026,
  COMPANY_HOLIDAYS_2025,
  STANDARD_CHECKIN,
  LATE_THRESHOLD,
  STANDARD_CHECKOUT,
  EARLY_THRESHOLD,
};
export type {
  AttendanceStatus,
  AttendanceRecord,
  MonthlyReport,
  YearlyReport,
  PayrollEntry,
  AuditEntry,
};

/** Lightweight staff-user shape used across attendance pages (replaces old STAFF_USERS mock constant). */
export interface StaffUser {
  id: string;
  name: string;
  role: string;
  departmentId?: string;
}

const BASE = "/saas/v1/attendance";

export class AttendanceService {
  // ── Year Data (real records only — no client-side fabrication) ────────────
  //
  // IMPORTANT: unlike the old mock/attendanceData.ts `loadYearData`, this method
  // does NOT fall back to generating deterministic fake demo data when the API
  // returns nothing. It simply returns whatever the server has (empty array if
  // no attendance has been recorded yet for that year). The old `generateYearData`
  // pseudo-random generator was deleted entirely, not preserved as an opt-in seed.

  static async getYearData(year: number): Promise<AttendanceRecord[]> {
    const data = await api.get<AttendanceRecord[]>(`${BASE}/year/${year}`);
    return data || [];
  }

  // ── Audit Log ──────────────────────────────────────────────────────────────

  static async getAuditLog(): Promise<AuditEntry[]> {
    const data = await api.get<AuditEntry[]>(`${BASE}/audit`);
    return data || [];
  }

  static async appendAuditEntry(entry: Omit<AuditEntry, "id">): Promise<AuditEntry> {
    return api.post<AuditEntry>(`${BASE}/audit`, entry);
  }

  // ── Staff / Dept Lookups (previously read mockUsers-derived STAFF_USERS) ──

  static async getStaffUsers(): Promise<StaffUser[]> {
    const users = await UserService.getAll();
    return users
      .filter((u) => u.role !== "client" && u.role !== "super_admin")
      .map((u) => ({ id: u.id, name: u.full_name || u.email, role: u.role, departmentId: u.departmentId }));
  }

  static async getUserDeptId(userId: string): Promise<string> {
    const staff = await AttendanceService.getStaffUsers();
    const u = staff.find((x) => x.id === userId);
    return u?.departmentId || ROLE_TO_DEPT[u?.role ?? ""] || "";
  }

  static async getUsersInDept(deptId: string): Promise<StaffUser[]> {
    const staff = await AttendanceService.getStaffUsers();
    return staff.filter((u) => (u.departmentId || ROLE_TO_DEPT[u.role] || "") === deptId);
  }

  // ── Self Check-in Log (src/pages/HR/Attendance.tsx) ───────────────────────
  //
  // A separate, independent CRUD from getYearData() above: this is the raw
  // daily check-in/check-out log (employee self check-in/out + super_admin
  // manual mark/edit/delete), previously localStorage "mock_attendance". It
  // reuses the same `AttendanceRecord`/`AttendanceStatus` shape as the yearly
  // report data since the two happen to be structurally identical, but hits
  // its own endpoint namespace and does NOT read/write the year-report data.
  // No client-side demo-seed is generated — returns whatever the API has.

  static async getSelfRecords(): Promise<AttendanceRecord[]> {
    const data = await api.get<AttendanceRecord[]>(`${BASE}/self`);
    return data || [];
  }

  static async createSelfRecord(entry: Omit<AttendanceRecord, "id">): Promise<AttendanceRecord> {
    return api.post<AttendanceRecord>(`${BASE}/self`, entry);
  }

  static async updateSelfRecord(id: string, patch: Partial<Omit<AttendanceRecord, "id">>): Promise<void> {
    await api.put(`${BASE}/self/${id}`, patch);
  }

  static async deleteSelfRecord(id: string): Promise<void> {
    await api.delete(`${BASE}/self/${id}`);
  }
}
