import { api } from "../lib/client";
import type { PermissionDomain } from "../types";

export interface Department {
  id: string;
  name: string;
  domain: PermissionDomain;
  code?: string | null;
  status?: "active" | "inactive";
  defaultShiftId?: string | null;
  headUserId?: string;
  description?: string;
  createdAt: string;
  memberCount?: number;
}

const BASE = "/saas/v1/departments";

export class DepartmentService {
  static async getAll(): Promise<Department[]> {
    const data = await api.get<Department[]>(`${BASE}/list`);
    return data || [];
  }

  static async create(dept: Omit<Department, "id" | "createdAt">): Promise<Department> {
    return api.post<Department>(`${BASE}/create`, dept);
  }

  static async update(id: string, updates: Partial<Department>): Promise<Department> {
    return api.put<Department>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
