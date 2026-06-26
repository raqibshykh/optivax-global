import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useProjects } from "../../hooks/useProjects";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/client";
import { notifyClientRevisionSubmitted } from "../../services/notificationHelpers";

export default function MyProjects() {
  const { projects, isLoading } = useProjects();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [revisionComment, setRevisionComment] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const handleOpenRevisionModal = (projectId: string) => {
    setSelectedProjectId(projectId);
    setRevisionComment("");
    setIsRevisionModalOpen(true);
  };

  const handleSubmitRevision = async () => {
    if (!selectedProjectId) return;
    if (!revisionComment.trim()) {
      showToast("Please enter a revision comment.", "error");
      return;
    }

    setIsSubmittingRevision(true);
    try {
      await api.post("/saas/v1/revisions/create", {
        projectId: selectedProjectId,
        clientId: user?.id,
        comment: revisionComment,
      });
      showToast("Revision request sent to the team.", "success");
      const proj = projects.find(p => p.id === selectedProjectId);
      if (user) {
        notifyClientRevisionSubmitted(user.id, user.name, selectedProjectId, proj?.name ?? selectedProjectId);
      }
      setIsRevisionModalOpen(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to send revision request.", "error");
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  return (
    <>
      <PageMeta
        title="My Projects | Optivax Global"
        description="View and track your projects."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            My Projects
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Track progress and view project details.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No projects found.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {project.name}
                </h3>
                <div className="flex gap-2 self-start sm:self-auto">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    project.status === 'completed' ? 'bg-green-100 text-green-800' :
                    project.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status.replace('-', ' ').toUpperCase()}
                  </span>
                  <button 
                    onClick={() => handleOpenRevisionModal(project.id)}
                    className="text-xs px-3 py-1 font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40"
                  >
                    Request Revision
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {project.description}
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div className={`h-2 rounded-full ${project.progress === 100 ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${project.progress}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{project.startDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{project.deadline}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  <p className={`font-medium ${project.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                    {project.status === 'completed' ? 'Delivered' : 'Active'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isRevisionModalOpen} onClose={() => setIsRevisionModalOpen(false)} className="max-w-lg">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Request Revision</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Please describe the revisions you need in detail. This will be sent directly to our team.
        </p>
        <textarea
          value={revisionComment}
          onChange={(e) => setRevisionComment(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 min-h-[120px]"
          placeholder="E.g., Please change the color of the header, update the logo, etc."
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setIsRevisionModalOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitRevision}
            disabled={isSubmittingRevision}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmittingRevision ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </Modal>
    </>
  );
}
