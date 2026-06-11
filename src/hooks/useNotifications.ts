import { useState, useEffect, useCallback } from "react";
import { Notification } from "../types";
import { NotificationService } from "../services/notificationService";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/client"; // 👈 API client import kiya

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
        if (user.email) {
          // 👈 Client table se sahi ID lookup karne ke liye email query lagayi
          const clients = await api.get<{ id: string }[]>(
            `/saas/v1/clients/list?email=${encodeURIComponent(user.email)}`
          );
          const clientId = clients?.[0]?.id;
          if (clientId) {
            data = await NotificationService.getByUserId(clientId);
          } else {
            data = await NotificationService.getByUserId(user.id);
          }
        } else {
          data = await NotificationService.getByUserId(user.id);
        }
      } else {
        data = await NotificationService.getByUserId(user.id);
      }
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err: any) {
      throw new Error(err.message || "Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      // client lookup for marking all as read
      let targetId = user.id;
      if (user.role === 'client' && user.email) {
        const clients = await api.get<{ id: string }[]>(
          `/saas/v1/clients/list?email=${encodeURIComponent(user.email)}`
        );
        if (clients?.[0]?.id) targetId = clients[0].id;
      }

      await NotificationService.markAllAsRead(targetId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err: any) {
      throw new Error(err.message || "Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await NotificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete notification");
    }
  };

  const addNotification = async (notification: Omit<Notification, "id">) => {
    try {
      const newNotification = await NotificationService.create(notification);
      setNotifications((prev) => [newNotification, ...prev]);
      return newNotification;
    } catch (err: any) {
      throw new Error(err.message || "Failed to add notification");
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