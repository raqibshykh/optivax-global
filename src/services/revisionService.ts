import { api } from "../lib/client";

const BASE = "/saas/v1/revisions";

export interface Revision {
  id: string;
  projectId: string;
  clientId: string;
  comment: string;
  status: string;
  created_at: string;
  type?: string;
  updatedBy?: string;
}

export class RevisionService {
  static async getAll(filters?: { clientId?: string; projectId?: string }): Promise<Revision[]> {
    const params = new URLSearchParams();
    if (filters?.clientId) params.set("clientId", filters.clientId);
    if (filters?.projectId) params.set("projectId", filters.projectId);
    const qs = params.toString();
    const data = await api.get<Revision[]>(`${BASE}/list${qs ? `?${qs}` : ""}`);
    return data || [];
  }

  static async create(entry: Omit<Revision, "id" | "created_at" | "status"> & { status?: string }): Promise<Revision> {
    return api.post<Revision>(`${BASE}/create`, entry);
  }

  static async update(id: string, patch: Partial<Revision>): Promise<Revision | null> {
    const data = await api.put<Revision | null>(`${BASE}/update`, { id, ...patch });
    return data ?? null;
  }
}
