import React, { useState, useEffect } from "react";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Project } from "../../types";
import { useClients } from "../../hooks/useClients";
import { useAuth } from "../../context/AuthContext";
import { canManageBudget } from "../../utils/rbac";
import { safeParse } from "../../lib/storage";
import { NotificationService } from "../../services/notificationService";

interface UserProfile {
  id: string;
  full_name?: string;
  role?: string;
  departmentId?: string;
  designation?: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

const PROFILES_KEY  = "mock_profiles";
const REVISIONS_KEY = "mock_revisions";

function loadProfiles(): UserProfile[] {
  return safeParse<UserProfile[]>(localStorage.getItem(PROFILES_KEY) ?? "[]", []);
}

export default function ProjectModal({ isOpen, onClose, project, onSave }: ProjectModalProps) {
  const { clients } = useClients();
  const { user } = useAuth();
  const isBudgetOwner = canManageBudget(user ?? null);
  const isSuper   = user?.role === "super_admin";
  const isManager = user?.role === "management";

  const [formData, setFormData] = useState({
    clientId: "",
    name: "",
    description: "",
    status: "not-started" as Project["status"],
    priority: "medium" as Project["priority"],
    startDate: new Date().toISOString().split("T")[0],
    deadline: new Date().toISOString().split("T")[0],
    progress: 0,
    budget: 0,
    spent: 0,
    files: [] as string[],
    assignedTo: [] as string[],
  });
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const all = loadProfiles();
    setProfiles(all);
    if (project) {
      setFormData({
        clientId: project.clientId,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        deadline: project.deadline,
        progress: project.progress,
        budget: project.budget || 0,
        spent: project.spent || 0,
        files: project.files || [],
        assignedTo: project.assignedTo || [],
      });
    } else {
      setFormData({
        clientId: clients.length > 0 ? clients[0].id : "",
        name: "",
        description: "",
        status: "not-started",
        priority: "medium",
        startDate: new Date().toISOString().split("T")[0],
        deadline: new Date().toISOString().split("T")[0],
        progress: 0,
        budget: 0,
        spent: 0,
        files: [],
        assignedTo: [],
      });
    }
    setAssigneeSearch("");
  }, [project, isOpen, clients]);

  const profileById = (id: string) => profiles.find((p) => p.id === id);

  // Valid assignees: exclude clients and super_admin from the selection list
  const validAssignees = profiles.filter((p) => {
    if (!p.role) return false;
    if (p.role === "client" || p.role === "super_admin") return false;
    return true;
  });

  const filteredAssignees = assigneeSearch.trim()
    ? validAssignees.filter(
        (p) =>
          (p.full_name || "").toLowerCase().includes(assigneeSearch.toLowerCase()) ||
          (p.role || "").toLowerCase().includes(assigneeSearch.toLowerCase())
      )
    : validAssignees;

  const toggleAssignee = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter((id) => id !== userId)
        : [...prev.assignedTo, userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const prevAssigned = new Set(project?.assignedTo || []);
      const nextAssigned = new Set(formData.assignedTo);

      await onSave(formData);

      // If editing and assignment changed: create revision entry + notify new assignees
      if (project) {
        const added   = formData.assignedTo.filter((id) => !prevAssigned.has(id));
        const removed = (project.assignedTo || []).filter((id) => !nextAssigned.has(id));

        if (added.length > 0 || removed.length > 0) {
          const now = new Date().toISOString();
          const names = (ids: string[]) => ids.map((id) => profileById(id)?.full_name || id).join(", ");
          const comment = [
            added.length   ? `Added: ${names(added)}`   : "",
            removed.length ? `Removed: ${names(removed)}` : "",
          ].filter(Boolean).join(" | ");

          // Persist revision entry directly to localStorage
          const revisions = safeParse<any[]>(localStorage.getItem(REVISIONS_KEY) ?? "[]", []);
          revisions.unshift({
            id: `rev-${Date.now()}`,
            projectId: project.id,
            clientId: formData.clientId,
            comment: `Assignment change — ${comment}`,
            status: "pending",
            type: "assignment_change",
            updatedBy: user?.id,
            created_at: now,
          });
          localStorage.setItem(REVISIONS_KEY, JSON.stringify(revisions));

          // Notify newly assigned users
          await Promise.allSettled(
            added.map((uid) =>
              NotificationService.create({
                userId: uid,
                type: "project",
                title: "Project Assignment",
                message: `You have been assigned to project "${formData.name}".`,
                read: false,
                createdAt: now,
              } as any)
            )
          );
        }
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "progress" || name === "budget" || name === "spent" ? Number(value) : value,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl p-6">
      <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        {project ? "Edit Project" : "Create Project"}
      </h3>
      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Project Name *</Label>
          <Input name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div>
          <Label>Client *</Label>
          <select
            name="clientId"
            value={formData.clientId}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="" disabled>Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Description</Label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Status</Label>
            <select name="status" value={formData.status} onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <Label>Priority</Label>
            <select name="priority" value={formData.priority} onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
          </div>
          <div>
            <Label>Deadline</Label>
            <Input type="date" name="deadline" value={formData.deadline} onChange={handleChange} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Progress (%)</Label>
            <Input type="number" min="0" max="100" name="progress" value={formData.progress.toString()} onChange={handleChange} />
          </div>
          <div>
            <Label>Budget ($)</Label>
            {isBudgetOwner ? (
              <Input type="number" min="0" name="budget" value={formData.budget.toString()} onChange={handleChange} />
            ) : (
              <div className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-700 dark:bg-gray-800 text-gray-500">
                ${formData.budget.toLocaleString()} <span className="text-xs">(view only)</span>
              </div>
            )}
          </div>
          <div>
            <Label>Spent ($)</Label>
            {isBudgetOwner ? (
              <Input type="number" min="0" name="spent" value={formData.spent.toString()} onChange={handleChange} />
            ) : (
              <div className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-700 dark:bg-gray-800 text-gray-500">
                ${formData.spent.toLocaleString()} <span className="text-xs">(view only)</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Assignment Panel ─────────────────────────────────────────── */}
        {(isSuper || isManager || user?.role === "production_admin" || user?.role === "sales_admin") && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <Label>Team Assignment</Label>

            {/* Current assignees — read-only info */}
            {project && (project.assignedTo || []).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Assignees</p>
                {(project.assignedTo || []).map((uid) => {
                  const p = profileById(uid);
                  return (
                    <div key={uid} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-gray-50 dark:bg-gray-800">
                      <span className="font-medium text-gray-900 dark:text-white">{p?.full_name || uid}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500 capitalize">{p?.departmentId?.replace("dept-", "") || "—"}</span>
                      {p?.designation && (
                        <>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-400 text-xs">{p.designation}</span>
                        </>
                      )}
                      {formData.assignedTo.includes(uid) && (
                        <span className="ml-auto text-xs text-green-600 dark:text-green-400">✓ assigned</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search + pick new assignees */}
            <div>
              <input
                type="text"
                placeholder="Search by name or role…"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                {filteredAssignees.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">No users found</p>
                ) : (
                  filteredAssignees.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={formData.assignedTo.includes(p.id)}
                        onChange={() => toggleAssignee(p.id)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{p.full_name || p.id}</span>
                      <span className="text-xs text-gray-400 ml-auto capitalize">{p.role?.replace(/_/g, " ")}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {formData.assignedTo.length} user{formData.assignedTo.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">
            {isSubmitting ? "Saving…" : "Save Project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
