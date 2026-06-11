import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

import AdminPanel from "./pages/Dashboard/AdminPanel";
import ClientPanel from "./pages/Dashboard/ClientPanel";
import SuperAdminPanel from "./pages/Dashboard/SuperAdminPanel";
import SalesPanel from "./pages/Dashboard/SalesPanel";
import ProductionPanel from "./pages/Dashboard/ProductionPanel";
import MarketingPanel from "./pages/Dashboard/MarketingPanel";
import HRPanel from "./pages/Dashboard/HRPanel";
import ManagementPanel from "./pages/Dashboard/ManagementPanel";

// Admin pages
import Clients from "./pages/Admin/Clients";
import Projects from "./pages/Admin/Projects";
import AdminBilling from "./pages/Admin/Billing";
import AdminFiles from "./pages/Admin/Files";
import AdminNotifications from "./pages/Admin/Notifications";
import AdminRevisions from "./pages/Admin/Revisions";
import Settings from "./pages/Admin/Settings";

// Admin Email Marketing Pages
import Campaigns from "./pages/Admin/Email/Campaigns";
import Templates from "./pages/Admin/Email/Templates";
import Audience from "./pages/Admin/Email/Audience";
import Analytics from "./pages/Admin/Email/Analytics";
import Automation from "./pages/Admin/Email/Automation";

// Client pages
import MyProjects from "./pages/Client/MyProjects";
import ClientBilling from "./pages/Client/Billing";
import ClientFiles from "./pages/Client/Files";
import ClientNotifications from "./pages/Client/Notifications";
import MyRevisions from "./pages/Client/MyRevisions";
import Profile from "./pages/Client/Profile";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Root Redirect to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route element={<AppLayout />}>

          {/* ================================================================
              SUPER ADMIN — full access (bypasses all role checks in ProtectedRoute)
          ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
            <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
            <Route path="/super-admin/dashboard" element={<SuperAdminPanel />} />
            <Route path="/super-admin/departments" element={<SuperAdminPanel />} />
          </Route>

          {/* Super admin can also access the admin panel */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminPanel />} />
            <Route path="/admin/clients" element={<Clients />} />
            <Route path="/admin/projects" element={<Projects />} />
            <Route path="/admin/billing" element={<AdminBilling />} />
            <Route path="/admin/files" element={<AdminFiles />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/revisions" element={<AdminRevisions />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/email/campaigns" element={<Campaigns />} />
            <Route path="/admin/email/templates" element={<Templates />} />
            <Route path="/admin/email/audience" element={<Audience />} />
            <Route path="/admin/email/analytics" element={<Analytics />} />
            <Route path="/admin/email/automation" element={<Automation />} />
          </Route>

          {/* ================================================================
              SALES ADMIN
          ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["sales_admin"]} />}>
            <Route path="/sales" element={<Navigate to="/sales/dashboard" replace />} />
            <Route path="/sales/dashboard" element={<SalesPanel />} />
            {/* Sales can also view shared pages */}
            <Route path="/sales/projects" element={<Projects />} />
            <Route path="/sales/billing" element={<AdminBilling />} />
            <Route path="/sales/notifications" element={<AdminNotifications />} />
          </Route>

          {/* ================================================================
              PRODUCTION ADMIN
          ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["production_admin"]} />}>
            <Route path="/production" element={<Navigate to="/production/dashboard" replace />} />
            <Route path="/production/dashboard" element={<ProductionPanel />} />
            <Route path="/production/projects" element={<Projects />} />
            <Route path="/production/notifications" element={<AdminNotifications />} />
            <Route path="/production/files" element={<AdminFiles />} />
          </Route>

          {/* ================================================================
              MARKETING ADMIN
          ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["marketing_admin"]} />}>
            <Route path="/marketing" element={<Navigate to="/marketing/dashboard" replace />} />
            <Route path="/marketing/dashboard" element={<MarketingPanel />} />
            <Route path="/marketing/notifications" element={<AdminNotifications />} />
            <Route path="/marketing/email/campaigns" element={<Campaigns />} />
            <Route path="/marketing/email/templates" element={<Templates />} />
            <Route path="/marketing/email/audience" element={<Audience />} />
            <Route path="/marketing/email/analytics" element={<Analytics />} />
            <Route path="/marketing/email/automation" element={<Automation />} />
          </Route>

          {/* ================================================================
              HR ADMIN
          ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["hr_admin"]} />}>
            <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="/hr/dashboard" element={<HRPanel />} />
            <Route path="/hr/users" element={<Clients />} /> {/* Reusing Clients view for now */}
            <Route path="/hr/departments" element={<NotFound />} />
            <Route path="/hr/notifications" element={<AdminNotifications />} />
          </Route>

          {/* ================================================================
              MANAGEMENT
          ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["management"]} />}>
            <Route path="/management" element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/dashboard" element={<ManagementPanel />} />
            <Route path="/management/projects" element={<Projects />} />
            <Route path="/management/billing" element={<AdminBilling />} />
            <Route path="/management/reports" element={<NotFound />} />
            <Route path="/management/notifications" element={<AdminNotifications />} />
          </Route>

          {/* ================================================================
              CLIENT
          ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
            <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
            <Route path="/client/dashboard" element={<ClientPanel />} />
            <Route path="/client/projects" element={<MyProjects />} />
            <Route path="/client/billing" element={<ClientBilling />} />
            <Route path="/client/files" element={<ClientFiles />} />
            <Route path="/client/notifications" element={<ClientNotifications />} />
            <Route path="/client/revisions" element={<MyRevisions />} />
            <Route path="/client/profile" element={<Profile />} />
          </Route>

        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
