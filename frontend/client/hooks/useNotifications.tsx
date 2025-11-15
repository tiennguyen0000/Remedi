import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { Notification, NotificationType } from "@shared/notificationTypes";
import { apiFetch } from "@/lib/api";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  archiveNotification: (notificationId: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  send: (notification: Partial<Notification>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

// SSE endpoint isn't available in this starter; we'll use polling for now
let pollInterval: number | null = null;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchNotifications();
    // Start polling every 15s
    pollInterval = window.setInterval(fetchNotifications, 15000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval as any);
        pollInterval = null;
      }
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const data = (await apiFetch(
        `/api/thong-bao?userId=${user.id}`,
      )) as Notification[];
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiFetch(`/api/thong-bao/${notificationId}/read`, {
        method: "POST",
      });

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: "read",
                readAt: new Date().toISOString(),
              }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch("/api/thong-bao/read-all", { method: "PUT" });

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          status: "read",
          readAt: new Date().toISOString(),
        })),
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiFetch(`/api/thong-bao/${notificationId}`, { method: "DELETE" });

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId),
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      await apiFetch(`/api/thong-bao/${notificationId}/archive`, {
        method: "PUT",
      });

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, status: "archived" }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Error archiving notification:", error);
    }
  };

  const clearNotifications = async () => {
    try {
      await apiFetch("/api/thong-bao/clear", { method: "DELETE" });

      setNotifications([]);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const send = async (notification: Partial<Notification>) => {
    try {
      const newNotification = (await apiFetch("/api/thong-bao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
      })) as any;
      if (
        newNotification.target === user?.id ||
        newNotification.target === user?.role
      ) {
        setNotifications((prev) => [newNotification, ...prev]);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    archiveNotification,
    clearNotifications,
    send,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
