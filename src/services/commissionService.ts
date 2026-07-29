import { api } from "../lib/client";

export interface Commission {
  id: string;
  userId: string;
  userName: string;
  type: "percentage" | "fixed";
  value: number;
  projectId?: string;
  projectName?: string;
  invoiceId?: string;
  amount: number;
  status: "pending" | "approved" | "paid";
  notes?: string;
  createdAt: string;
}

const BASE = "/saas/v1/commissions";

export class CommissionService {
  static async getAll(params?: Record<string, string>): Promise<Commission[]> {
    const res = await api.get<{ commissions: Commission[] }>(BASE, { params });
    return res.commissions ?? [];
  }

  static async create(data: Omit<Commission, "id" | "createdAt">): Promise<Commission> {
    const res = await api.post<{ commission: Commission }>(BASE, data);
    return res.commission;
  }

  static async update(id: string, data: Partial<Commission>): Promise<Commission> {
    const res = await api.put<{ commission: Commission }>(BASE, { id, ...data });
    return res.commission;
  }

  static async delete(id: string): Promise<void> {
    await api.delete(BASE, { id });
  }
}
