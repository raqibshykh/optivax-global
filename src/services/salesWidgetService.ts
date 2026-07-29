import { api } from "../lib/client";

// Small, self-contained data set backing the quick-glance widgets on
// SalesPanel.tsx (leads/deals/commissions). Distinct from the full Lead
// domain (src/services/leadService.ts, src/pages/Sales/Leads.tsx) and the
// full Commission domain (src/services/commissionService.ts) — "deals" in
// particular has no equivalent anywhere else in the app.

export interface SalesLead { id: string; name: string; email: string; company: string; status: "New" | "Contacted" | "Qualified" | "Lost"; estimated_value: number; }
export interface SalesDeal { id: string; title: string; client: string; amount: number; stage: "Proposal" | "Negotiation" | "Won" | "Lost"; }
export interface SalesCommission { id: string; amount: number; deal_id: string; status: "Pending" | "Paid"; date: string; }

const BASE = "/saas/v1/sales-widget";

export class SalesWidgetService {
  static async getLeads(): Promise<SalesLead[]> {
    const data = await api.get<SalesLead[]>(`${BASE}/leads`);
    return data || [];
  }

  static async createLead(lead: Omit<SalesLead, "id">): Promise<SalesLead> {
    return api.post<SalesLead>(`${BASE}/leads`, lead);
  }

  static async getDeals(): Promise<SalesDeal[]> {
    const data = await api.get<SalesDeal[]>(`${BASE}/deals`);
    return data || [];
  }

  static async getCommissions(): Promise<SalesCommission[]> {
    const data = await api.get<SalesCommission[]>(`${BASE}/commissions`);
    return data || [];
  }
}
