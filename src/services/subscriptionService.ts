import { api } from "../lib/client";

export interface Subscription {
  id: string;
  organization_id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  current_period_end: string;
}

const BASE = "/saas/v1/subscriptions";

export class SubscriptionService {
  static async getAll(): Promise<Subscription[]> {
    const data = await api.get<Subscription[]>(`${BASE}/list`);
    return data || [];
  }
}
