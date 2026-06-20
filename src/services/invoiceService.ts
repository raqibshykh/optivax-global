import { api } from "../lib/client";
import { Invoice } from "../types";

const BASE = "/saas/v1/invoices";

export class InvoiceService {
  static async getAll(assignedTo?: string): Promise<Invoice[]> {
    const url = assignedTo ? `${BASE}/list?assignedTo=${encodeURIComponent(assignedTo)}` : `${BASE}/list`;
    const data = await api.get<Invoice[]>(url);
    return data || [];
  }

  static async getById(id: string): Promise<Invoice | null> {
    const data = await api.get<Invoice[]>(`${BASE}/list?id=${encodeURIComponent(id)}`);
    return data?.[0] ?? null;
  }

  static async getByClientId(clientId: string): Promise<Invoice[]> {
    const data = await api.get<Invoice[]>(
      `${BASE}/list?clientId=${encodeURIComponent(clientId)}`
    );
    return data || [];
  }

  static async create(invoice: Omit<Invoice, "id" | "number">): Promise<Invoice> {
    return api.post<Invoice>(`${BASE}/generate`, invoice);
  }

  static async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    return api.put<Invoice>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }

  static async updateStatus(id: string, status: Invoice["status"]): Promise<Invoice> {
    return this.update(id, { status });
  }

  static async stripeConfirm(payload: {
    invoiceId: string;
    stripePaymentIntentId: string;
    stripeChargeId: string;
    amount: number;
    currency: string;
    paidByUserId: string;
    cardholderName?: string;
  }): Promise<{ invoice: Invoice; payment: unknown }> {
    return api.post(`${BASE}/stripe-confirm`, payload);
  }
}
