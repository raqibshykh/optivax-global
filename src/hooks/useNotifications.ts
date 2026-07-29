import { useState, useEffect, useCallback } from "react";
import { Notification } from "../types";
import { NotificationService } from "../services/notificationService";
import { ClientService } from "../services/clientService";
import { useAuth } from "../context/AuthContext";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      let data: Notification[] = [];
      if (user.role === 'super_admin') {
        data = await NotificationService.getAll();
      } else if (user.role === 'client') {
        const client = user.email ? await ClientService.getByEmail(user.email) : null;
        data = await NotificationService.getByUserId(client?.id ?? user.id);
      } else {
        data = await NotificationService.getByUserId(user.id);
      }
      setNotifications(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Cross-tab sync: listen for BroadcastChannel messages and storage updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    let bc: BroadcastChannel | null = null;
    const storageKey = "__saas_notifications_update";

    const onMessage = (_ev: MessageEvent) => {
      try {
        // payload can be anything; refresh list to keep authoritative state
        fetchNotifications();
      } catch { /* refresh best-effort — a failed refetch here isn't user-actionable */ }
    };

    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("saas_notifications");
        bc.addEventListener("message", onMessage);
      }
    } catch { /* BroadcastChannel unsupported in this browser — cross-tab sync degrades to the storage-event fallback below */ }

    const onStorage = (ev: StorageEvent) => {
      try {
        if (ev.key === storageKey) fetchNotifications();
      } catch { /* refresh best-effort — a failed refetch here isn't user-actionable */ }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      try { bc?.removeEventListener("message", onMessage); bc?.close(); } catch { /* channel already closed/never opened */ }
      try { window.removeEventListener("storage", onStorage); } catch { /* listener already removed */ }
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || "Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      let targetId = user.id;
      if (user.role === 'client' && user.email) {
        const client = await ClientService.getByEmail(user.email);
        if (client?.id) targetId = client.id;
      }

      await NotificationService.markAllAsRead(targetId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || "Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await NotificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || "Failed to delete notification");
    }
  };

  const addNotification = async (notification: Omit<Notification, "id">) => {
    try {
      const newNotification = await NotificationService.create(notification);
      setNotifications((prev) => [newNotification, ...prev]);
      return newNotification;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || "Failed to add notification");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    refreshNotifications: fetchNotifications,
  };
}