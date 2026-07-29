import { api } from "../lib/client";

export interface DepartmentShift {
  id: string;
  departmentId: string;
  shiftName: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  graceMinutes: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt?: string | null;
}

const BASE = "/saas/v1/shifts";

export class ShiftService {
  static async getAll(): Promise<DepartmentShift[]> {
    const data = await api.get<DepartmentShift[]>(`${BASE}/list`);
    return data || [];
  }

  static async create(shift: Omit<DepartmentShift, "id" | "createdAt" | "updatedAt">): Promise<DepartmentShift> {
    return api.post<DepartmentShift>(`${BASE}/create`, shift);
  }

  static async update(id: string, updates: Partial<DepartmentShift>): Promise<DepartmentShift> {
    return api.put<DepartmentShift>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
