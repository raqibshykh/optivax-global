import { api } from "../lib/client";

const BASE = "/saas/v1/marketing-campaigns";

export interface MarketingCampaign {
  id: string;
  name: string;
  platform: string;
  status: "Active" | "Draft" | "Completed";
  budget: number;
  spent: number;
  createdBy?: string;
  linkedTaskId?: string;
}

export class MarketingCampaignService {
  static async getAll(): Promise<MarketingCampaign[]> {
    const data = await api.get<MarketingCampaign[]>(BASE);
    return data || [];
  }

  static async create(campaign: Omit<MarketingCampaign, "id">): Promise<MarketingCampaign> {
    return api.post<MarketingCampaign>(BASE, campaign);
  }

  static async update(id: string, updates: Partial<MarketingCampaign>): Promise<MarketingCampaign> {
    return api.put<MarketingCampaign>(`${BASE}/${id}`, updates);
  }
}
