import { api } from '../lib/client';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed';
  assigneeId?: string;
  dueDate?: string;
}

/**
 * Hook providing CRUD operations for tasks.
 * Returns helper functions; components can call them directly.
 */
export const useTasks = () => {
  const fetchTasks = async (params?: Record<string, any>) => {
    const response = await api.get<{ tasks: Task[] }>('/saas/v1/tasks', { params });
    return response.tasks;
  };

  const getTask = async (id: string) => {
    const response = await api.get<{ task: Task }>(`/saas/v1/tasks/${id}`);
    return response.task;
  };

  const createTask = async (data: Partial<Task>) => {
    const response = await api.post<{ task: Task }>('/saas/v1/tasks', data);
    return response.task;
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    const response = await api.put<{ task: Task }>(`/saas/v1/tasks/${id}`, data);
    return response.task;
  };

  const deleteTask = async (id: string) => {
    await api.delete(`/saas/v1/tasks/${id}`);
    return true;
  };

  return { fetchTasks, getTask, createTask, updateTask, deleteTask };
};
