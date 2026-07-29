import { lazy, Suspense } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import ChangePassword from "./pages/AuthPages/ChangePassword";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import LoadingState from "./components/common/LoadingState";

// ── Dashboard panels ─────────────────────────────────────────────────────
const AdminPanel = lazy(() => import("./pages/Dashboard/AdminPanel"));
const ClientPanel = lazy(() => import("./pages/Dashboard/ClientPanel"));
const SuperAdminPanel = lazy(() => import("./pages/Dashboard/SuperAdminPanel"));
const SalesPanel = lazy(() => import("./pages/Dashboard/SalesPanel"));
const ProductionPanel = lazy(() => import("./pages/Dashboard/ProductionPanel"));
const MarketingPanel = lazy(() => import("./pages/Dashboard/MarketingPanel"));
const HRPanel = lazy(() => import("./pages/Dashboard/HRPanel"));
const ManagementPanel = lazy(() => import("./pages/Dashboard/ManagementPanel"));
const ITSupportPanel = lazy(() => import("./pages/Dashboard/ITSupportPanel"));

// ── HR pages ─────────────────────────────────────────────────────────────
const Employees = lazy(() => import("./pages/HR/Employees"));
const Payroll = lazy(() => import("./pages/HR/Payroll"));
const LeaveRequests = lazy(() => import("./pages/HR/LeaveRequests"));
const Attendance = lazy(() => import("./pages/HR/Attendance"));
const AttendanceMonthly = lazy(() => import("./pages/HR/AttendanceMonthly"));
const AttendanceYearly = lazy(() => import("./pages/HR/AttendanceYearly"));
const AttendanceAnalytics = lazy(() => import("./pages/HR/AttendanceAnalytics"));
const AttendanceCalendar = lazy(() => import("./pages/HR/AttendanceCalendar"));
const AttendancePayroll = lazy(() => import("./pages/HR/AttendancePayroll"));
const AttendanceCorrections = lazy(() => import("./pages/HR/AttendanceCorrections"));
const AttendanceImport = lazy(() => import("./pages/HR/AttendanceImport"));

// ── Admin / shared pages ──────────────────────────────────────────────────
const Clients = lazy(() => import("./pages/Admin/Clients"));
const Projects = lazy(() => import("./pages/Admin/Projects"));
const AdminBilling = lazy(() => import("./pages/Admin/Billing"));
const AdminFiles = lazy(() => import("./pages/Admin/Files"));
const AdminNotifications = lazy(() => import("./pages/Admin/Notifications"));
const AdminRevisions = lazy(() => import("./pages/Admin/Revisions"));
const Settings = lazy(() => import("./pages/Admin/Settings"));
const AuditLogs = lazy(() => import("./pages/Admin/AuditLogs"));
const SecurityAuditLogs = lazy(() => import("./pages/Admin/SecurityAuditLogs"));

// ── Email marketing pages ─────────────────────────────────────────────────
const Campaigns = lazy(() => import("./pages/Admin/Email/Campaigns"));
const Templates = lazy(() => import("./pages/Admin/Email/Templates"));
const Audience = lazy(() => import("./pages/Admin/Email/Audience"));
const Analytics = lazy(() => import("./pages/Admin/Email/Analytics"));
const Automation = lazy(() => import("./pages/Admin/Email/Automation"));

// ── Common feature pages ──────────────────────────────────────────────────
const Reports = lazy(() => import("./pages/Common/Reports"));
const Tasks = lazy(() => import("./pages/Common/Tasks"));
const ActivityReports = lazy(() => import("./pages/Common/ActivityReports"));
const LiveActivityDashboard = lazy(() => import("./pages/Common/LiveActivityDashboard"));

// ── Sales management pages ────────────────────────────────────────────────
const CampaignBudgets = lazy(() => import("./pages/Sales/CampaignBudgets"));
const SalesLeads = lazy(() => import("./pages/Sales/Leads"));
const SalesTargets = lazy(() => import("./pages/Sales/SalesTargets"));
const SalesTasks = lazy(() => import("./pages/Sales/SalesTasks"));
const TeamPerformance = lazy(() => import("./pages/Sales/TeamPerformance"));
const Commissions = lazy(() => import("./pages/Sales/Commissions"));

// ── Production pages ──────────────────────────────────────────────────────
const Deliverables = lazy(() => import("./pages/Production/Deliverables"));
const ClientOwnership = lazy(() => import("./pages/Production/ClientOwnership"));
const MyClients = lazy(() => import("./pages/Production/MyClients"));

// ── Marketing pages ───────────────────────────────────────────────────────
const SocialTracking = lazy(() => import("./pages/Marketing/SocialTracking"));
const MarketingLeads = lazy(() => import("./pages/Marketing/Leads"));
const ContentCalendar = lazy(() => import("./pages/Marketing/ContentCalendar"));

// ── Client Communication pages ────────────────────────────────────────────
const ClientConversations = lazy(() => import("./pages/Conversations/ClientConversations"));
const ClientMessages = lazy(() => import("./pages/Client/Messages"));

// ── Budget Management ─────────────────────────────────────────────────────
const BudgetManagement = lazy(() => import("./pages/Budget/BudgetManagement"));

// ── Payroll & Salary ──────────────────────────────────────────────────────
const SalarySlips = lazy(() => import("./pages/HR/SalarySlips"));
const BulkSalarySlips = lazy(() => import("./pages/HR/BulkSalarySlips"));
const AdvanceSalary = lazy(() => import("./pages/HR/AdvanceSalary"));
const AdvanceSalaryAuditLog = lazy(() => import("./pages/HR/AdvanceSalaryAuditLog"));
const MySalarySlips = lazy(() => import("./pages/Employee/MySalarySlips"));
const MyBudget = lazy(() => import("./pages/Employee/MyBudget"));
const AdvanceSalaryRequest = lazy(() => import("./pages/Employee/AdvanceSalaryRequest"));

// ── IT Support pages ─────────────────────────────────────────────────────
const AttendanceDashboard = lazy(() => import("./pages/ITSupport/AttendanceDashboard"));
const Devices = lazy(() => import("./pages/ITSupport/Devices"));
const DeviceLogs = lazy(() => import("./pages/ITSupport/DeviceLogs"));
const AttendanceExceptions = lazy(() => import("./pages/ITSupport/AttendanceExceptions"));
const AttendanceReports = lazy(() => import("./pages/ITSupport/AttendanceReports"));
const ITTickets = lazy(() => import("./pages/ITSupport/Tickets"));
const Punches = lazy(() => import("./pages/ITSupport/Punches"));
const BiometricMapping = lazy(() => import("./pages/ITSupport/BiometricMapping"));

// ── Admin feature pages ───────────────────────────────────────────────────
const Departments = lazy(() => import("./pages/Admin/Departments"));

// ── Client pages ──────────────────────────────────────────────────────────
const MyProjects = lazy(() => import("./pages/Client/MyProjects"));
const ClientBilling = lazy(() => import("./pages/Client/Billing"));
const ClientFiles = lazy(() => import("./pages/Client/Files"));
const ClientNotifications = lazy(() => import("./pages/Client/Notifications"));
const MyRevisions = lazy(() => import("./pages/Client/MyRevisions"));
const Profile = lazy(() => import("./pages/Client/Profile"));

// ── Auth guards ───────────────────────────────────────────────────────────
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";

/** Full-page fallback while a lazy route chunk loads — matches the loading UI already used elsewhere (LoadingState), so a first visit to any route reads like a normal load, not a redesign. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingState label="Loading page..." />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <Router>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Root → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Public ──────────────────────────────────────────────────── */}
        <Route element={<PublicRoute />}>
          <Route path="/login"          element={<SignIn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Any authenticated user, regardless of role — reachable even
            while must-change-password is blocking every other route. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>

        {/* ── Protected (inside AppLayout) ─────────────────────────── */}
        <Route element={<AppLayout />}>

          {/* ── SUPER ADMIN ───────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="system" allowedRoles={["super_admin"]} />}>
            <Route path="/super-admin"             element={<Navigate to="/super-admin/dashboard" replace />} />
            <Route path="/super-admin/dashboard"   element={<SuperAdminPanel />} />
            <Route path="/super-admin/departments" element={<Departments />} />
          </Route>

          {/* Super admin shares the full admin panel routes */}
          <Route element={<ProtectedRoute allowedDomain="system" allowedRoles={["super_admin"]} />}>
            <Route path="/admin"                       element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard"             element={<AdminPanel />} />
            <Route path="/admin/clients"               element={<Clients />} />
            <Route path="/admin/projects"              element={<Projects />} />
            <Route path="/admin/billing"               element={<AdminBilling />} />
            <Route path="/admin/files"                 element={<AdminFiles />} />
            <Route path="/admin/notifications"         element={<AdminNotifications />} />
            <Route path="/admin/revisions"             element={<AdminRevisions />} />
            <Route path="/admin/settings"              element={<Settings />} />
            <Route path="/admin/reports"               element={<Reports />} />
            <Route path="/admin/audit-logs"            element={<AuditLogs />} />
            <Route path="/admin/security-audit-logs"   element={<SecurityAuditLogs />} />
            <Route path="/admin/commissions"          element={<Commissions />} />
            <Route path="/admin/email/campaigns"       element={<Campaigns />} />
            <Route path="/admin/email/templates"       element={<Templates />} />
            <Route path="/admin/email/audience"        element={<Audience />} />
            <Route path="/admin/email/analytics"       element={<Analytics />} />
            <Route path="/admin/email/automation"      element={<Automation />} />
            <Route path="/admin/users"                 element={<Employees />} />
          </Route>

          {/* ── SALES ─────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin", "sales_member"]} />}>
            <Route path="/sales"                    element={<Navigate to="/sales/dashboard" replace />} />
            <Route path="/sales/dashboard"          element={<SalesPanel />} />
            <Route path="/sales/leads"              element={<SalesLeads />} />
            <Route path="/sales/clients"            element={<Clients />} />
            <Route path="/sales/tasks"              element={<SalesTasks />} />
            <Route path="/sales/targets"            element={<SalesTargets />} />
            <Route element={<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin"]} />}>
              <Route path="/sales/campaigns"          element={<CampaignBudgets />} />
              <Route path="/sales/team-performance"   element={<TeamPerformance />} />
            </Route>
            <Route path="/sales/commissions"        element={<Commissions />} />
            <Route path="/sales/reports"            element={<Reports />} />
            <Route path="/sales/files"              element={<AdminFiles />} />
            <Route element={<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin"]} />}>
              <Route path="/sales/billing"          element={<AdminBilling />} />
            </Route>
            <Route path="/sales/notifications"      element={<AdminNotifications />} />
            <Route path="/sales/settings"           element={<Settings />} />
            <Route path="/sales/profile"            element={<Profile />} />
            <Route element={<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin", "hr_admin", "management"]} />}>
              <Route path="/sales/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── PRODUCTION ────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="production" allowedRoles={["production_admin", "production_member"]} />}>
            <Route path="/production"                    element={<Navigate to="/production/dashboard" replace />} />
            <Route path="/production/dashboard"          element={<ProductionPanel />} />
            <Route path="/production/content-requests"   element={<ContentCalendar />} />
            <Route path="/production/projects"           element={<Projects />} />
            <Route path="/production/tasks"              element={<Tasks />} />
            <Route path="/production/deliverables"       element={<Deliverables />} />
            <Route path="/production/files"              element={<AdminFiles />} />
            <Route path="/production/reports"            element={<Reports />} />
            <Route path="/production/revisions"          element={<AdminRevisions />} />
            <Route path="/production/notifications"      element={<AdminNotifications />} />
            <Route path="/production/settings"           element={<Settings />} />
            <Route path="/production/profile"            element={<Profile />} />
            <Route path="/production/my-clients"         element={<MyClients />} />
            <Route element={<ProtectedRoute allowedDomain="production" allowedRoles={["production_admin", "hr_admin", "management"]} />}>
              <Route path="/production/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── CLIENT OWNERSHIP — super_admin, management, production_admin ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "production_admin"]} />}>
            <Route path="/production/client-ownership" element={<ClientOwnership />} />
          </Route>

          {/* ── MARKETING ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="marketing" allowedRoles={["marketing_admin", "marketing_member"]} />}>
            <Route path="/marketing"                       element={<Navigate to="/marketing/dashboard" replace />} />
            <Route path="/marketing/dashboard"             element={<MarketingPanel />} />
            <Route path="/marketing/leads"                 element={<MarketingLeads />} />
            <Route path="/marketing/content-calendar"      element={<ContentCalendar />} />
            <Route path="/marketing/tasks"                 element={<Tasks />} />
            <Route path="/marketing/social"               element={<SocialTracking />} />
            <Route path="/marketing/reports"               element={<Reports />} />
            <Route path="/marketing/files"                 element={<AdminFiles />} />
            <Route path="/marketing/notifications"         element={<AdminNotifications />} />
            <Route path="/marketing/email/campaigns"       element={<Campaigns />} />
            <Route path="/marketing/email/templates"       element={<Templates />} />
            <Route path="/marketing/email/audience"        element={<Audience />} />
            <Route element={<ProtectedRoute allowedDomain="marketing" allowedRoles={["marketing_admin"]} />}>
              <Route path="/marketing/email/analytics"     element={<Analytics />} />
              <Route path="/marketing/email/automation"    element={<Automation />} />
            </Route>
            <Route path="/marketing/settings"              element={<Settings />} />
            <Route path="/marketing/profile"               element={<Profile />} />
            <Route element={<ProtectedRoute allowedDomain="marketing" allowedRoles={["marketing_admin", "hr_admin", "management"]} />}>
              <Route path="/marketing/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── HR ────────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "hr_member"]} />}>
            <Route path="/hr"               element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="/hr/dashboard"     element={<HRPanel />} />
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "management"]} />}>
              <Route path="/hr/users" element={<Employees />} />
            </Route>
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "super_admin"]} />}>
              <Route path="/hr/payroll"        element={<Payroll />} />
            </Route>
            <Route path="/hr/leave"          element={<LeaveRequests />} />
            <Route path="/hr/attendance"         element={<Attendance />} />
            <Route path="/hr/attendance/monthly" element={<AttendanceMonthly />} />
            <Route path="/hr/attendance/yearly"  element={<AttendanceYearly />} />
            <Route path="/hr/attendance/analytics"   element={<AttendanceAnalytics />} />
            <Route path="/hr/attendance/calendar"    element={<AttendanceCalendar />} />
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "management"]} />}>
              <Route path="/hr/attendance/payroll" element={<AttendancePayroll />} />
            </Route>
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["super_admin"]} />}>
              <Route path="/hr/attendance/corrections" element={<AttendanceCorrections />} />
            </Route>
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["super_admin", "hr_admin"]} />}>
              <Route path="/hr/attendance/import" element={<AttendanceImport />} />
            </Route>
            <Route path="/hr/tasks"          element={<Tasks />} />
            <Route path="/hr/files"          element={<AdminFiles />} />
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "super_admin"]} />}>
              <Route path="/hr/settings"       element={<Settings />} />
              <Route path="/hr/reports"        element={<Reports />} />
            </Route>
            <Route path="/hr/notifications"  element={<AdminNotifications />} />
            <Route path="/hr/profile"        element={<Profile />} />
          </Route>

          {/* ── MANAGEMENT ────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="reports" allowedRoles={["management"]} />}>
            <Route path="/management"                element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/dashboard"      element={<ManagementPanel />} />
            <Route path="/management/projects"       element={<Projects />} />
            <Route path="/management/clients"        element={<Clients />} />
            <Route path="/management/billing"        element={<AdminBilling />} />
            <Route path="/management/reports"        element={<Reports />} />
            <Route path="/management/tasks"          element={<Tasks />} />
            <Route path="/management/notifications"  element={<AdminNotifications />} />
            <Route path="/management/audit-logs"     element={<AuditLogs />} />
            <Route path="/management/deliverables"   element={<Deliverables />} />
            <Route path="/management/revisions"      element={<AdminRevisions />} />
            <Route path="/management/files"          element={<AdminFiles />} />
            <Route path="/management/profile"        element={<Profile />} />
            <Route element={<ProtectedRoute allowedDomain="reports" allowedRoles={["management"]} />}>
              <Route path="/management/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── CLIENT CONVERSATIONS — management/super_admin + marketing/production depts only.
               Sales Admin/Sales Member explicitly excluded from viewing client messages/history. ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "marketing_admin", "marketing_member", "production_admin", "production_member"]} />}>
            <Route path="/conversations" element={<ClientConversations />} />
          </Route>

          {/* ── BUDGET MANAGEMENT ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "production_admin", "marketing_admin", "hr_admin", "it_admin"]} />}>
            <Route path="/budget" element={<BudgetManagement />} />
          </Route>

          {/* ── MY BUDGET — member-level personal budget view ─────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["sales_member", "production_member", "marketing_member", "hr_member", "it_member"]} />}>
            <Route path="/my-budget" element={<MyBudget />} />
          </Route>

          {/* ── PAYROLL / SALARY SLIPS (admin view) ───────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "hr_admin"]} />}>
            <Route path="/hr/salary-slips"    element={<SalarySlips />} />
            <Route path="/hr/advance-salary"  element={<AdvanceSalary />} />
          </Route>

          {/* ── ADVANCE SALARY AUDIT LOG — Super Admin & HR Admin only ─────── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "hr_admin"]} />}>
            <Route path="/hr/advance-salary/audit" element={<AdvanceSalaryAuditLog />} />
          </Route>

          {/* ── BULK SALARY SLIP GENERATION — Super Admin & HR Admin only ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "hr_admin"]} />}>
            <Route path="/hr/bulk-salary-slips" element={<BulkSalarySlips />} />
          </Route>

          {/* ── SALARY SLIPS + ADVANCE — all internal employees including IT ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "sales_member", "production_admin", "production_member", "marketing_admin", "marketing_member", "hr_admin", "hr_member", "it_admin", "it_member"]} />}>
            <Route path="/salary-slips"       element={<MySalarySlips />} />
            <Route path="/advance-salary"     element={<AdvanceSalaryRequest />} />
          </Route>

          {/* ── IT TICKETS — all internal staff (non-client) can submit ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "sales_member", "production_admin", "production_member", "marketing_admin", "marketing_member", "hr_admin", "hr_member", "it_admin", "it_member"]} />}>
            <Route path="/it/tickets" element={<ITTickets />} />
          </Route>

          {/* ── ACTIVITY REPORTS — Super Admin, Management, HR Admin (all), dept admins (own dept, server-scoped) ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "hr_admin", "sales_admin", "production_admin", "marketing_admin", "it_admin"]} />}>
            <Route path="/activity/reports" element={<ActivityReports />} />
          </Route>

          {/* ── LIVE ACTIVITY DASHBOARD — every internal (non-client) role; members see only themselves, server-scoped ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "sales_member", "production_admin", "production_member", "marketing_admin", "marketing_member", "hr_admin", "hr_member", "it_admin", "it_member"]} />}>
            <Route path="/activity/live" element={<LiveActivityDashboard />} />
          </Route>

          {/* ── IT SUPPORT ────────────────────────────────────────── */}
          {/* No billing / payroll / salary / financial routes exposed here. */}
          <Route element={<ProtectedRoute allowedDomain="it_support" allowedRoles={["it_admin", "it_member"]} />}>
            <Route path="/it"               element={<Navigate to="/it/dashboard" replace />} />
            <Route path="/it/dashboard"     element={<ITSupportPanel />} />
            <Route path="/it/attendance"    element={<AttendanceDashboard />} />
            <Route path="/it/devices"       element={<Devices />} />
            <Route path="/it/device-logs"   element={<DeviceLogs />} />
            <Route path="/it/punches"       element={<Punches />} />
            <Route path="/it/biometric-mapping" element={<BiometricMapping />} />
            <Route path="/it/exceptions"    element={<AttendanceExceptions />} />
            <Route path="/it/reports"       element={<AttendanceReports />} />
            <Route path="/it/notifications" element={<AdminNotifications />} />
            <Route path="/it/profile"       element={<Profile />} />
          </Route>

          {/* ── CLIENT ────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="clients" allowedRoles={["client"]} />}>
            <Route path="/client"               element={<Navigate to="/client/dashboard" replace />} />
            <Route path="/client/dashboard"     element={<ClientPanel />} />
            <Route path="/client/projects"      element={<MyProjects />} />
            <Route path="/client/billing"       element={<ClientBilling />} />
            <Route path="/client/files"         element={<ClientFiles />} />
            <Route path="/client/notifications" element={<ClientNotifications />} />
            <Route path="/client/messages"      element={<ClientMessages />} />
            <Route path="/client/revisions"     element={<MyRevisions />} />
            <Route path="/client/profile"       element={<Profile />} />
          </Route>

        </Route>{/* end AppLayout */}

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </Router>
    </ErrorBoundary>
  );
}
