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
  taskId?: string;
  taskName?: string;
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
      assignedById: "u1", assignedByName: "Super Admin",
      assignedToId: "u8", assignedToName: "James Carter",
      totalBudget: 150000, usedBudget: 87500, status: "active",
      purpose: "Sales Operations — Q3 2026",
      description: "Covers lead generation tools, CRM subscriptions, team incentives, and client acquisition travel for Q3.",
      allocationDate: "2026-04-01",
      notes: "Covers lead generation, CRM tools, team incentives and travel.",
      createdAt: "2026-04-01T09:00:00Z", updatedAt: "2026-06-15T14:00:00Z",
    },
    {
      id: "bud-002", name: "Digital Marketing Campaign Q3", department: "Marketing",
      category: "Marketing", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Sarah Mitchell",
      assignedToId: "u10", assignedToName: "Olivia Brown",
      totalBudget: 50000, usedBudget: 32000, status: "active",
      purpose: "Digital Marketing Campaign — Q3 2026",
      description: "Google Ads, LinkedIn Sponsored, Instagram placements, and influencer partnership fees for Q3 campaign.",
      allocationDate: "2026-04-01",
      notes: "Google Ads, LinkedIn, Instagram, and influencer partnerships.",
      createdAt: "2026-04-01T09:00:00Z", updatedAt: "2026-06-20T10:00:00Z",
    },
    {
      id: "bud-003", name: "Website Redesign Project", department: "Production",
      projectName: "TechCorp Website Redesign", category: "Development", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Sarah Mitchell",
      assignedToId: "u9", assignedToName: "David Chen",
      totalBudget: 80000, usedBudget: 45200, status: "active",
      purpose: "TechCorp Website Redesign — Phase 1",
      description: "Phase 1 covers UX design, front-end development, and product catalog integration. Phase 2 (checkout) is budgeted separately.",
      allocationDate: "2026-04-15",
      notes: "Phase 1: design and catalog. Phase 2: full checkout (budgeted separately).",
      createdAt: "2026-04-15T09:00:00Z", updatedAt: "2026-06-18T09:00:00Z",
    },
    {
      id: "bud-004", name: "HR Recruitment Drive Q3", department: "HR",
      category: "HR", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Sarah Mitchell",
      assignedToId: "u11", assignedToName: "Ava Johnson",
      totalBudget: 25000, usedBudget: 18500, status: "active",
      purpose: "Q3 Recruitment Drive — Engineering & Operations",
      description: "Job board listings, applicant background checks, technical assessment tools, and new-hire onboarding expenses.",
      allocationDate: "2026-05-01",
      notes: "Job boards, background checks, onboarding costs.",
      createdAt: "2026-05-01T09:00:00Z", updatedAt: "2026-06-10T11:00:00Z",
    },
    {
      id: "bud-005", name: "IT Infrastructure Upgrade", department: "IT Support",
      category: "Infrastructure", fiscalYear: "FY2026",
      assignedById: "u1", assignedByName: "Super Admin",
      assignedToId: "u16", assignedToName: "Sophia Kim",
      totalBudget: 120000, usedBudget: 95000, status: "active",
      purpose: "IT Infrastructure Modernization FY2026",
      description: "Procurement and installation of ZKTeco biometric terminals, managed network switches, and server capacity upgrades across all offices.",
      allocationDate: "2026-03-01",
      notes: "ZKTeco biometric devices, network switches, server upgrades.",
      createdAt: "2026-03-01T09:00:00Z", updatedAt: "2026-06-22T08:00:00Z",
    },
    {
      id: "bud-006", name: "Enterprise Software Licensing FY2026", department: "Management",
      category: "Operations", fiscalYear: "FY2026",
      assignedById: "u1", assignedByName: "Super Admin",
      assignedToId: "u2", assignedToName: "Sarah Mitchell",
      totalBudget: 200000, usedBudget: 180000, status: "active",
      purpose: "Enterprise SaaS Licensing — FY2026",
      description: "Annual license renewals for CRM (Salesforce), ERP (SAP), project management (Jira/Confluence), and cloud infrastructure (AWS, Cloudflare).",
      allocationDate: "2026-01-01",
      notes: "CRM, ERP, project management, and cloud infrastructure licenses.",
      createdAt: "2026-01-01T09:00:00Z", updatedAt: "2026-06-01T09:00:00Z",
    },
    {
      id: "bud-007", name: "Social Media Brand Campaign", department: "Marketing",
      category: "Marketing", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Sarah Mitchell",
      assignedToId: "u10", assignedToName: "Olivia Brown",
      totalBudget: 30000, usedBudget: 12000, status: "active",
      purpose: "Social Media Brand Awareness Campaign — Jun–Sep 2026",
      description: "Short-form video content for TikTok and Instagram Reels, YouTube unboxing series, and sponsored posts.",
      allocationDate: "2026-06-01",
      notes: "TikTok, Instagram Reels, YouTube unboxing series.",
      createdAt: "2026-06-01T09:00:00Z", updatedAt: "2026-06-19T14:00:00Z",
    },
    {
      id: "bud-008", name: "Client Onboarding System Dev", department: "Production",
      category: "Development", fiscalYear: "FY2026",
      assignedById: "u8", assignedByName: "James Carter",
      assignedToId: "u9", assignedToName: "David Chen",
      totalBudget: 60000, usedBudget: 5000, status: "active",
      purpose: "Automated Client Onboarding Portal — Kick-off June 2026",
      description: "Build and deploy a self-service client onboarding portal including KYC flow, document upload, and automated welcome sequences.",
      allocationDate: "2026-06-10",
      notes: "New automated client onboarding portal. Kick-off June 2026.",
      createdAt: "2026-06-10T09:00:00Z", updatedAt: "2026-06-10T09:00:00Z",
    },
    {
      id: "bud-009", name: "Annual Operations Reserve", department: "Management",
      category: "General", fiscalYear: "FY2026",
      assignedById: "u1", assignedByName: "Super Admin",
      assignedToId: "u2", assignedToName: "Sarah Mitchell",
      totalBudget: 500000, usedBudget: 230000, status: "active",
      purpose: "FY2026 Emergency & Discretionary Reserve",
      description: "Held by management for emergency operational needs, unplanned department top-ups, and strategic opportunities. Released in quarterly tranches.",
      allocationDate: "2026-01-01",
      notes: "Emergency and discretionary reserve. Released in tranches per quarter.",
      createdAt: "2026-01-01T09:00:00Z", updatedAt: "2026-04-01T09:00:00Z",
    },
    {
      id: "bud-010", name: "Employee Training Program Q2", department: "HR",
      category: "HR", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Sarah Mitchell",
      assignedToId: "u11", assignedToName: "Ava Johnson",
      totalBudget: 40000, usedBudget: 40200, status: "overspent",
      purpose: "Q2 Employee Training & Development",
      description: "External trainer fees, workshop materials, e-learning platform subscriptions, and certification exam vouchers for Q2 cohort.",
      allocationDate: "2026-04-01",
      notes: "External trainer fees exceeded estimate. Q3 top-up pending approval.",
      createdAt: "2026-04-01T09:00:00Z", updatedAt: "2026-06-12T16:00:00Z",
    },
    {
      id: "bud-011", name: "Sales Team Commission Pool Q3", department: "Sales",
      category: "Sales", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Sarah Mitchell",
      assignedToId: "u8", assignedToName: "James Carter",
      totalBudget: 75000, usedBudget: 22000, status: "active",
      purpose: "Q3 Sales Commission Pool — Performance Payouts",
      description: "Performance-based commission payouts for sales team hitting Q3 targets. Distributed monthly based on individual deal closures.",
      allocationDate: "2026-06-01",
      notes: "Performance-based commission payouts for sales team Q3.",
      createdAt: "2026-06-01T09:00:00Z", updatedAt: "2026-06-01T09:00:00Z",
    },
    {
      id: "bud-012", name: "Content Creation & SEO FY2026", department: "Marketing",
      category: "Marketing", fiscalYear: "FY2026",
      assignedById: "u2", assignedByName: "Sarah Mitchell",
      assignedToId: "u10", assignedToName: "Olivia Brown",
      totalBudget: 35000, usedBudget: 35000, status: "paused",
      purpose: "Content Creation & SEO — FY2026",
      description: "Blog content production, SEO audit and optimization, backlink outreach, and keyword research tools. Fully utilized — pending FY2027 renewal.",
      allocationDate: "2026-01-01",
      notes: "Fully utilized. Paused pending FY2027 renewal decision.",
      createdAt: "2026-01-01T09:00:00Z", updatedAt: "2026-06-01T09:00:00Z",
    },
    // ── Member-assigned budgets ─────────────────────────────────────────────
    {
      id: "bud-013", name: "Facebook Ads Campaign — June 2026", department: "Sales",
      category: "Sales", fiscalYear: "FY2026",
      assignedById: "u8", assignedByName: "James Carter",
      assignedToId: "u12", assignedToName: "Emma Wilson",
      totalBudget: 50000, usedBudget: 18000, status: "active",
      purpose: "Facebook Ads Campaign — June 2026",
      description: "Budget allocated for Meta Ads Manager, creative production, audience targeting, and lead generation campaign running June–July 2026.",
      allocationDate: "2026-06-01",
      notes: "Focus on lead-gen campaigns for Optivax product line. Track CPL weekly.",
      createdAt: "2026-06-01T09:00:00Z", updatedAt: "2026-06-20T11:00:00Z",
    },
    {
      id: "bud-014", name: "Product Demo Video Production", department: "Production",
      category: "Development", fiscalYear: "FY2026",
      assignedById: "u9", assignedByName: "David Chen",
      assignedToId: "u13", assignedToName: "Liam Park",
      totalBudget: 35000, usedBudget: 12500, status: "active",
      purpose: "Product Demo Video Series — Q3 2026",
      description: "Script writing, studio time, video editing, and post-production for 5-part product demonstration series for the Optivax CRM platform.",
      allocationDate: "2026-06-05",
      notes: "Deliver 5 videos by end of August. Include voiceover and captions.",
      createdAt: "2026-06-05T09:00:00Z", updatedAt: "2026-06-18T14:00:00Z",
    },
    {
      id: "bud-015", name: "Influencer Partnership Campaign", department: "Marketing",
      category: "Marketing", fiscalYear: "FY2026",
      assignedById: "u10", assignedByName: "Olivia Brown",
      assignedToId: "u14", assignedToName: "Noah Davis",
      totalBudget: 25000, usedBudget: 8000, status: "active",
      purpose: "Influencer & Creator Partnership — Jun–Aug 2026",
      description: "Coordinate and pay 10 micro-influencers across Instagram and TikTok for sponsored content promoting Optivax's new product launch.",
      allocationDate: "2026-06-10",
      notes: "Briefs sent. Contracts to be signed by June 30. Track engagement metrics.",
      createdAt: "2026-06-10T09:00:00Z", updatedAt: "2026-06-22T09:00:00Z",
    },
    {
      id: "bud-016", name: "Staff Wellness & Training Fund", department: "HR",
      category: "HR", fiscalYear: "FY2026",
      assignedById: "u11", assignedByName: "Ava Johnson",
      assignedToId: "u15", assignedToName: "Ethan Lee",
      totalBudget: 20000, usedBudget: 4500, status: "active",
      purpose: "Staff Wellness & Skills Development — Q3 2026",
      description: "Budget for employee wellness initiatives, mental health resources, soft-skills workshops, and professional certification reimbursements for the HR department.",
      allocationDate: "2026-06-15",
      notes: "Coordinate with team leads for individual training plans. Receipts required for reimbursement.",
      createdAt: "2026-06-15T09:00:00Z", updatedAt: "2026-06-22T10:00:00Z",
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
