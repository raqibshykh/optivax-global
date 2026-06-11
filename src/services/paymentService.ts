import { api } from "../lib/client";

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  created_at: string;
  method: string;
  transactionId: string;
  notes?: string;
}

export interface CreatePaymentPayload {
  invoiceId: string;
  amount: number;
  method: string;
  notes?: string;
  transactionId?: string;
}

const BASE = "/saas/v1/payments";

export class PaymentService {
  static async getAll(): Promise<Payment[]> {
    const data = await api.get<Payment[]>(`${BASE}/list`);
    return data || [];
  }

  static async getByInvoiceId(invoiceId: string): Promise<Payment[]> {
    const data = await api.get<Payment[]>(
      `${BASE}/list?invoiceId=${encodeURIComponent(invoiceId)}`
    );
    return data || [];
  }

  /**
   * Creates a payment. The backend will:
   * 1. Insert the payment record.
   * 2. Sum all payments for the invoice → update paid_amount & remaining_balance.
   * 3. Set invoice status to 'paid' or 'partial'.
   * 4. Update the associated project's spent amount.
   */
  static async create(payload: CreatePaymentPayload): Promise<Payment> {
    return api.post<Payment>(`${BASE}/create`, payload);
  }
}
