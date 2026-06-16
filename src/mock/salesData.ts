import { CampaignBudget, SalesTarget, SalesTask } from "../types";

export const SALES_MEMBERS = [
  { id: "u12", name: "Emma Wilson",  role: "sales_member" },
  { id: "u22", name: "Chris Nolan",  role: "sales_member" },
  { id: "u23", name: "Diana Prince", role: "sales_member" },
];

export const SALES_ADMIN_ID = "u8";
export const SALES_ADMIN_NAME = "James Carter";

const LS_CAMPAIGNS = "sales_campaigns";
const LS_TARGETS   = "sales_targets";
const LS_TASKS     = "sales_tasks";

// ── Default seed data ──────────────────────────────────────────────────────

const defaultCampaigns: CampaignBudget[] = [
  {
    id: "cb1",
    campaignName: "Q2 Digital Outreach",
    totalBudget: 50000,
    budgetSpent: 32500,
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    assignedMembers: ["u12", "u22"],
    status: "active",
    notes: "Focus on tech-sector SMBs via LinkedIn and targeted email drips",
    createdAt: "2026-04-01T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "cb2",
    campaignName: "Enterprise Acquisition Drive",
    totalBudget: 80000,
    budgetSpent: 45200,
    startDate: "2026-05-01",
    endDate: "2026-07-31",
    assignedMembers: ["u23", "u12"],
    status: "active",
    notes: "Target Fortune 500 accounts with dedicated account management approach",
    createdAt: "2026-04-28T10:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "cb3",
    campaignName: "SMB Growth Campaign",
    totalBudget: 30000,
    budgetSpent: 30000,
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    assignedMembers: ["u22", "u23"],
    status: "completed",
    notes: "Q1 SMB targeting — closed successfully with 112% ROI",
    createdAt: "2026-01-01T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "cb4",
    campaignName: "H2 Market Expansion",
    totalBudget: 100000,
    budgetSpent: 5000,
    startDate: "2026-07-01",
    endDate: "2026-12-31",
    assignedMembers: ["u12", "u22", "u23"],
    status: "planned",
    notes: "Second-half expansion into manufacturing and logistics verticals",
    createdAt: "2026-06-01T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
];

const defaultTargets: SalesTarget[] = [
  {
    id: "st1",
    memberId: "u12",
    memberName: "Emma Wilson",
    monthlyTarget: 45000,
    quarterlyTarget: 135000,
    annualTarget: 540000,
    achievedAmount: 38500,
    period: "2026-Q2",
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-06-10T14:00:00Z",
  },
  {
    id: "st2",
    memberId: "u22",
    memberName: "Chris Nolan",
    monthlyTarget: 35000,
    quarterlyTarget: 105000,
    annualTarget: 420000,
    achievedAmount: 41200,
    period: "2026-Q2",
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-06-10T14:00:00Z",
  },
  {
    id: "st3",
    memberId: "u23",
    memberName: "Diana Prince",
    monthlyTarget: 40000,
    quarterlyTarget: 120000,
    annualTarget: 480000,
    achievedAmount: 36800,
    period: "2026-Q2",
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-06-10T14:00:00Z",
  },
];

const defaultTasks: SalesTask[] = [
  {
    id: "stk1",
    title: "Follow up with Pearson Specter",
    description: "Send personalised follow-up email and schedule discovery call for the enterprise package",
    assignedTo: "u12",
    assignedName: "Emma Wilson",
    priority: "high",
    dueDate: "2026-06-20",
    status: "in-progress",
    estimatedValue: 50000,
    notes: "Client expressed strong interest in Q1. HOT lead.",
    createdAt: "2026-06-10T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "stk2",
    title: "Prepare enterprise proposal for Acme Corp",
    description: "Customise enterprise proposal deck with pricing, SLAs, and implementation timeline",
    assignedTo: "u22",
    assignedName: "Chris Nolan",
    priority: "high",
    dueDate: "2026-06-18",
    status: "todo",
    estimatedValue: 75000,
    notes: "Use the new proposal template from marketing.",
    createdAt: "2026-06-11T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "stk3",
    title: "Schedule product demo for Globex",
    description: "Coordinate with product team to arrange a live demo for Globex decision makers",
    assignedTo: "u23",
    assignedName: "Diana Prince",
    priority: "medium",
    dueDate: "2026-06-22",
    status: "todo",
    estimatedValue: 30000,
    notes: "Prefer morning slot — CFO travels in afternoons.",
    createdAt: "2026-06-11T10:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "stk4",
    title: "Send contract to Stark Industries",
    description: "Finalise and send MSA + SOW to legal contact at Stark Industries",
    assignedTo: "u12",
    assignedName: "Emma Wilson",
    priority: "high",
    dueDate: "2026-06-16",
    status: "done",
    estimatedValue: 45000,
    notes: "Signed — deal closed!",
    createdAt: "2026-06-09T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "stk5",
    title: "Cold outreach to 20 tech startups",
    description: "Identify and send personalised cold emails to 20 seed/Series-A startups in target vertical",
    assignedTo: "u22",
    assignedName: "Chris Nolan",
    priority: "low",
    dueDate: "2026-06-30",
    status: "in-progress",
    estimatedValue: 0,
    notes: "8 of 20 sent so far.",
    createdAt: "2026-06-12T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "stk6",
    title: "Renewal negotiation with Wayne Enterprises",
    description: "Lead renewal discussion, propose 20% upsell on advanced analytics module",
    assignedTo: "u23",
    assignedName: "Diana Prince",
    priority: "high",
    dueDate: "2026-06-25",
    status: "todo",
    estimatedValue: 120000,
    notes: "Contract expires June 30. Must close before EOQ.",
    createdAt: "2026-06-12T10:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "stk7",
    title: "Q2 pipeline review meeting preparation",
    description: "Compile pipeline data, win/loss summary, and forecast slide for leadership review",
    assignedTo: "u12",
    assignedName: "Emma Wilson",
    priority: "medium",
    dueDate: "2026-06-17",
    status: "done",
    estimatedValue: 0,
    createdAt: "2026-06-13T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
  {
    id: "stk8",
    title: "Competitive analysis report",
    description: "Research top 3 competitors and document pricing, feature gaps, and win/loss patterns",
    assignedTo: "u22",
    assignedName: "Chris Nolan",
    priority: "low",
    dueDate: "2026-06-28",
    status: "blocked",
    estimatedValue: 0,
    notes: "Blocked — waiting on access to Gartner research portal.",
    createdAt: "2026-06-13T09:00:00Z",
    createdBy: SALES_ADMIN_ID,
  },
];

// ── localStorage helpers ───────────────────────────────────────────────────

function load<T>(key: string, seed: T[]): T[] {
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as T[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

export function getCampaigns(): CampaignBudget[] {
  return load(LS_CAMPAIGNS, defaultCampaigns);
}
export function saveCampaigns(data: CampaignBudget[]) {
  localStorage.setItem(LS_CAMPAIGNS, JSON.stringify(data));
}

export function getTargets(): SalesTarget[] {
  return load(LS_TARGETS, defaultTargets);
}
export function saveTargets(data: SalesTarget[]) {
  localStorage.setItem(LS_TARGETS, JSON.stringify(data));
}

export function getSalesTasks(): SalesTask[] {
  return load(LS_TASKS, defaultTasks);
}
export function saveSalesTasks(data: SalesTask[]) {
  localStorage.setItem(LS_TASKS, JSON.stringify(data));
}
