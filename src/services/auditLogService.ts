import { AuditLog } from "../types";
import { safeParse } from "../lib/storage";

export const AUDIT_LOG_KEY = "optivax_audit_logs";

const readLogs = (): AuditLog[] =>
  safeParse<AuditLog[]>(localStorage.getItem(AUDIT_LOG_KEY), []);

const writeLogs = (logs: AuditLog[]) => {
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch {}
};

export class AuditLogService {
  static getAll(): AuditLog[] {
    return readLogs().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  static add(entry: Omit<AuditLog, "id" | "timestamp">): AuditLog {
    const log: AuditLog = {
      id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const existing = readLogs();
    // Keep last 2000 entries to avoid unbounded growth
    const trimmed = [log, ...existing].slice(0, 2000);
    writeLogs(trimmed);
    return log;
  }

  static getByEntityType(entityType: string): AuditLog[] {
    return readLogs()
      .filter((l) => l.entityType === entityType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static getByUser(userId: string): AuditLog[] {
    return readLogs()
      .filter((l) => l.performedBy === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static search(query: string, filters?: {
    entityType?: string;
    action?: string;
    performedByRole?: string;
    dateFrom?: string;
    dateTo?: string;
  }): AuditLog[] {
    const q = query.toLowerCase();
    return readLogs()
      .filter((l) => {
        if (filters?.entityType && l.entityType !== filters.entityType) return false;
        if (filters?.action && l.action !== filters.action) return false;
        if (filters?.performedByRole && l.performedByRole !== filters.performedByRole) return false;
        if (filters?.dateFrom && l.timestamp < filters.dateFrom) return false;
        if (filters?.dateTo && l.timestamp > filters.dateTo + "T23:59:59") return false;
        if (!q) return true;
        return (
          l.description.toLowerCase().includes(q) ||
          l.performedByName.toLowerCase().includes(q) ||
          l.entityName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static getRecent(limit = 20): AuditLog[] {
    return readLogs()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}
