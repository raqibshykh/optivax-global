import { api } from "../lib/client";
import { Client } from "../types";

const BASE = "/saas/v1/clients";

export class ClientService {
  static async getAll(): Promise<Client[]> {
    const data = await api.get<Client[]>(`${BASE}/list`);
    return data || [];
  }

  static async getById(id: string): Promise<Client | null> {
    const data = await api.get<Client[]>(`${BASE}/list?id=${encodeURIComponent(id)}`);
    return data?.[0] ?? null;
  }

  static async create(client: Omit<Client, "id">): Promise<Client> {
    return api.post<Client>(`${BASE}/create`, client);
  }

  static async update(id: string, updates: Partial<Client>): Promise<Client> {
    return api.put<Client>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
