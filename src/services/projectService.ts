import { api } from "../lib/client";
import { Project } from "../types";

const BASE = "/saas/v1/projects";

export class ProjectService {
  static async getAll(assignedTo?: string): Promise<Project[]> {
    const url = assignedTo ? `${BASE}/list?assignedTo=${encodeURIComponent(assignedTo)}` : `${BASE}/list`;
    const data = await api.get<Project[]>(url);
    return data || [];
  }

  static async getById(id: string): Promise<Project | null> {
    const data = await api.get<Project[]>(`${BASE}/list?id=${encodeURIComponent(id)}`);
    return data?.[0] ?? null;
  }

  static async getByClientId(clientId: string): Promise<Project[]> {
    const data = await api.get<Project[]>(
      `${BASE}/list?clientId=${encodeURIComponent(clientId)}`
    );
    return data || [];
  }

  static async create(project: Omit<Project, "id">): Promise<Project> {
    return api.post<Project>(`${BASE}/create`, project);
  }

  static async update(id: string, updates: Partial<Project>): Promise<Project> {
    return api.put<Project>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
