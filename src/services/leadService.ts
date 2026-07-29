import { api } from "../lib/client";
import { Lead } from "../types";

const BASE = "/saas/v1/leads";

export class LeadService {
  static async getAll(filters?: { assignedTo?: string; status?: string }): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.assignedTo) params.set("assignedTo", filters.assignedTo);
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();
    const data = await api.get<{ leads: Lead[] }>(`${BASE}/list${qs ? `?${qs}` : ""}`);
    return data?.leads ?? [];
  }

  static async getById(id: string): Promise<Lead | null> {
    const data = await api.get<Lead>(`${BASE}/${encodeURIComponent(id)}`);
    return data ?? null;
  }

  static async create(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    const res = await api.post<{ lead: Lead }>(`${BASE}/create`, lead);
    return res.lead;
  }

  static async update(id: string, updates: Partial<Omit<Lead, 'id'>>): Promise<Lead> {
    const res = await api.put<{ lead: Lead }>(`${BASE}/${encodeURIComponent(id)}`, updates);
    return res.lead;
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`);
  }

  static async convert(leadId: string, convertedBy?: string, convertedByName?: string): Promise<Lead> {
    const res = await api.post<{ lead: Lead }>(`${BASE}/convert`, { leadId, convertedBy, convertedByName });
    return res.lead;
  }
}
