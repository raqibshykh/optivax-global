import { api } from "../lib/client";

export interface Invoice {
  id: string;
  client_id: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string; // ISO date
  created_at: string;
}

/** Hook providing CRUD operations for invoices */
export const useBilling = () => {
  const fetchInvoices = async (params?: Record<string, any>) => {
    const res = await api.get<{ invoices: Invoice[] }>('/saas/v1/invoices', { params });
    return res.invoices;
  };

  const getInvoice = async (id: string) => {
    const res = await api.get<{ invoice: Invoice }>(`/saas/v1/invoices/${id}`);
    return res.invoice;
  };

  const createInvoice = async (data: Partial<Invoice>) => {
    const res = await api.post<{ invoice: Invoice }>('/saas/v1/invoices', data);
    return res.invoice;
  };

  const updateInvoice = async (id: string, data: Partial<Invoice>) => {
    const res = await api.put<{ invoice: Invoice }>(`/saas/v1/invoices/${id}`, data);
    return res.invoice;
  };

  const deleteInvoice = async (id: string) => {
    await api.delete(`/saas/v1/invoices/${id}`);
    return true;
  };

  return { fetchInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice };
}
