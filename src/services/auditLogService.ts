import { api } from "../lib/client";
import { AuditLog } from "../types";

const BASE = "/saas/v1/audit-logs";

export interface AuditLogSearchFilters {
  entityType?: string;
  action?: string;
  performedByRole?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class AuditLogService {
  static async getAll(): Promise<AuditLog[]> {
    const data = await api.get<AuditLog[]>(`${BASE}/list`);
    return data || [];
  }

  /**
   * Always a best-effort side-effect write fired alongside an already-
   * authorized action (see AuditLogController::create()'s doc comment) —
   * never the primary request a caller is waiting on. Marked `background`
   * so a stray 401 here can't blow away an otherwise-valid session.
   */
  static async add(entry: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
    return api.post<AuditLog>(`${BASE}/create`, entry, { background: true });
  }

  static async getByEntityType(entityType: string): Promise<AuditLog[]> {
    const data = await api.get<AuditLog[]>(`${BASE}/list?entityType=${encodeURIComponent(entityType)}`);
    return data || [];
  }

  static async getByUser(userId: string): Promise<AuditLog[]> {
    const data = await api.get<AuditLog[]>(`${BASE}/list?performedBy=${encodeURIComponent(userId)}`);
    return data || [];
  }

  static async search(query: string, filters?: AuditLogSearchFilters): Promise<AuditLog[]> {
    const data = await api.get<AuditLog[]>(`${BASE}/search`, { params: { q: query, ...filters } });
    return data || [];
  }

  static async getRecent(limit = 20): Promise<AuditLog[]> {
    const data = await api.get<AuditLog[]>(`${BASE}/list`, { params: { limit } });
    return data || [];
  }
}
