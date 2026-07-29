import { api } from "../lib/client";

const BASE = "/saas/v1/hr/employee-extra";

/**
 * Per-employee salary-override / leave / work-mode defaults.
 * Superset of the various narrower local `EmployeeExtraData` interfaces each
 * consuming page declares for itself — `extraDeduction` is only used by
 * HR/Payroll.tsx, everyone else omits it.
 */
export interface EmployeeExtraData {
  userId: string;
  leavesTaken: number;
  salary: number;
  extraDeduction?: number;
  salaryStatus: "Paid" | "Unpaid";
  workMode: "Onsite" | "Remote";
}

export class EmployeeExtraService {
  static async getAll(): Promise<Record<string, EmployeeExtraData>> {
    const data = await api.get<Record<string, EmployeeExtraData>>(BASE);
    return data || {};
  }

  /** Upserts the extra-data record for a single employee. */
  static async update(
    employeeId: string,
    patch: Partial<Omit<EmployeeExtraData, "userId">>
  ): Promise<void> {
    await api.put(`${BASE}/${employeeId}`, patch);
  }

  /** Bulk overwrite — used by "Mark All Paid". */
  static async saveAll(record: Record<string, EmployeeExtraData>): Promise<void> {
    await api.put(BASE, record);
  }
}
