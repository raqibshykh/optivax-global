// User & Auth Types
export type UserRole =
  | "super_admin"
  | "management"
  | "sales_admin" | "sales_member"
  | "production_admin" | "production_member"
  | "marketing_admin" | "marketing_member"
  | "hr_admin" | "hr_member"
  | "it_admin" | "it_member"
  | "client";

export type PermissionDomain =
  | "sales" | "production" | "marketing" | "hr" | "it_support"
  | "clients" | "system" | "billing" | "reports"
  | "files" | "notifications" | "revisions" | "conversations" | "budget"
  | "payroll" | "salary_slips" | "advance_salary";

export type PermissionAction =
  | "VIEW" | "CREATE" | "EDIT" | "DELETE"
  | "EXPORT" | "APPROVE" | "ASSIGN";

// ── Core entity types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  designation?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  company?: string;
  companyName?: string;
  bio?: string;
  joinDate: string;
  lastLogin?: string;
  departmentId?: string;
}

export const DESIGNATIONS_BY_ROLE: Partial<Record<UserRole, string[]>> = {
  production_admin:  ["Production Manager", "Tech Lead", "Senior Developer"],
  production_member: ["Frontend Developer", "Backend Developer", "Designer", "SEO Specialist", "QA Engineer", "Full Stack Developer"],
  marketing_admin:   ["Marketing Manager", "Digital Marketing Lead"],
  marketing_member:  ["Social Media Manager", "Content Writer", "PPC Specialist", "SEO Analyst", "Graphic Designer"],
  sales_admin:       ["Sales Manager", "Business Development Manager"],
  sales_member:      ["Sales Executive", "Account Executive", "Business Development Executive"],
  hr_admin:          ["HR Manager", "HR Lead"],
  hr_member:         ["Recruiter", "HR Executive", "Payroll Specialist"],
  it_admin:          ["IT Manager", "IT Lead", "Systems Administrator"],
  it_member:         ["IT Support Specialist", "Help Desk Technician", "Network Engineer", "Systems Engineer", "Field Technician"],
  management:        ["Director", "VP", "C-Level Executive"],
};

export interface Department {
  id: string;
  name: string;
  headUserId?: string;
  memberCount: number;
  domain: PermissionDomain;
  description?: string;
}

export interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  departmentId: string;
  position: string;
  salary?: number;
  workMode: "onsite" | "remote" | "hybrid";
  joinDate: string;
  status: "active" | "inactive" | "on-leave";
  avatar?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  status: "active" | "inactive";
  joinDate: string;
  avatar?: string;
  totalProjects: number;
  totalBilled: number;
  lastPaymentDate?: string;
  tags?: string[];
  // StoredClient compatibility fields — auto-populated by mock server
  contactName?: string;
  companyName?: string;
  createdAt?: string;
  createdBy?: string;
  createdByName?: string;
  assignedProductionMembers?: string[];
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string;
  status: "not-started" | "in-progress" | "completed" | "on-hold";
  priority: "low" | "medium" | "high";
  startDate: string;
  deadline: string;
  assignedTo?: string[];
  progress: number;
  budget?: number;
  spent?: number;
  files: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  priority: "low" | "medium" | "high";
  assignedTo?: string;
  projectId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: string;
  estimated_value?: number;
  created_at: string;
  updated_at?: string;
}

// ── Financial types ────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  projectId?: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: InvoiceItem[];
  notes?: string;
  invoice_url?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;              // "usd"
  date: string;                  // YYYY-MM-DD
  paidAt: string;                // ISO timestamp
  paidByUserId?: string;         // client user ID
  method: "credit-card" | "bank-transfer" | "check" | "cash";
  transactionId: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  notes?: string;
  checkImageUrl?: string;
}

// ── Supporting types ───────────────────────────────────────────────────────

export type FileVisibility = "private" | "department" | "specific" | "project-team" | "client";

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedById?: string;
  uploaderDept?: string;
  uploadDate: string;
  projectId?: string;
  clientId?: string;
  url?: string;
  visibility?: FileVisibility;
  visibleTo?: string[];
}

export type NotificationType = "invoice" | "project" | "payment" | "system" | "profile";
export type NotificationModule =
  | "attendance" | "leave" | "payroll" | "advance" | "budget"
  | "employee" | "project" | "task" | "campaign" | "security"
  | "login" | "production" | "client" | "general" | "sales" | "message" | "ticket";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  module?: NotificationModule;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface Activity {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: string;
  targetId?: string;
  targetType?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  allDay?: boolean;
  type: "meeting" | "deadline" | "reminder" | "other";
  color?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalClients: number;
  totalProjects: number;
  pendingInvoices: number;
  completedProjects: number;
  activeUsers: number;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

// ── Email marketing types ──────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: "welcome" | "newsletter" | "reminder" | "custom";
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  templateId: string;
  status: "draft" | "scheduled" | "sent";
  scheduleDate?: string;
  sentDate?: string;
  audienceTags: string[];
  stats: { sent: number; opened: number; clicked: number };
  createdAt: string;
  updatedAt: string;
}

export interface EmailAutomation {
  id: string;
  name: string;
  triggerType: "new_client" | "invoice_overdue" | "project_complete";
  templateId: string;
  status: "active" | "inactive";
  delayHours: number;
  createdAt: string;
  updatedAt: string;
}

// ── Audit & Activity types ─────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  timestamp: string;
  description: string;
  department?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

// ── Deliverables types ─────────────────────────────────────────────────────

export type DeliverableStatus = "Pending" | "In Progress" | "Review" | "Approved" | "Delivered";

export interface Deliverable {
  id: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  title: string;
  description: string;
  status: DeliverableStatus;
  dueDate: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  fileUrl?: string;
  notes?: string;
}

// ── Stored Client (created by Sales Admin, with production assignment) ─────

export interface StoredClient {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  createdAt: string;
  createdBy: string;
  createdByName: string;
  assignedProductionMembers: string[];
}

// ── Sales Management types ─────────────────────────────────────────────────

export interface CampaignBudget {
  id: string;
  campaignName: string;
  totalBudget: number;
  budgetSpent: number;
  startDate: string;
  endDate: string;
  assignedMembers: string[]; // user IDs
  status: "active" | "completed" | "paused" | "planned";
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface SalesTarget {
  id: string;
  memberId: string;
  memberName: string;
  monthlyTarget: number;
  quarterlyTarget: number;
  annualTarget: number;
  achievedAmount: number;
  period: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // user ID
  assignedName: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  estimatedValue: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

// ── Social Media Tracking ──────────────────────────────────────────────────────

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "google_ads"
  | "other";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  trackingId: string;
  status: "active" | "inactive";
  createdAt: string;
  createdBy: string;
}

export interface SocialClickEvent {
  id: string;
  linkId: string;
  trackingId: string;
  platform: SocialPlatform;
  timestamp: string;
  visitorId: string;
  referrer: string;
  device: string;
  browser: string;
  sourceUrl: string;
}
