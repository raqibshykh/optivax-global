import { api } from "../lib/client";

import { EmailTemplate, EmailCampaign, EmailAutomation } from "../types";

const BASE = "/saas/v1/email";

export class EmailService {
  // ── Templates ──────────────────────────────────────────────
  static async getTemplates(): Promise<EmailTemplate[]> {
    const data = await api.get<EmailTemplate[]>(`${BASE}/templates/list`);
    return data || [];
  }

  static async createTemplate(t: Omit<EmailTemplate, "id">): Promise<EmailTemplate> {
    return api.post<EmailTemplate>(`${BASE}/templates/create`, t);
  }

  static async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    return api.put<EmailTemplate>(`${BASE}/templates/update`, { id, ...updates });
  }

  static async deleteTemplate(id: string): Promise<void> {
    await api.delete(`${BASE}/templates/delete`, { id });
  }

  // ── Campaigns ──────────────────────────────────────────────
  static async getCampaigns(): Promise<EmailCampaign[]> {
    const data = await api.get<EmailCampaign[]>(`${BASE}/campaigns/list`);
    return data || [];
  }

  static async createCampaign(c: Omit<EmailCampaign, "id">): Promise<EmailCampaign> {
    return api.post<EmailCampaign>(`${BASE}/campaigns/create`, c);
  }

  static async updateCampaign(id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign> {
    return api.put<EmailCampaign>(`${BASE}/campaigns/update`, { id, ...updates });
  }

  static async deleteCampaign(id: string): Promise<void> {
    await api.delete(`${BASE}/campaigns/delete`, { id });
  }

  // ── Automations ─────────────────────────────────────────────
  static async getAutomations(): Promise<EmailAutomation[]> {
    const data = await api.get<EmailAutomation[]>(`${BASE}/automations/list`);
    return data || [];
  }

  static async createAutomation(a: Omit<EmailAutomation, "id">): Promise<EmailAutomation> {
    return api.post<EmailAutomation>(`${BASE}/automations/create`, a);
  }

  static async updateAutomation(id: string, updates: Partial<EmailAutomation>): Promise<EmailAutomation> {
    return api.put<EmailAutomation>(`${BASE}/automations/update`, { id, ...updates });
  }
}
