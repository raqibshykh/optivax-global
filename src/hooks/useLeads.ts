import { api } from '../lib/client';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'Lead' | 'Qualified' | 'Proposal Sent' | 'Won' | 'Lost';
}

/** Hook providing CRUD operations for leads */
export const useLeads = () => {
  const fetchLeads = async (params?: Record<string, any>) => {
    const response = await api.get<{ leads: Lead[] }>('/saas/v1/leads', { params });
    return response.leads;
  };

  const getLead = async (id: string) => {
    const response = await api.get<{ lead: Lead }>(`/saas/v1/leads/${id}`);
    return response.lead;
  };

  const createLead = async (data: Partial<Lead>) => {
    const response = await api.post<{ lead: Lead }>('/saas/v1/leads', data);
    return response.lead;
  };

  const updateLead = async (id: string, data: Partial<Lead>) => {
    const response = await api.put<{ lead: Lead }>(`/saas/v1/leads/${id}`, data);
    return response.lead;
  };

  const deleteLead = async (id: string) => {
    await api.delete(`/saas/v1/leads/${id}`);
    return true;
  };

  return { fetchLeads, getLead, createLead, updateLead, deleteLead };
};
