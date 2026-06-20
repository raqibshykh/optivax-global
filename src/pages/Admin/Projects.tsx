import PageMeta from "../../components/common/PageMeta";
import { useProjects } from "../../hooks/useProjects";
import { useClients } from "../../hooks/useClients";
import { useState } from "react";
import ProjectModal from "./ProjectModal";
import ProjectTaskAssignmentModal from "../../components/common/ProjectTaskAssignmentModal";
import { Project } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function Projects() {
  const { projects, isLoading, addProject, updateProject, deleteProject } = useProjects();
  const { clients } = useClients();
  const { showToast } = useToast();
  const { canCreate, canEdit, canDelete } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [assignModalProjectId, setAssignModalProjectId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await deleteProject(id);
      showToast("Project deleted successfully", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete project", "error");
    }
  };

  const handleSave = async (projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, projectData);
        showToast("Project updated successfully", "success");
      } else {
        await addProject({
          ...projectData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showToast("Project created successfully", "success");
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save project", "error");
      throw err;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.company : "Unknown Client";
  };

  return (
    <>
      <PageMeta
        title="Projects | Optivax Global"
        description="Manage and track all projects."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Track project progress and manage deadlines.
          </p>
        </div>
        {canCreate("production") && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
          >
            Create Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full text-center p-8 text-gray-500 dark:text-gray-400">
            No projects found.
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1 pr-2">
                  {project.name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  project.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                {project.description}
              </p>
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div className={`h-2 rounded-full ${project.progress === 100 ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${project.progress}%` }}></div>
                </div>
              </div>
              <div className="mt-4 flex justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span>Due: {project.deadline ? new Date(project.deadline).toLocaleDateString() : "—"}</span>
                <span className="truncate max-w-[120px]" title={getClientName(project.clientId)}>
                  {getClientName(project.clientId)}
                </span>
              </div>
              <div className="mt-4 flex gap-2 pt-2">
                <button
                  onClick={() => setAssignModalProjectId(project.id)}
                  className="flex-1 py-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-300 transition-colors"
                >
                  Assign
                </button>
                {canEdit("production") && (
                  <button
                    onClick={() => handleEdit(project)}
                    className="flex-1 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {canDelete("production") && (
                  confirmDeleteId === project.id ? (
                    <div className="flex-1 flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="flex-1 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded dark:bg-gray-700 dark:text-gray-300 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="flex-1 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={editingProject}
        onSave={handleSave}
      />

      <ProjectTaskAssignmentModal
        isOpen={assignModalProjectId !== null}
        onClose={() => setAssignModalProjectId(null)}
        preSelectedProjectId={assignModalProjectId ?? undefined}
        onAssigned={() => showToast("Assignment saved successfully", "success")}
      />
    </>
  );
}
