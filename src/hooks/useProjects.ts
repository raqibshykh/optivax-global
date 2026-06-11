import { useState, useEffect, useCallback } from "react";
import { Project } from "../types";
import { ProjectService } from "../services/projectService";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/client"; // 👈 API client import kiya

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: Project[] = [];
      if (user?.role === "client") {
        if (user.email) {
          // 👈 Client table se sahi clientId lookup karne ke liye email query chalayi
          const clients = await api.get<{ id: string }[]>(
            `/saas/v1/clients/list?email=${encodeURIComponent(user.email)}`
          );
          const clientId = clients?.[0]?.id;
          if (clientId) {
            data = await ProjectService.getByClientId(clientId);
          } else {
            data = await ProjectService.getByClientId(user.id);
          }
        } else {
          data = await ProjectService.getByClientId(user.id);
        }
      } else {
        data = await ProjectService.getAll();
      }
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (projectData: Omit<Project, "id">) => {
    try {
      const newProject = await ProjectService.create(projectData);
      setProjects((prev) => [...prev, newProject]);
      return newProject;
    } catch (err: any) {
      throw new Error(err.message || "Failed to add project");
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updatedProject = await ProjectService.update(id, updates);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? updatedProject : p))
      );
      return updatedProject;
    } catch (err: any) {
      throw new Error(err.message || "Failed to update project");
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await ProjectService.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete project");
    }
  };

  const updateStatus = async (id: string, status: Project["status"]) => {
    try {
      const updatedProject = await ProjectService.update(id, { status });
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? updatedProject : p))
      );
      return updatedProject;
    } catch (err: any) {
      throw new Error(err.message || "Failed to update status");
    }
  };

  return {
    projects,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    updateStatus,
    refreshProjects: fetchProjects,
  };
}