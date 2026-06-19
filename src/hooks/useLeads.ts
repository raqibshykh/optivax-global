import { api } from '../lib/client';
import { useAuth } from '../context/AuthContext';
import type { Lead } from '../types';

export const useLeads = () => {
  const { user } = useAuth();

  const fetchLeads = async (params?: Record<string, string | number | boolean>) => {
    const finalParams = { ...(params || {}) };
    if (user?.role?.endsWith("_member") && !finalParams.assignedTo) {
      finalParams.assignedTo = user.id;
    }
    const response = await api.get<{ leads: Lead[] }>('/saas/v1/leads', { params: finalParams });
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
