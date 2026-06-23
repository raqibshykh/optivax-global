export type BudgetStatus   = "active" | "paused" | "closed" | "overspent";
export type BudgetCategory = "Operations" | "Marketing" | "Development" | "HR" | "Infrastructure" | "Sales" | "General";
export type BudgetAction   =
  | "create" | "increase" | "reduce" | "transfer_out" | "transfer_in"
  | "adjust" | "reallocate" | "edit" | "close" | "reopen" | "pause" | "note";

export interface Budget {
  id: string;
  name: string;
  department: string;
  projectId?: string;
  projectName?: string;
  category: BudgetCategory;
  assignedById: string;
  assignedByName: string;
  assignedToId: string;
  assignedToName: string;
  totalBudget: number;
  usedBudget: number;
  status: BudgetStatus;
  fiscalYear: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
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
  relatedBudgetId?: string;
  relatedBudgetName?: string;
}

const BUDGET_KEY = "mock_budgets";
const AUDIT_KEY  = "mock_budget_audit_logs";

function seedBudgets(): Budget[] {
  return [
    {
      id: "bud-001", name: "Sales Operations Q3 2026", department: "Sales",
      category: "Sales", fiscalYear: "FY2026",
      assignedById: "u1", assignedByName: "Admin",
      assignedToId: "u4", assignedToName: "Omar Farooq",
      totalBudget: 150000, usedBudget: 87500, status: "active",
      notes: "Covers lead generation, CRM tools, team incentives and travel.",
      createdAt: "2026-04-01T09:00:00Z", updatedAt: "2026-06-15T14:00:00Z",
    },
    {
      id: "bud-002", name: "Digital Marketing Campaign Q3", department: "Marketing",
      category: "Marketing", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Rania Al-Sayed",
      assignedToId: "u9", assignedToName: "Layla Hassan",
      totalBudget: 50000, usedBudget: 32000, status: "active",
      notes: "Google Ads, LinkedIn, Instagram, and influencer partnerships.",
      createdAt: "2026-04-01T09:00:00Z", updatedAt: "2026-06-20T10:00:00Z",
    },
    {
      id: "bud-003", name: "Website Redesign Project", department: "Production",
      projectName: "TechCorp Website Redesign", category: "Development", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Rania Al-Sayed",
      assignedToId: "u14", assignedToName: "Yusuf Okafor",
      totalBudget: 80000, usedBudget: 45200, status: "active",
      notes: "Phase 1: design and catalog. Phase 2: full checkout (budgeted separately).",
      createdAt: "2026-04-15T09:00:00Z", updatedAt: "2026-06-18T09:00:00Z",
    },
    {
      id: "bud-004", name: "HR Recruitment Drive Q3", department: "HR",
      category: "HR", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Rania Al-Sayed",
      assignedToId: "u7", assignedToName: "Nina Patel",
      totalBudget: 25000, usedBudget: 18500, status: "active",
      notes: "Job boards, background checks, onboarding costs.",
      createdAt: "2026-05-01T09:00:00Z", updatedAt: "2026-06-10T11:00:00Z",
    },
    {
      id: "bud-005", name: "IT Infrastructure Upgrade", department: "IT Support",
      category: "Infrastructure", fiscalYear: "FY2026",
      assignedById: "u1", assignedByName: "Admin",
      assignedToId: "u16", assignedToName: "Sophia Kim",
      totalBudget: 120000, usedBudget: 95000, status: "active",
      notes: "ZKTeco biometric devices, network switches, server upgrades.",
      createdAt: "2026-03-01T09:00:00Z", updatedAt: "2026-06-22T08:00:00Z",
    },
    {
      id: "bud-006", name: "Enterprise Software Licensing FY2026", department: "Management",
      category: "Operations", fiscalYear: "FY2026",
      assignedById: "u1", assignedByName: "Admin",
      assignedToId: "u2", assignedToName: "Rania Al-Sayed",
      totalBudget: 200000, usedBudget: 180000, status: "active",
      notes: "CRM, ERP, project management, and cloud infrastructure licenses.",
      createdAt: "2026-01-01T09:00:00Z", updatedAt: "2026-06-01T09:00:00Z",
    },
    {
      id: "bud-007", name: "Social Media Brand Campaign", department: "Marketing",
      category: "Marketing", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Rania Al-Sayed",
      assignedToId: "u9", assignedToName: "Layla Hassan",
      totalBudget: 30000, usedBudget: 12000, status: "active",
      notes: "TikTok, Instagram Reels, YouTube unboxing series.",
      createdAt: "2026-06-01T09:00:00Z", updatedAt: "2026-06-19T14:00:00Z",
    },
    {
      id: "bud-008", name: "Client Onboarding System Dev", department: "Production",
      category: "Development", fiscalYear: "FY2026",
      assignedById: "u4", assignedByName: "Omar Farooq",
      assignedToId: "u14", assignedToName: "Yusuf Okafor",
      totalBudget: 60000, usedBudget: 5000, status: "active",
      notes: "New automated client onboarding portal. Kick-off June 2026.",
      createdAt: "2026-06-10T09:00:00Z", updatedAt: "2026-06-10T09:00:00Z",
    },
    {
      id: "bud-009", name: "Annual Operations Reserve", department: "Management",
      category: "General", fiscalYear: "FY2026",
      assignedById: "u1", assignedByName: "Admin",
      assignedToId: "u2", assignedToName: "Rania Al-Sayed",
      totalBudget: 500000, usedBudget: 230000, status: "active",
      notes: "Emergency and discretionary reserve. Released in tranches per quarter.",
      createdAt: "2026-01-01T09:00:00Z", updatedAt: "2026-04-01T09:00:00Z",
    },
    {
      id: "bud-010", name: "Employee Training Program Q2", department: "HR",
      category: "HR", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Rania Al-Sayed",
      assignedToId: "u7", assignedToName: "Nina Patel",
      totalBudget: 40000, usedBudget: 40200, status: "overspent",
      notes: "External trainer fees exceeded estimate. Q3 top-up pending approval.",
      createdAt: "2026-04-01T09:00:00Z", updatedAt: "2026-06-12T16:00:00Z",
    },
    {
      id: "bud-011", name: "Sales Team Commission Pool Q3", department: "Sales",
      category: "Sales", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Rania Al-Sayed",
      assignedToId: "u4", assignedToName: "Omar Farooq",
      totalBudget: 75000, usedBudget: 22000, status: "active",
      notes: "Performance-based commission payouts for sales team Q3.",
      createdAt: "2026-06-01T09:00:00Z", updatedAt: "2026-06-01T09:00:00Z",
    },
    {
      id: "bud-012", name: "Content Creation & SEO FY2026", department: "Marketing",
      category: "Marketing", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Rania Al-Sayed",
      assignedToId: "u9", assignedToName: "Layla Hassan",
      totalBudget: 35000, usedBudget: 35000, status: "paused",
      notes: "Fully utilized. Paused pending FY2027 renewal decision.",
      createdAt: "2026-01-01T09:00:00Z", updatedAt: "2026-06-01T09:00:00Z",
    },
  ];
}

function seedAuditLogs(): BudgetAuditLog[] {
  return [
    {
      id: "al-001", budgetId: "bud-001", budgetName: "Sales Operations Q3 2026",
      action: "create", previousValue: 0, newValue: 150000,
      changedById: "u1", changedByName: "Admin",
      timestamp: "2026-04-01T09:00:00Z", reason: "Initial budget allocation for Q3 sales operations.",
    },
    {
      id: "al-002", budgetId: "bud-001", budgetName: "Sales Operations Q3 2026",
      action: "increase", previousValue: 150000, newValue: 150000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-05-10T11:00:00Z", reason: "Additional trade show budget approved by management.",
    },
    {
      id: "al-003", budgetId: "bud-002", budgetName: "Digital Marketing Campaign Q3",
      action: "create", previousValue: 0, newValue: 50000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-04-01T09:00:00Z", reason: "Q3 digital marketing campaign budget.",
    },
    {
      id: "al-004", budgetId: "bud-003", budgetName: "Website Redesign Project",
      action: "create", previousValue: 0, newValue: 80000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-04-15T09:00:00Z", reason: "TechCorp website redesign project budget.",
    },
    {
      id: "al-005", budgetId: "bud-005", budgetName: "IT Infrastructure Upgrade",
      action: "increase", previousValue: 100000, newValue: 120000,
      changedById: "u1", changedByName: "Admin",
      timestamp: "2026-05-20T10:00:00Z", reason: "Additional ZKTeco device procurement approved.",
    },
    {
      id: "al-006", budgetId: "bud-006", budgetName: "Enterprise Software Licensing FY2026",
      action: "create", previousValue: 0, newValue: 200000,
      changedById: "u1", changedByName: "Admin",
      timestamp: "2026-01-01T09:00:00Z", reason: "Annual software licensing budget for FY2026.",
    },
    {
      id: "al-007", budgetId: "bud-010", budgetName: "Employee Training Program Q2",
      action: "create", previousValue: 0, newValue: 40000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-04-01T09:00:00Z", reason: "Q2 employee training and development budget.",
    },
    {
      id: "al-008", budgetId: "bud-010", budgetName: "Employee Training Program Q2",
      action: "adjust", previousValue: 40000, newValue: 40000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-06-12T16:00:00Z", reason: "Budget reviewed — overspend of $200 due to external trainer overtime. Flagged for Q3 top-up.",
    },
    {
      id: "al-009", budgetId: "bud-007", budgetName: "Social Media Brand Campaign",
      action: "transfer_in", previousValue: 25000, newValue: 30000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-06-05T14:00:00Z", reason: "Transferred from Content Creation budget to fund additional influencer partnerships.",
      relatedBudgetId: "bud-012", relatedBudgetName: "Content Creation & SEO FY2026",
    },
    {
      id: "al-010", budgetId: "bud-012", budgetName: "Content Creation & SEO FY2026",
      action: "transfer_out", previousValue: 40000, newValue: 35000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-06-05T14:00:00Z", reason: "Transferred $5,000 to Social Media Brand Campaign for influencer partnerships.",
      relatedBudgetId: "bud-007", relatedBudgetName: "Social Media Brand Campaign",
    },
    {
      id: "al-011", budgetId: "bud-012", budgetName: "Content Creation & SEO FY2026",
      action: "pause", previousValue: 35000, newValue: 35000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-06-01T09:00:00Z", reason: "Budget fully utilized. Pausing until FY2027 planning is complete.",
    },
    {
      id: "al-012", budgetId: "bud-009", budgetName: "Annual Operations Reserve",
      action: "reduce", previousValue: 500000, newValue: 500000,
      changedById: "u1", changedByName: "Admin",
      timestamp: "2026-04-01T09:00:00Z", reason: "Q2 tranche released to department budgets.",
    },
    {
      id: "al-013", budgetId: "bud-004", budgetName: "HR Recruitment Drive Q3",
      action: "increase", previousValue: 20000, newValue: 25000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-05-15T09:00:00Z", reason: "Additional headcount approved — engineering team expansion.",
    },
    {
      id: "al-014", budgetId: "bud-008", budgetName: "Client Onboarding System Dev",
      action: "create", previousValue: 0, newValue: 60000,
      changedById: "u4", changedByName: "Omar Farooq",
      timestamp: "2026-06-10T09:00:00Z", reason: "New client onboarding portal development budget.",
    },
    {
      id: "al-015", budgetId: "bud-011", budgetName: "Sales Team Commission Pool Q3",
      action: "create", previousValue: 0, newValue: 75000,
      changedById: "u2", changedByName: "Rania Al-Sayed",
      timestamp: "2026-06-01T09:00:00Z", reason: "Q3 performance commission pool for sales team.",
    },
  ];
}

export function getBudgets(): Budget[] {
  const raw = localStorage.getItem(BUDGET_KEY);
  if (raw) { try { return JSON.parse(raw) as Budget[]; } catch { /* fall through */ } }
  const seed = seedBudgets();
  localStorage.setItem(BUDGET_KEY, JSON.stringify(seed));
  return seed;
}

export function saveBudgets(budgets: Budget[]): void {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

export function getAuditLogs(): BudgetAuditLog[] {
  const raw = localStorage.getItem(AUDIT_KEY);
  if (raw) { try { return JSON.parse(raw) as BudgetAuditLog[]; } catch { /* fall through */ } }
  const seed = seedAuditLogs();
  localStorage.setItem(AUDIT_KEY, JSON.stringify(seed));
  return seed;
}

export function saveAuditLogs(logs: BudgetAuditLog[]): void {
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
}

export function appendAuditLog(entry: BudgetAuditLog): void {
  const logs = getAuditLogs();
  saveAuditLogs([...logs, entry]);
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

export function getChangesThisMonth(logs: BudgetAuditLog[]): number {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  return logs.filter(l => {
    const d = new Date(l.timestamp);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;
}

export function computeStatus(b: { totalBudget: number; usedBudget: number; status: BudgetStatus }): BudgetStatus {
  if (b.status === "closed" || b.status === "paused") return b.status;
  if (b.usedBudget > b.totalBudget) return "overspent";
  return "active";
}
