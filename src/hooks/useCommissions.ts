import { api } from '../lib/client';

export interface Commission {
  id: string;
  userId: string;
  type: 'percentage' | 'fixed';
  value: number;
  projectId?: string;
  invoiceId?: string;
  amount: number;
}

/** Read‑only hook for commissions */
export const useCommissions = () => {
  const fetchCommissions = async (params?: Record<string, any>) => {
    const response = await api.get<{ commissions: Commission[] }>('/saas/v1/commissions', { params });
    return response.commissions;
  };

  const getCommission = async (id: string) => {
    const response = await api.get<{ commission: Commission }>(`/saas/v1/commissions/${id}`);
    return response.commission;
  };

  return { fetchCommissions, getCommission };
};
