import { api } from "../lib/client";
import { CampaignBudget, SalesTarget, SalesTask } from "../types";

const CAMPAIGNS_BASE = "/saas/v1/sales/campaigns";
const TARGETS_BASE = "/saas/v1/sales/targets";
const TASKS_BASE = "/saas/v1/sales/tasks";

export class CampaignService {
  static async getAll(assignedTo?: string): Promise<CampaignBudget[]> {
    const url = assignedTo
      ? `${CAMPAIGNS_BASE}/list?assignedTo=${encodeURIComponent(assignedTo)}`
      : `${CAMPAIGNS_BASE}/list`;
    const data = await api.get<CampaignBudget[]>(url);
    return data || [];
  }

  static async getById(id: string): Promise<CampaignBudget | null> {
    const data = await api.get<CampaignBudget[]>(`${CAMPAIGNS_BASE}/list?id=${encodeURIComponent(id)}`);
    return data?.[0] ?? null;
  }

  static async create(campaign: Omit<CampaignBudget, "id">): Promise<CampaignBudget> {
    return api.post<CampaignBudget>(`${CAMPAIGNS_BASE}/create`, campaign);
  }

  static async update(id: string, updates: Partial<CampaignBudget>): Promise<CampaignBudget> {
    return api.put<CampaignBudget>(`${CAMPAIGNS_BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${CAMPAIGNS_BASE}/delete`, { id });
  }
}

export class SalesTargetService {
  static async getAll(memberId?: string): Promise<SalesTarget[]> {
    const url = memberId
      ? `${TARGETS_BASE}/list?memberId=${encodeURIComponent(memberId)}`
      : `${TARGETS_BASE}/list`;
    const data = await api.get<SalesTarget[]>(url);
    return data || [];
  }

  static async getById(id: string): Promise<SalesTarget | null> {
    const data = await api.get<SalesTarget[]>(`${TARGETS_BASE}/list?id=${encodeURIComponent(id)}`);
    return data?.[0] ?? null;
  }

  static async create(target: Omit<SalesTarget, "id">): Promise<SalesTarget> {
    return api.post<SalesTarget>(`${TARGETS_BASE}/create`, target);
  }

  static async update(id: string, updates: Partial<SalesTarget>): Promise<SalesTarget> {
    return api.put<SalesTarget>(`${TARGETS_BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${TARGETS_BASE}/delete`, { id });
  }
}

export class SalesTaskService {
  static async getAll(assignedTo?: string): Promise<SalesTask[]> {
    const url = assignedTo
      ? `${TASKS_BASE}/list?assignedTo=${encodeURIComponent(assignedTo)}`
      : `${TASKS_BASE}/list`;
    const data = await api.get<SalesTask[]>(url);
    return data || [];
  }

  static async getById(id: string): Promise<SalesTask | null> {
    const data = await api.get<SalesTask[]>(`${TASKS_BASE}/list?id=${encodeURIComponent(id)}`);
    return data?.[0] ?? null;
  }

  static async create(task: Omit<SalesTask, "id">): Promise<SalesTask> {
    return api.post<SalesTask>(`${TASKS_BASE}/create`, task);
  }

  static async update(id: string, updates: Partial<SalesTask>): Promise<SalesTask> {
    return api.put<SalesTask>(`${TASKS_BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${TASKS_BASE}/delete`, { id });
  }
}
