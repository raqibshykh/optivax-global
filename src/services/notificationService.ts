import { api } from "../lib/client";
import { Notification } from "../types";

const BASE = "/saas/v1/notifications";

// BroadcastChannel for cross-tab notification sync (UI-only concern, unrelated to data storage).
let notificationsChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    notificationsChannel = new BroadcastChannel("saas_notifications");
  } catch {
    notificationsChannel = null;
  }
}

export const broadcastNotification = (payload: unknown) => {
  try {
    notificationsChannel?.postMessage(payload);
  } catch {
    // ignore — cross-tab sync is best-effort
  }
};

export class NotificationService {
  static async getAll(): Promise<Notification[]> {
    const data = await api.get<Notification[]>(`${BASE}/list`);
    return data || [];
  }

  static async getByUserId(userId: string): Promise<Notification[]> {
    const data = await api.get<Notification[]>(`${BASE}/list?userId=${encodeURIComponent(userId)}`);
    return data || [];
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getByUserId(userId);
    return list.filter((n) => !n.read).length;
  }

  static async markAsRead(id: string): Promise<void> {
    await api.put(`${BASE}/update`, { id, read: true });
    broadcastNotification({ action: "markAsRead", id });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await api.put(`${BASE}/mark-all-read`, { userId });
    broadcastNotification({ action: "markAllAsRead", userId });
  }

  static async create(payload: Omit<Notification, "id">, options?: { background?: boolean }): Promise<Notification> {
    const notification = await api.post<Notification>(`${BASE}/create`, payload, options);
    broadcastNotification({ action: "create", notification });
    return notification;
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
    broadcastNotification({ action: "delete", id });
  }

  static async deleteAllForUser(userId: string): Promise<void> {
    await api.delete(`${BASE}/delete-all`, { userId });
    broadcastNotification({ action: "deleteAllForUser", userId });
  }
}
