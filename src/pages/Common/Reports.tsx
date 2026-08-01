import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
import { api } from "../../lib/client";
import { exportCSV } from "../../lib/csvExport";

import { UserService, type UserProfile } from "../../services/userService";
import { DepartmentService, type Department } from "../../services/departmentService";
import { ProjectService } from "../../services/projectService";
import { TaskService } from "../../services/taskService";
import { ClientService } from "../../services/clientService";
import { InvoiceService } from "../../services/invoiceService";
import {
  BudgetService, getCompanyBudgetStats, getDeptBudgetSummaries,
  type CompanyBudget, type DeptAllocation, type MemberAllocation,
} from "../../services/budgetService";
import { PayrollService, getPayrollStats, type SalarySlip } from "../../services/payrollService";
import { AttendanceService, computeYearlyReport, type AttendanceRecord } from "../../services/attendanceService";
import { LeaveRequestService, type HRLeaveRequest, type LeaveRequest } from "../../services/leaveRequestService";
import { NotificationService } from "../../services/notificationService";
import { getActivityStats, type ActivitySession } from "../../types/activity";
import type { Project, Task, Client, Invoice, Notification } from "../../types";

// Routes this component actually serves (src/App.tsx): /admin/reports,
// /sales/reports, /production/reports, /marketing/reports, /hr/reports,
// /management/reports. /it/reports is a different page
// (ITSupport/AttendanceReports.tsx) — no "it" domain reaches this component.
type ReportDomain = "admin" | "sales" | "production" | "marketing" | "hr" | "management";

const DOMAIN_DEPT_ID: Record<string, string> = {
  sales: "dept-sales",
  production: "dept-production",
  marketing: "dept-marketing",
  hr: "dept-hr",
};
const DOMAIN_DEPT_LABEL: Record<string, string> = {
  sales: "Sales",
  production: "Production",
  marketing: "Marketing",
  hr: "HR",
};

function fmtMoney(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

interface KpiCard {
  label: string;
  value: string;
  color: string;
}

export default function Reports() {
  const { canView, canExport } = useAuth();
  const location = useLocation();

  const domain = useMemo<ReportDomain | null>(() => {
    const seg = location.pathname.split("/").filter(Boolean)[0];
    const known: ReportDomain[] = ["admin", "sales", "production", "marketing", "hr", "management"];
    return (known as string[]).includes(seg) ? (seg as ReportDomain) : null;
  }, [location.pathname]);

  const isCompanyWide = domain === "admin" || domain === "management" || domain === null;

  // Each flag is ANDed with canView() on the RBAC domain that actually gates
  // the underlying API call (see the comment on each line for which
  // controller/route enforces it) — the route/domain heuristic above only
  // decides which sections a report *page* is scoped to show; it does not
  // guarantee the viewer's role holds the RBAC grant that section's data
  // requires. Previously this wasn't checked, so a role reaching a
  // company-wide (or "hr") report page that lacked one of these grants (e.g.
  // management holding no 'hr' domain, by design, or sales_admin holding no
  // 'production' domain) got a 403 buried inside loadData()'s single
  // Promise.all — which sank the ENTIRE Reports page instead of just hiding
  // the one section that role isn't authorized for. Gating on the real
  // permission fixes that: unauthorized sections are simply never fetched or
  // shown, exactly like every other RBAC-gated part of this app.
  const needs = useMemo(() => ({
    employees:    (isCompanyWide || domain === "hr") && canView("employees"),      // ProfileController::list() — open, but mirrors the 'employees' domain conceptually
    departments:  isCompanyWide || domain === "hr",                                 // DepartmentRoutes.php /departments/list — auth-only (every authenticated user needs department names for display), no domain gate
    attendance:   (isCompanyWide || domain === "hr") && canView("hr"),              // AttendanceController::year() -> 'hr' VIEW
    leave:        (isCompanyWide || domain === "hr") && canView("employee_leave"),  // LeaveRequestController -> 'employee_leave' VIEW
    payroll:      (isCompanyWide || domain === "hr") && canView("salary_slips"),    // PayrollController::listSalarySlips() -> 'salary_slips' VIEW
    activity:     isCompanyWide || domain === "hr",                                 // /activity/sessions — auth only, no domain gate
    clients:      (isCompanyWide || domain === "sales") && canView("clients"),      // ClientRoutes.php -> 'clients' VIEW
    invoices:     (isCompanyWide || domain === "sales") && canView("billing"),      // InvoiceController -> 'billing' VIEW
    tasks:        (isCompanyWide || domain === "sales" || domain === "production" || domain === "marketing") && canView("production"), // TaskRoutes.php -> 'production' VIEW
    projects:     (isCompanyWide || domain === "production") && canView("production"), // ProjectRoutes.php -> 'production' VIEW
    budget:       (isCompanyWide || domain === "production" || domain === "marketing") && canView("budget"), // BudgetController -> 'budget' VIEW
    notifications: isCompanyWide && canView("notifications"),                       // NotificationRoutes.php -> 'notifications' VIEW
  }), [isCompanyWide, domain, canView]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [hrLeave, setHrLeave] = useState<HRLeaveRequest[]>([]);
  const [employeeLeave, setEmployeeLeave] = useState<LeaveRequest[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companyBudget, setCompanyBudget] = useState<CompanyBudget | null>(null);
  const [deptAllocations, setDeptAllocations] = useState<DeptAllocation[]>([]);
  const [memberAllocations, setMemberAllocations] = useState<MemberAllocation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const year = new Date().getFullYear();
      const [
        usersRes, departmentsRes, attendanceRes, hrLeaveRes, employeeLeaveRes, slipsRes,
        sessionsRes, clientsRes, invoicesRes, tasksRes, projectsRes,
        companyBudgetRes, deptAllocationsRes, memberAllocationsRes, notificationsRes,
      ] = await Promise.all([
        needs.employees ? UserService.getAll() : Promise.resolve<UserProfile[]>([]),
        needs.departments ? DepartmentService.getAll() : Promise.resolve<Department[]>([]),
        needs.attendance ? AttendanceService.getYearData(year) : Promise.resolve<AttendanceRecord[]>([]),
        needs.leave ? LeaveRequestService.getAll() : Promise.resolve<HRLeaveRequest[]>([]),
        needs.leave ? LeaveRequestService.getEmployeeRequests() : Promise.resolve<LeaveRequest[]>([]),
        needs.payroll ? PayrollService.getSalarySlips() : Promise.resolve<SalarySlip[]>([]),
        needs.activity
          ? api.get<{ sessions: ActivitySession[] }>("/saas/v1/activity/sessions", {})
          : Promise.resolve<{ sessions: ActivitySession[] }>({ sessions: [] }),
        needs.clients ? ClientService.getAll() : Promise.resolve<Client[]>([]),
        needs.invoices ? InvoiceService.getAll() : Promise.resolve<Invoice[]>([]),
        needs.tasks ? TaskService.getAll() : Promise.resolve<Task[]>([]),
        needs.projects ? ProjectService.getAll() : Promise.resolve<Project[]>([]),
        needs.budget ? BudgetService.getCompanyBudget() : Promise.resolve<CompanyBudget | null>(null),
        needs.budget ? BudgetService.getDeptAllocations() : Promise.resolve<DeptAllocation[]>([]),
        needs.budget ? BudgetService.getMemberAllocations() : Promise.resolve<MemberAllocation[]>([]),
        needs.notifications ? NotificationService.getAll() : Promise.resolve<Notification[]>([]),
      ]);
      setUsers(usersRes);
      setDepartments(departmentsRes);
      setAttendanceRecords(attendanceRes);
      setHrLeave(hrLeaveRes);
      setEmployeeLeave(employeeLeaveRes);
      setSalarySlips(slipsRes);
      setSessions(sessionsRes.sessions ?? []);
      setClients(clientsRes);
      setInvoices(invoicesRes);
      setTasks(tasksRes);
      setProjects(projectsRes);
      setCompanyBudget(companyBudgetRes);
      setDeptAllocations(deptAllocationsRes);
      setMemberAllocations(memberAllocationsRes);
      setNotifications(notificationsRes);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  }, [needs]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Employees / Departments / Attendance ──────────────────────────────────
  const staff = useMemo(() => users.filter((u) => u.role !== "client"), [users]);
  const currentYear = new Date().getFullYear();
  const avgAttendanceRate = useMemo(() => {
    if (staff.length === 0 || attendanceRecords.length === 0) return null;
    const total = staff.reduce(
      (sum, u) => sum + computeYearlyReport(u.id, u.full_name, u.role, currentYear, attendanceRecords).annualAttendancePercentage,
      0
    );
    return Math.round(total / staff.length);
  }, [staff, attendanceRecords, currentYear]);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const pendingLeave = hrLeave.filter((l) => l.status === "pending").length
    + employeeLeave.filter((l) => l.status === "Pending").length;
  const approvedLeave = hrLeave.filter((l) => l.status === "approved").length
    + employeeLeave.filter((l) => l.status === "Approved").length;

  // ── Payroll / Revenue / Profit (company-wide only) ─────────────────────────
  const payrollStats = getPayrollStats(salarySlips, []);
  const revenue = invoices.reduce((sum, inv) => sum + (inv.amountPaid ?? (inv.status === "paid" ? inv.amount : 0)), 0);
  const budgetStats = getCompanyBudgetStats(companyBudget, deptAllocations, memberAllocations);
  const profit = revenue - payrollStats.totalNetPaid - budgetStats.totalUsedByMembers;

  // ── Tasks / Projects (domain-scoped where applicable) ──────────────────────
  const scopedTasks = domain && DOMAIN_DEPT_ID[domain]
    ? tasks.filter((t) => t.assigneeDept === DOMAIN_DEPT_ID[domain])
    : tasks;
  const taskStatusCounts = {
    todo: scopedTasks.filter((t) => t.status === "todo").length,
    inProgress: scopedTasks.filter((t) => t.status === "in-progress").length,
    done: scopedTasks.filter((t) => t.status === "done").length,
    blocked: scopedTasks.filter((t) => t.status === "blocked").length,
  };
  const projectStatusCounts = {
    notStarted: projects.filter((p) => p.status === "not-started").length,
    inProgress: projects.filter((p) => p.status === "in-progress").length,
    completed: projects.filter((p) => p.status === "completed").length,
    onHold: projects.filter((p) => p.status === "on-hold").length,
  };

  // ── Budgets / Expenses (domain-scoped where applicable) ────────────────────
  const deptBudgetSummaries = getDeptBudgetSummaries(deptAllocations, memberAllocations);
  const scopedDeptBudgets = domain && DOMAIN_DEPT_LABEL[domain]
    ? deptBudgetSummaries.filter((d) => d.department === DOMAIN_DEPT_LABEL[domain])
    : deptBudgetSummaries;

  // ── Activity / Time Tracking ────────────────────────────────────────────────
  const activityStats = getActivityStats(sessions);

  // ── Notifications ───────────────────────────────────────────────────────────
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  // ── KPI cards shown for this domain ─────────────────────────────────────────
  const kpiCards: KpiCard[] = [];
  if (needs.employees) kpiCards.push({ label: "Employees", value: String(staff.length), color: "text-brand-500" });
  if (needs.departments) kpiCards.push({ label: "Departments", value: String(departments.length), color: "text-purple-500" });
  if (needs.attendance) kpiCards.push({ label: "Attendance Rate", value: avgAttendanceRate !== null ? `${avgAttendanceRate}%` : "—", color: "text-emerald-500" });
  if (needs.leave) kpiCards.push({ label: "Pending Leave", value: String(pendingLeave), color: "text-amber-500" });
  if (needs.leave) kpiCards.push({ label: "Approved Leave", value: String(approvedLeave), color: "text-emerald-500" });
  if (needs.payroll) kpiCards.push({ label: "Salary Slips", value: String(payrollStats.totalSlips), color: "text-brand-500" });
  if (needs.payroll) kpiCards.push({ label: "Net Paid (This Month)", value: fmtMoney(payrollStats.totalNetPaid), color: "text-emerald-500" });
  if (needs.activity) kpiCards.push({ label: "Avg Session (min)", value: String(activityStats.avgSession), color: "text-brand-500" });
  if (needs.clients) kpiCards.push({ label: "Clients", value: String(clients.length), color: "text-brand-500" });
  if (needs.clients) kpiCards.push({ label: "Active Clients", value: String(clients.filter((c) => c.status === "active").length), color: "text-emerald-500" });
  if (needs.invoices) kpiCards.push({ label: "Revenue", value: fmtMoney(revenue), color: "text-emerald-500" });
  if (needs.projects) kpiCards.push({ label: "Projects", value: String(projects.length), color: "text-brand-500" });
  if (needs.tasks) kpiCards.push({ label: domain ? `${DOMAIN_DEPT_LABEL[domain] ?? "Department"} Tasks` : "Tasks", value: String(scopedTasks.length), color: "text-brand-500" });
  if (needs.budget) kpiCards.push({ label: "Budget Spent", value: fmtMoney(scopedDeptBudgets.reduce((s, d) => s + d.usedTotal, 0)), color: "text-orange-500" });
  if (isCompanyWide && needs.invoices && needs.payroll && needs.budget) kpiCards.push({ label: "Profit", value: fmtMoney(profit), color: profit >= 0 ? "text-emerald-500" : "text-red-500" });
  if (needs.notifications) kpiCards.push({ label: "Unread Notifications", value: String(unreadNotifications), color: "text-amber-500" });

  const hasAnyData = kpiCards.length > 0 && (
    staff.length || departments.length || attendanceRecords.length || hrLeave.length || employeeLeave.length ||
    salarySlips.length || sessions.length || clients.length || invoices.length || tasks.length || projects.length ||
    deptAllocations.length || memberAllocations.length || notifications.length
  );

  const handleExport = () => {
    exportCSV(
      ["Metric", "Value"],
      kpiCards.map((c) => [c.label, c.value]),
      `${domain ?? "company"}-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <>
      <PageMeta title="Reports | Optivax CRM" description="Live business reports" />
      <PageBreadcrumb pageTitle="Reports" />

      {isLoading ? (
        <LoadingState label="Loading report data..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={loadData} />
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Live figures from current system data.</p>
            {canExport("reports") && (
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium"
              >
                Export CSV
              </button>
            )}
          </div>

          {!hasAnyData ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
              No records exist yet for this report.
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {kpiCards.map((c) => (
                  <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
                    <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Task status breakdown */}
                {needs.tasks && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Task Status</h3>
                    {scopedTasks.length === 0 ? (
                      <p className="text-sm text-gray-400">No tasks recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: "To Do", count: taskStatusCounts.todo, color: "bg-gray-400" },
                          { label: "In Progress", count: taskStatusCounts.inProgress, color: "bg-blue-500" },
                          { label: "Done", count: taskStatusCounts.done, color: "bg-emerald-500" },
                          { label: "Blocked", count: taskStatusCounts.blocked, color: "bg-red-500" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${item.color}`} />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{item.label}</span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Project status breakdown */}
                {needs.projects && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Project Status</h3>
                    {projects.length === 0 ? (
                      <p className="text-sm text-gray-400">No projects recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: "Not Started", count: projectStatusCounts.notStarted, color: "bg-gray-400" },
                          { label: "In Progress", count: projectStatusCounts.inProgress, color: "bg-blue-500" },
                          { label: "Completed", count: projectStatusCounts.completed, color: "bg-emerald-500" },
                          { label: "On Hold", count: projectStatusCounts.onHold, color: "bg-amber-500" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${item.color}`} />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{item.label}</span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Budget / Expenses breakdown */}
                {needs.budget && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Budget / Expenses</h3>
                    {scopedDeptBudgets.length === 0 ? (
                      <p className="text-sm text-gray-400">No budget allocations recorded yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {scopedDeptBudgets.map((d) => (
                          <div key={d.department}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700 dark:text-gray-300">{d.department}</span>
                              <span className="text-gray-500">{fmtMoney(d.usedTotal)} / {fmtMoney(d.allocatedAmount)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${d.utilizationPct >= 90 ? "bg-red-500" : d.utilizationPct >= 70 ? "bg-yellow-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(100, d.utilizationPct)}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{d.utilizationPct}% utilized</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Activity / Time Tracking */}
                {needs.activity && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Activity &amp; Time Tracking</h3>
                    {sessions.length === 0 ? (
                      <p className="text-sm text-gray-400">No activity sessions recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: "Total Sessions", count: activityStats.total },
                          { label: "Completed", count: activityStats.completed },
                          { label: "Total Breaks", count: activityStats.totalBreaks },
                          { label: "Warnings", count: activityStats.totalWarnings },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                            <span className="font-semibold text-gray-800 dark:text-white">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
