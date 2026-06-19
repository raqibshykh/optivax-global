import { api } from '../lib/client';
import type { Task } from '../types';

export type { Task };

export const useTasks = () => {
  const fetchTasks = async (params?: Record<string, string | number | boolean>): Promise<Task[]> => {
    return api.get<Task[]>('/saas/v1/tasks', { params });
  };

  const getTask = async (id: string): Promise<Task | null> => {
    const tasks = await api.get<Task[]>(`/saas/v1/tasks?id=${encodeURIComponent(id)}`);
    return tasks?.[0] ?? null;
  };

  const createTask = async (data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    return api.post<Task>('/saas/v1/tasks', {
      ...data,
      createdAt: new Date().toISOString(),
    });
  };

  const updateTask = async (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task> => {
    return api.put<Task>(`/saas/v1/tasks/${id}`, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    await api.delete(`/saas/v1/tasks/${id}`);
    return true;
  };

  return { fetchTasks, getTask, createTask, updateTask, deleteTask };
};
