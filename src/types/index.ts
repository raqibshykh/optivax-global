// User & Auth Types
export type UserRole = "super_admin" | "management" | "sales_admin" | "production_admin" | "marketing_admin" | "hr_admin" | "client";

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
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

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

// Client Types
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
}

// Project Types
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

// Invoice Types
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

// Payment Types
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: "credit-card" | "bank-transfer" | "check";
  transactionId: string;
  notes?: string;
}

// File Types
export interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadDate: string;
  projectId?: string;
  clientId?: string;
  url?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: "invoice" | "project" | "payment" | "system" | "profile";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

// Activity Types
export interface Activity {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: string;
  targetId?: string;
  targetType?: string;
}

// Calendar Event Types
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

// Dashboard Stats
export interface DashboardStats {
  totalRevenue: number;
  totalClients: number;
  totalProjects: number;
  pendingInvoices: number;
  completedProjects: number;
  activeUsers: number;
}

// Toast Types
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

// Email Marketing Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string; // Stored as HTML or rich text JSON
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
  audienceTags: string[]; // empty means all clients
  stats: {
    sent: number;
    opened: number;
    clicked: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmailAutomation {
  id: string;
  name: string;
  triggerType: "new_client" | "invoice_overdue" | "project_complete";
  templateId: string;
  status: "active" | "inactive";
  delayHours: number; // 0 = immediate
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  source?: string;
  status?: string;
  estimated_value?: number;
  created_at: string;
  updated_at?: string;
}
