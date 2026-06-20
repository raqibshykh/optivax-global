import { api } from "../lib/client";

export interface StripePaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  date: string;
  paidAt: string;
  paidByUserId?: string;
  method: string;
  transactionId: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  created_at: string;
}

const BASE = "/saas/v1/payments";

export class PaymentService {
  static async getAll(): Promise<StripePaymentRecord[]> {
    const data = await api.get<StripePaymentRecord[]>(`${BASE}/list`);
    return (data || []).filter((p) => p.stripePaymentIntentId);
  }

  static async getByInvoiceId(invoiceId: string): Promise<StripePaymentRecord[]> {
    const data = await api.get<StripePaymentRecord[]>(
      `${BASE}/list?invoiceId=${encodeURIComponent(invoiceId)}`
    );
    return (data || []).filter((p) => p.stripePaymentIntentId);
  }
}
