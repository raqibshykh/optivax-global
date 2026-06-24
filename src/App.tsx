import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ── Dashboard panels ─────────────────────────────────────────────────────
import AdminPanel from "./pages/Dashboard/AdminPanel";
import ClientPanel from "./pages/Dashboard/ClientPanel";
import SuperAdminPanel from "./pages/Dashboard/SuperAdminPanel";
import SalesPanel from "./pages/Dashboard/SalesPanel";
import ProductionPanel from "./pages/Dashboard/ProductionPanel";
import MarketingPanel from "./pages/Dashboard/MarketingPanel";
import HRPanel from "./pages/Dashboard/HRPanel";
import ManagementPanel from "./pages/Dashboard/ManagementPanel";
import ITSupportPanel from "./pages/Dashboard/ITSupportPanel";

// ── HR pages ─────────────────────────────────────────────────────────────
import Employees from "./pages/HR/Employees";
import Payroll from "./pages/HR/Payroll";
import LeaveRequests from "./pages/HR/LeaveRequests";
import Attendance from "./pages/HR/Attendance";

// ── Admin / shared pages ──────────────────────────────────────────────────
import Clients from "./pages/Admin/Clients";
import Projects from "./pages/Admin/Projects";
import AdminBilling from "./pages/Admin/Billing";
import AdminFiles from "./pages/Admin/Files";
import AdminNotifications from "./pages/Admin/Notifications";
import AdminRevisions from "./pages/Admin/Revisions";
import Settings from "./pages/Admin/Settings";
import AuditLogs from "./pages/Admin/AuditLogs";

// ── Email marketing pages ─────────────────────────────────────────────────
import Campaigns from "./pages/Admin/Email/Campaigns";
import Templates from "./pages/Admin/Email/Templates";
import Audience from "./pages/Admin/Email/Audience";
import Analytics from "./pages/Admin/Email/Analytics";
import Automation from "./pages/Admin/Email/Automation";

// ── Common feature pages ──────────────────────────────────────────────────
import Reports from "./pages/Common/Reports";
import Tasks from "./pages/Common/Tasks";

// ── Sales management pages ────────────────────────────────────────────────
import CampaignBudgets from "./pages/Sales/CampaignBudgets";
import SalesLeads from "./pages/Sales/Leads";
import SalesTargets from "./pages/Sales/SalesTargets";
import SalesTasks from "./pages/Sales/SalesTasks";
import TeamPerformance from "./pages/Sales/TeamPerformance";
import Commissions from "./pages/Sales/Commissions";

// ── Production pages ──────────────────────────────────────────────────────
import Deliverables from "./pages/Production/Deliverables";

// ── Marketing pages ───────────────────────────────────────────────────────
import SocialTracking from "./pages/Marketing/SocialTracking";
import MarketingLeads from "./pages/Marketing/Leads";

// ── Client Communication pages ────────────────────────────────────────────
import ClientConversations from "./pages/Conversations/ClientConversations";
import ClientMessages from "./pages/Client/Messages";

// ── Budget Management ─────────────────────────────────────────────────────
import BudgetManagement from "./pages/Budget/BudgetManagement";

// ── Payroll & Salary ──────────────────────────────────────────────────────
import SalarySlips from "./pages/HR/SalarySlips";
import BulkSalarySlips from "./pages/HR/BulkSalarySlips";
import AdvanceSalary from "./pages/HR/AdvanceSalary";
import MySalarySlips from "./pages/Employee/MySalarySlips";
import MyBudget from "./pages/Employee/MyBudget";
import AdvanceSalaryRequest from "./pages/Employee/AdvanceSalaryRequest";

// ── IT Support pages ─────────────────────────────────────────────────────
import AttendanceDashboard from "./pages/ITSupport/AttendanceDashboard";
import Devices from "./pages/ITSupport/Devices";
import DeviceLogs from "./pages/ITSupport/DeviceLogs";
import AttendanceExceptions from "./pages/ITSupport/AttendanceExceptions";
import AttendanceReports from "./pages/ITSupport/AttendanceReports";
import ITTickets from "./pages/ITSupport/Tickets";

// ── Admin feature pages ───────────────────────────────────────────────────
import Departments from "./pages/Admin/Departments";

// ── Client pages ──────────────────────────────────────────────────────────
import MyProjects from "./pages/Client/MyProjects";
import ClientBilling from "./pages/Client/Billing";
import ClientFiles from "./pages/Client/Files";
import ClientNotifications from "./pages/Client/Notifications";
import MyRevisions from "./pages/Client/MyRevisions";
import Profile from "./pages/Client/Profile";

// ── Auth guards ───────────────────────────────────────────────────────────
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";

export default function App() {
  return (
    <ErrorBoundary>
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Root → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Public ──────────────────────────────────────────────────── */}
        <Route element={<PublicRoute />}>
          <Route path="/login"          element={<SignIn />} />
          <Route path="/signup"         element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/sales/campaigns"          element={<CampaignBudgets />} />
            <Route path="/sales/team-performance"   element={<TeamPerformance />} />
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
            <Route path="/production"               element={<Navigate to="/production/dashboard" replace />} />
            <Route path="/production/dashboard"     element={<ProductionPanel />} />
            <Route path="/production/projects"      element={<Projects />} />
            <Route path="/production/tasks"         element={<Tasks />} />
            <Route path="/production/deliverables"  element={<Deliverables />} />
            <Route path="/production/files"         element={<AdminFiles />} />
            <Route path="/production/reports"       element={<Reports />} />
            <Route path="/production/revisions"    element={<AdminRevisions />} />
            <Route path="/production/notifications" element={<AdminNotifications />} />
            <Route path="/production/settings"      element={<Settings />} />
            <Route path="/production/profile"       element={<Profile />} />
            <Route element={<ProtectedRoute allowedDomain="production" allowedRoles={["production_admin", "hr_admin", "management"]} />}>
              <Route path="/production/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── MARKETING ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="marketing" allowedRoles={["marketing_admin", "marketing_member"]} />}>
            <Route path="/marketing"                       element={<Navigate to="/marketing/dashboard" replace />} />
            <Route path="/marketing/dashboard"             element={<MarketingPanel />} />
            <Route path="/marketing/leads"                 element={<MarketingLeads />} />
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
            <Route path="/hr/payroll"        element={<Payroll />} />
            <Route path="/hr/leave"          element={<LeaveRequests />} />
            <Route path="/hr/attendance"     element={<Attendance />} />
            <Route path="/hr/tasks"          element={<Tasks />} />
            <Route path="/hr/files"          element={<AdminFiles />} />
            <Route path="/hr/settings"       element={<Settings />} />
            <Route path="/hr/reports"        element={<Reports />} />
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

          {/* ── CLIENT CONVERSATIONS — all client-facing depts + management/super_admin ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "sales_member", "marketing_admin", "marketing_member", "production_admin", "production_member"]} />}>
            <Route path="/conversations" element={<ClientConversations />} />
          </Route>

          {/* ── BUDGET MANAGEMENT ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "production_admin", "marketing_admin", "hr_admin", "it_admin"]} />}>
            <Route path="/budget" element={<BudgetManagement />} />
          </Route>

          {/* ── MY BUDGET — member-level personal budget view ─────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["sales_member", "production_member", "marketing_member", "hr_member"]} />}>
            <Route path="/my-budget" element={<MyBudget />} />
          </Route>

          {/* ── PAYROLL / SALARY SLIPS (admin view) ───────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "hr_admin"]} />}>
            <Route path="/hr/salary-slips"    element={<SalarySlips />} />
            <Route path="/hr/advance-salary"  element={<AdvanceSalary />} />
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

          {/* ── IT SUPPORT ────────────────────────────────────────── */}
          {/* No billing / payroll / salary / financial routes exposed here. */}
          <Route element={<ProtectedRoute allowedDomain="it_support" allowedRoles={["it_admin", "it_member"]} />}>
            <Route path="/it"               element={<Navigate to="/it/dashboard" replace />} />
            <Route path="/it/dashboard"     element={<ITSupportPanel />} />
            <Route path="/it/attendance"    element={<AttendanceDashboard />} />
            <Route path="/it/devices"       element={<Devices />} />
            <Route path="/it/device-logs"   element={<DeviceLogs />} />
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
    </Router>
    </ErrorBoundary>
  );
}
