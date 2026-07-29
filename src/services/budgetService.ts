import { api } from "../lib/client";
import { UserService } from "./userService";
import {
  deptFromRole,
  getBudgetStats,
  computeStatus,
  getCompanyBudgetStats,
  getDeptBudgetSummaries,
  type CompanyBudget,
  type DeptAllocation,
  type MemberAllocation,
  type BudgetAuditEntry,
  type BudgetMasterAction,
  type BudgetReturn,
  type BudgetRequest,
  type BudgetRequestStatus,
  type BudgetRequestPriority,
  type Budget,
  type BudgetCategory,
  type BudgetStatus,
  type BudgetAuditLog,
  type BudgetAction,
  type DeptBudgetSummary,
  type BudgetMasterStats,
} from "../domain/budget/calculations";

// Re-export types + pure calculation helpers so consumers only need one import
// (`services/budgetService`) instead of reaching into `domain/budget/calculations`.
export {
  deptFromRole,
  getBudgetStats,
  computeStatus,
  getCompanyBudgetStats,
  getDeptBudgetSummaries,
};
export type {
  CompanyBudget,
  DeptAllocation,
  MemberAllocation,
  BudgetAuditEntry,
  BudgetMasterAction,
  BudgetReturn,
  BudgetRequest,
  BudgetRequestStatus,
  BudgetRequestPriority,
  Budget,
  BudgetCategory,
  BudgetStatus,
  BudgetAuditLog,
  BudgetAction,
  DeptBudgetSummary,
  BudgetMasterStats,
};

const BASE = "/saas/v1/budget";

export class BudgetService {
  // ── Company Budget ─────────────────────────────────────────────────────────

  static async getCompanyBudget(): Promise<CompanyBudget | null> {
    const data = await api.get<CompanyBudget | null>(`${BASE}/company`);
    return data ?? null;
  }

  static async saveCompanyBudget(b: CompanyBudget): Promise<void> {
    await api.put(`${BASE}/company`, b);
  }

  /** Resets the company budget AND all department/member allocations. */
  static async resetCompanyBudget(): Promise<void> {
    await api.delete(`${BASE}/company/reset`);
  }

  // ── Dept Allocations ───────────────────────────────────────────────────────

  static async getDeptAllocations(): Promise<DeptAllocation[]> {
    const data = await api.get<DeptAllocation[]>(`${BASE}/departments`);
    return data || [];
  }

  static async saveDeptAllocations(allocs: DeptAllocation[]): Promise<void> {
    await api.put(`${BASE}/departments`, { allocations: allocs });
  }

  static async getDeptAllocation(dept: string): Promise<DeptAllocation | undefined> {
    const all = await BudgetService.getDeptAllocations();
    return all.find((d) => d.department === dept);
  }

  // ── Member Allocations ─────────────────────────────────────────────────────

  static async getMemberAllocations(): Promise<MemberAllocation[]> {
    const data = await api.get<MemberAllocation[]>(`${BASE}/members`);
    return data || [];
  }

  static async saveMemberAllocations(allocs: MemberAllocation[]): Promise<void> {
    await api.put(`${BASE}/members`, { allocations: allocs });
  }

  static async getMemberAllocation(employeeId: string): Promise<MemberAllocation | undefined> {
    const all = await BudgetService.getMemberAllocations();
    return all.find((m) => m.employeeId === employeeId);
  }

  // ── Audit Log ──────────────────────────────────────────────────────────────

  static async getBudgetAuditLog(): Promise<BudgetAuditEntry[]> {
    const data = await api.get<BudgetAuditEntry[]>(`${BASE}/audit`);
    return data || [];
  }

  static async appendBudgetAuditEntry(entry: Omit<BudgetAuditEntry, "id" | "timestamp">): Promise<BudgetAuditEntry> {
    return api.post<BudgetAuditEntry>(`${BASE}/audit`, entry);
  }

  // ── Company Unallocated (caps budget-request approval amounts) ────────────

  static async getCompanyUnallocated(): Promise<number> {
    const [cb, depts] = await Promise.all([BudgetService.getCompanyBudget(), BudgetService.getDeptAllocations()]);
    const totalAllocated = depts.reduce((s, d) => s + d.allocatedAmount, 0);
    return Math.max(0, (cb?.totalAmount ?? 0) - totalAllocated);
  }

  // ── Dept-Admin / Member Lookups (previously read mockUsers directly) ──────

  static async getDeptAdminForDept(dept: string): Promise<{ id: string; name: string } | undefined> {
    const users = await UserService.getAll();
    return users
      .filter((u) => u.role.endsWith("_admin") && deptFromRole(u.role) === dept)
      .map((u) => ({ id: u.id, name: u.full_name || u.email }))[0];
  }

  static async getMembersForDept(dept: string): Promise<{ id: string; name: string; role: string }[]> {
    const users = await UserService.getAll();
    return users
      .filter((u) => u.role.endsWith("_member") && deptFromRole(u.role) === dept)
      .map((u) => ({ id: u.id, name: u.full_name || u.email, role: u.role }));
  }

  static async getAllDeptAdmins(): Promise<{ id: string; name: string; role: string; dept: string }[]> {
    const users = await UserService.getAll();
    return users
      .filter((u) => u.role.endsWith("_admin") && u.role !== "super_admin" && u.role !== "management")
      .map((u) => ({ id: u.id, name: u.full_name || u.email, role: u.role, dept: deptFromRole(u.role) }));
  }

  // ── Budget Returns ─────────────────────────────────────────────────────────

  static async getBudgetReturns(): Promise<BudgetReturn[]> {
    const data = await api.get<BudgetReturn[]>(`${BASE}/returns`);
    return data || [];
  }

  static async appendBudgetReturn(entry: Omit<BudgetReturn, "id" | "timestamp">): Promise<BudgetReturn> {
    return api.post<BudgetReturn>(`${BASE}/returns`, entry);
  }

  static async getBudgetReturnsByDept(dept: string): Promise<BudgetReturn[]> {
    const all = await BudgetService.getBudgetReturns();
    return all.filter((r) => r.department === dept);
  }

  // ── Budget Requests ────────────────────────────────────────────────────────

  static async getBudgetRequests(): Promise<BudgetRequest[]> {
    const data = await api.get<BudgetRequest[]>(`${BASE}/requests`);
    return data || [];
  }

  static async saveBudgetRequests(reqs: BudgetRequest[]): Promise<void> {
    await api.put(`${BASE}/requests`, { requests: reqs });
  }

  static async appendBudgetRequest(entry: Omit<BudgetRequest, "id" | "submittedAt">): Promise<BudgetRequest> {
    return api.post<BudgetRequest>(`${BASE}/requests`, entry);
  }

  static async updateBudgetRequest(id: string, patch: Partial<BudgetRequest>): Promise<void> {
    await api.put(`${BASE}/requests`, { id, ...patch });
  }

  static async getBudgetRequestsByDept(dept: string): Promise<BudgetRequest[]> {
    const all = await BudgetService.getBudgetRequests();
    return all.filter((r) => r.department === dept);
  }

  static async getPendingBudgetRequests(): Promise<BudgetRequest[]> {
    const all = await BudgetService.getBudgetRequests();
    return all.filter((r) => r.status === "Pending");
  }

  // ── Backward-compat shim for ManagementPanel / SalesPanel ─────────────────
  // NOTE: mock/budgetData.ts still exports the original sync versions of these —
  // SalesPanel.tsx (owned by a different concurrent task) continues to import
  // from there unchanged. This async version is for newly-migrated consumers.

  static async getBudgets(): Promise<Budget[]> {
    const [depts, members] = await Promise.all([BudgetService.getDeptAllocations(), BudgetService.getMemberAllocations()]);
    return depts.map((d) => {
      const used = members.filter((m) => m.department === d.department).reduce((s, m) => s + m.usedAmount, 0);
      const status: BudgetStatus = used > d.allocatedAmount ? "overspent" : "active";
      return {
        id: d.id,
        name: `${d.department} Dept Budget`,
        department: d.department,
        category: "General" as BudgetCategory,
        assignedById: d.allocatedById,
        assignedByName: d.allocatedByName,
        assignedToId: d.adminId,
        assignedToName: d.adminName,
        totalBudget: d.allocatedAmount,
        usedBudget: used,
        status,
        fiscalYear: "FY2026",
        notes: "",
        createdAt: d.allocatedAt,
        updatedAt: d.updatedAt,
      };
    });
  }

  static async getAuditLogs(): Promise<BudgetAuditLog[]> {
    return [];
  }
  static async saveAuditLogs(_logs: BudgetAuditLog[]): Promise<void> {
    /* no-op — preserved from mock/budgetData.ts for parity */
  }
  static async appendAuditLog(_entry: BudgetAuditLog): Promise<void> {
    /* no-op — preserved from mock/budgetData.ts for parity */
  }
  static getChangesThisMonth(_logs: BudgetAuditLog[]): number {
    return 0;
  }
  static async saveBudgets(_budgets: Budget[]): Promise<void> {
    /* no-op — preserved from mock/budgetData.ts for parity */
  }
}
