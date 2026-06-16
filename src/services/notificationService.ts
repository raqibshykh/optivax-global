import { api } from "../lib/client";

import { Notification } from "../types";
import { safeParse } from "../lib/storage";

const BASE = "/saas/v1/notifications";
const LOCAL_KEY = "mock_notifications";

// BroadcastChannel for cross-tab notification sync (fallbacks handled by storage event)
let notificationsChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    notificationsChannel = new BroadcastChannel("saas_notifications");
  } catch {
    notificationsChannel = null;
  }
}

const STORAGE_UPDATE_KEY = "__saas_notifications_update";

export const broadcastNotification = (payload: unknown) => {
  try {
    if (notificationsChannel) {
      notificationsChannel.postMessage(payload);
    }
    // also bump a storage key for older browsers or cross-origin tabs
    try {
      localStorage.setItem(STORAGE_UPDATE_KEY, JSON.stringify({ ts: Date.now(), payload }));
    } catch {}
  } catch {}
};

const readLocal = (): Notification[] => {
  const raw = localStorage.getItem(LOCAL_KEY);
  return safeParse<Notification[]>(raw, []);
};

const writeLocal = (items: Notification[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {}
};

export class NotificationService {
  static async getAll(): Promise<Notification[]> {
    try {
      const data = await api.get<Notification[]>(`${BASE}/list`);
      return data || [];
    } catch {
      return readLocal();
    }
  }

  static async getByUserId(userId: string): Promise<Notification[]> {
    try {
      const data = await api.get<Notification[]>(
        `${BASE}/list?userId=${encodeURIComponent(userId)}`
      );
      return data || [];
    } catch {
      const all = readLocal();
      return all.filter((n) => n.userId === userId);
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getByUserId(userId);
    return list.filter((n) => !n.read).length;
  }

  static async markAsRead(id: string): Promise<void> {
    try {
      await api.put(`${BASE}/update`, { id, read: true });
    } catch {
      const all = readLocal();
      const updated = all.map((n) => (n.id === id ? { ...n, read: true } : n));
      writeLocal(updated);
      // notify other tabs about the update
      try { broadcastNotification({ action: "markAsRead", id }); } catch {}
    }
  }

  static async markAllAsRead(userId: string): Promise<void> {
    try {
      await api.put(`${BASE}/mark-all-read`, { userId });
    } catch {
      const all = readLocal();
      const updated = all.map((n) => (n.userId === userId ? { ...n, read: true } : n));
      writeLocal(updated);
      try { broadcastNotification({ action: "markAllAsRead", userId }); } catch {}
    }
  }

  static async create(payload: Omit<Notification, "id">): Promise<Notification> {
    try {
      return await api.post<Notification>(`${BASE}/create`, payload);
    } catch {
      const all = readLocal();
      const n: Notification = { id: `n-${Math.random().toString(36).slice(2,9)}`, ...payload } as Notification;
      const updated = [n, ...all];
      writeLocal(updated);
      try { broadcastNotification({ action: "create", notification: n }); } catch {}
      return n;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await api.delete(`${BASE}/delete`, { id });
    } catch {
      const all = readLocal();
      writeLocal(all.filter((n) => n.id !== id));
      try { broadcastNotification({ action: "delete", id }); } catch {}
    }
  }

  static async deleteAllForUser(userId: string): Promise<void> {
    try {
      await api.delete(`${BASE}/delete-all`, { userId });
    } catch {
      const all = readLocal();
      writeLocal(all.filter((n) => n.userId !== userId));
      try { broadcastNotification({ action: "deleteAllForUser", userId }); } catch {}
    }
  }
}
