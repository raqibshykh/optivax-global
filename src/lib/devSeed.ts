// Synchronous mock-data seeder — runs at module-load time via client.ts.
// Every key is written only when the key is absent, so real user edits are never clobbered.
// In production Vite replaces import.meta.env.DEV with false and tree-shakes this file.

import { mockUsers } from "../mock/users";

type AnyObj = Record<string, unknown>;

function seedKey(key: string, value: unknown[] | AnyObj): void {
  try {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch { /* quota / private-browsing — silently skip */ }
}

// ── Profiles (employees + clients) ───────────────────────────────────────────
function seedProfiles(): void {
  seedKey("mock_profiles", mockUsers.map((u) => {
    const ux = u as unknown as AnyObj;
    return {
      id: u.id,
      email: u.email,
      full_name: u.name,
      avatar_url: ux["avatar"] ?? "",
      company: ux["company"] ?? "",
      role: u.role,
      departmentId: ux["departmentId"],
      created_at: ux["joinDate"] ?? new Date().toISOString(),
    };
  }));
}

// ── Clients ───────────────────────────────────────────────────────────────────
function seedClients(): void {
  seedKey("optivax_clients", [
    {
      id: "u6", name: "Alice Johnson", company: "Acme Corp",
      companyName: "Acme Corp", contactName: "Alice Johnson",
      email: "client1@example.com", phone: "+1-555-0101",
      status: "active", joinDate: "2026-01-15T00:00:00Z",
      address: "123 Main St", city: "New York",
      totalProjects: 2, totalBilled: 9700,
      assignedProductionMembers: ["u13", "u24"],
      createdBy: "u1", createdByName: "Super Admin",
      createdAt: "2026-01-15T00:00:00Z",
    },
    {
      id: "u7", name: "Bob Williams", company: "Globex Corp",
      companyName: "Globex Corp", contactName: "Bob Williams",
      email: "client2@example.com", phone: "+1-555-0102",
      status: "active", joinDate: "2026-02-01T00:00:00Z",
      address: "456 Oak Ave", city: "Los Angeles",
      totalProjects: 2, totalBilled: 4000,
      assignedProductionMembers: ["u13"],
      createdBy: "u1", createdByName: "Super Admin",
      createdAt: "2026-02-01T00:00:00Z",
    },
    {
      id: "u30", name: "Carol Stevens", company: "TechNova Inc",
      companyName: "TechNova Inc", contactName: "Carol Stevens",
      email: "client3@example.com", phone: "+1-555-0103",
      status: "active", joinDate: "2026-02-20T00:00:00Z",
      address: "789 Innovation Blvd", city: "San Francisco",
      totalProjects: 2, totalBilled: 17500,
      assignedProductionMembers: ["u9", "u24"],
      createdBy: "u1", createdByName: "Super Admin",
      createdAt: "2026-02-20T00:00:00Z",
    },
    {
      id: "u31", name: "Daniel Foster", company: "BluePeak Retail",
      companyName: "BluePeak Retail", contactName: "Daniel Foster",
      email: "client4@example.com", phone: "+1-555-0104",
      status: "active", joinDate: "2026-03-05T00:00:00Z",
      address: "321 Commerce St", city: "Chicago",
      totalProjects: 1, totalBilled: 4200,
      assignedProductionMembers: ["u13"],
      createdBy: "u1", createdByName: "Super Admin",
      createdAt: "2026-03-05T00:00:00Z",
    },
    {
      id: "u32", name: "Elena Vasquez", company: "MediCore Solutions",
      companyName: "MediCore Solutions", contactName: "Elena Vasquez",
      email: "client5@example.com", phone: "+1-555-0105",
      status: "active", joinDate: "2026-03-18T00:00:00Z",
      address: "555 Healthcare Ave", city: "Boston",
      totalProjects: 2, totalBilled: 14200,
      assignedProductionMembers: ["u9", "u13"],
      createdBy: "u1", createdByName: "Super Admin",
      createdAt: "2026-03-18T00:00:00Z",
    },
    {
      id: "u33", name: "Frank Huang", company: "CapitalEdge Finance",
      companyName: "CapitalEdge Finance", contactName: "Frank Huang",
      email: "client6@example.com", phone: "+1-555-0106",
      status: "inactive", joinDate: "2026-04-02T00:00:00Z",
      address: "100 Wall Street", city: "New York",
      totalProjects: 1, totalBilled: 19000,
      assignedProductionMembers: ["u24"],
      createdBy: "u1", createdByName: "Super Admin",
      createdAt: "2026-04-02T00:00:00Z",
    },
  ]);
}

// ── Projects ──────────────────────────────────────────────────────────────────
function seedProjects(): void {
  seedKey("mock_projects", [
    {
      id: "proj-1", name: "Website Redesign", clientId: "u6",
      description: "Full website redesign with new branding and SEO optimisation",
      status: "in-progress", priority: "high", progress: 65,
      budget: 8000, spent: 5200,
      startDate: "2026-05-01T00:00:00Z", deadline: "2026-07-31T00:00:00Z",
      files: [], assignedTo: ["u9", "u13", "u24"],
      createdAt: "2026-05-01T00:00:00Z", updatedAt: new Date().toISOString(),
    },
    {
      id: "proj-2", name: "Mobile App MVP", clientId: "u6",
      description: "Cross-platform mobile app for order tracking",
      status: "in-progress", priority: "medium", progress: 30,
      budget: 15000, spent: 4500,
      startDate: "2026-06-01T00:00:00Z", deadline: "2026-09-30T00:00:00Z",
      files: [], assignedTo: ["u9", "u13"],
      createdAt: "2026-06-01T00:00:00Z", updatedAt: new Date().toISOString(),
    },
    {
      id: "proj-3", name: "Brand Identity Package", clientId: "u7",
      description: "Logo, colour palette, brand guidelines and marketing kit",
      status: "completed", priority: "low", progress: 100,
      budget: 3000, spent: 2800,
      startDate: "2026-03-01T00:00:00Z", deadline: "2026-04-30T00:00:00Z",
      files: [], assignedTo: ["u10", "u14"],
      createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-04-29T00:00:00Z",
    },
    {
      id: "proj-4", name: "E-Commerce Platform", clientId: "u30",
      description: "Full-stack e-commerce solution with payment integration and admin dashboard",
      status: "in-progress", priority: "high", progress: 45,
      budget: 22000, spent: 9900,
      startDate: "2026-03-15T00:00:00Z", deadline: "2026-08-31T00:00:00Z",
      files: [], assignedTo: ["u9", "u13", "u24"],
      createdAt: "2026-03-15T00:00:00Z", updatedAt: new Date().toISOString(),
    },
    {
      id: "proj-5", name: "SaaS Analytics Dashboard", clientId: "u30",
      description: "Real-time analytics dashboard with data visualisation and reporting",
      status: "todo", priority: "medium", progress: 10,
      budget: 12000, spent: 1200,
      startDate: "2026-06-10T00:00:00Z", deadline: "2026-10-15T00:00:00Z",
      files: [], assignedTo: ["u9"],
      createdAt: "2026-06-10T00:00:00Z", updatedAt: new Date().toISOString(),
    },
    {
      id: "proj-6", name: "Retail POS System", clientId: "u31",
      description: "Point-of-sale system with inventory management and sales reporting",
      status: "in-progress", priority: "high", progress: 55,
      budget: 9500, spent: 5225,
      startDate: "2026-04-20T00:00:00Z", deadline: "2026-08-20T00:00:00Z",
      files: [], assignedTo: ["u13", "u24"],
      createdAt: "2026-04-20T00:00:00Z", updatedAt: new Date().toISOString(),
    },
    {
      id: "proj-7", name: "Patient Portal", clientId: "u32",
      description: "Secure patient management portal with appointment booking and records",
      status: "in-progress", priority: "high", progress: 70,
      budget: 18000, spent: 12600,
      startDate: "2026-02-01T00:00:00Z", deadline: "2026-07-15T00:00:00Z",
      files: [], assignedTo: ["u9", "u13"],
      createdAt: "2026-02-01T00:00:00Z", updatedAt: new Date().toISOString(),
    },
    {
      id: "proj-8", name: "Compliance Reporting Tool", clientId: "u32",
      description: "Automated regulatory compliance reporting and audit trail system",
      status: "completed", priority: "medium", progress: 100,
      budget: 7500, spent: 7200,
      startDate: "2026-01-10T00:00:00Z", deadline: "2026-04-30T00:00:00Z",
      files: [], assignedTo: ["u9", "u24"],
      createdAt: "2026-01-10T00:00:00Z", updatedAt: "2026-04-28T00:00:00Z",
    },
    {
      id: "proj-9", name: "Financial Risk Dashboard", clientId: "u33",
      description: "Real-time risk monitoring and portfolio analysis platform",
      status: "in-progress", priority: "high", progress: 80,
      budget: 25000, spent: 20000,
      startDate: "2026-01-20T00:00:00Z", deadline: "2026-06-30T00:00:00Z",
      files: [], assignedTo: ["u9", "u13", "u24"],
      createdAt: "2026-01-20T00:00:00Z", updatedAt: new Date().toISOString(),
    },
    {
      id: "proj-10", name: "Corporate Intranet Portal", clientId: "u7",
      description: "Internal employee portal with document management and announcements",
      status: "todo", priority: "low", progress: 5,
      budget: 6000, spent: 300,
      startDate: "2026-06-15T00:00:00Z", deadline: "2026-10-31T00:00:00Z",
      files: [], assignedTo: ["u14", "u24"],
      createdAt: "2026-06-15T00:00:00Z", updatedAt: new Date().toISOString(),
    },
  ]);
}

// ── Tasks (mirrors Tasks.tsx INITIAL_TASKS so all panels agree) ───────────────
function seedTasks(): void {
  seedKey("mock_tasks", [
    { id: "t1",  title: "Design login screen",       description: "Create new UI for auth flow",    status: "done",        priority: "high",   assignee: "Emma Wilson",    assigneeId: "u12", dueDate: "2026-06-10", budget: 600,   budgetUsed: 580,  category: "general", assigneeDept: "dept-sales",       assigneeRole: "sales_member" },
    { id: "t2",  title: "API integration — leads",   description: "Connect leads CRUD to backend",  status: "in-progress", priority: "high",   assignee: "James Carter",   assigneeId: "u8",  dueDate: "2026-06-18", budget: 800,   budgetUsed: 320,  category: "general", assigneeDept: "dept-sales",       assigneeRole: "sales_admin" },
    { id: "t3",  title: "Write unit tests",          description: "Cover auth context hooks",       status: "todo",        priority: "medium", assignee: "Liam Park",      assigneeId: "u13", dueDate: "2026-06-22", budget: 400,   budgetUsed: 0,    category: "general", assigneeDept: "dept-production",   assigneeRole: "production_member" },
    { id: "t4",  title: "Update client portal",      description: "Refresh billing UI",             status: "in-progress", priority: "medium", assignee: "Olivia Brown",   assigneeId: "u10", dueDate: "2026-06-20", budget: 500,   budgetUsed: 210,  category: "general", assigneeDept: "dept-marketing",    assigneeRole: "marketing_admin" },
    { id: "t5",  title: "Database schema migration", description: "Add employee tables",            status: "todo",        priority: "high",   assignee: "David Chen",     assigneeId: "u9",  dueDate: "2026-06-25", budget: 1000,  budgetUsed: 0,    category: "general", assigneeDept: "dept-production",   assigneeRole: "production_admin" },
    { id: "t6",  title: "Fix sidebar routing",       description: "Remove dead navigation links",   status: "done",        priority: "high",   assignee: "Noah Davis",     assigneeId: "u14", dueDate: "2026-06-15", budget: 300,   budgetUsed: 280,  category: "general", assigneeDept: "dept-marketing",    assigneeRole: "marketing_member" },
    { id: "t7",  title: "Email campaign scheduler",  description: "Implement send scheduling",      status: "blocked",     priority: "medium", assignee: "Ava Johnson",    assigneeId: "u11", dueDate: "2026-06-30", budget: 700,   budgetUsed: 150,  category: "campaign", assigneeDept: "dept-hr",           assigneeRole: "hr_admin" },
    { id: "t8",  title: "HR payroll report",         description: "Generate monthly payroll PDF",   status: "todo",        priority: "low",    assignee: "Ethan Lee",      assigneeId: "u15", dueDate: "2026-07-01", budget: 200,   budgetUsed: 0,    category: "general", assigneeDept: "dept-hr",           assigneeRole: "hr_member" },
    { id: "t9",  title: "Deploy to staging",         description: "Push latest build to staging",   status: "in-progress", priority: "high",   assignee: "James Carter",   assigneeId: "u8",  dueDate: "2026-06-17", budget: 300,   budgetUsed: 120,  category: "general", assigneeDept: "dept-sales",        assigneeRole: "sales_admin" },
    { id: "t10", title: "Onboard client — Globex",   description: "Initial setup and handover",     status: "todo",        priority: "medium", assignee: "Sarah Mitchell", assigneeId: "u2",  dueDate: "2026-06-28", budget: 400,   budgetUsed: 0,    category: "general", assigneeRole: "management" },
    { id: "t11", title: "Q3 content calendar",       description: "Plan all social posts for Q3",   status: "in-progress", priority: "medium", assignee: "Noah Davis",     assigneeId: "u14", dueDate: "2026-07-05", budget: 350,   budgetUsed: 140,  category: "content",  assigneeDept: "dept-marketing",    assigneeRole: "marketing_member" },
    { id: "t12", title: "Mobile UI prototype",       description: "Interactive Figma prototype",    status: "in-progress", priority: "high",   assignee: "Edgar Wright",   assigneeId: "u24", dueDate: "2026-07-10", budget: 1200,  budgetUsed: 480,  category: "general",  assigneeDept: "dept-production",   assigneeRole: "production_member" },
    { id: "t13", title: "Network infrastructure audit", description: "Audit all switches and firewall rules", status: "in-progress", priority: "high", assignee: "Ryan Patel", assigneeId: "u16", dueDate: "2026-07-05", budget: 900, budgetUsed: 300, category: "general", assigneeDept: "dept-it-support", assigneeRole: "it_admin" },
    { id: "t14", title: "ZKTeco firmware update",   description: "Upgrade firmware on all 5 biometric devices", status: "todo", priority: "medium", assignee: "Sophia Kim", assigneeId: "u26", dueDate: "2026-07-15", budget: 400, budgetUsed: 0, category: "general", assigneeDept: "dept-it-support", assigneeRole: "it_member" },
  ]);
}

// ── Payments (drive the Revenue widgets) ──────────────────────────────────────
function seedPayments(): void {
  seedKey("mock_payments", [
    { id: "pay-1",  invoiceId: "inv-1",  amount: 2500,  date: "2026-06-01", method: "Bank Transfer",  transactionId: "TXN-1001", created_at: "2026-06-01T10:00:00Z", status: "completed" },
    { id: "pay-2",  invoiceId: "inv-2",  amount: 2800,  date: "2026-04-18", method: "Wire Transfer",   transactionId: "TXN-1002", created_at: "2026-04-18T09:15:00Z", status: "completed" },
    { id: "pay-3",  invoiceId: "inv-3",  amount: 3000,  date: "2026-05-20", method: "Credit Card",     transactionId: "TXN-1003", created_at: "2026-05-20T14:30:00Z", status: "completed" },
    { id: "pay-4",  invoiceId: "inv-5",  amount: 1500,  date: "2026-06-10", method: "Bank Transfer",   transactionId: "TXN-1004", created_at: "2026-06-10T11:00:00Z", status: "completed" },
    { id: "pay-5",  invoiceId: "inv-6",  amount: 8000,  date: "2026-04-12", method: "Wire Transfer",   transactionId: "TXN-1005", created_at: "2026-04-12T08:30:00Z", status: "completed" },
    { id: "pay-6",  invoiceId: "inv-8",  amount: 4200,  date: "2026-05-10", method: "Bank Transfer",   transactionId: "TXN-1006", created_at: "2026-05-10T13:00:00Z", status: "completed" },
    { id: "pay-7",  invoiceId: "inv-9",  amount: 7000,  date: "2026-03-18", method: "Wire Transfer",   transactionId: "TXN-1007", created_at: "2026-03-18T11:45:00Z", status: "completed" },
    { id: "pay-8",  invoiceId: "inv-10", amount: 7200,  date: "2026-05-08", method: "Credit Card",     transactionId: "TXN-1008", created_at: "2026-05-08T16:00:00Z", status: "completed" },
    { id: "pay-9",  invoiceId: "inv-11", amount: 9500,  date: "2026-02-28", method: "Wire Transfer",   transactionId: "TXN-1009", created_at: "2026-02-28T10:00:00Z", status: "completed" },
    { id: "pay-10", invoiceId: "inv-13", amount: 1200,  date: "2026-06-20", method: "Bank Transfer",   transactionId: "TXN-1010", created_at: "2026-06-20T09:00:00Z", status: "completed" },
  ]);
}

// ── Invoices (billing module) ─────────────────────────────────────────────────
function seedInvoices(): void {
  seedKey("mock_invoices", [
    {
      id: "inv-1", number: "INV-2026-0001", clientId: "u6", projectId: "proj-1",
      description: "Website Redesign — Phase 1 (Design & Wireframes)",
      amount: 2500, status: "paid",
      issueDate: "2026-05-28", dueDate: "2026-06-05", paidDate: "2026-06-01",
      items: [{ id: "ii-1", description: "Design & wireframes", quantity: 1, rate: 2500, total: 2500 }],
    },
    {
      id: "inv-2", number: "INV-2026-0002", clientId: "u7", projectId: "proj-3",
      description: "Brand Identity Package — Final Delivery",
      amount: 2800, status: "paid",
      issueDate: "2026-04-12", dueDate: "2026-04-22", paidDate: "2026-04-18",
      items: [{ id: "ii-2", description: "Brand package delivery", quantity: 1, rate: 2800, total: 2800 }],
    },
    {
      id: "inv-3", number: "INV-2026-0003", clientId: "u6", projectId: "proj-2",
      description: "Mobile App MVP — Discovery & Architecture",
      amount: 3000, status: "paid",
      issueDate: "2026-05-14", dueDate: "2026-05-24", paidDate: "2026-05-20",
      items: [{ id: "ii-3", description: "Discovery & architecture", quantity: 1, rate: 3000, total: 3000 }],
    },
    {
      id: "inv-4", number: "INV-2026-0004", clientId: "u6", projectId: "proj-1",
      description: "Website Redesign — Phase 2 (Frontend Development)",
      amount: 2700, status: "pending",
      issueDate: "2026-06-08", dueDate: "2026-06-22",
      items: [{ id: "ii-4", description: "Frontend development", quantity: 1, rate: 2700, total: 2700 }],
    },
    {
      id: "inv-5", number: "INV-2026-0005", clientId: "u6", projectId: "proj-2",
      description: "Mobile App MVP — UI Prototype",
      amount: 1500, status: "paid",
      issueDate: "2026-06-15", dueDate: "2026-06-30", paidDate: "2026-06-10",
      items: [{ id: "ii-5", description: "UI prototype delivery", quantity: 1, rate: 1500, total: 1500 }],
    },
    {
      id: "inv-6", number: "INV-2026-0006", clientId: "u30", projectId: "proj-4",
      description: "E-Commerce Platform — Phase 1 (Architecture & Backend)",
      amount: 8000, status: "paid",
      issueDate: "2026-04-01", dueDate: "2026-04-15", paidDate: "2026-04-12",
      items: [{ id: "ii-6", description: "Architecture & backend", quantity: 1, rate: 8000, total: 8000 }],
    },
    {
      id: "inv-7", number: "INV-2026-0007", clientId: "u30", projectId: "proj-4",
      description: "E-Commerce Platform — Phase 2 (Frontend & Payments)",
      amount: 9500, status: "pending",
      issueDate: "2026-06-05", dueDate: "2026-06-25",
      items: [{ id: "ii-7", description: "Frontend & payment integration", quantity: 1, rate: 9500, total: 9500 }],
    },
    {
      id: "inv-8", number: "INV-2026-0008", clientId: "u31", projectId: "proj-6",
      description: "Retail POS System — Milestone 1",
      amount: 4200, status: "paid",
      issueDate: "2026-05-01", dueDate: "2026-05-15", paidDate: "2026-05-10",
      items: [{ id: "ii-8", description: "POS core module", quantity: 1, rate: 4200, total: 4200 }],
    },
    {
      id: "inv-9", number: "INV-2026-0009", clientId: "u32", projectId: "proj-7",
      description: "Patient Portal — Development Phase 1",
      amount: 7000, status: "paid",
      issueDate: "2026-03-01", dueDate: "2026-03-20", paidDate: "2026-03-18",
      items: [{ id: "ii-9", description: "Patient management module", quantity: 1, rate: 7000, total: 7000 }],
    },
    {
      id: "inv-10", number: "INV-2026-0010", clientId: "u32", projectId: "proj-8",
      description: "Compliance Reporting Tool — Full Delivery",
      amount: 7200, status: "paid",
      issueDate: "2026-04-28", dueDate: "2026-05-10", paidDate: "2026-05-08",
      items: [{ id: "ii-10", description: "Full compliance system", quantity: 1, rate: 7200, total: 7200 }],
    },
    {
      id: "inv-11", number: "INV-2026-0011", clientId: "u33", projectId: "proj-9",
      description: "Financial Risk Dashboard — Phase 1",
      amount: 9500, status: "paid",
      issueDate: "2026-02-15", dueDate: "2026-03-01", paidDate: "2026-02-28",
      items: [{ id: "ii-11", description: "Risk engine & data pipeline", quantity: 1, rate: 9500, total: 9500 }],
    },
    {
      id: "inv-12", number: "INV-2026-0012", clientId: "u33", projectId: "proj-9",
      description: "Financial Risk Dashboard — Phase 2",
      amount: 9500, status: "overdue",
      issueDate: "2026-05-01", dueDate: "2026-06-01",
      items: [{ id: "ii-12", description: "Dashboard UI & reporting", quantity: 1, rate: 9500, total: 9500 }],
    },
    {
      id: "inv-13", number: "INV-2026-0013", clientId: "u7", projectId: "proj-10",
      description: "Corporate Intranet Portal — Discovery",
      amount: 1200, status: "paid",
      issueDate: "2026-06-15", dueDate: "2026-06-22", paidDate: "2026-06-20",
      items: [{ id: "ii-13", description: "Discovery & scoping", quantity: 1, rate: 1200, total: 1200 }],
    },
  ]);
}

// ── Marketing campaigns ───────────────────────────────────────────────────────
function seedCampaigns(): void {
  seedKey("marketing_campaigns", [
    {
      id: "camp-1", name: "Q2 Social Media Blitz", budget: 5000, spent: 3800,
      status: "Active", startDate: "2026-04-01", endDate: "2026-06-30",
      platform: "Multi", impressions: 48200, clicks: 2340, conversions: 91,
    },
    {
      id: "camp-2", name: "June Email Newsletter", budget: 800, spent: 610,
      status: "Active", startDate: "2026-06-01", endDate: "2026-06-30",
      platform: "Email", impressions: 13500, clicks: 920, conversions: 48,
    },
    {
      id: "camp-3", name: "Brand Awareness Q1", budget: 8000, spent: 7950,
      status: "Completed", startDate: "2026-01-01", endDate: "2026-03-31",
      platform: "Multi", impressions: 98000, clicks: 4800, conversions: 225,
    },
  ]);
}

// ── Deliverables ──────────────────────────────────────────────────────────────
function seedDeliverables(): void {
  seedKey("optivax_deliverables", [
    {
      id: "del-1",
      clientId: "u6", clientName: "Alice Johnson (Acme Corp)",
      projectId: "proj-1", projectName: "Website Redesign",
      title: "Website Wireframes",
      description: "Full wireframe set — all pages",
      status: "Approved", dueDate: "2026-06-10",
      uploadedBy: "u9", uploadedByName: "David Chen",
      uploadedAt: "2026-05-15T00:00:00Z",
      approvedBy: "u2", approvedByName: "Sarah Mitchell",
      approvedAt: "2026-06-09T10:00:00Z",
    },
    {
      id: "del-2",
      clientId: "u7", clientName: "Bob Williams (Globex Corp)",
      projectId: "proj-3", projectName: "Brand Identity Package",
      title: "Brand Logo Pack",
      description: "Final logo in all formats (SVG, PNG, PDF)",
      status: "Delivered", dueDate: "2026-04-20",
      uploadedBy: "u10", uploadedByName: "Olivia Brown",
      uploadedAt: "2026-04-01T00:00:00Z",
      approvedBy: "u2", approvedByName: "Sarah Mitchell",
      approvedAt: "2026-04-18T09:00:00Z",
    },
    {
      id: "del-3",
      clientId: "u6", clientName: "Alice Johnson (Acme Corp)",
      projectId: "proj-2", projectName: "Mobile App MVP",
      title: "Mobile App Prototype",
      description: "Interactive Figma prototype for client review",
      status: "In Progress", dueDate: "2026-07-10",
      uploadedBy: "u9", uploadedByName: "David Chen",
      uploadedAt: "2026-06-05T00:00:00Z",
    },
    {
      id: "del-4",
      clientId: "u6", clientName: "Alice Johnson (Acme Corp)",
      projectId: "proj-1", projectName: "Website Redesign",
      title: "SEO Audit Report",
      description: "Complete SEO analysis and keyword recommendations",
      status: "Review", dueDate: "2026-06-25",
      uploadedBy: "u10", uploadedByName: "Olivia Brown",
      uploadedAt: "2026-06-10T00:00:00Z",
    },
  ]);
}

// ── Leave requests ────────────────────────────────────────────────────────────
function seedLeaveRequests(): void {
  seedKey("optivax_leave_requests", [
    {
      id: "leave-1", status: "Pending",
      employeeId: "u12", employeeName: "Emma Wilson",
      role: "sales_member", department: "Sales",
      type: "Annual", startDate: "2026-07-01", endDate: "2026-07-05", days: 5,
      reason: "Family vacation", submittedAt: "2026-06-12T08:00:00Z",
    },
    {
      id: "leave-2", status: "Approved",
      employeeId: "u14", employeeName: "Noah Davis",
      role: "marketing_member", department: "Marketing",
      type: "Sick", startDate: "2026-06-19", endDate: "2026-06-20", days: 2,
      reason: "Medical appointment", submittedAt: "2026-06-15T10:30:00Z",
    },
    {
      id: "leave-3", status: "Pending",
      employeeId: "u24", employeeName: "Edgar Wright",
      role: "production_member", department: "Production",
      type: "Personal", startDate: "2026-06-25", endDate: "2026-06-26", days: 2,
      reason: "Personal matters", submittedAt: "2026-06-16T09:15:00Z",
    },
    {
      id: "leave-4", status: "Rejected",
      employeeId: "u22", employeeName: "Chris Nolan",
      role: "sales_member", department: "Sales",
      type: "Annual", startDate: "2026-06-20", endDate: "2026-06-23", days: 4,
      reason: "Short holiday", submittedAt: "2026-06-10T14:00:00Z",
    },
    {
      id: "leave-5", status: "Pending",
      employeeId: "u26", employeeName: "Sophia Kim",
      role: "it_member", department: "IT Support",
      type: "Annual", startDate: "2026-07-14", endDate: "2026-07-18", days: 5,
      reason: "Annual holiday", submittedAt: "2026-06-20T09:00:00Z",
    },
  ]);
}

// ── Employee extra (salary / work-mode / leaves taken) ───────────────────────
function seedEmployeeExtras(): void {
  const KEY = "optivax_employee_extra";
  if (localStorage.getItem(KEY)) return;

  const data: Record<string, AnyObj> = {
    u2:  { userId: "u2",  salary: 120000, salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 3 },
    u8:  { userId: "u8",  salary: 85000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 5 },
    u9:  { userId: "u9",  salary: 90000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 2 },
    u10: { userId: "u10", salary: 80000,  salaryStatus: "Paid", workMode: "Remote",  leavesTaken: 4 },
    u11: { userId: "u11", salary: 75000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 6 },
    u12: { userId: "u12", salary: 55000,  salaryStatus: "Paid", workMode: "Remote",  leavesTaken: 8 },
    u13: { userId: "u13", salary: 60000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 3 },
    u14: { userId: "u14", salary: 55000,  salaryStatus: "Paid", workMode: "Remote",  leavesTaken: 2 },
    u15: { userId: "u15", salary: 50000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 1 },
    u20: { userId: "u20", salary: 52000,  salaryStatus: "Paid", workMode: "Remote",  leavesTaken: 4 },
    u21: { userId: "u21", salary: 52000,  salaryStatus: "Paid", workMode: "Remote",  leavesTaken: 2 },
    u22: { userId: "u22", salary: 53000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 7 },
    u23: { userId: "u23", salary: 53000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 3 },
    u24: { userId: "u24", salary: 58000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 2 },
    u25: { userId: "u25", salary: 50000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 1 },
    u16: { userId: "u16", salary: 95000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 2 },
    u26: { userId: "u26", salary: 65000,  salaryStatus: "Paid", workMode: "Onsite",  leavesTaken: 3 },
    u27: { userId: "u27", salary: 70000,  salaryStatus: "Paid", workMode: "Hybrid",  leavesTaken: 1 },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

// ── Email marketing ───────────────────────────────────────────────────────────
function seedEmailMarketing(): void {
  const now = "2026-06-01T00:00:00Z";
  seedKey("email_templates", [
    { id: "et-1", name: "Welcome Email",       subject: "Welcome to Optivax!", content: "<h1>Welcome!</h1><p>Thanks for joining us.</p>",             type: "welcome",    createdAt: now, updatedAt: now },
    { id: "et-2", name: "Monthly Newsletter",  subject: "Optivax June Update",  content: "<h1>June News</h1><p>Here's what's new this month.</p>",   type: "newsletter", createdAt: now, updatedAt: now },
    { id: "et-3", name: "Invoice Reminder",    subject: "Payment Due Reminder", content: "<h1>Reminder</h1><p>Your invoice is due soon.</p>",         type: "reminder",   createdAt: now, updatedAt: now },
  ]);
  seedKey("email_campaigns", [
    { id: "ec-1", name: "June Newsletter Blast",   subject: "June 2026 Updates",        templateId: "et-2", status: "sent",      sentDate: "2026-06-05T09:00:00Z", audienceTags: ["all"],     stats: { sent: 120, opened: 87, clicked: 34 }, createdAt: now, updatedAt: now },
    { id: "ec-2", name: "New Client Welcome",       subject: "Welcome to Optivax!",      templateId: "et-1", status: "scheduled", scheduleDate: "2026-06-25T10:00:00Z", audienceTags: ["new"],  stats: { sent: 0,   opened: 0,  clicked: 0  }, createdAt: now, updatedAt: now },
    { id: "ec-3", name: "Overdue Invoice Alerts",   subject: "Action Required: Invoice", templateId: "et-3", status: "draft",     audienceTags: ["overdue"],           stats: { sent: 0,   opened: 0,  clicked: 0  }, createdAt: now, updatedAt: now },
  ]);
  seedKey("email_automations", [
    { id: "ea-1", name: "New Client Onboarding",   triggerType: "new_client",       templateId: "et-1", status: "active",   delayHours: 1,  createdAt: now, updatedAt: now },
    { id: "ea-2", name: "Invoice Overdue Alert",    triggerType: "invoice_overdue",  templateId: "et-3", status: "active",   delayHours: 48, createdAt: now, updatedAt: now },
    { id: "ea-3", name: "Project Complete Follow-up", triggerType: "project_complete", templateId: "et-2", status: "inactive", delayHours: 24, createdAt: now, updatedAt: now },
  ]);
}

// ── Organizations ─────────────────────────────────────────────────────────────
function seedOrganizations(): void {
  seedKey("mock_organizations", [
    { id: "org-1", name: "Acme Corp",            owner_id: "u6",  created_at: "2026-01-15T00:00:00Z" },
    { id: "org-2", name: "Globex Corp",           owner_id: "u7",  created_at: "2026-02-01T00:00:00Z" },
    { id: "org-3", name: "TechNova Inc",          owner_id: "u30", created_at: "2026-02-20T00:00:00Z" },
    { id: "org-4", name: "BluePeak Retail",       owner_id: "u31", created_at: "2026-03-05T00:00:00Z" },
    { id: "org-5", name: "MediCore Solutions",    owner_id: "u32", created_at: "2026-03-18T00:00:00Z" },
    { id: "org-6", name: "CapitalEdge Finance",   owner_id: "u33", created_at: "2026-04-02T00:00:00Z" },
  ]);
}

// ── Subscriptions ─────────────────────────────────────────────────────────────
function seedSubscriptions(): void {
  seedKey("mock_subscriptions", [
    { id: "sub-1", organization_id: "org-1", plan_name: "Enterprise",    status: "active",   billing_cycle: "monthly", current_period_end: "2026-07-15" },
    { id: "sub-2", organization_id: "org-2", plan_name: "Professional",  status: "active",   billing_cycle: "annual",  current_period_end: "2026-12-31" },
    { id: "sub-3", organization_id: "org-3", plan_name: "Enterprise",    status: "active",   billing_cycle: "annual",  current_period_end: "2026-12-31" },
    { id: "sub-4", organization_id: "org-4", plan_name: "Starter",       status: "active",   billing_cycle: "monthly", current_period_end: "2026-07-05" },
    { id: "sub-5", organization_id: "org-5", plan_name: "Enterprise",    status: "active",   billing_cycle: "annual",  current_period_end: "2027-03-18" },
    { id: "sub-6", organization_id: "org-6", plan_name: "Professional",  status: "inactive", billing_cycle: "monthly", current_period_end: "2026-05-02" },
  ]);
}

// ── Social Tracking ───────────────────────────────────────────────────────────
function seedSocialTracking(): void {
  seedKey("social_links", [
    { id: "sl-1", trackingId: "trk-fb001", platform: "facebook",   label: "Optivax Facebook Page",    url: "https://facebook.com/optivax",   status: "active", createdAt: "2026-04-01T00:00:00Z", createdBy: "u10" },
    { id: "sl-2", trackingId: "trk-ig001", platform: "instagram",  label: "Optivax Instagram Profile", url: "https://instagram.com/optivax",  status: "active", createdAt: "2026-04-01T00:00:00Z", createdBy: "u10" },
    { id: "sl-3", trackingId: "trk-li001", platform: "linkedin",   label: "Optivax LinkedIn Company",  url: "https://linkedin.com/company/optivax", status: "active", createdAt: "2026-04-05T00:00:00Z", createdBy: "u14" },
    { id: "sl-4", trackingId: "trk-yt001", platform: "youtube",    label: "Optivax YouTube Channel",   url: "https://youtube.com/@optivax",   status: "active", createdAt: "2026-04-10T00:00:00Z", createdBy: "u10" },
    { id: "sl-5", trackingId: "trk-gad01", platform: "google_ads", label: "Google Ads — Q2 Campaign",  url: "https://ads.google.com/optivax", status: "active", createdAt: "2026-05-01T00:00:00Z", createdBy: "u10" },
  ]);
  seedKey("social_clicks", [
    { id: "clk-1",  linkId: "sl-1", trackingId: "trk-fb001", platform: "facebook",   visitorId: "v-a1", referrer: "direct",       device: "desktop", browser: "Chrome", timestamp: "2026-05-02T08:10:00Z" },
    { id: "clk-2",  linkId: "sl-1", trackingId: "trk-fb001", platform: "facebook",   visitorId: "v-a2", referrer: "facebook.com", device: "mobile",  browser: "Safari", timestamp: "2026-05-03T09:25:00Z" },
    { id: "clk-3",  linkId: "sl-2", trackingId: "trk-ig001", platform: "instagram",  visitorId: "v-b1", referrer: "direct",       device: "mobile",  browser: "Safari", timestamp: "2026-05-04T11:00:00Z" },
    { id: "clk-4",  linkId: "sl-2", trackingId: "trk-ig001", platform: "instagram",  visitorId: "v-b2", referrer: "instagram.com",device: "mobile",  browser: "Chrome", timestamp: "2026-05-05T14:30:00Z" },
    { id: "clk-5",  linkId: "sl-2", trackingId: "trk-ig001", platform: "instagram",  visitorId: "v-b3", referrer: "direct",       device: "desktop", browser: "Firefox",timestamp: "2026-05-06T16:45:00Z" },
    { id: "clk-6",  linkId: "sl-3", trackingId: "trk-li001", platform: "linkedin",   visitorId: "v-c1", referrer: "linkedin.com", device: "desktop", browser: "Chrome", timestamp: "2026-05-08T10:15:00Z" },
    { id: "clk-7",  linkId: "sl-4", trackingId: "trk-yt001", platform: "youtube",    visitorId: "v-d1", referrer: "direct",       device: "desktop", browser: "Chrome", timestamp: "2026-05-10T13:20:00Z" },
    { id: "clk-8",  linkId: "sl-1", trackingId: "trk-fb001", platform: "facebook",   visitorId: "v-a3", referrer: "direct",       device: "desktop", browser: "Edge",   timestamp: "2026-05-12T09:00:00Z" },
    { id: "clk-9",  linkId: "sl-5", trackingId: "trk-gad01", platform: "google_ads", visitorId: "v-e1", referrer: "google.com",   device: "desktop", browser: "Chrome", timestamp: "2026-05-14T11:30:00Z" },
    { id: "clk-10", linkId: "sl-5", trackingId: "trk-gad01", platform: "google_ads", visitorId: "v-e2", referrer: "google.com",   device: "mobile",  browser: "Safari", timestamp: "2026-05-15T14:00:00Z" },
    { id: "clk-11", linkId: "sl-2", trackingId: "trk-ig001", platform: "instagram",  visitorId: "v-b4", referrer: "instagram.com",device: "mobile",  browser: "Chrome", timestamp: "2026-05-17T17:00:00Z" },
    { id: "clk-12", linkId: "sl-3", trackingId: "trk-li001", platform: "linkedin",   visitorId: "v-c2", referrer: "direct",       device: "desktop", browser: "Chrome", timestamp: "2026-05-19T09:45:00Z" },
    { id: "clk-13", linkId: "sl-1", trackingId: "trk-fb001", platform: "facebook",   visitorId: "v-a4", referrer: "facebook.com", device: "mobile",  browser: "Safari", timestamp: "2026-06-01T10:00:00Z" },
    { id: "clk-14", linkId: "sl-5", trackingId: "trk-gad01", platform: "google_ads", visitorId: "v-e3", referrer: "google.com",   device: "desktop", browser: "Chrome", timestamp: "2026-06-03T11:00:00Z" },
    { id: "clk-15", linkId: "sl-2", trackingId: "trk-ig001", platform: "instagram",  visitorId: "v-b5", referrer: "direct",       device: "mobile",  browser: "Safari", timestamp: "2026-06-05T15:30:00Z" },
  ]);
}

// ── Public entry point ────────────────────────────────────────────────────────
export function seedAllMockData(): void {
  if (typeof window === "undefined") return;
  seedProfiles();
  seedClients();
  seedProjects();
  seedTasks();
  seedPayments();
  seedInvoices();
  seedCampaigns();
  seedDeliverables();
  seedLeaveRequests();
  seedEmployeeExtras();
  seedEmailMarketing();
  seedOrganizations();
  seedSubscriptions();
  seedSocialTracking();
}
