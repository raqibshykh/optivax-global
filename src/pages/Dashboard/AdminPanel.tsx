import PageMeta from "../../components/common/PageMeta";
import MetricCard from "../../components/dashboard/MetricCard";
import { UserIcon, TaskIcon, DollarLineIcon, CheckCircleIcon } from "../../icons";
import { useClients } from "../../hooks/useClients";
import { useProjects } from "../../hooks/useProjects";
import { useInvoices } from "../../hooks/useInvoices";
import { useMemo } from "react";

export default function AdminPanel() {
  const { clients, isLoading: loadingClients } = useClients();
  const { projects, isLoading: loadingProjects } = useProjects();
  const { invoices, isLoading: loadingInvoices } = useInvoices();

  const activeProjects = projects.filter((p) => p.status === "in-progress");
  const completedProjects = projects.filter((p) => p.status === "completed");
  
  const pendingInvoices = invoices.filter(
    (i) => i.status === "pending" || i.status === "overdue"
  );
  
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Simple sort for upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    return [...projects]
      .filter((p) => p.status !== "completed")
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);
  }, [projects]);

  const isLoading = loadingClients || loadingProjects || loadingInvoices;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Admin Dashboard | Optivax Global"
        description="Admin dashboard for managing clients, projects, and operations."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Overview of your business operations and key metrics.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Total Clients"
          value={clients.length.toString()}
          change="All time"
          changeType="positive"
          icon={<UserIcon className="w-6 h-6" />}
        />
        <MetricCard
          title="Active Projects"
          value={activeProjects.length.toString()}
          change={`${projects.length} total projects`}
          changeType="positive"
          icon={<TaskIcon className="w-6 h-6" />}
        />
        <MetricCard
          title="Pending Payments"
          value={`$${pendingAmount.toLocaleString()}`}
          change={`${pendingInvoices.length} invoices due`}
          changeType="negative"
          icon={<DollarLineIcon className="w-6 h-6" />}
        />
        <MetricCard
          title="Completed Projects"
          value={completedProjects.length.toString()}
          change={`${Math.round((completedProjects.length / (projects.length || 1)) * 100)}% completion rate`}
          changeType="positive"
          icon={<CheckCircleIcon className="w-6 h-6" />}
        />
      </div>

      {/* Additional sections can be added here */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {/* Display latest 3 invoices as recent activity mock */}
            {invoices.slice(-3).reverse().map((inv) => (
              <div key={inv.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Invoice {inv.status === 'paid' ? 'Paid' : 'Created'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {inv.number} - ${inv.amount.toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {inv.issueDate}
                </span>
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="text-sm text-gray-500">No recent activity.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upcoming Deadlines
          </h3>
          <div className="space-y-3">
            {upcomingDeadlines.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Due: {p.deadline}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${p.priority === 'high' ? 'bg-red-100 text-red-800' : p.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                  {p.priority}
                </span>
              </div>
            ))}
            {upcomingDeadlines.length === 0 && (
              <p className="text-sm text-gray-500">No upcoming deadlines.</p>
            )}
          </div>
        </div>
      </div>

      {/* Implementation Plan Roadmap */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Backend API Implementation Roadmap
          </h3>
          <span className="px-2.5 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-400">
            100% Completed
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Overview of the 10 core REST API modules fully implemented for the Optivax CRM backend.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "Authentication", desc: "GET /auth/me - JWT & Roles" },
            { name: "Tasks", desc: "CRUD /tasks - Task management & automation" },
            { name: "Leads", desc: "CRUD /leads - Lead tracking & conversion" },
            { name: "Projects", desc: "CRUD /projects - Project tracking" },
            { name: "Invoices", desc: "CRUD /invoices & PDF Generation via Dompdf" },
            { name: "Payments", desc: "CRUD /payments - Revenue tracking" },
            { name: "Commissions", desc: "CRUD /commissions - Staff payouts" },
            { name: "Automation Workflows", desc: "CRUD /automation/workflows - Event-driven actions" },
            { name: "Notifications", desc: "CRUD & Real-time SSE /notifications/stream" },
            { name: "Users", desc: "CRUD /users - Staff and Client user management" },
          ].map((module, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="mt-0.5 text-green-500">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{idx + 1}. {module.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{module.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
