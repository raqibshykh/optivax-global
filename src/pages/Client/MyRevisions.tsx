import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { api } from "../../lib/client";
import { useProjects } from "../../hooks/useProjects";
import { useToast } from "../../context/ToastContext";

interface Revision {
  id: string;
  projectId: string;
  clientId: string;
  comment: string;
  status: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  "pending":     "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "in-progress": "bg-blue-100  text-blue-800  dark:bg-blue-900/30  dark:text-blue-400",
  "completed":   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function MyRevisions() {
  const { projects } = useProjects();
  const { showToast } = useToast();

  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRevisions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Revision[]>("/saas/v1/revisions/list");
      setRevisions(data || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load revision requests.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const getProjectName = (projectId: string) => {
    const p = projects.find((proj) => proj.id === projectId);
    return p ? p.name : projectId;
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

  const formatStatus = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");

  return (
    <>
      <PageMeta
        title="My Revision Requests | Optivax Global"
        description="View your submitted revision requests and their current status."
      />

      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            My Revision Requests
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Track all revision requests you've submitted and their current status.
          </p>
        </div>
        {!isLoading && (
          <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
            {revisions.length} request{revisions.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center p-12 text-gray-500 dark:text-gray-400">
            <svg className="mx-auto mb-4 w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium mb-1">No revision requests yet</p>
            <p className="text-sm">
              Go to <span className="font-medium text-blue-600 dark:text-blue-400">My Projects</span> and click "Request Revision" on any project card to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {["Project", "Comment", "Status", "Date Submitted"].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {revisions.map((revision) => (
                    <tr
                      key={revision.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getProjectName(revision.projectId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-sm">
                        <p
                          className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
                          title={revision.comment}
                        >
                          {revision.comment || (
                            <span className="italic text-gray-400">No comment provided</span>
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                            statusStyles[revision.status] ?? "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {formatStatus(revision.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(revision.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-800">
              {revisions.map((revision) => (
                <div key={revision.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {getProjectName(revision.projectId)}
                    </p>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                        statusStyles[revision.status] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {formatStatus(revision.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {revision.comment || <span className="italic text-gray-400">No comment</span>}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Submitted {formatDate(revision.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
