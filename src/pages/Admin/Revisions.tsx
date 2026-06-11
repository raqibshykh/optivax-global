import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { api } from "../../lib/client";
import { useClients } from "../../hooks/useClients";
import { useToast } from "../../context/ToastContext";

interface Revision {
  id: string;
  projectId: string;
  clientId: string;
  comment: string;
  status: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["pending", "in-progress", "completed"];

const statusStyles: Record<string, string> = {
  "pending": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "in-progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "completed": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function AdminRevisions() {
  const { clients } = useClients();
  const { showToast } = useToast();

  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [revData, projData] = await Promise.all([
        api.get<Revision[]>("/saas/v1/revisions/list"),
        api.get<Project[]>("/saas/v1/projects/list"),
      ]);
      setRevisions(revData || []);
      setProjects(projData || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load revisions.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProjectName = (projectId: string) => {
    const p = projects.find((proj) => proj.id === projectId);
    return p ? p.name : projectId;
  };

  const getClientName = (clientId: string) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.name : clientId;
  };

  const handleStatusChange = async (revisionId: string, newStatus: string) => {
    setUpdatingId(revisionId);
    try {
      await api.put("/saas/v1/revisions/update", { id: revisionId, status: newStatus });
      setRevisions((prev) =>
        prev.map((r) => (r.id === revisionId ? { ...r, status: newStatus } : r))
      );
      showToast("Revision status updated.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update status.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <PageMeta
        title="Revision Requests | Optivax Global"
        description="Manage all client revision requests."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Revision Requests
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Review and manage all client revision requests across projects.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
          {revisions.length} total
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center p-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium mb-1">No revision requests yet</p>
            <p className="text-sm">Revision requests submitted by clients will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revision ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Comment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Update Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {revisions.map((revision) => (
                  <tr key={revision.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {revision.id.slice(0, 16)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getProjectName(revision.projectId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getClientName(revision.clientId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate" title={revision.comment}>
                        {revision.comment || <span className="italic text-gray-400">No comment</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${statusStyles[revision.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {revision.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(revision.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={revision.status}
                        disabled={updatingId === revision.id}
                        onChange={(e) => handleStatusChange(revision.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
