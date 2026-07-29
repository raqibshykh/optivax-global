import { api } from "../lib/client";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

const BASE = "/saas/v1/organizations";

export class OrganizationService {
  static async getAll(): Promise<Organization[]> {
    const data = await api.get<Organization[]>(`${BASE}/list`);
    return data || [];
  }
}
