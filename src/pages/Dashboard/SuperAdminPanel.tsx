import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { api } from "../../lib/client";
import Chart from "react-apexcharts";
import { UserService } from "../../services/userService";
import type { UserProfile } from "../../services/userService";
import { notifyUserCreated } from "../../services/notificationHelpers";
import { useAuth } from "../../context/AuthContext";
import { storeMockPassword } from "../../lib/client";
import { safeParse } from "../../lib/storage";
import type { LeaveRequest } from "../Client/Profile";
import { seedAllMockData } from "../../lib/devSeed";
import { getCampaigns, getTargets, getSalesTasks } from "../../mock/salesData";
import { AuditLogService } from "../../services/auditLogService";
import {
  getContentEntries, STATUS_BADGE, STATUS_DOT, PROD_STATUS_BADGE, PROD_STATUS_DOT, PLATFORM_ABBR,
  type ContentEntry,
} from "../../mock/contentCalendarData";

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Organization    { id: string; name: string; owner_id: string; created_at: string; }
interface Payment         { id: string; amount: number; currency?: string; created_at: string; date?: string; status?: string; method: string; transactionId: string; invoiceId?: string; }
interface Subscription    { id: string; organization_id: string; plan_name: string; status: string; billing_cycle: string; current_period_end: string; }
interface StoredClient    { id: string; companyName?: string; name?: string; company?: string; contactName?: string; email: string; phone?: string; status: string; }
interface Project         { id: string; name: string; clientId: string; status: string; priority: string; progress: number; budget: number; spent: number; deadline: string; description: string; }
interface EmployeeExtra   { userId: string; salary: number; salaryStatus: string; workMode: string; leavesTaken: number; }
interface MockTask        { id: string; title: string; description?: string; status: string; priority: string; assignee?: string; assigneeId?: string; dueDate?: string; budget?: number; budgetUsed?: number; category?: string; }
interface Invoice         { id: string; number: string; clientId: string; projectId?: string; description?: string; amount: number; status: string; issueDate: string; dueDate: string; paidDate?: string; }
interface MarketingCampaign { id: string; name: string; budget: number; spent: number; status: string; platform?: string; startDate?: string; endDate?: string; impressions?: number; clicks?: number; conversions?: number; }
interface SalesCampaign   { id: string; campaignName: string; totalBudget: number; budgetSpent: number; status: string; startDate?: string; endDate?: string; notes?: string; }
interface SalesTarget     { id: string; memberId: string; memberName: string; monthlyTarget: number; quarterlyTarget: number; annualTarget?: number; achievedAmount: number; period: string; }
interface SalesTask       { id: string; title: string; description?: string; assignedTo: string; assignedName?: string; priority: string; dueDate: string; status: string; estimatedValue: number; notes?: string; }
interface Deliverable     { id: string; title: string; description?: string; clientName?: string; projectName?: string; status: string; dueDate?: string; uploadedByName?: string; approvedByName?: string; uploadedAt?: string; }
interface EmailTemplate   { id: string; name: string; subject: string; type?: string; createdAt?: string; }
interface EmailCampaign   { id: string; name: string; subject: string; status: string; sentDate?: string; scheduleDate?: string; audienceTags?: string[]; stats?: { sent: number; opened: number; clicked: number }; }
interface EmailAutomation { id: string; name: string; triggerType: string; status: string; delayHours?: number; }
interface CreateUserForm  { full_name: string; email: string; password: string; role: string; company: string; }

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_ROLES = [
  { value: "management",        label: "Management" },
  { value: "hr_admin",          label: "HR Admin" },
  { value: "hr_member",         label: "HR Member" },
  { value: "sales_admin",       label: "Sales Admin" },
  { value: "sales_member",      label: "Sales Member" },
  { value: "production_admin",  label: "Production Admin" },
  { value: "production_member", label: "Production Member" },
  { value: "marketing_admin",   label: "Marketing Admin" },
  { value: "marketing_member",  label: "Marketing Member" },
  { value: "it_admin",          label: "IT Admin" },
  { value: "it_member",         label: "IT Member" },
  { value: "client",            label: "Client" },
];

const DEPT_MAP: Record<string, string> = {
  sales: "Sales", marketing: "Marketing", production: "Production",
  hr: "HR", management: "Management", super_admin: "Management", client: "Client",
  it: "IT Support",
};

const getDept = (role?: string): string => {
  if (!role) return "General";
  for (const [prefix, dept] of Object.entries(DEPT_MAP)) {
    if (role === prefix || role.startsWith(prefix + "_")) return dept;
  }
  return "General";
};

const DEPT_COLORS: Record<string, string> = {
  Sales:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Marketing:    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Production:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  HR:           "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  Management:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "IT Support": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  Client:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  General:      "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const STATUS_COLORS: Record<string, string> = {
  active:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Active:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Completed:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  done:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "in-progress":"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "In Progress":"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  todo:        "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  blocked:     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  overdue:     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  scheduled:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sent:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft:       "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  planned:     "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  inactive:    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  Approved:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Delivered:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Review:      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low:    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const PANEL_LINKS = [
  { label: "Admin Panel",        path: "/admin/dashboard",          dept: "Management" },
  { label: "Management",         path: "/management/dashboard",     dept: "Management" },
  { label: "HR Dashboard",       path: "/hr/dashboard",             dept: "HR" },
  { label: "Sales Dashboard",    path: "/sales/dashboard",          dept: "Sales" },
  { label: "Marketing",          path: "/marketing/dashboard",      dept: "Marketing" },
  { label: "Production",         path: "/production/dashboard",     dept: "Production" },
  { label: "HR Employees",       path: "/hr/users",                 dept: "HR" },
  { label: "HR Payroll",         path: "/hr/payroll",               dept: "HR" },
  { label: "Sales Tasks",        path: "/sales/tasks",              dept: "Sales" },
  { label: "Sales Targets",      path: "/sales/targets",            dept: "Sales" },
  { label: "Marketing Tasks",    path: "/marketing/tasks",          dept: "Marketing" },
  { label: "Social Tracking",    path: "/marketing/social",         dept: "Marketing" },
  { label: "Prod. Deliverables", path: "/production/deliverables",  dept: "Production" },
  { label: "IT Support",          path: "/it/dashboard",             dept: "IT Support" },
  { label: "IT Tickets",          path: "/it/tickets",               dept: "IT Support" },
  { label: "Biometric Devices",   path: "/it/devices",               dept: "IT Support" },
  { label: "Email Campaigns",     path: "/admin/email/campaigns",    dept: "Management" },
  { label: "Billing",             path: "/admin/billing",            dept: "Management" },
  { label: "Audit Logs",          path: "/admin/audit-logs",         dept: "Management" },
];

const LEAVE_KEY = "optivax_leave_requests";
const EXTRA_KEY = "optivax_employee_extra";

const TABS = [
  "Overview", "Users", "Projects", "Clients", "Departments",
  "Tasks", "Invoices", "Transactions", "Campaigns", "Deliverables", "Email", "Leave Requests",
] as const;
type Tab = typeof TABS[number];

// ── Small UI helpers ──────────────────────────────────────────────────────────
function KPI({ title, value, sub, color = "blue" }: { title: string; value: string | number; sub?: string; color?: string }) {
  const ring: Record<string, string> = {
    blue: "border-blue-500", green: "border-green-500", purple: "border-purple-500",
    orange: "border-orange-500", yellow: "border-yellow-500", indigo: "border-indigo-500",
    pink: "border-pink-500", red: "border-red-500",
  };
  return (
    <div className={`rounded-xl border-l-4 ${ring[color] ?? ring.blue} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <h4 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</h4>
      {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

function Badge({ text, color }: { text: string; color?: string }) {
  const c = color ?? STATUS_COLORS[text] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${c}`}>{text}</span>;
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{children}</th>;
}

function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? "Search…"}
      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-56"
    />
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SuperAdminPanel() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  // ── State — seeded from localStorage immediately, refreshed via API ──────────
  const [users,         setUsers]         = useState<UserProfile[]>(() =>
    safeParse<UserProfile[]>(localStorage.getItem("mock_profiles"), [])
  );
  const [clients,       setClients]       = useState<StoredClient[]>(() =>
    safeParse<StoredClient[]>(localStorage.getItem("optivax_clients"), [])
  );
  const [projects,      setProjects]      = useState<Project[]>(() =>
    safeParse<Project[]>(localStorage.getItem("mock_projects"), [])
  );
  const [payments,      setPayments]      = useState<Payment[]>(() =>
    safeParse<Payment[]>(localStorage.getItem("mock_payments"), [])
  );
  const [invoices,      setInvoices]      = useState<Invoice[]>(() =>
    safeParse<Invoice[]>(localStorage.getItem("mock_invoices"), [])
  );
  const [organizations, setOrganizations] = useState<Organization[]>(() =>
    safeParse<Organization[]>(localStorage.getItem("mock_organizations"), [])
  );
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    safeParse<Subscription[]>(localStorage.getItem("mock_subscriptions"), [])
  );
  const [emailTemplates,  setEmailTemplates]  = useState<EmailTemplate[]>(() =>
    safeParse<EmailTemplate[]>(localStorage.getItem("email_templates"), [])
  );
  const [emailCampaigns,  setEmailCampaigns]  = useState<EmailCampaign[]>(() =>
    safeParse<EmailCampaign[]>(localStorage.getItem("email_campaigns"), [])
  );
  const [emailAutomations,setEmailAutomations]= useState<EmailAutomation[]>(() =>
    safeParse<EmailAutomation[]>(localStorage.getItem("email_automations"), [])
  );
  const [isLoading, setIsLoading] = useState(false);

  // ── localStorage-backed state ─────────────────────────────────────────────
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    safeParse<LeaveRequest[]>(localStorage.getItem(LEAVE_KEY), [])
  );
  const [extras, setExtras] = useState<Record<string, EmployeeExtra>>(() =>
    safeParse<Record<string, EmployeeExtra>>(localStorage.getItem(EXTRA_KEY), {})
  );
  const [mockTasks,     setMockTasks]     = useState<MockTask[]>(() =>
    safeParse<MockTask[]>(localStorage.getItem("mock_tasks"), [])
  );
  const [salesTasks,    setSalesTasks]    = useState<SalesTask[]>(() => getSalesTasks() as SalesTask[]);
  const [mktCampaigns,  setMktCampaigns]  = useState<MarketingCampaign[]>(() =>
    safeParse<MarketingCampaign[]>(localStorage.getItem("marketing_campaigns"), [])
  );
  const [salesCampaigns,setSalesCampaigns]= useState<SalesCampaign[]>(() => getCampaigns() as SalesCampaign[]);
  const [salesTargets,  setSalesTargets]  = useState<SalesTarget[]>(() => getTargets() as SalesTarget[]);
  const [deliverables,  setDeliverables]  = useState<Deliverable[]>(() =>
    safeParse<Deliverable[]>(localStorage.getItem("optivax_deliverables"), [])
  );
  const [calEntries,    setCalEntries]    = useState<ContentEntry[]>(() => getContentEntries());

  // ── Modal / form state ────────────────────────────────────────────────────
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm,  setCreateForm]  = useState<CreateUserForm>({ full_name: "", email: "", password: "", role: "hr_admin", company: "Optivax Global" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState("");
  const [deleteUserId,  setDeleteUserId]  = useState<string | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [userSearch,     setUserSearch]     = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [projSearch,     setProjSearch]     = useState("");
  const [clientSearch,   setClientSearch]   = useState("");
  const [txSearch,       setTxSearch]       = useState("");
  const [taskSearch,     setTaskSearch]     = useState("");
  const [taskSource,     setTaskSource]     = useState<"all" | "general" | "sales">("all");
  const [invSearch,      setInvSearch]      = useState("");
  const [campTab,        setCampTab]        = useState<"marketing" | "sales" | "targets">("marketing");
  const [delivSearch,    setDelivSearch]    = useState("");
  const [emailTab,       setEmailTab]       = useState<"templates" | "campaigns" | "automations">("campaigns");
  const [leaveFilter,    setLeaveFilter]    = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  // ── Data fetching — refreshes API state; localStorage provides the initial values ──
  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get<UserProfile[]>("/saas/v1/profiles/list"),
        api.get<Organization[]>("/saas/v1/organizations/list"),
        api.get<Payment[]>("/saas/v1/payments/list"),
        api.get<Subscription[]>("/saas/v1/subscriptions/list"),
        api.get<StoredClient[]>("/saas/v1/clients/list"),
        api.get<Project[]>("/saas/v1/projects/list"),
        api.get<Invoice[]>("/saas/v1/invoices/list"),
        api.get<EmailTemplate[]>("/saas/v1/email/templates/list"),
        api.get<EmailCampaign[]>("/saas/v1/email/campaigns/list"),
        api.get<EmailAutomation[]>("/saas/v1/email/automations/list"),
      ]);
      const pick = <T,>(r: PromiseSettledResult<T[]>): T[] =>
        r.status === "fulfilled" && Array.isArray(r.value) && r.value.length > 0 ? r.value : [];
      const apiUsers   = pick(results[0]);
      const apiClients = pick(results[4]);
      const apiProjects= pick(results[5]);
      // Only overwrite localStorage-seeded state when API returns non-empty data
      if (apiUsers.length)    setUsers(apiUsers);
      if (pick(results[1]).length) setOrganizations(pick(results[1]));
      if (pick(results[2]).length) setPayments(pick(results[2]));
      if (pick(results[3]).length) setSubscriptions(pick(results[3]));
      if (apiClients.length)  setClients(apiClients);
      if (apiProjects.length) setProjects(apiProjects);
      if (pick(results[6]).length) setInvoices(pick(results[6]));
      if (pick(results[7]).length) setEmailTemplates(pick(results[7]));
      if (pick(results[8]).length) setEmailCampaigns(pick(results[8]));
      if (pick(results[9]).length) setEmailAutomations(pick(results[9]));
    } catch {
      // data load failure is handled by empty state in UI
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LEAVE_KEY)              setLeaveRequests(safeParse<LeaveRequest[]>(e.newValue, []));
      if (e.key === EXTRA_KEY)              setExtras(safeParse<Record<string, EmployeeExtra>>(e.newValue, {}));
      if (e.key === "mock_tasks")           setMockTasks(safeParse<MockTask[]>(e.newValue, []));
      if (e.key === "marketing_campaigns")  setMktCampaigns(safeParse<MarketingCampaign[]>(e.newValue, []));
      if (e.key === "optivax_deliverables") setDeliverables(safeParse<Deliverable[]>(e.newValue, []));
      if (e.key === "sales_tasks")          setSalesTasks(getSalesTasks() as SalesTask[]);
      if (e.key === "sales_campaigns")      setSalesCampaigns(getCampaigns() as SalesCampaign[]);
      if (e.key === "sales_targets")        setSalesTargets(getTargets() as SalesTarget[]);
      if (e.key === "mkt_content_calendar_v1") setCalEntries(getContentEntries());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const employees    = useMemo(() => users.filter(u => u.role !== "client"), [users]);
  const totalRevenue = useMemo(() => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [payments]);
  const pendingLeaves = leaveRequests.filter(l => l.status === "Pending").length;
  const allTasks     = useMemo(() => [
    ...mockTasks.map(t => ({ ...t, _source: "General" as const })),
    ...salesTasks.map(t => ({ id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority, assignee: t.assignedName, assigneeId: t.assignedTo, dueDate: t.dueDate, budget: t.estimatedValue, budgetUsed: 0, category: "sales", _source: "Sales" as const })),
  ], [mockTasks, salesTasks]);

  const depts = useMemo(() => {
    const map: Record<string, UserProfile[]> = { Sales: [], Marketing: [], Production: [], HR: [], Management: [], "IT Support": [] };
    employees.forEach(u => { const d = getDept(u.role); if (map[d]) map[d].push(u); });
    return map;
  }, [employees]);

  // ── Content Calendar derived data ────────────────────────────────────────
  const calStats = useMemo(() => {
    const today      = new Date().toISOString().slice(0, 10);
    const in7        = new Date(); in7.setDate(in7.getDate() + 7);
    const in7str     = in7.toISOString().slice(0, 10);
    const monthPrefix = today.slice(0, 7);
    const monthLastDay = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)
      .toISOString().slice(0, 10);

    const todayItems    = calEntries.filter(e => e.scheduledDate === today && e.status !== "Cancelled");
    const upcomingItems = calEntries
      .filter(e => e.scheduledDate > today && e.scheduledDate <= in7str && e.status !== "Cancelled")
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, 5);
    const pendingProd   = calEntries.filter(e => e.productionSupportRequired && (e.productionStatus ?? "Pending") === "Pending");
    const readyForMkt   = calEntries.filter(e => e.productionStatus === "Ready For Marketing");
    const monthItems    = calEntries.filter(e =>
      e.scheduledDate >= monthPrefix + "-01" && e.scheduledDate <= monthLastDay
    );
    const monthByStatus = {
      Published: monthItems.filter(e => e.status === "Published").length,
      Ready:     monthItems.filter(e => e.status === "Ready").length,
      Planned:   monthItems.filter(e => e.status === "Planned").length,
      Cancelled: monthItems.filter(e => e.status === "Cancelled").length,
    };
    const prodCount    = calEntries.filter(e => e.productionSupportRequired).length;
    const selfCount    = calEntries.filter(e => !e.productionSupportRequired).length;
    const total        = calEntries.length;
    return { todayItems, upcomingItems, pendingProd, readyForMkt, monthItems, monthByStatus, prodCount, selfCount, total };
  }, [calEntries]);

  // ── Revenue chart ─────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const dm: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dm[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0;
    }
    payments.forEach(p => {
      const key = new Date(p.created_at || p.date || "").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dm[key] !== undefined) dm[key] += Number(p.amount || 0);
    });
    return { categories: Object.keys(dm), series: [{ name: "Revenue ($)", data: Object.values(dm) }] };
  }, [payments]);

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false } },
    colors: ["#3C50E0"],
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] } },
    xaxis: { categories: chartData.categories, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: "10px" }, rotate: -30 } },
    yaxis: { labels: { formatter: (v: number) => `$${v}` } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
  };

  // ── Subscription lookup ───────────────────────────────────────────────────
  const getSubForClient = (email: string) => {
    const u   = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    const org = u ? organizations.find(o => o.owner_id === u.id) : null;
    const sub = org ? subscriptions.find(s => s.organization_id === org.id) : null;
    return sub ? { plan: sub.plan_name, status: sub.status } : { plan: "None", status: "Inactive" };
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.full_name || !createForm.email || !createForm.password || !createForm.role) {
      setCreateError("All fields are required."); return;
    }
    setCreateLoading(true); setCreateError("");
    try {
      const newUser = await UserService.create({ full_name: createForm.full_name, email: createForm.email, avatar_url: "", company: createForm.company, role: createForm.role, created_at: new Date().toISOString() });
      storeMockPassword(createForm.email, createForm.password);
      if (currentUser) {
        notifyUserCreated(currentUser.id, currentUser.name, currentUser.role, newUser.id, newUser.full_name, newUser.email, newUser.role);
        AuditLogService.add({
          action: "USER_CREATED",
          entityType: "user",
          entityId: newUser.id,
          entityName: `${newUser.full_name} (${newUser.role})`,
          performedBy: currentUser.id,
          performedByName: currentUser.name,
          performedByRole: currentUser.role,
          description: `Created new user ${newUser.full_name} with role ${newUser.role} — email: ${newUser.email}`,
        });
      }
      setShowCreateUser(false);
      setCreateForm({ full_name: "", email: "", password: "", role: "hr_admin", company: "Optivax Global" });
      fetchData();
    } catch { setCreateError("Failed to create user. Email may already be in use."); }
    finally { setCreateLoading(false); }
  };

  const handleDeleteUser = async (id: string) => {
    try { await UserService.delete(id); fetchData(); } catch {}
    setDeleteUserId(null);
  };

  const handleResetMockData = () => {
    const MOCK_KEYS = [
      "mock_profiles", "optivax_clients", "mock_projects", "mock_invoices",
      "mock_payments", "mock_tasks", "mock_files", "mock_revisions",
      "marketing_campaigns", "optivax_deliverables",
      "optivax_leave_requests", "optivax_employee_extra", "email_templates",
      "email_campaigns", "email_automations", "mock_organizations", "mock_subscriptions",
      "mock_attendance", "mock_assignments", "mock_leads", "mock_commissions",
      "sales_campaigns", "sales_tasks", "sales_targets",
      "social_links", "social_clicks", "social_account_metrics",
      "optivax_audit_logs", "mock_notifications", "mock_passwords",
      "mock_it_tickets", "mock_biometric_devices", "mock_device_sync_logs", "mock_attendance_exceptions",
      "mock_conversations", "mock_budgets", "mock_budget_audit_logs",
      "mock_salary_slips", "mock_advance_requests",
    ];
    MOCK_KEYS.forEach(k => localStorage.removeItem(k));
    seedAllMockData();
    // re-read all state directly from freshly-seeded localStorage
    setUsers         (safeParse<UserProfile[]>  (localStorage.getItem("mock_profiles"),        []));
    setClients       (safeParse<StoredClient[]> (localStorage.getItem("optivax_clients"),       []));
    setProjects      (safeParse<Project[]>      (localStorage.getItem("mock_projects"),         []));
    setPayments      (safeParse<Payment[]>      (localStorage.getItem("mock_payments"),         []));
    setInvoices      (safeParse<Invoice[]>      (localStorage.getItem("mock_invoices"),         []));
    setOrganizations (safeParse<Organization[]> (localStorage.getItem("mock_organizations"),    []));
    setSubscriptions (safeParse<Subscription[]> (localStorage.getItem("mock_subscriptions"),    []));
    setEmailTemplates  (safeParse<EmailTemplate[]>  (localStorage.getItem("email_templates"),   []));
    setEmailCampaigns  (safeParse<EmailCampaign[]>  (localStorage.getItem("email_campaigns"),   []));
    setEmailAutomations(safeParse<EmailAutomation[]>(localStorage.getItem("email_automations"), []));
    setLeaveRequests (safeParse<LeaveRequest[]> (localStorage.getItem(LEAVE_KEY),               []));
    setExtras        (safeParse<Record<string, EmployeeExtra>>(localStorage.getItem(EXTRA_KEY), {}));
    setMockTasks     (safeParse<MockTask[]>     (localStorage.getItem("mock_tasks"),            []));
    setMktCampaigns  (safeParse<MarketingCampaign[]>(localStorage.getItem("marketing_campaigns"),[]));
    setDeliverables  (safeParse<Deliverable[]>  (localStorage.getItem("optivax_deliverables"),  []));
    setSalesTasks(getSalesTasks() as SalesTask[]);
    setSalesCampaigns(getCampaigns() as SalesCampaign[]);
    setSalesTargets(getTargets() as SalesTarget[]);
  };

  const handleLeaveAction = (id: string, action: "Approved" | "Rejected") => {
    const leave = leaveRequests.find(l => l.id === id);
    const updated = leaveRequests.map(l => l.id === id ? { ...l, status: action } : l);
    setLeaveRequests(updated);
    localStorage.setItem(LEAVE_KEY, JSON.stringify(updated));
    if (currentUser && leave) {
      AuditLogService.add({
        action: action === "Approved" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
        entityType: "leave_request",
        entityId: leave.id,
        entityName: `${leave.employeeName} — ${leave.type} (${leave.days}d)`,
        performedBy: currentUser.id,
        performedByName: currentUser.name,
        performedByRole: currentUser.role,
        description: `${action} leave request for ${leave.employeeName}: ${leave.type} from ${leave.startDate} to ${leave.endDate}`,
      });
    }
  };

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return users.filter(u =>
      (userRoleFilter === "all" || u.role === userRoleFilter) &&
      (!q || (u.full_name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.role || "").includes(q))
    );
  }, [users, userSearch, userRoleFilter]);

  const filteredProjects  = useMemo(() => { const q = projSearch.toLowerCase(); return !q ? projects : projects.filter(p => p.name.toLowerCase().includes(q) || p.status.includes(q)); }, [projects, projSearch]);
  const filteredClients   = useMemo(() => { const q = clientSearch.toLowerCase(); return !q ? clients : clients.filter(c => (c.companyName || c.company || c.name || "").toLowerCase().includes(q) || c.email.toLowerCase().includes(q)); }, [clients, clientSearch]);
  const filteredTx        = useMemo(() => { const q = txSearch.toLowerCase(); return !q ? payments : payments.filter(p => (p.transactionId || "").toLowerCase().includes(q) || (p.method || "").toLowerCase().includes(q)); }, [payments, txSearch]);
  const filteredInvoices  = useMemo(() => { const q = invSearch.toLowerCase(); return !q ? invoices : invoices.filter(i => (i.number || "").toLowerCase().includes(q) || i.status.includes(q)); }, [invoices, invSearch]);
  const filteredTasks     = useMemo(() => {
    const q  = taskSearch.toLowerCase();
    const src = taskSource === "general" ? allTasks.filter(t => t._source === "General") : taskSource === "sales" ? allTasks.filter(t => t._source === "Sales") : allTasks;
    return !q ? src : src.filter(t => t.title.toLowerCase().includes(q) || (t.assignee || "").toLowerCase().includes(q) || t.status.includes(q));
  }, [allTasks, taskSearch, taskSource]);
  const filteredDeliverables = useMemo(() => { const q = delivSearch.toLowerCase(); return !q ? deliverables : deliverables.filter(d => d.title.toLowerCase().includes(q) || (d.clientName || "").toLowerCase().includes(q)); }, [deliverables, delivSearch]);
  const filteredLeaves    = useMemo(() => leaveFilter === "All" ? leaveRequests : leaveRequests.filter(l => l.status === leaveFilter), [leaveRequests, leaveFilter]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Super Admin Dashboard | Optivax Global" description="Complete platform control center." />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Control Center</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Complete platform visibility — all data, all departments, all permissions.</p>
        </div>
        <button onClick={handleResetMockData}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg transition-colors whitespace-nowrap">
          ↺ Reload Mock Data
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 mb-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700 pb-px scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              activeTab === tab ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}>
            {tab}
            {tab === "Leave Requests" && pendingLeaves > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 text-white text-xs px-1.5 py-0.5">{pendingLeaves}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
      {activeTab === "Overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <KPI title="Total Employees"   value={employees.length}                   sub={`${users.filter(u=>u.role==="client").length} client accounts`}           color="blue" />
            <KPI title="Total Clients"     value={clients.length}                     sub={`${projects.filter(p=>p.status!=="completed").length} active projects`}    color="green" />
            <KPI title="Total Projects"    value={projects.length}                    sub={`${projects.filter(p=>p.status==="in-progress").length} in progress`}      color="purple" />
            <KPI title="Total Revenue"     value={`$${totalRevenue.toLocaleString()}`}sub={`${payments.length} transactions`}                                        color="yellow" />
            <KPI title="Open Invoices"     value={invoices.filter(i=>i.status==="pending"||i.status==="overdue").length} sub={`$${invoices.filter(i=>i.status==="pending"||i.status==="overdue").reduce((s,i)=>s+i.amount,0).toLocaleString()} outstanding`} color="orange" />
            <KPI title="Pending Leaves"    value={pendingLeaves}                      sub="awaiting approval"                                                        color="red" />
            <KPI title="Active Campaigns"  value={[...mktCampaigns.filter(c=>c.status==="Active"), ...salesCampaigns.filter(c=>c.status==="active")].length} sub={`${mktCampaigns.length + salesCampaigns.length} total`} color="pink" />
            <KPI title="All Tasks"         value={allTasks.length}                    sub={`${allTasks.filter(t=>t.status==="done").length} completed`}               color="indigo" />
            <KPI title="Deliverables"      value={deliverables.length}                sub={`${deliverables.filter(d=>d.status==="Approved").length} approved`}        color="green" />
            <KPI title="Subscriptions"     value={subscriptions.filter(s=>s.status==="active").length} sub="active plans"                                           color="blue" />
            <KPI title="Email Campaigns"   value={emailCampaigns.length}              sub={`${emailCampaigns.filter(c=>c.status==="sent").length} sent`}              color="purple" />
            <KPI title="Departments"       value={Object.values(depts).filter(d=>d.length>0).length} sub="active"                                                   color="indigo" />
          </div>

          <Card>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend — Last 30 Days</h3>
            <div className="h-72">
              <Chart options={chartOptions} series={chartData.series} type="area" height="100%" />
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Access Every Panel</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {PANEL_LINKS.map(link => (
                <Link key={link.path} to={link.path} className={`rounded-lg px-4 py-3 text-sm font-medium transition hover:opacity-80 ${DEPT_COLORS[link.dept] ?? "bg-gray-100 text-gray-700"}`}>
                  {link.label} →
                </Link>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                <button onClick={() => setActiveTab("Transactions")} className="text-xs text-brand-500 hover:underline">View all</button>
              </div>
              {payments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div><p className="text-xs font-medium text-gray-900 dark:text-white">{p.transactionId}</p><p className="text-xs text-gray-400">{p.method}</p></div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">${Number(p.amount).toLocaleString()}</span>
                </div>
              ))}
              {payments.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No transactions.</p>}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pending Leaves</h3>
                <button onClick={() => setActiveTab("Leave Requests")} className="text-xs text-brand-500 hover:underline">View all</button>
              </div>
              {leaveRequests.filter(l => l.status === "Pending").slice(0, 4).map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div><p className="text-xs font-medium text-gray-900 dark:text-white">{l.employeeName}</p><p className="text-xs text-gray-400">{l.type} · {l.days}d · {l.startDate}</p></div>
                  <div className="flex gap-1">
                    <button onClick={() => handleLeaveAction(l.id, "Approved")} className="px-2 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded">✓</button>
                    <button onClick={() => handleLeaveAction(l.id, "Rejected")} className="px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded">✗</button>
                  </div>
                </div>
              ))}
              {pendingLeaves === 0 && <p className="text-xs text-gray-400 text-center py-4">No pending requests.</p>}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Open Invoices</h3>
                <button onClick={() => setActiveTab("Invoices")} className="text-xs text-brand-500 hover:underline">View all</button>
              </div>
              {invoices.filter(i => i.status !== "paid").slice(0, 4).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div><p className="text-xs font-medium text-gray-900 dark:text-white">{inv.number}</p><p className="text-xs text-gray-400">Due: {inv.dueDate}</p></div>
                  <div className="flex items-center gap-2">
                    <Badge text={inv.status} />
                    <span className="text-xs font-bold text-orange-600">${inv.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {invoices.filter(i => i.status !== "paid").length === 0 && <p className="text-xs text-gray-400 text-center py-4">All invoices paid.</p>}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Deliverables</h3>
                <button onClick={() => setActiveTab("Deliverables")} className="text-xs text-brand-500 hover:underline">View all</button>
              </div>
              {deliverables.slice(0, 4).map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div><p className="text-xs font-medium text-gray-900 dark:text-white">{d.title}</p><p className="text-xs text-gray-400">{d.projectName}</p></div>
                  <Badge text={d.status} />
                </div>
              ))}
              {deliverables.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No deliverables.</p>}
            </Card>
          </div>

          {/* Employees / Clients / Projects quick-view */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Employees ({employees.length})</h3>
                <button onClick={() => setActiveTab("Users")} className="text-xs text-brand-500 hover:underline">View all</button>
              </div>
              {employees.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">No employees.</p>
                : employees.slice(0, 6).map(u => {
                  const dept = getDept(u.role);
                  return (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{u.full_name || "—"}</p>
                        <p className="text-xs text-gray-400">{u.role?.replace(/_/g, " ")}</p>
                      </div>
                      <Badge text={dept} color={DEPT_COLORS[dept]} />
                    </div>
                  );
                })
              }
              {employees.length > 6 && (
                <p className="text-xs text-gray-400 text-center pt-2">+{employees.length - 6} more</p>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Clients ({clients.length})</h3>
                <button onClick={() => setActiveTab("Clients")} className="text-xs text-brand-500 hover:underline">View all</button>
              </div>
              {clients.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">No clients.</p>
                : clients.map(c => {
                  const projCount = projects.filter(p => p.clientId === c.id).length;
                  return (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{c.companyName || c.company || c.name || "—"}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge text={c.status || "active"} />
                        <p className="text-xs text-gray-400 mt-0.5">{projCount} project{projCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  );
                })
              }
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Projects ({projects.length})</h3>
                <button onClick={() => setActiveTab("Projects")} className="text-xs text-brand-500 hover:underline">View all</button>
              </div>
              {projects.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">No projects.</p>
                : projects.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{p.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div className="h-1 rounded-full bg-brand-500" style={{ width: `${p.progress ?? 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{p.progress ?? 0}%</span>
                      </div>
                    </div>
                    <Badge text={p.status?.replace(/-/g, " ")} />
                  </div>
                ))
              }
            </Card>
          </div>

          {/* ── Content Calendar ──────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Content Calendar</h2>
              <Link to="/marketing/content-calendar" className="text-xs text-brand-500 hover:underline">Open Calendar →</Link>
            </div>

            {/* 4 stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <Link to="/marketing/content-calendar" className="rounded-xl border-l-4 border-blue-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow block">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Today's Content</p>
                <h4 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{calStats.todayItems.length}</h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">scheduled for today</p>
              </Link>
              <Link to="/marketing/content-calendar" className="rounded-xl border-l-4 border-indigo-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow block">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Upcoming (7 days)</p>
                <h4 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{calStats.upcomingItems.length}</h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">content items ahead</p>
              </Link>
              <Link to="/production/content-requests" className="rounded-xl border-l-4 border-orange-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow block">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending Prod. Requests</p>
                <h4 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{calStats.pendingProd.length}</h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">awaiting production</p>
              </Link>
              <Link to="/production/content-requests" className="rounded-xl border-l-4 border-green-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow block">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ready For Marketing</p>
                <h4 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{calStats.readyForMkt.length}</h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">items ready to publish</p>
              </Link>
            </div>

            {/* 2 detail cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-5">
              {/* Monthly Content Summary */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Monthly Content Summary
                    <span className="ml-2 text-xs font-normal text-gray-400">({new Date().toLocaleString("default",{month:"long",year:"numeric"})})</span>
                  </h3>
                  <span className="text-xs text-gray-400">{calStats.monthItems.length} total</span>
                </div>
                {(["Published","Ready","Planned","Cancelled"] as const).map(st => {
                  const count = calStats.monthByStatus[st];
                  const pct   = calStats.monthItems.length > 0 ? Math.round(count / calStats.monthItems.length * 100) : 0;
                  return (
                    <div key={st} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[st]}`} />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{st}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{count}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[st]}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${STATUS_DOT[st]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </Card>

              {/* Marketing vs Production Activity Summary */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Marketing vs Production Activity</h3>
                  <span className="text-xs text-gray-400">{calStats.total} entries total</span>
                </div>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-900/40 p-3 text-center">
                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{calStats.selfCount}</p>
                    <p className="text-xs text-pink-500 dark:text-pink-400 mt-0.5">Self-Managed</p>
                    <p className="text-xs text-gray-400">{calStats.total > 0 ? Math.round(calStats.selfCount / calStats.total * 100) : 0}%</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/40 p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{calStats.prodCount}</p>
                    <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">Production-Dependent</p>
                    <p className="text-xs text-gray-400">{calStats.total > 0 ? Math.round(calStats.prodCount / calStats.total * 100) : 0}%</p>
                  </div>
                </div>
                {calStats.total > 0 && (
                  <div className="w-full h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex">
                    <div className="h-2 bg-pink-400 transition-all" style={{ width: `${Math.round(calStats.selfCount / calStats.total * 100)}%` }} />
                    <div className="h-2 bg-orange-400 transition-all" style={{ width: `${Math.round(calStats.prodCount / calStats.total * 100)}%` }} />
                  </div>
                )}
                <div className="mt-4 space-y-1.5">
                  {[
                    { label: "Pending Production", count: calStats.pendingProd.length, cls: PROD_STATUS_BADGE["Pending"], dot: PROD_STATUS_DOT["Pending"] },
                    { label: "In Progress",         count: calEntries.filter(e => e.productionStatus === "In Progress").length, cls: PROD_STATUS_BADGE["In Progress"], dot: PROD_STATUS_DOT["In Progress"] },
                    { label: "Ready For Marketing", count: calStats.readyForMkt.length, cls: PROD_STATUS_BADGE["Ready For Marketing"], dot: PROD_STATUS_DOT["Ready For Marketing"] },
                    { label: "Delivered",            count: calEntries.filter(e => e.productionStatus === "Delivered").length, cls: PROD_STATUS_BADGE["Delivered"], dot: PROD_STATUS_DOT["Delivered"] },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{row.label}</span>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.cls}`}>{row.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Today + Upcoming lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Today's Scheduled Content</h3>
                  <Link to="/marketing/content-calendar" className="text-xs text-brand-500 hover:underline">Calendar →</Link>
                </div>
                {calStats.todayItems.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-4">Nothing scheduled for today.</p>
                  : calStats.todayItems.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                            {PLATFORM_ABBR[e.platform]}
                          </span>
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{e.title}</p>
                        </div>
                        <p className="text-xs text-gray-400">{e.scheduledTime} · {e.contentType}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {e.productionSupportRequired && e.productionStatus && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${PROD_STATUS_BADGE[e.productionStatus]}`}>
                            {e.productionStatus}
                          </span>
                        )}
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[e.status]}`}>{e.status}</span>
                      </div>
                    </div>
                  ))
                }
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Content (Next 7 Days)</h3>
                  <Link to="/marketing/content-calendar" className="text-xs text-brand-500 hover:underline">Calendar →</Link>
                </div>
                {calStats.upcomingItems.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-4">No upcoming content in 7 days.</p>
                  : calStats.upcomingItems.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                            {PLATFORM_ABBR[e.platform]}
                          </span>
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{e.title}</p>
                        </div>
                        <p className="text-xs text-gray-400">{e.scheduledDate} · {e.scheduledTime}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {e.productionSupportRequired && e.productionStatus && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${PROD_STATUS_BADGE[e.productionStatus]}`}>
                            {e.productionStatus}
                          </span>
                        )}
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[e.status]}`}>{e.status}</span>
                      </div>
                    </div>
                  ))
                }
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ══ USERS ═════════════════════════════════════════════════════════════ */}
      {activeTab === "Users" && (
        <Card>
          <SectionHead
            title="All Users"
            sub={`${users.length} total · ${employees.length} employees · ${users.filter(u=>u.role==="client").length} clients`}
            action={
              <>
                <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search name / email / role…" />
                <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button onClick={() => { setShowCreateUser(true); setCreateError(""); }}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                  + Create User
                </button>
              </>
            }
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                {["Name","Email","Role","Department","Work Mode","Salary","Leaves","Joined","Action"].map(h => <TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length === 0
                  ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No users match the filter.</td></tr>
                  : filteredUsers.map(u => {
                    const ex = extras[u.id]; const dept = getDept(u.role); const isMe = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{u.full_name || "—"}{isMe && <span className="ml-1 text-xs text-brand-500">(you)</span>}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{u.email}</td>
                        <td className="px-3 py-3"><Badge text={u.role?.replace(/_/g," ")||"—"} color={DEPT_COLORS[dept]} /></td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{dept}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{ex?.workMode ?? "—"}</td>
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{ex?.salary ? `$${ex.salary.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-3 text-center text-gray-500 dark:text-gray-400">{ex?.leavesTaken ?? "—"}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {!isMe && (deleteUserId === u.id
                            ? <div className="flex gap-1"><button onClick={() => handleDeleteUser(u.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Confirm</button><button onClick={() => setDeleteUserId(null)} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">Cancel</button></div>
                            : <button onClick={() => setDeleteUserId(u.id)} className="px-2 py-1 text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Remove</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══ PROJECTS ══════════════════════════════════════════════════════════ */}
      {activeTab === "Projects" && (
        <Card>
          <SectionHead title="All Projects"
            sub={`${projects.length} total · ${projects.filter(p=>p.status==="in-progress").length} active · ${projects.filter(p=>p.status==="completed").length} completed`}
            action={<SearchInput value={projSearch} onChange={setProjSearch} placeholder="Search projects…" />}
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                {["Project","Client","Status","Priority","Progress","Budget / Spent","Deadline"].map(h => <TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProjects.length === 0
                  ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No projects found.</td></tr>
                  : filteredProjects.map(p => {
                    const client = clients.find(c => c.id === p.clientId);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-3"><p className="font-medium text-gray-900 dark:text-white">{p.name}</p>{p.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.description}</p>}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{client?.companyName||client?.company||client?.name||p.clientId}</td>
                        <td className="px-3 py-3"><Badge text={p.status?.replace(/-/g," ")} /></td>
                        <td className="px-3 py-3"><Badge text={p.priority||"—"} color={PRIORITY_COLORS[p.priority]} /></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${(p.progress??0)>=100?"bg-green-500":"bg-brand-500"}`} style={{width:`${p.progress??0}%`}} />
                            </div>
                            <span className="text-xs text-gray-500">{p.progress??0}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                          <span className="text-green-600 dark:text-green-400 font-medium">${(p.spent??0).toLocaleString()}</span>
                          <span className="text-gray-400 mx-1">/</span>${(p.budget??0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">{p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══ CLIENTS ═══════════════════════════════════════════════════════════ */}
      {activeTab === "Clients" && (
        <Card>
          <SectionHead title="All Clients" sub={`${clients.length} total clients`}
            action={<SearchInput value={clientSearch} onChange={setClientSearch} placeholder="Search clients…" />}
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                {["Company","Contact","Email","Phone","Projects","Active","Subscription","Plan Status","Account"].map(h => <TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClients.length === 0
                  ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No clients found.</td></tr>
                  : filteredClients.map(c => {
                    const all = projects.filter(p => p.clientId === c.id);
                    const active = all.filter(p => p.status !== "completed");
                    const sub = getSubForClient(c.email);
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{c.companyName||c.company||c.name||"—"}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{c.contactName||"—"}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{c.email}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{c.phone||"—"}</td>
                        <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">{all.length}</td>
                        <td className="px-3 py-3 text-center"><Badge text={String(active.length)} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" /></td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{sub.plan}</td>
                        <td className="px-3 py-3"><Badge text={sub.status} /></td>
                        <td className="px-3 py-3"><Badge text={c.status||"active"} /></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══ DEPARTMENTS ═══════════════════════════════════════════════════════ */}
      {activeTab === "Departments" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(depts).map(([dept, members]) => (
              <div key={dept} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{dept}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{members.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">{members.filter(m=>m.role.endsWith("_admin")).length} admin · {members.filter(m=>m.role.endsWith("_member")||m.role==="management").length} member</p>
              </div>
            ))}
          </div>
          {Object.entries(depts).map(([dept, members]) => (
            <Card key={dept}>
              <div className="flex items-center gap-3 mb-4">
                <Badge text={dept} color={DEPT_COLORS[dept]} />
                <span className="text-sm text-gray-500 dark:text-gray-400">{members.length} employee{members.length!==1?"s":""}</span>
              </div>
              {members.length === 0
                ? <p className="text-sm text-gray-400 italic">No employees in this department.</p>
                : <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-100 dark:divide-gray-800">
                    <thead><tr>{["Name","Email","Role","Work Mode","Salary","Leaves","Joined"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {members.map(m => {
                        const ex = extras[m.id];
                        return (
                          <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{m.full_name||"—"}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.email}</td>
                            <td className="px-3 py-2"><Badge text={m.role.replace(/_/g," ")} color={DEPT_COLORS[dept]} /></td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{ex?.workMode??"—"}</td>
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{ex?.salary ? `$${ex.salary.toLocaleString()}` : "—"}</td>
                            <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">{ex?.leavesTaken??"—"}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              }
            </Card>
          ))}
        </div>
      )}

      {/* ══ TASKS ═════════════════════════════════════════════════════════════ */}
      {activeTab === "Tasks" && (
        <Card>
          <SectionHead title="All Tasks"
            sub={`${allTasks.length} total (${mockTasks.length} general + ${salesTasks.length} sales) · ${allTasks.filter(t=>t.status==="done").length} completed`}
            action={
              <>
                <SearchInput value={taskSearch} onChange={setTaskSearch} placeholder="Search tasks…" />
                <div className="flex gap-1">
                  {(["all","general","sales"] as const).map(s => (
                    <button key={s} onClick={() => setTaskSource(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition ${taskSource===s ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            }
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                {["Title","Assignee","Category","Status","Priority","Budget","Budget Used","Due Date","Source"].map(h => <TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTasks.length === 0
                  ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No tasks found.</td></tr>
                  : filteredTasks.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{t.title}</p>
                        {t.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{t.description}</p>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{t.assignee||"—"}</td>
                      <td className="px-3 py-3"><Badge text={t.category||"general"} color="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" /></td>
                      <td className="px-3 py-3"><Badge text={t.status} /></td>
                      <td className="px-3 py-3"><Badge text={t.priority} color={PRIORITY_COLORS[t.priority]} /></td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{t.budget ? `$${t.budget.toLocaleString()}` : "—"}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {t.budgetUsed !== undefined && t.budget ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-brand-500" style={{width:`${Math.min((t.budgetUsed/t.budget)*100,100)}%`}} />
                            </div>
                            <span className="text-xs">${t.budgetUsed}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{t.dueDate||"—"}</td>
                      <td className="px-3 py-3"><Badge text={t._source} color={t._source==="Sales" ? DEPT_COLORS.Sales : DEPT_COLORS.General} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══ INVOICES ══════════════════════════════════════════════════════════ */}
      {activeTab === "Invoices" && (
        <Card>
          <SectionHead title="All Invoices"
            sub={`${invoices.length} total · ${invoices.filter(i=>i.status==="paid").length} paid · ${invoices.filter(i=>i.status==="pending"||i.status==="overdue").length} outstanding`}
            action={<SearchInput value={invSearch} onChange={setInvSearch} placeholder="Search invoices…" />}
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                {["Invoice #","Client","Project","Description","Amount","Status","Issue Date","Due Date","Paid Date"].map(h => <TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvoices.length === 0
                  ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No invoices found.</td></tr>
                  : filteredInvoices.map(inv => {
                    const client = clients.find(c => c.id === inv.clientId);
                    const project = projects.find(p => p.id === inv.projectId);
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{inv.number}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{client?.companyName||client?.company||inv.clientId}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{project?.name||inv.projectId||"—"}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{inv.description||"—"}</td>
                        <td className="px-3 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">${inv.amount.toLocaleString()}</td>
                        <td className="px-3 py-3"><Badge text={inv.status} /></td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{inv.issueDate}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{inv.dueDate}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{inv.paidDate||"—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total invoiced: <strong className="text-gray-900 dark:text-white">${invoices.reduce((s,i)=>s+i.amount,0).toLocaleString()}</strong></span>
            <span className="text-gray-500 dark:text-gray-400">Outstanding: <strong className="text-orange-600">${invoices.filter(i=>i.status!=="paid").reduce((s,i)=>s+i.amount,0).toLocaleString()}</strong></span>
          </div>
        </Card>
      )}

      {/* ══ TRANSACTIONS ══════════════════════════════════════════════════════ */}
      {activeTab === "Transactions" && (
        <Card>
          <SectionHead title="All Transactions"
            sub={`${payments.length} total · $${totalRevenue.toLocaleString()} total revenue`}
            action={<SearchInput value={txSearch} onChange={setTxSearch} placeholder="Search ID / method…" />}
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                {["Transaction ID","Amount","Currency","Method","Invoice","Status","Date"].map(h => <TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTx.length === 0
                  ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No transactions found.</td></tr>
                  : filteredTx.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.transactionId}</td>
                      <td className="px-3 py-3 font-bold text-green-600 dark:text-green-400 whitespace-nowrap">${Number(p.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 uppercase">{p.currency||"USD"}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300 capitalize whitespace-nowrap">{p.method}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.invoiceId||"—"}</td>
                      <td className="px-3 py-3"><Badge text={p.status||"completed"} /></td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(p.created_at||p.date||"").toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Total: <span className="text-green-600 dark:text-green-400">${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
            </span>
          </div>
        </Card>
      )}

      {/* ══ CAMPAIGNS ═════════════════════════════════════════════════════════ */}
      {activeTab === "Campaigns" && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-px">
            {([["marketing","Marketing Campaigns"],["sales","Sales Campaigns"],["targets","Sales Targets"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setCampTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${campTab===key ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {label}
              </button>
            ))}
          </div>

          {campTab === "marketing" && (
            <Card>
              <SectionHead title="Marketing Campaigns"
                sub={`${mktCampaigns.length} total · ${mktCampaigns.filter(c=>c.status==="Active").length} active`}
              />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                    {["Name","Platform","Status","Budget","Spent","Remaining","Impressions","Clicks","Conversions","Dates"].map(h => <TH key={h}>{h}</TH>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {mktCampaigns.length === 0
                      ? <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">No marketing campaigns.</td></tr>
                      : mktCampaigns.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{c.name}</td>
                          <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{c.platform||"—"}</td>
                          <td className="px-3 py-3"><Badge text={c.status} /></td>
                          <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">${c.budget.toLocaleString()}</td>
                          <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">${c.spent.toLocaleString()}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={c.budget-c.spent >= 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                              ${(c.budget-c.spent).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{c.impressions?.toLocaleString()||"—"}</td>
                          <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{c.clicks?.toLocaleString()||"—"}</td>
                          <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{c.conversions?.toLocaleString()||"—"}</td>
                          <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{c.startDate||"—"} → {c.endDate||"—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {campTab === "sales" && (
            <Card>
              <SectionHead title="Sales Campaigns"
                sub={`${salesCampaigns.length} total · $${salesCampaigns.reduce((s,c)=>s+c.totalBudget,0).toLocaleString()} total budget`}
              />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                    {["Campaign Name","Status","Total Budget","Spent","Remaining","Utilisation","Dates","Notes"].map(h => <TH key={h}>{h}</TH>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {salesCampaigns.length === 0
                      ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No sales campaigns.</td></tr>
                      : salesCampaigns.map(c => {
                        const pct = c.totalBudget > 0 ? Math.round((c.budgetSpent/c.totalBudget)*100) : 0;
                        return (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{c.campaignName}</td>
                            <td className="px-3 py-3"><Badge text={c.status} /></td>
                            <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">${c.totalBudget.toLocaleString()}</td>
                            <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">${c.budgetSpent.toLocaleString()}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={c.totalBudget-c.budgetSpent>=0?"text-green-600 dark:text-green-400 font-medium":"text-red-600 dark:text-red-400 font-medium"}>
                                ${(c.totalBudget-c.budgetSpent).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${pct>=100?"bg-red-500":"bg-brand-500"}`} style={{width:`${Math.min(pct,100)}%`}} />
                                </div>
                                <span className="text-xs text-gray-500">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{c.startDate||"—"} → {c.endDate||"—"}</td>
                            <td className="px-3 py-3 text-gray-400 text-xs max-w-[200px] truncate">{c.notes||"—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {campTab === "targets" && (
            <Card>
              <SectionHead title="Sales Targets"
                sub={`${salesTargets.length} targets · ${salesTargets.filter(t=>t.achievedAmount>=t.monthlyTarget).length} on track`}
              />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                    {["Member","Period","Monthly Target","Quarterly Target","Annual Target","Achieved","Progress","Status"].map(h => <TH key={h}>{h}</TH>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {salesTargets.length === 0
                      ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No sales targets.</td></tr>
                      : salesTargets.map(t => {
                        const pct = t.monthlyTarget > 0 ? Math.round((t.achievedAmount/t.monthlyTarget)*100) : 0;
                        const onTrack = t.achievedAmount >= t.monthlyTarget;
                        return (
                          <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{t.memberName}</td>
                            <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{t.period}</td>
                            <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">${t.monthlyTarget.toLocaleString()}</td>
                            <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">${t.quarterlyTarget.toLocaleString()}</td>
                            <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">${t.annualTarget?.toLocaleString()||"—"}</td>
                            <td className="px-3 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">${t.achievedAmount.toLocaleString()}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 min-w-[100px]">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${onTrack?"bg-green-500":"bg-brand-500"}`} style={{width:`${Math.min(pct,100)}%`}} />
                                </div>
                                <span className="text-xs text-gray-500">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <Badge text={onTrack ? "On Track" : "Behind"} color={onTrack ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══ DELIVERABLES ══════════════════════════════════════════════════════ */}
      {activeTab === "Deliverables" && (
        <Card>
          <SectionHead title="All Deliverables"
            sub={`${deliverables.length} total · ${deliverables.filter(d=>d.status==="Approved").length} approved · ${deliverables.filter(d=>d.status==="In Progress").length} in progress`}
            action={<SearchInput value={delivSearch} onChange={setDelivSearch} placeholder="Search deliverables…" />}
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                {["Title","Description","Client","Project","Status","Due Date","Uploaded By","Approved By","Uploaded At"].map(h => <TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDeliverables.length === 0
                  ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No deliverables found.</td></tr>
                  : filteredDeliverables.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{d.title}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{d.description||"—"}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{d.clientName||"—"}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{d.projectName||"—"}</td>
                      <td className="px-3 py-3"><Badge text={d.status} /></td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{d.dueDate||"—"}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{d.uploadedByName||"—"}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{d.approvedByName||"—"}</td>
                      <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══ EMAIL ═════════════════════════════════════════════════════════════ */}
      {activeTab === "Email" && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-px">
            {([["campaigns","Campaigns"],["templates","Templates"],["automations","Automations"]] as const).map(([key,label]) => (
              <button key={key} onClick={() => setEmailTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${emailTab===key ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {label} ({key==="campaigns"?emailCampaigns.length:key==="templates"?emailTemplates.length:emailAutomations.length})
              </button>
            ))}
          </div>

          {emailTab === "campaigns" && (
            <Card>
              <SectionHead title="Email Campaigns" sub={`${emailCampaigns.length} total · ${emailCampaigns.filter(c=>c.status==="sent").length} sent`} />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                    {["Name","Subject","Status","Sent","Opened","Clicked","Open Rate","Sent/Scheduled Date"].map(h => <TH key={h}>{h}</TH>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {emailCampaigns.length === 0
                      ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No email campaigns.</td></tr>
                      : emailCampaigns.map(c => {
                        const openRate = c.stats && c.stats.sent > 0 ? Math.round((c.stats.opened/c.stats.sent)*100) : 0;
                        return (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{c.name}</td>
                            <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{c.subject}</td>
                            <td className="px-3 py-3"><Badge text={c.status} /></td>
                            <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">{c.stats?.sent ?? 0}</td>
                            <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">{c.stats?.opened ?? 0}</td>
                            <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">{c.stats?.clicked ?? 0}</td>
                            <td className="px-3 py-3 text-center">
                              <Badge text={`${openRate}%`} color={openRate>=50?"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400":"bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"} />
                            </td>
                            <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{c.sentDate ? new Date(c.sentDate).toLocaleDateString() : c.scheduleDate ? `Scheduled: ${new Date(c.scheduleDate).toLocaleDateString()}` : "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {emailTab === "templates" && (
            <Card>
              <SectionHead title="Email Templates" sub={`${emailTemplates.length} templates`} />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                    {["Name","Subject","Type","Created"].map(h => <TH key={h}>{h}</TH>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {emailTemplates.length === 0
                      ? <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No templates.</td></tr>
                      : emailTemplates.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{t.name}</td>
                          <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{t.subject}</td>
                          <td className="px-3 py-3"><Badge text={t.type||"general"} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" /></td>
                          <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {emailTab === "automations" && (
            <Card>
              <SectionHead title="Email Automations" sub={`${emailAutomations.length} automations · ${emailAutomations.filter(a=>a.status==="active").length} active`} />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                    {["Name","Trigger","Delay (hrs)","Status"].map(h => <TH key={h}>{h}</TH>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {emailAutomations.length === 0
                      ? <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No automations.</td></tr>
                      : emailAutomations.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{a.name}</td>
                          <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{a.triggerType?.replace(/_/g," ")}</td>
                          <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">{a.delayHours ?? "—"}</td>
                          <td className="px-3 py-3"><Badge text={a.status} /></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══ LEAVE REQUESTS ════════════════════════════════════════════════════ */}
      {activeTab === "Leave Requests" && (
        <Card>
          <SectionHead title="Leave Requests"
            sub={`${leaveRequests.length} total · ${pendingLeaves} pending approval`}
            action={
              <div className="flex gap-1">
                {(["All","Pending","Approved","Rejected"] as const).map(f => (
                  <button key={f} onClick={() => setLeaveFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${leaveFilter===f ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                    {f}{f==="Pending"&&pendingLeaves>0?` (${pendingLeaves})`:""}
                  </button>
                ))}
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                {["Employee","Department","Type","Dates","Days","Reason","Submitted","Status","Actions"].map(h => <TH key={h}>{h}</TH>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeaves.length === 0
                  ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No leave requests in this filter.</td></tr>
                  : filteredLeaves.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{l.employeeName}</p>
                        <p className="text-xs text-gray-400">{l.role?.replace(/_/g," ")}</p>
                      </td>
                      <td className="px-3 py-3"><Badge text={l.department||getDept(l.role)} color={DEPT_COLORS[getDept(l.role)]} /></td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{l.type}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{l.startDate} → {l.endDate}</td>
                      <td className="px-3 py-3 text-center font-medium text-gray-700 dark:text-gray-300">{l.days}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 max-w-[180px] truncate">{l.reason}</td>
                      <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(l.submittedAt).toLocaleDateString()}</td>
                      <td className="px-3 py-3">
                        <Badge text={l.status}
                          color={l.status==="Approved"?"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400":l.status==="Rejected"?"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400":"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {l.status === "Pending"
                          ? <div className="flex gap-1">
                              <button onClick={() => handleLeaveAction(l.id,"Approved")} className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition">Approve</button>
                              <button onClick={() => handleLeaveAction(l.id,"Rejected")} className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition">Reject</button>
                            </div>
                          : <span className="text-xs text-gray-400 italic">Decided</span>
                        }
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══ CREATE USER MODAL ══════════════════════════════════════════════════ */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Create New User</h3>
                <p className="text-xs text-gray-500 mt-0.5">Super Admin can create any role</p>
              </div>
              <button onClick={() => setShowCreateUser(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createError && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg px-3 py-2">{createError}</div>}
              {([["Full Name","full_name","text"],["Email","email","email"],["Temporary Password","password","password"],["Company","company","text"]] as const).map(([label,key,type]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input type={type} required={key!=="company"} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={createForm[key]} onChange={e => setCreateForm(f => ({...f,[key]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={createForm.role} onChange={e => setCreateForm(f => ({...f,role:e.target.value}))}>
                  {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreateUser(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={createLoading} className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50">
                  {createLoading ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
