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

  useEffect(() => {
    if (!currentUser?.id) return;

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('ksp_auth_token') || undefined;
        const res = await api.getNotifications(currentUser.id, 0, 50, token);
        
        const notificationList = Array.isArray(res) ? res : (res?.data?.content || res?.data || []);
        
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
    } catch (err) {}
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.markNotificationAsRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {}
  };

  const handleDelete = async (id: string) => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.deleteNotification(id, currentUser.id, token);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {}
  };

  const handleClearAll = async () => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.deleteAllNotifications(currentUser.id, token);
      setNotifications([]);
    } catch (err) {}
  };

  const getNotificationBgColor = (type: Notification["type"]) => {
    switch (type) {
      case "like": return "bg-rose-100 text-rose-500";
      case "comment": return "bg-blue-100 text-blue-500";
      case "follow": return "bg-emerald-100 text-emerald-500";
      case "badge": return "bg-amber-100 text-amber-500";
      case "mention": return "bg-purple-100 text-purple-500";
      default: return "bg-slate-100 text-slate-500";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full border border-transparent hover:border-orange-100 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-all">
          <Bell className="h-[22px] w-[22px]" />
          {unreadCount > 0 && (
            <span className="notif-dot absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 border-2 border-white text-[9px] font-bold text-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-hidden bg-[#FAFCFF] border-l border-slate-200/60 shadow-2xl">
        <div className="bg-white/80 backdrop-blur-xl px-6 py-5 border-b border-slate-100 shadow-sm relative z-10">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between text-xl">
              <span className="font-extrabold text-slate-900 tracking-tight">Thông báo</span>
              {unreadCount > 0 && (
                <Badge className="text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-2.5 py-0.5 rounded-full shadow-sm">
                  {unreadCount} mới
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="text-slate-500 text-sm font-medium mt-1">
              Cập nhật hoạt động và tương tác gần đây
            </SheetDescription>
          </SheetHeader>
          
          {notifications.length > 0 && (
            <div className="flex gap-3 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1 h-10 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 rounded-xl transition-all shadow-sm"
              >
                <CheckCheck className="h-4 w-4 mr-2 text-emerald-500" /> Đã đọc hết
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="flex-1 h-10 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 rounded-xl transition-all shadow-sm"
              >
                <Trash2 className="h-4 w-4 mr-2 text-rose-500" /> Xóa tất cả
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-160px)] px-5 py-5">
          <div className="space-y-3 pb-6">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative rounded-[20px] p-4 transition-all duration-300 ${
                    notification.read
                      ? "bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md"
                      : "bg-gradient-to-br from-orange-50/80 to-white border border-orange-200 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm border border-white/50 ${getNotificationBgColor(notification.type)}`}>
                      {notification.icon}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className={`text-sm mb-1 line-clamp-2 leading-relaxed ${notification.read ? 'text-slate-700 font-medium' : 'text-slate-900 font-semibold'}`}>
                        {notification.title}
                      </p>
                      {notification.description && (
                         <p className="text-[13px] text-slate-500 mb-2.5 leading-relaxed line-clamp-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                          {notification.description}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>

                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-slate-100">
                      {!notification.read && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {!notification.read && (
                    <div className="notif-dot absolute top-5 right-5 h-2.5 w-2.5 rounded-full bg-orange-500 border border-white shadow-sm" />
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-20 w-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <Bell className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Chưa có thông báo nào</h3>
                <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed">
                  Khi có người tương tác với bạn, thông báo sẽ xuất hiện tại đây.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
