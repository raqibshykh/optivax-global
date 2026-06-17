import React, { useState, useEffect } from "react";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Project } from "../../types";
import { useClients } from "../../hooks/useClients";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

export default function ProjectModal({ isOpen, onClose, project, onSave }: ProjectModalProps) {
  const { clients } = useClients();
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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
      });
    }
  }, [project, isOpen, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save project");
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
              <option key={c.id} value={c.id}>
                {c.name} ({c.company})
              </option>
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
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <Label>Priority</Label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
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
            <Input type="number" min="0" name="budget" value={formData.budget.toString()} onChange={handleChange} />
          </div>
          <div>
            <Label>Spent ($)</Label>
            <Input type="number" min="0" name="spent" value={formData.spent.toString()} onChange={handleChange} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
