import { api } from "../lib/client";

import { Notification } from "../types";

const BASE = "/saas/v1/notifications";

export class NotificationService {
  static async getAll(): Promise<Notification[]> {
    const data = await api.get<Notification[]>(`${BASE}/list`);
    return data || [];
  }

  static async getByUserId(userId: string): Promise<Notification[]> {
    const data = await api.get<Notification[]>(
      `${BASE}/list?userId=${encodeURIComponent(userId)}`
    );
    return data || [];
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getByUserId(userId);
    return list.filter((n) => !n.read).length;
  }

  static async markAsRead(id: string): Promise<void> {
    await api.put(`${BASE}/update`, { id, read: true });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await api.put(`${BASE}/mark-all-read`, { userId });
  }

  static async create(payload: Omit<Notification, "id">): Promise<Notification> {
    return api.post<Notification>(`${BASE}/create`, payload);
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }

  static async deleteAllForUser(userId: string): Promise<void> {
    await api.delete(`${BASE}/delete-all`, { userId });
  }
}
