import PageMeta from "../../components/common/PageMeta";
import MetricCard from "../../components/dashboard/MetricCard";
import { TaskIcon, CheckCircleIcon, DollarLineIcon, FileIcon } from "../../icons";
import { useProjects } from "../../hooks/useProjects";
import { useInvoices } from "../../hooks/useInvoices";

export default function ClientPanel() {
  const { projects, isLoading: loadingProjects } = useProjects();
  const { invoices, isLoading: loadingInvoices } = useInvoices();
  const activeProjects = projects.filter((p) => p.status === "in-progress");
  const firstActiveProject = activeProjects[0];
  const avgProgress = activeProjects.length > 0 
    ? Math.round(activeProjects.reduce((sum, p) => sum + p.progress, 0) / activeProjects.length)
    : 0;

  const pendingInvoices = invoices.filter(
    (i) => i.status === "pending" || i.status === "overdue"
  );
  
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalFiles = projects.reduce((sum, p) => sum + (p.files?.length || 0), 0);



  const isLoading = loadingProjects || loadingInvoices;

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
        title="Client Portal | Optivax Global"
        description="Client dashboard for tracking projects and managing account."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Client Portal
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Track your projects, view invoices, and manage your account.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Active Project"
          value={firstActiveProject ? firstActiveProject.name : "None"}
          icon={<TaskIcon className="w-6 h-6" />}
        />
        <MetricCard
          title="Completion"
          value={`${avgProgress}%`}
          change={firstActiveProject ? "On track" : ""}
          changeType="positive"
          icon={<CheckCircleIcon className="w-6 h-6" />}
        />
        <MetricCard
          title="Pending Invoice"
          value={`$${pendingAmount.toLocaleString()}`}
          change={`${pendingInvoices.length} invoices due`}
          changeType="negative"
          icon={<DollarLineIcon className="w-6 h-6" />}
        />
        <MetricCard
          title="Available Files"
          value={totalFiles.toString()}
          change="Across all projects"
          changeType="positive"
          icon={<FileIcon className="w-6 h-6" />}
        />
      </div>



      {/* Project Progress */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Project Progress
        </h3>
        <div className="space-y-4">
          {activeProjects.map((project) => (
            <div key={project.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[250px]">{project.name}</span>
                <span className="text-gray-900 dark:text-white">{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.progress}%` }}></div>
              </div>
            </div>
          ))}
          {activeProjects.length === 0 && (
            <p className="text-sm text-gray-500">No active projects to display.</p>
          )}
        </div>
      </div>

      {/* Recent Updates */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Invoices
        </h3>
        <div className="space-y-3">
          {invoices.slice(-3).reverse().map((inv) => (
            <div key={inv.id} className="flex items-start justify-between space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${inv.status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'}`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Invoice {inv.number} - {inv.status.toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${inv.amount.toLocaleString()} • {inv.issueDate}
                  </p>
                </div>
              </div>
              {inv.invoice_url && (
                <a
                  href={inv.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition self-center"
                >
                  Download PDF
                </a>
              )}
            </div>
          ))}
          {invoices.length === 0 && (
            <p className="text-sm text-gray-500">No recent invoices.</p>
          )}
        </div>
      </div>
    </>
  );
}

