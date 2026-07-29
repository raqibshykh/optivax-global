import { useState, useEffect } from "react";
import { ProjectService } from "../../services/projectService";
import { TaskService } from "../../services/taskService";
import { UserService } from "../../services/userService";
import { NotificationService } from "../../services/notificationService";
import { RevisionService } from "../../services/revisionService";

interface SimpleProject {
  id: string;
  name: string;
  clientId?: string;
  status?: string;
  assignedTo?: string[];
}

interface SimpleTask {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  status?: string;
  assigneeId?: string;
  assignee?: string;
}

interface SimpleUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface ProjectTaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: (info: AssignmentResult) => void;
  preSelectedProjectId?: string;
}

export interface AssignmentResult {
  type: "project" | "task";
  projectId: string;
  projectName: string;
  taskId?: string;
  taskTitle?: string;
  assigneeId: string;
  assigneeName: string;
  assignedAt: string;
}

export default function ProjectTaskAssignmentModal({
  isOpen,
  onClose,
  onAssigned,
  preSelectedProjectId,
}: ProjectTaskAssignmentModalProps) {
  const [projects, setProjects]   = useState<SimpleProject[]>([]);
  const [tasks, setTasks]         = useState<SimpleTask[]>([]);
  const [employees, setEmployees] = useState<SimpleUser[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [assignType, setAssignType]               = useState<"project" | "task">("project");
  const [selectedTaskId, setSelectedTaskId]       = useState("");
  const [selectedUserId, setSelectedUserId]       = useState("");
  const [isSaving, setIsSaving]                   = useState(false);
  const [saved, setSaved]                         = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [projectsData, employeesData] = await Promise.all([
        ProjectService.getAll(),
        UserService.getAll(),
      ]);
      setProjects(projectsData);
      setEmployees(employeesData.filter((u) => u.role !== "client"));
    })();
    setSelectedProjectId(preSelectedProjectId ?? "");
    setAssignType("project");
    setSelectedTaskId("");
    setSelectedUserId("");
    setSaved(false);
  }, [isOpen, preSelectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    setSelectedTaskId("");
    (async () => {
      const allTasks = await TaskService.getAll();
      setTasks(allTasks.filter((t) => t.projectId === selectedProjectId));
    })();
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedUser    = employees.find((u) => u.id === selectedUserId);

  // Only unassigned tasks appear in the assignment dropdown
  const unassignedTasks = tasks.filter((t) => !t.assigneeId || t.assigneeId === "");
  const selectedTask    = unassignedTasks.find((t) => t.id === selectedTaskId);

  // Project assignment: check if user is already in assignedTo list
  const alreadyOnProject =
    !!selectedUserId &&
    Array.isArray(selectedProject?.assignedTo) &&
    selectedProject.assignedTo.includes(selectedUserId);

  const handleSave = async () => {
    if (!selectedProjectId || !selectedUserId) return;
    if (assignType === "task" && !selectedTaskId) return;
    if (assignType === "project" && alreadyOnProject) return;

    setIsSaving(true);

    const now = new Date().toISOString();

    const result: AssignmentResult = {
      type:        assignType,
      projectId:   selectedProjectId,
      projectName: selectedProject?.name ?? "",
      ...(assignType === "task" && selectedTask
        ? { taskId: selectedTaskId, taskTitle: selectedTask.title }
        : {}),
      assigneeId:   selectedUserId,
      assigneeName: selectedUser?.full_name ?? "",
      assignedAt:   now,
    };

    try {
      // Task assignment — update the task's assigneeId via the TaskService
      if (assignType === "task" && selectedTaskId) {
        await TaskService.update(selectedTaskId, {
          assigneeId: selectedUserId,
          assignee: selectedUser?.full_name ?? "",
        });
      }

      // Project assignment — update project's assignedTo list via the ProjectService
      if (assignType === "project" && selectedProjectId) {
        const assignedTo: string[] = Array.isArray(selectedProject?.assignedTo)
          ? [...selectedProject.assignedTo]
          : [];
        if (!assignedTo.includes(selectedUserId)) assignedTo.push(selectedUserId);
        await ProjectService.update(selectedProjectId, { assignedTo });
      }

      // Notify assignee
      await NotificationService.create({
        userId:    selectedUserId,
        type:      "system",
        title:     assignType === "task" ? "Task Assigned to You" : "Project Assigned to You",
        message:
          assignType === "task"
            ? `You have been assigned task "${selectedTask?.title}" on project "${selectedProject?.name}".`
            : `You have been assigned to project "${selectedProject?.name}".`,
        read:      false,
        createdAt: now,
        actionUrl: "/tasks",
      });

      // Write revision / audit entry.
      // NOTE: this also subsumes the record previously written to the local-only
      // "mock_assignments" array — that array had no other readers anywhere in the
      // app (verified via grep), so rather than inventing a new service/endpoint for
      // a write-only duplicate of this same audit event, its info (assignee/task/
      // project) is folded into this single RevisionService entry.
      await RevisionService.create({
        projectId: selectedProjectId,
        clientId: selectedProject?.clientId ?? "",
        comment:
          assignType === "task"
            ? `Task "${selectedTask?.title}" assigned to ${selectedUser?.full_name ?? selectedUserId} on project "${selectedProject?.name}".`
            : `User ${selectedUser?.full_name ?? selectedUserId} added to project "${selectedProject?.name}".`,
        status:    "completed",
        type:      "task_assign",
        updatedBy: "",
      });

      setSaved(true);
      onAssigned?.(result);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Work</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {saved ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Assignment saved!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedUser?.full_name} has been assigned to{" "}
              {assignType === "task"
                ? `"${selectedTask?.title}"`
                : `project "${selectedProject?.name}"`}
              .
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Notification sent and audit log updated.
            </p>
            <div className="mt-5 flex gap-3 justify-center">
              <button
                onClick={() => {
                  setSaved(false);
                  setSelectedUserId("");
                  setSelectedTaskId("");
                }}
                className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50"
              >
                Assign another
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Step 1: Select Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">
                  1
                </span>
                Select Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="">Choose a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Assignment type */}
            {selectedProjectId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">
                    2
                  </span>
                  Assignment Type
                </label>
                <div className="flex gap-3">
                  {(["project", "task"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setAssignType(t);
                        setSelectedTaskId("");
                      }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        assignType === t
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {t === "project" ? "Entire Project" : "Specific Task"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Select Task (unassigned only) */}
            {selectedProjectId && assignType === "task" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">
                    3
                  </span>
                  Select Unassigned Task
                  {tasks.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({unassignedTasks.length} of {tasks.length} available)
                    </span>
                  )}
                </label>

                {tasks.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400 py-2">
                    No tasks found for this project. Create tasks first.
                  </p>
                ) : unassignedTasks.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                      All tasks are already assigned.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      To reassign a task, open it via Edit Task on the task board.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">Choose a task…</option>
                    {unassignedTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                        {t.status ? ` [${t.status}]` : ""}
                      </option>
                    ))}
                  </select>
                )}

                {tasks.length > 0 && unassignedTasks.length < tasks.length && (
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {tasks.length - unassignedTasks.length} already-assigned task
                    {tasks.length - unassignedTasks.length !== 1 ? "s are" : " is"} hidden.
                    Use Edit Task to reassign them.
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Select Employee */}
            {selectedProjectId &&
              (assignType === "project" ||
                (assignType === "task" &&
                  (selectedTaskId || tasks.length === 0 || unassignedTasks.length === 0))) &&
              unassignedTasks.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">
                      {assignType === "task" ? "4" : "3"}
                    </span>
                    Assign To
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">Choose an employee…</option>
                    {employees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role.replace(/_/g, " ")})
                      </option>
                    ))}
                  </select>
                  {assignType === "project" && alreadyOnProject && selectedUserId && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                      This user is already assigned to this project.
                    </p>
                  )}
                </div>
              )}

            {/* Employee step when all tasks assigned (project type only) */}
            {selectedProjectId && assignType === "project" && (
              <div
                style={{
                  display:
                    selectedProjectId &&
                    assignType === "project" &&
                    unassignedTasks.length === 0
                      ? "block"
                      : "none",
                }}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">
                    3
                  </span>
                  Assign To
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Choose an employee…</option>
                  {employees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role.replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
                {alreadyOnProject && selectedUserId && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                    This user is already assigned to this project.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  isSaving ||
                  !selectedProjectId ||
                  !selectedUserId ||
                  (assignType === "task" && !selectedTaskId) ||
                  (assignType === "project" && !!alreadyOnProject)
                }
                className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : "Assign"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
