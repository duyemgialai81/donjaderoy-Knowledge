import { useState, useEffect } from "react";
import { Bell, X, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Separator } from "./ui/separator";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import api from "../lib/api";
import { useAuth } from "../lib/authContext";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "badge" | "mention";
  title: string;
  description?: string;
  createdAt: string;
  read: boolean;
  icon: string;
  link?: string;
}

export function NotificationCenter() {
  const { user: currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications from backend
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('ksp_auth_token') || undefined;
        const res = await api.getNotifications(currentUser.id, 0, 50, token);
        
        const notificationList = Array.isArray(res) ? res : (res?.data?.content || res?.data || []);
        console.log('[NotificationCenter] Fetched notifications:', notificationList);

        // Map backend notification format to frontend format
        const mapped = notificationList.map((n: any) => {
          let icon = '📢';
          let type: Notification['type'] = 'mention';

          if (n.type === 'like') {
            icon = '❤️';
            type = 'like';
          } else if (n.type === 'comment') {
            icon = '💬';
            type = 'comment';
          } else if (n.type === 'follow') {
            icon = '👤';
            type = 'follow';
          } else if (n.type === 'badge') {
            icon = '🏆';
            type = 'badge';
          }

          return {
            id: n.id,
            type,
            title: n.title,
            description: n.description,
            createdAt: n.createdAt,
            read: n.isRead || false,
            icon
          };
        });

        setNotifications(mapped);
      } catch (err) {
        console.error('[NotificationCenter] Error loading notifications:', err);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.markAllNotificationsAsRead(currentUser.id, token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('[NotificationCenter] Error marking all as read:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.markNotificationAsRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('[NotificationCenter] Error marking as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.deleteNotification(id, currentUser.id, token);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('[NotificationCenter] Error deleting notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.deleteAllNotifications(currentUser.id, token);
      setNotifications([]);
    } catch (err) {
      console.error('[NotificationCenter] Error clearing all notifications:', err);
    }
  };

  const getNotificationBgColor = (type: Notification["type"]) => {
    switch (type) {
      case "like":
        return "bg-red-100";
      case "comment":
        return "bg-blue-100";
      case "follow":
        return "bg-green-100";
      case "badge":
        return "bg-orange-100";
      case "mention":
        return "bg-purple-100";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} mới
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Cập nhật hoạt động và tương tác gần đây
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Action Buttons */}
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Đánh dấu đã đọc
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa tất cả
              </Button>
            </div>
          )}

          <Separator />

          {/* Notifications List */}
          <ScrollArea className="h-[calc(100vh-240px)]">
            <div className="space-y-2">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group relative rounded-lg border p-4 transition-colors ${
                      notification.read
                        ? "bg-white hover:bg-gray-50"
                        : "bg-orange-50 border-orange-200 hover:bg-orange-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${getNotificationBgColor(
                          notification.type
                        )}`}
                      >
                        {notification.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm mb-1">{notification.title}</p>
                        <p className="text-xs text-gray-600 mb-2">
                          {notification.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <CheckCheck className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-orange-600" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="mb-2">Không có thông báo</h3>
                  <p className="text-sm text-gray-600">
                    Bạn sẽ nhận được thông báo khi có hoạt động mới
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
