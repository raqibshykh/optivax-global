import { useState, useEffect, useCallback, useRef } from "react";
import { Project } from "../types";
import { ProjectService } from "../services/projectService";
import { ClientService } from "../services/clientService";
import { useAuth } from "../context/AuthContext";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: Project[] = [];
      if (user?.role === "client") {
        const client = user.email ? await ClientService.getByEmail(user.email) : null;
        data = await ProjectService.getByClientId(client?.id ?? user.id);
      } else {
        if (user?.role.endsWith("_member")) {
          data = await ProjectService.getAll(user.id);
        } else {
          data = await ProjectService.getAll();
        }
      }
      if (mountedRef.current) setProjects(data);
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      if (mountedRef.current) setIsLoading(false);
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
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to add project");
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updatedProject = await ProjectService.update(id, updates);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? updatedProject : p))
      );
      return updatedProject;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to update project");
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await ProjectService.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const updateStatus = async (id: string, status: Project["status"]) => {
    try {
      const updatedProject = await ProjectService.update(id, { status });
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? updatedProject : p))
      );
      return updatedProject;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to update status");
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
