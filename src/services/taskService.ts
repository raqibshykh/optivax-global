import { api } from "../lib/client";
import type { Task } from "../types";

const BASE = "/saas/v1/tasks";

export class TaskService {
  static async getAll(params?: Record<string, string | number | boolean>): Promise<Task[]> {
    return api.get<Task[]>(BASE, { params });
  }

  static async getById(id: string): Promise<Task | null> {
    const tasks = await api.get<Task[]>(`${BASE}?id=${encodeURIComponent(id)}`);
    return tasks?.[0] ?? null;
  }

  static async create(data: Omit<Task, "id" | "createdAt">): Promise<Task> {
    return api.post<Task>(BASE, { ...data, createdAt: new Date().toISOString() });
  }

  static async update(id: string, data: Partial<Omit<Task, "id" | "createdAt">>): Promise<Task> {
    return api.put<Task>(`${BASE}/${id}`, { ...data, updatedAt: new Date().toISOString() });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }
}
