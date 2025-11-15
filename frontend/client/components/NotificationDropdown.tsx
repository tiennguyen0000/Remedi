import React, { useState, useEffect } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function NotificationDropdown() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const response = await apiClient.getNotifications();
      if (response.success && response.data) {
        const sorted = response.data.sort((a: any, b: any) => {
          const aTime = new Date(a.ngay_tao || a.createdAt || 0).getTime();
          const bTime = new Date(b.ngay_tao || b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setNotifications(sorted.slice(0, 20));
        setUnreadCount(sorted.filter((n: any) => !n.da_xem && n.da_xem !== 1).length);
      }
    } catch (error: any) {
      // Only log non-401 errors (401 will be handled by apiFetch)
      if (error?.status !== 401) {
        console.error("Failed to load notifications:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (id: string, notification: any) => {
    if (notification.da_xem || notification.da_xem === 1) return;
    try {
      await apiClient.markNotificationRead(id);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, da_xem: 1 } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, da_xem: 1 }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  if (!isAuthenticated) return null;

  const formatTime = (date: string | Date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: vi,
      });
    } catch {
      return "";
    }
  };

  const getNotificationType = (type: string) => {
    switch (type) {
      case "VOUCHER":
        return "🎁 Voucher";
      case "SUBMISSION":
        return "📋 Hồ sơ";
      case "USER":
        return "👤 Người dùng";
      case "FORUM":
        return "💬 Diễn đàn";
      default:
        return "🔔 Thông báo";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 rounded-full"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-primary animate-pulse" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Thông báo</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              Đọc tất cả
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Đang tải...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Không có thông báo mới</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const isUnread = !notification.da_xem && notification.da_xem !== 1;
                const notificationDate = notification.ngay_tao || notification.createdAt;
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id, notification)}
                    className={`flex-col items-start p-4 cursor-pointer hover:bg-accent ${
                      isUnread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-primary">
                            {getNotificationType(notification.loai_thong_bao || "SYSTEM")}
                          </span>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm font-medium line-clamp-2">
                          {notification.noi_dung || notification.message || "Thông báo mới"}
                        </p>
                        {notificationDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(notificationDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={loadNotifications}
            >
              Làm mới
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Thêm default export
export default NotificationDropdown;
