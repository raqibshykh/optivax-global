// Pure budget calculation logic — relocated verbatim from src/mock/budgetData.ts.
// No business rule/formula here has changed; only the data source changed (callers
// now pass in the records this used to read from localStorage directly).

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CompanyBudget {
  id: "master";
  totalAmount: number;
  fiscalYear: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName: string;
}

export interface DeptAllocation {
  id: string;
  department: string;
  adminId: string;
  adminName: string;
  allocatedAmount: number;
  purpose?: string;        // e.g. "Marketing Campaign", "Department Operations"
  effectiveDate?: string;  // YYYY-MM-DD
  allocatedAt: string;
  updatedAt: string;
  allocatedById: string;
  allocatedByName: string;
}

export interface MemberAllocation {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  allocatedAmount: number;
  usedAmount: number;
  allocatedById: string;
  allocatedByName: string;
  allocatedAt: string;
  updatedAt: string;
}

export type BudgetMasterAction =
  | "BUDGET_CREATED"
  | "BUDGET_UPDATED"
  | "BUDGET_INCREASED"
  | "BUDGET_REDUCED"
  | "BUDGET_RESET"
  | "BUDGET_REALLOCATED"
  | "BUDGET_PURPOSE_UPDATED"
  | "BUDGET_RETURNED"
  | "BUDGET_REQUEST_SUBMITTED"
  | "BUDGET_REQUEST_APPROVED"
  | "BUDGET_REQUEST_REJECTED"
  | "BUDGET_REQUEST_PARTIAL"
  | "DEPT_ALLOCATED"
  | "DEPT_ALLOCATION_UPDATED"
  | "MEMBER_ALLOCATED"
  | "MEMBER_ALLOCATION_UPDATED";

export type BudgetRequestStatus = "Pending" | "Approved" | "Rejected" | "Partially Approved";
export type BudgetRequestPriority = "Low" | "Medium" | "High" | "Critical";

export interface BudgetReturn {
  id: string;
  department: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  previousAllocated: number;
  returnedAmount: number;
  newAllocated: number;
  reason: string;
  notes?: string;
  timestamp: string;
}

export interface BudgetRequest {
  id: string;
  department: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  requestedAmount: number;
  approvedAmount: number;
  status: BudgetRequestStatus;
  priority: BudgetRequestPriority;
  justification: string;
  notes?: string;
  actionedById?: string;
  actionedByName?: string;
  actionNotes?: string;
  submittedAt: string;
  actionedAt?: string;
}

export interface BudgetAuditEntry {
  id: string;
  action: BudgetMasterAction;
  previousAmount: number;
  newAmount: number;
  performedById: string;
  performedByName: string;
  performedByRole: string;
  targetName?: string;
  department?: string;
  fromDepartment?: string;   // for BUDGET_REALLOCATED transfers
  toDepartment?: string;     // for BUDGET_REALLOCATED transfers
  purpose?: string;
  previousPurpose?: string;  // for BUDGET_PURPOSE_UPDATED
  timestamp: string;
  notes?: string;
}

// ── Backward-compat types (used by ManagementPanel / SalesPanel) ──────────────

export type BudgetStatus = "active" | "paused" | "closed" | "overspent";
export type BudgetCategory = "Operations" | "Marketing" | "Development" | "HR" | "Infrastructure" | "Sales" | "General";
export type BudgetAction = "create" | "increase" | "reduce" | "transfer_out" | "transfer_in" | "adjust" | "reallocate" | "edit" | "close" | "reopen" | "pause" | "note";

export interface Budget {
  id: string;
  name: string;
  department: string;
  category: BudgetCategory;
  assignedById: string;
  assignedByName: string;
  assignedToId: string;
  assignedToName: string;
  totalBudget: number;
  usedBudget: number;
  status: BudgetStatus;
  fiscalYear: string;
  purpose?: string;
  description?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  allocationDate?: string;
}

export interface BudgetAuditLog {
  id: string;
  budgetId: string;
  budgetName: string;
  action: BudgetAction;
  previousValue: number;
  newValue: number;
  changedById: string;
  changedByName: string;
  timestamp: string;
  reason: string;
}

// ── Computed Stats ─────────────────────────────────────────────────────────────

export interface BudgetMasterStats {
  totalAmount: number;
  totalAllocatedToDepts: number;
  totalUnallocated: number;
  totalUsedByMembers: number;
  totalRemainingForMembers: number;
  utilizationPct: number;
}

/**
 * Same formula as the original mock/budgetData.ts#getCompanyBudgetStats.
 * Previously read company budget / depts / members directly from localStorage;
 * now the caller (BudgetService) fetches those via API and passes them in.
 */
export function getCompanyBudgetStats(
  cb: CompanyBudget | null,
  depts: DeptAllocation[],
  members: MemberAllocation[]
): BudgetMasterStats {
  const totalAmount = cb?.totalAmount ?? 0;
  const totalAllocatedToDepts = depts.reduce((s, d) => s + d.allocatedAmount, 0);
  const totalUnallocated = totalAmount - totalAllocatedToDepts;
  const totalUsedByMembers = members.reduce((s, m) => s + m.usedAmount, 0);
  const totalMemberAllocated = members.reduce((s, m) => s + m.allocatedAmount, 0);
  const totalRemainingForMembers = totalMemberAllocated - totalUsedByMembers;
  const utilizationPct = totalAmount > 0 ? Math.round((totalUsedByMembers / totalAmount) * 100) : 0;

  return { totalAmount, totalAllocatedToDepts, totalUnallocated, totalUsedByMembers, totalRemainingForMembers, utilizationPct };
}

export interface DeptBudgetSummary {
  department: string;
  adminName: string;
  adminId: string;
  allocatedAmount: number;
  memberAllocatedTotal: number;
  usedTotal: number;
  remainingForAllocation: number;
  utilizationPct: number;
}

/**
 * Same formula as the original mock/budgetData.ts#getDeptBudgetSummaries.
 * Previously read depts / members directly from localStorage; now the caller
 * (BudgetService) fetches those via API and passes them in.
 */
export function getDeptBudgetSummaries(depts: DeptAllocation[], members: MemberAllocation[]): DeptBudgetSummary[] {
  return depts.map(d => {
    const deptMembers = members.filter(m => m.department === d.department);
    const memberAllocatedTotal = deptMembers.reduce((s, m) => s + m.allocatedAmount, 0);
    const usedTotal = deptMembers.reduce((s, m) => s + m.usedAmount, 0);
    const utilizationPct = d.allocatedAmount > 0 ? Math.round((usedTotal / d.allocatedAmount) * 100) : 0;
    return {
      department: d.department,
      adminName: d.adminName,
      adminId: d.adminId,
      allocatedAmount: d.allocatedAmount,
      memberAllocatedTotal,
      usedTotal,
      remainingForAllocation: d.allocatedAmount - memberAllocatedTotal,
      utilizationPct,
    };
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function deptFromRole(role: string): string {
  if (role.startsWith("sales")) return "Sales";
  if (role.startsWith("production")) return "Production";
  if (role.startsWith("marketing")) return "Marketing";
  if (role.startsWith("hr")) return "HR";
  if (role.startsWith("it")) return "IT Support";
  if (role === "management") return "Management";
  return "General";
}

// ── Legacy backward-compat stats (used by ManagementPanel / SalesPanel) ───────

export function getBudgetStats(budgets: Budget[]) {
  const total = budgets.reduce((s, b) => s + b.totalBudget, 0);
  const used = budgets.reduce((s, b) => s + b.usedBudget, 0);
  const remaining = total - used;
  const utilPct = total > 0 ? Math.round((used / total) * 100) : 0;
  const overspent = budgets.filter(b => b.status === "overspent").length;
  const active = budgets.filter(b => b.status === "active").length;
  return { total, used, remaining, utilPct, overspent, active, count: budgets.length };
}

export function computeStatus(b: { totalBudget: number; usedBudget: number; status: BudgetStatus }): BudgetStatus {
  if (b.status === "closed" || b.status === "paused") return b.status;
  return b.usedBudget > b.totalBudget ? "overspent" : "active";
}
