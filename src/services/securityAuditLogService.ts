import { api } from "../lib/client";

export interface SecurityAuditLogEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  actorRole: string | null;
  targetUserId: string | null;
  status: "success" | "failure";
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SecurityAuditLogFilters {
  action?: string;
  actorUserId?: string;
  targetUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

// Super-admin-only, read-only trail of auth/user-management events — see
// wordpress-backend SecurityAuditLogController's doc comment. Distinct from
// AuditLogService, which backs the general business-activity log.
export class SecurityAuditLogService {
  static async list(filters: SecurityAuditLogFilters = {}): Promise<SecurityAuditLogEntry[]> {
    return api.get<SecurityAuditLogEntry[]>("/saas/v1/security-audit-logs/list", {
      params: filters as Record<string, unknown>,
    });
  }
}
