import { api } from "../lib/client";

export interface CompanyHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  year: number;
  label: string;
}

const BASE = "/saas/v1/company-holidays";

/**
 * Backs the now-live `company_holidays` table (seeded once from the prior hardcoded
 * COMPANY_HOLIDAYS_2026/_2025 arrays — see Migrator::seedCompanyHolidaysFromDefaults()).
 * `getDateList()` is the shape src/domain/attendance/calculations.ts's isCompanyHoliday()/
 * isWorkingDay() expect for their `liveHolidays` param.
 */
export class CompanyHolidayService {
  static async getAll(): Promise<CompanyHoliday[]> {
    const data = await api.get<CompanyHoliday[]>(`${BASE}/list`);
    return data || [];
  }

  static async getDateList(): Promise<string[]> {
    const holidays = await this.getAll();
    return holidays.map((h) => h.date);
  }

  static async create(holiday: Omit<CompanyHoliday, "id">): Promise<CompanyHoliday> {
    return api.post<CompanyHoliday>(`${BASE}/create`, holiday);
  }

  static async update(id: string, updates: Partial<CompanyHoliday>): Promise<CompanyHoliday> {
    return api.put<CompanyHoliday>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
