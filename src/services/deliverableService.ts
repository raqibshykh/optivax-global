import { api } from "../lib/client";
import { Deliverable } from "../types";

const BASE = "/saas/v1/deliverables";

export class DeliverableService {
  static async getAll(): Promise<Deliverable[]> {
    const data = await api.get<Deliverable[]>(`${BASE}/list`);
    return data || [];
  }

  static async create(entry: Omit<Deliverable, "id">): Promise<Deliverable> {
    return api.post<Deliverable>(`${BASE}/create`, entry);
  }

  static async update(id: string, patch: Partial<Deliverable>): Promise<Deliverable> {
    return api.put<Deliverable>(`${BASE}/update`, { id, ...patch });
  }
}
