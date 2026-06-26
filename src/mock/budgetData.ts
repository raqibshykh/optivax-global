import { mockUsers } from "./users";

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

export type BudgetRequestStatus   = "Pending" | "Approved" | "Rejected" | "Partially Approved";
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

// ── Backward-compat types (used by ManagementPanel) ───────────────────────────

export type BudgetStatus   = "active" | "paused" | "closed" | "overspent";
export type BudgetCategory = "Operations" | "Marketing" | "Development" | "HR" | "Infrastructure" | "Sales" | "General";
export type BudgetAction   = "create" | "increase" | "reduce" | "transfer_out" | "transfer_in" | "adjust" | "reallocate" | "edit" | "close" | "reopen" | "pause" | "note";

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

// ── Storage keys ───────────────────────────────────────────────────────────────

const COMPANY_KEY  = "mock_company_budget";
const RETURNS_KEY  = "mock_budget_returns";
const REQUESTS_KEY = "mock_budget_requests";
const DEPT_KEY     = "mock_dept_allocations";
const MEMBER_KEY   = "mock_member_allocations";
const AUDIT_KEY    = "mock_budget_master_audit";

// ── Seeds ──────────────────────────────────────────────────────────────────────

function seedCompanyBudget(): CompanyBudget {
  return {
    id: "master",
    totalAmount: 5000000,
    fiscalYear: "FY2026",
    description: "OptiVax Global annual operating budget for FY2026, covering all departments and strategic initiatives.",
    createdAt: "2026-01-01T09:00:00Z",
    updatedAt: "2026-06-01T09:00:00Z",
    createdById: "u1",
    createdByName: "Super Admin",
  };
}

function seedDeptAllocations(): DeptAllocation[] {
  const now = "2026-01-15T09:00:00Z";
  return [
    { id: "da-sales",      department: "Sales",      adminId: "u8",  adminName: "James Carter",  allocatedAmount: 1000000, purpose: "Sales Operations & Client Acquisition", effectiveDate: "2026-01-15", allocatedAt: now, updatedAt: now, allocatedById: "u1", allocatedByName: "Super Admin" },
    { id: "da-marketing",  department: "Marketing",  adminId: "u10", adminName: "Olivia Brown",  allocatedAmount: 1000000, purpose: "Marketing Campaign",                    effectiveDate: "2026-01-15", allocatedAt: now, updatedAt: now, allocatedById: "u1", allocatedByName: "Super Admin" },
    { id: "da-production", department: "Production", adminId: "u9",  adminName: "David Chen",    allocatedAmount: 1000000, purpose: "Department Operations",                 effectiveDate: "2026-01-15", allocatedAt: now, updatedAt: now, allocatedById: "u1", allocatedByName: "Super Admin" },
    { id: "da-hr",         department: "HR",         adminId: "u11", adminName: "Ava Johnson",   allocatedAmount:  500000, purpose: "Employee Activities",                   effectiveDate: "2026-01-15", allocatedAt: now, updatedAt: now, allocatedById: "u1", allocatedByName: "Super Admin" },
    { id: "da-it",         department: "IT Support", adminId: "u16", adminName: "Ryan Patel",    allocatedAmount:  500000, purpose: "Software Subscription",                 effectiveDate: "2026-01-15", allocatedAt: now, updatedAt: now, allocatedById: "u1", allocatedByName: "Super Admin" },
  ];
}

function seedMemberAllocations(): MemberAllocation[] {
  const now = "2026-02-01T09:00:00Z";
  return [
    { id: "ma-u12", employeeId: "u12", employeeName: "Emma Wilson",     employeeRole: "sales_member",      department: "Sales",      allocatedAmount: 150000, usedAmount: 87500, allocatedById: "u8",  allocatedByName: "James Carter", allocatedAt: now, updatedAt: now },
    { id: "ma-u22", employeeId: "u22", employeeName: "Chris Nolan",     employeeRole: "sales_member",      department: "Sales",      allocatedAmount: 100000, usedAmount: 40000, allocatedById: "u8",  allocatedByName: "James Carter", allocatedAt: now, updatedAt: now },
    { id: "ma-u23", employeeId: "u23", employeeName: "Diana Prince",    employeeRole: "sales_member",      department: "Sales",      allocatedAmount: 120000, usedAmount: 55000, allocatedById: "u8",  allocatedByName: "James Carter", allocatedAt: now, updatedAt: now },
    { id: "ma-u14", employeeId: "u14", employeeName: "Noah Davis",      employeeRole: "marketing_member",  department: "Marketing",  allocatedAmount: 200000, usedAmount: 85000, allocatedById: "u10", allocatedByName: "Olivia Brown",  allocatedAt: now, updatedAt: now },
    { id: "ma-u20", employeeId: "u20", employeeName: "Alice Martins",   employeeRole: "marketing_member",  department: "Marketing",  allocatedAmount: 150000, usedAmount: 60000, allocatedById: "u10", allocatedByName: "Olivia Brown",  allocatedAt: now, updatedAt: now },
    { id: "ma-u21", employeeId: "u21", employeeName: "Ben Thompson",    employeeRole: "marketing_member",  department: "Marketing",  allocatedAmount: 100000, usedAmount: 30000, allocatedById: "u10", allocatedByName: "Olivia Brown",  allocatedAt: now, updatedAt: now },
    { id: "ma-u13", employeeId: "u13", employeeName: "Liam Park",       employeeRole: "production_member", department: "Production", allocatedAmount: 250000, usedAmount: 120000, allocatedById: "u9", allocatedByName: "David Chen",    allocatedAt: now, updatedAt: now },
    { id: "ma-u24", employeeId: "u24", employeeName: "Edgar Wright",    employeeRole: "production_member", department: "Production", allocatedAmount: 180000, usedAmount:  75000, allocatedById: "u9", allocatedByName: "David Chen",    allocatedAt: now, updatedAt: now },
    { id: "ma-u15", employeeId: "u15", employeeName: "Ethan Lee",       employeeRole: "hr_member",         department: "HR",         allocatedAmount: 120000, usedAmount:  62000, allocatedById: "u11", allocatedByName: "Ava Johnson",  allocatedAt: now, updatedAt: now },
    { id: "ma-u25", employeeId: "u25", employeeName: "Fiona Gallagher", employeeRole: "hr_member",         department: "HR",         allocatedAmount:  80000, usedAmount:  23000, allocatedById: "u11", allocatedByName: "Ava Johnson",  allocatedAt: now, updatedAt: now },
    { id: "ma-u26", employeeId: "u26", employeeName: "Sophia Kim",      employeeRole: "it_member",         department: "IT Support", allocatedAmount: 150000, usedAmount:  95000, allocatedById: "u16", allocatedByName: "Ryan Patel",   allocatedAt: now, updatedAt: now },
    { id: "ma-u27", employeeId: "u27", employeeName: "Marcus Bell",     employeeRole: "it_member",         department: "IT Support", allocatedAmount: 100000, usedAmount:  42000, allocatedById: "u16", allocatedByName: "Ryan Patel",   allocatedAt: now, updatedAt: now },
  ];
}

function seedAuditEntries(): BudgetAuditEntry[] {
  return [
    { id: "ba-001", action: "BUDGET_CREATED",          previousAmount: 0,        newAmount: 5000000, performedById: "u1", performedByName: "Super Admin", performedByRole: "super_admin", notes: "Initial company budget for FY2026",                  timestamp: "2026-01-01T09:00:00Z" },
    { id: "ba-002", action: "DEPT_ALLOCATED", previousAmount: 0, newAmount: 1000000, performedById: "u1", performedByName: "Super Admin", performedByRole: "super_admin", targetName: "James Carter",  department: "Sales",      purpose: "Sales Operations & Client Acquisition", notes: "FY2026 Sales department allocation",      timestamp: "2026-01-15T09:00:00Z" },
    { id: "ba-003", action: "DEPT_ALLOCATED", previousAmount: 0, newAmount: 1000000, performedById: "u1", performedByName: "Super Admin", performedByRole: "super_admin", targetName: "Olivia Brown", department: "Marketing",  purpose: "Marketing Campaign",                    notes: "FY2026 Marketing department allocation",  timestamp: "2026-01-15T09:05:00Z" },
    { id: "ba-004", action: "DEPT_ALLOCATED", previousAmount: 0, newAmount: 1000000, performedById: "u1", performedByName: "Super Admin", performedByRole: "super_admin", targetName: "David Chen",   department: "Production", purpose: "Department Operations",                 notes: "FY2026 Production department allocation", timestamp: "2026-01-15T09:10:00Z" },
    { id: "ba-005", action: "DEPT_ALLOCATED", previousAmount: 0, newAmount:  500000, performedById: "u1", performedByName: "Super Admin", performedByRole: "super_admin", targetName: "Ava Johnson",  department: "HR",         purpose: "Employee Activities",                   notes: "FY2026 HR department allocation",         timestamp: "2026-01-15T09:15:00Z" },
    { id: "ba-006", action: "DEPT_ALLOCATED", previousAmount: 0, newAmount:  500000, performedById: "u1", performedByName: "Super Admin", performedByRole: "super_admin", targetName: "Ryan Patel",   department: "IT Support", purpose: "Software Subscription",                 notes: "FY2026 IT department allocation",         timestamp: "2026-01-15T09:20:00Z" },
    { id: "ba-007", action: "MEMBER_ALLOCATED",         previousAmount: 0,        newAmount:  150000, performedById: "u8", performedByName: "James Carter",  performedByRole: "sales_admin",      targetName: "Emma Wilson",     department: "Sales",      notes: "Q1 allocation", timestamp: "2026-02-01T09:00:00Z" },
    { id: "ba-008", action: "MEMBER_ALLOCATED",         previousAmount: 0,        newAmount:  200000, performedById: "u10", performedByName: "Olivia Brown", performedByRole: "marketing_admin",  targetName: "Noah Davis",      department: "Marketing",  notes: "Q1 allocation", timestamp: "2026-02-01T09:05:00Z" },
    { id: "ba-009", action: "BUDGET_INCREASED",         previousAmount: 5000000,  newAmount: 5000000, performedById: "u1", performedByName: "Super Admin", performedByRole: "super_admin", notes: "No change — reviewed and confirmed",         timestamp: "2026-04-01T09:00:00Z" },
    { id: "ba-010", action: "DEPT_ALLOCATION_UPDATED",  previousAmount: 900000,   newAmount: 1000000, performedById: "u1", performedByName: "Super Admin", performedByRole: "super_admin", targetName: "James Carter",  department: "Sales",      notes: "Q2 top-up for Sales commission pool",     timestamp: "2026-04-15T10:00:00Z" },
  ];
}

// ── CRUD — Company Budget ──────────────────────────────────────────────────────

export function getCompanyBudget(): CompanyBudget | null {
  const raw = localStorage.getItem(COMPANY_KEY);
  if (raw) { try { return JSON.parse(raw) as CompanyBudget; } catch { /* fall through */ } }
  const seed = seedCompanyBudget();
  localStorage.setItem(COMPANY_KEY, JSON.stringify(seed));
  return seed;
}

export function saveCompanyBudget(b: CompanyBudget): void {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(b));
}

export function resetCompanyBudget(): void {
  localStorage.removeItem(COMPANY_KEY);
  localStorage.removeItem(DEPT_KEY);
  localStorage.removeItem(MEMBER_KEY);
}

// ── CRUD — Dept Allocations ────────────────────────────────────────────────────

export function getDeptAllocations(): DeptAllocation[] {
  const raw = localStorage.getItem(DEPT_KEY);
  if (raw) { try { return JSON.parse(raw) as DeptAllocation[]; } catch { /* fall through */ } }
  const seed = seedDeptAllocations();
  localStorage.setItem(DEPT_KEY, JSON.stringify(seed));
  return seed;
}

export function saveDeptAllocations(allocs: DeptAllocation[]): void {
  localStorage.setItem(DEPT_KEY, JSON.stringify(allocs));
}

export function getDeptAllocation(dept: string): DeptAllocation | undefined {
  return getDeptAllocations().find(d => d.department === dept);
}

// ── CRUD — Member Allocations ──────────────────────────────────────────────────

export function getMemberAllocations(): MemberAllocation[] {
  const raw = localStorage.getItem(MEMBER_KEY);
  if (raw) { try { return JSON.parse(raw) as MemberAllocation[]; } catch { /* fall through */ } }
  const seed = seedMemberAllocations();
  localStorage.setItem(MEMBER_KEY, JSON.stringify(seed));
  return seed;
}

export function saveMemberAllocations(allocs: MemberAllocation[]): void {
  localStorage.setItem(MEMBER_KEY, JSON.stringify(allocs));
}

export function getMemberAllocation(employeeId: string): MemberAllocation | undefined {
  return getMemberAllocations().find(m => m.employeeId === employeeId);
}

// ── CRUD — Audit Log ───────────────────────────────────────────────────────────

export function getBudgetAuditLog(): BudgetAuditEntry[] {
  const raw = localStorage.getItem(AUDIT_KEY);
  if (raw) { try { return JSON.parse(raw) as BudgetAuditEntry[]; } catch { /* fall through */ } }
  const seed = seedAuditEntries();
  localStorage.setItem(AUDIT_KEY, JSON.stringify(seed));
  return seed;
}

export function appendBudgetAuditEntry(entry: Omit<BudgetAuditEntry, "id" | "timestamp">): void {
  const logs = getBudgetAuditLog();
  const newEntry: BudgetAuditEntry = {
    ...entry,
    id: `ba-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const capped = [...logs, newEntry].slice(-1000);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(capped));
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

export function getCompanyBudgetStats(): BudgetMasterStats {
  const cb = getCompanyBudget();
  const depts = getDeptAllocations();
  const members = getMemberAllocations();

  const totalAmount          = cb?.totalAmount ?? 0;
  const totalAllocatedToDepts = depts.reduce((s, d) => s + d.allocatedAmount, 0);
  const totalUnallocated     = totalAmount - totalAllocatedToDepts;
  const totalUsedByMembers   = members.reduce((s, m) => s + m.usedAmount, 0);
  const totalMemberAllocated = members.reduce((s, m) => s + m.allocatedAmount, 0);
  const totalRemainingForMembers = totalMemberAllocated - totalUsedByMembers;
  const utilizationPct       = totalAmount > 0 ? Math.round((totalUsedByMembers / totalAmount) * 100) : 0;

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

export function getDeptBudgetSummaries(): DeptBudgetSummary[] {
  const depts = getDeptAllocations();
  const members = getMemberAllocations();

  return depts.map(d => {
    const deptMembers = members.filter(m => m.department === d.department);
    const memberAllocatedTotal = deptMembers.reduce((s, m) => s + m.allocatedAmount, 0);
    const usedTotal            = deptMembers.reduce((s, m) => s + m.usedAmount, 0);
    const utilizationPct       = d.allocatedAmount > 0 ? Math.round((usedTotal / d.allocatedAmount) * 100) : 0;
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
  if (role.startsWith("sales"))      return "Sales";
  if (role.startsWith("production")) return "Production";
  if (role.startsWith("marketing"))  return "Marketing";
  if (role.startsWith("hr"))         return "HR";
  if (role.startsWith("it"))         return "IT Support";
  if (role === "management")         return "Management";
  return "General";
}

export function getDeptAdminForDept(dept: string): { id: string; name: string } | undefined {
  return mockUsers
    .filter(u => u.role.endsWith("_admin") && deptFromRole(u.role) === dept)
    .map(u => ({ id: u.id, name: u.name }))[0];
}

export function getMembersForDept(dept: string): { id: string; name: string; role: string }[] {
  return mockUsers
    .filter(u => u.role.endsWith("_member") && deptFromRole(u.role) === dept)
    .map(u => ({ id: u.id, name: u.name, role: u.role }));
}

export function getAllDeptAdmins(): { id: string; name: string; role: string; dept: string }[] {
  return mockUsers
    .filter(u => u.role.endsWith("_admin") && u.role !== "super_admin" && u.role !== "management")
    .map(u => ({ id: u.id, name: u.name, role: u.role, dept: deptFromRole(u.role) }));
}

// ── CRUD — Budget Returns ──────────────────────────────────────────────────────

export function getBudgetReturns(): BudgetReturn[] {
  const raw = localStorage.getItem(RETURNS_KEY);
  if (raw) { try { return JSON.parse(raw) as BudgetReturn[]; } catch { /* fall through */ } }
  return [];
}

export function appendBudgetReturn(entry: Omit<BudgetReturn, "id" | "timestamp">): BudgetReturn {
  const all = getBudgetReturns();
  const newEntry: BudgetReturn = { ...entry, id: `br-${Date.now()}`, timestamp: new Date().toISOString() };
  localStorage.setItem(RETURNS_KEY, JSON.stringify([...all, newEntry]));
  return newEntry;
}

export function getBudgetReturnsByDept(dept: string): BudgetReturn[] {
  return getBudgetReturns().filter(r => r.department === dept);
}

// ── CRUD — Budget Requests ─────────────────────────────────────────────────────

export function getBudgetRequests(): BudgetRequest[] {
  const raw = localStorage.getItem(REQUESTS_KEY);
  if (raw) { try { return JSON.parse(raw) as BudgetRequest[]; } catch { /* fall through */ } }
  return [];
}

export function saveBudgetRequests(reqs: BudgetRequest[]): void {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(reqs));
}

export function appendBudgetRequest(entry: Omit<BudgetRequest, "id" | "submittedAt">): BudgetRequest {
  const all = getBudgetRequests();
  const newEntry: BudgetRequest = {
    ...entry,
    id:          `breq-${Date.now()}`,
    submittedAt: new Date().toISOString(),
  };
  saveBudgetRequests([...all, newEntry]);
  return newEntry;
}

export function updateBudgetRequest(id: string, patch: Partial<BudgetRequest>): void {
  const all = getBudgetRequests();
  const idx = all.findIndex(r => r.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch };
    saveBudgetRequests(all);
  }
}

export function getBudgetRequestsByDept(dept: string): BudgetRequest[] {
  return getBudgetRequests().filter(r => r.department === dept);
}

export function getPendingBudgetRequests(): BudgetRequest[] {
  return getBudgetRequests().filter(r => r.status === "Pending");
}

// ── Backward-compat shim for ManagementPanel ──────────────────────────────────

export function getBudgets(): Budget[] {
  const depts   = getDeptAllocations();
  const members = getMemberAllocations();
  return depts.map(d => {
    const used = members.filter(m => m.department === d.department).reduce((s, m) => s + m.usedAmount, 0);
    const status: BudgetStatus = used > d.allocatedAmount ? "overspent" : "active";
    return {
      id: d.id, name: `${d.department} Dept Budget`, department: d.department,
      category: "General" as BudgetCategory,
      assignedById: d.allocatedById, assignedByName: d.allocatedByName,
      assignedToId: d.adminId, assignedToName: d.adminName,
      totalBudget: d.allocatedAmount, usedBudget: used, status,
      fiscalYear: "FY2026", notes: "", createdAt: d.allocatedAt, updatedAt: d.updatedAt,
    };
  });
}

export function getBudgetStats(budgets: Budget[]) {
  const total     = budgets.reduce((s, b) => s + b.totalBudget, 0);
  const used      = budgets.reduce((s, b) => s + b.usedBudget, 0);
  const remaining = total - used;
  const utilPct   = total > 0 ? Math.round((used / total) * 100) : 0;
  const overspent = budgets.filter(b => b.status === "overspent").length;
  const active    = budgets.filter(b => b.status === "active").length;
  return { total, used, remaining, utilPct, overspent, active, count: budgets.length };
}

export function getAuditLogs(): BudgetAuditLog[] { return []; }
export function saveAuditLogs(_logs: BudgetAuditLog[]): void { /* no-op */ }
export function appendAuditLog(_entry: BudgetAuditLog): void { /* no-op */ }
export function getChangesThisMonth(_logs: BudgetAuditLog[]): number { return 0; }
export function computeStatus(b: { totalBudget: number; usedBudget: number; status: BudgetStatus }): BudgetStatus {
  if (b.status === "closed" || b.status === "paused") return b.status;
  return b.usedBudget > b.totalBudget ? "overspent" : "active";
}
export function saveBudgets(_budgets: Budget[]): void { /* no-op */ }
