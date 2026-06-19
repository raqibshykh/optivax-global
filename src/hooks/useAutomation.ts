import { api } from '../lib/client';

export interface AutomationWorkflow {
  id: string;
  name: string;
  trigger_event: string;
  enabled: boolean;
  callback_class: string;
  config?: Record<string, string | number | boolean>;
}

export const useAutomation = () => {
  const fetchWorkflows = async () => {
    const resp = await api.get<{ workflows: AutomationWorkflow[] }>('/saas/v1/automation/workflows');
    return resp.workflows;
  };

  const toggleWorkflow = async (id: string, enabled: boolean) => {
    await api.patch(`/saas/v1/automation/workflows/${id}`, { enabled });
    return true;
  };

  const createWorkflow = async (data: Partial<AutomationWorkflow>) => {
    const resp = await api.post<{ workflow: AutomationWorkflow }>('/saas/v1/automation/workflows', data);
    return resp.workflow;
  };

  return { fetchWorkflows, toggleWorkflow, createWorkflow };
};
