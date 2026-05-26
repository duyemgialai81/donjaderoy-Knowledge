import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../lib/authContext";
import { localStorage_service } from "../lib/localStorage";
import type { User as UserType } from "../lib/mockData";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import {
  BadgeCheck,
  Ban,
  Bell,
  Camera,
  Laptop,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Smartphone,
  Unlock,
  User,
  Video,
} from "lucide-react";
import { toast } from "sonner";

type SettingsTab = "overview" | "privacy" | "calls" | "security";

interface CallPreferences {
  allowAudioCalls: boolean;
  allowVideoCalls: boolean;
  showActiveStatus: boolean;
  desktopNotifications: boolean;
  compactComposer: boolean;
  autoPlayMedia: boolean;
  profileNote: string;
}

const CALL_PREFERENCE_KEY = "ksp_call_preferences";

const defaultCallPreferences: CallPreferences = {
  allowAudioCalls: true,
  allowVideoCalls: true,
  showActiveStatus: true,
  desktopNotifications: true,
  compactComposer: false,
  autoPlayMedia: true,
  profileNote: "",
};

function loadCallPreferences() {
  try {
    const raw = localStorage.getItem(CALL_PREFERENCE_KEY);
    return raw ? { ...defaultCallPreferences, ...JSON.parse(raw) } : defaultCallPreferences;
  } catch (error) {
    return defaultCallPreferences;
  }
}

function formatRole(role?: string) {
  if (role === "lecturer") return "Giảng viên";
  if (role === "admin") return "Quản trị viên";
  return "Sinh viên";
}

function getAvatarUrl(user?: any) {
  if (user?.avatar && typeof user.avatar === "string" && user.avatar.trim()) {
    return user.avatar;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || user?.email || "default"}`;
}

function formatSettingDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function SettingsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [isSavingCalls, setIsSavingCalls] = useState(false);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    allowMessagesFrom: "everyone",
    requireApproval: true,
  });
  const [callPreferences, setCallPreferences] = useState<CallPreferences>(() => loadCallPreferences());
  const [blockedUsers, setBlockedUsers] = useState<UserType[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  const userAvatar = getAvatarUrl(user);
  const token = localStorage_service.getAuthToken();

  const accountFields = useMemo(
    () => [
      { label: "ID người dùng", value: user?.id || "--" },
      { label: "Tên hệ thống", value: user?.name || "--" },
      { label: "Email", value: user?.email || "--" },
      { label: "Vai trò", value: formatRole(user?.role) },
      { label: "Ngành học", value: user?.major || "--" },
      { label: "Lớp", value: user?.class || (user as any)?.className || "--" },
      { label: "Điểm hiện tại", value: (user?.points || 0).toLocaleString("vi-VN") },
      { label: "Bài viết", value: (user?.postsCount || 0).toLocaleString("vi-VN") },
      { label: "Người theo dõi", value: (user?.followers || 0).toLocaleString("vi-VN") },
      { label: "Trạng thái DB", value: user ? "active" : "--" },
      { label: "Đăng ký lúc", value: formatSettingDate(user?.joinedDate || (user as any)?.createdAt) },
      { label: "Cập nhật lúc", value: formatSettingDate((user as any)?.updatedAt) },
    ],
    [user],
  );

  const communicationFields = useMemo(
    () => [
      {
        label: "Tin nhắn từ",
        value: privacySettings.allowMessagesFrom === "everyone" ? "Mọi người" : "Theo dõi chéo",
      },
      { label: "Tin nhắn chờ", value: privacySettings.requireApproval ? "Bật" : "Tắt" },
      { label: "Hiện online", value: callPreferences.showActiveStatus ? "Bật" : "Tắt" },
      { label: "Gọi thoại", value: callPreferences.allowAudioCalls ? "Bật" : "Tắt" },
      { label: "Gọi video", value: callPreferences.allowVideoCalls ? "Bật" : "Tắt" },
      { label: "Thông báo desktop", value: callPreferences.desktopNotifications ? "Bật" : "Tắt" },
      { label: "Tự phát media", value: callPreferences.autoPlayMedia ? "Bật" : "Tắt" },
      { label: "Composer gọn", value: callPreferences.compactComposer ? "Bật" : "Tắt" },
      { label: "Ghi chú profile", value: callPreferences.profileNote || "--" },
    ],
    [callPreferences, privacySettings],
  );

  const fetchPrivacySettings = async () => {
    if (!token) return;
    try {
      const res = await api.getPrivacySettings(token);
      const data = res?.data || res;
      if (data) {
        setPrivacySettings({
          allowMessagesFrom: data.allowMessagesFrom || "everyone",
          requireApproval: data.requireApproval ?? true,
        });
      }
    } catch (error) {
      toast.error("Không thể tải cài đặt quyền riêng tư.");
    }
  };

  const fetchBlockedUsers = async () => {
    if (!token) return;
    setIsLoadingBlocked(true);
    try {
      const res = await api.getBlockedUsers(0, 50, token);
      setBlockedUsers(Array.isArray(res) ? res : []);
    } catch (error) {
      toast.error("Không thể tải danh sách chặn.");
    } finally {
      setIsLoadingBlocked(false);
    }
  };

  const fetchSecurityData = async () => {
    if (!token) return;
    setIsLoadingSecurity(true);
    try {
      const [sessionList, deviceList] = await Promise.all([
        api.getSessions(token).catch(() => []),
        api.getDevices(token).catch(() => []),
      ]);

      setSessions(Array.isArray(sessionList) ? sessionList : []);
      setDevices(Array.isArray(deviceList) ? deviceList : []);
    } catch (error) {
      toast.error("Không thể tải thông tin thiết bị và phiên đăng nhập.");
    } finally {
      setIsLoadingSecurity(false);
    }
  };

  useEffect(() => {
    if (activeTab === "privacy") {
      fetchPrivacySettings();
    }

    if (activeTab === "security") {
      fetchBlockedUsers();
      fetchSecurityData();
    }
  }, [activeTab]);

  const handleSavePrivacy = async () => {
    if (!token) return;

    setIsSavingPrivacy(true);
    try {
      await api.updatePrivacySettings(privacySettings, token);
      localStorage.setItem(CALL_PREFERENCE_KEY, JSON.stringify(callPreferences));
      toast.success("Đã cập nhật cài đặt quyền riêng tư.");
    } catch (error) {
      toast.error("Không thể lưu thay đổi quyền riêng tư.");
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleSaveCallPreferences = () => {
    setIsSavingCalls(true);
    try {
      localStorage.setItem(CALL_PREFERENCE_KEY, JSON.stringify(callPreferences));
      toast.success("Đã lưu tùy chọn gọi và nhắn tin.");
    } catch (error) {
      toast.error("Không thể lưu tùy chọn giao diện.");
    } finally {
      setTimeout(() => setIsSavingCalls(false), 350);
    }
  };

  const handleUnblock = async (blockedId: string, name: string) => {
    if (!token) return;

    try {
      await api.unblockUser(blockedId, token);
      setBlockedUsers((previous) => previous.filter((blockedUser) => blockedUser.id !== blockedId));
      toast.success(`Đã bỏ chặn ${name}.`);
    } catch (error) {
      toast.error("Không thể bỏ chặn người dùng lúc này.");
    }
  };

  const handleRevokeSession = async (sessionToken: string) => {
    if (!token) return;

    try {
      await api.revokeSession(sessionToken, token);
      setSessions((previous) => previous.filter((session) => session.token !== sessionToken && session.id !== sessionToken));
      toast.success("Đã thu hồi phiên đăng nhập.");
    } catch (error) {
      toast.error("Không thể thu hồi phiên đăng nhập.");
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!token) return;

    try {
      await api.deleteDevice(deviceId, token);
      setDevices((previous) => previous.filter((device) => device.id !== deviceId));
      toast.success("Đã gỡ thiết bị khỏi tài khoản.");
    } catch (error) {
      toast.error("Không thể xóa thiết bị này.");
    }
  };

  return (
    <div className="settings-page-modern mx-auto min-h-screen max-w-[1512px] px-4 py-6">
      <div className="settings-shell rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl border border-slate-100 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="settings-sidebar border-r border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-5">
            <div className="mb-6 flex items-center gap-2">
              <div className="settings-sidebar-icon flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0284c7] to-[#06b6d4] shadow-md">
                <SettingsIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Cài đặt</h2>
                <p className="text-xs text-slate-400">Tùy chỉnh tài khoản</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={userAvatar}
                  alt={user?.name || "User"}
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-white shadow-sm"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{user?.name || "Tài khoản hiện tại"}</div>
                  <div className="mt-0.5 text-xs text-slate-500 truncate">{user?.email || "Chưa có email"}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-sky-500 text-white hover:bg-sky-600 text-[10px] px-2 py-0.5">
                  {formatRole(user?.role)}
                </Badge>
                <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0.5">
                  {callPreferences.showActiveStatus ? "🟢 Online" : "🔴 Ẩn trạng thái"}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              {[
                { id: "overview", label: "Tổng quan", icon: User },
                { id: "privacy", label: "Quyền riêng tư", icon: Shield },
                { id: "calls", label: "Cuộc gọi & Tin nhắn", icon: Phone },
                { id: "security", label: "Bảo mật", icon: Lock },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  onClick={() => setActiveTab(item.id as SettingsTab)}
                >
                  <item.icon className={`mr-3 h-4 w-4 ${activeTab === item.id ? "text-sky-600" : "text-slate-400"}`} />
                  {item.label}
                </Button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="p-6 md:p-8">
            {activeTab === "overview" && (
              <div className="space-y-5">
                <section className="soft-info-panel">
                  <div className="soft-info-header">
                    <span className="soft-info-icon">
                      <User className="h-4 w-4" />
                    </span>
                    <div>
                      <h2>Hồ sơ cơ bản</h2>
                      <p>Thông tin tài khoản đang được dùng trên toàn bộ ứng dụng.</p>
                    </div>
                  </div>

                  <div className="soft-info-grid">
                    {accountFields.map((item) => (
                      <div key={item.label} className="soft-info-cell">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="soft-info-panel">
                  <div className="soft-info-header">
                    <span className="soft-info-icon">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <h2>Liên lạc & quyền riêng tư</h2>
                      <p>Tóm tắt các tùy chọn nhắn tin, gọi và trạng thái hoạt động.</p>
                    </div>
                    <Button
                      variant="outline"
                      className="soft-info-action"
                      onClick={() => setActiveTab("privacy")}
                    >
                      Tùy chỉnh
                    </Button>
                  </div>

                  <div className="soft-info-grid">
                    {communicationFields.map((item) => (
                      <div key={item.label} className="soft-info-cell">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-800">Quyền riêng tư & Nhắn tin</h2>
                  <p className="text-sm text-slate-500 mt-1">Quản lý ai có thể nhắn tin, xem trạng thái và gửi yêu cầu kết bạn.</p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPrivacySettings((prev) => ({ ...prev, allowMessagesFrom: "everyone" }))}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        privacySettings.allowMessagesFrom === "everyone"
                          ? "border-sky-200 bg-sky-50 shadow-sm ring-1 ring-sky-200"
                          : "border-slate-100 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-sky-500 mt-0.5" />
                        <div>
                          <div className="font-semibold text-slate-800">Mọi người</div>
                          <p className="text-sm text-slate-500">Cho phép tất cả người dùng bắt đầu hội thoại với bạn.</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivacySettings((prev) => ({ ...prev, allowMessagesFrom: "mutual_followers" }))}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        privacySettings.allowMessagesFrom === "mutual_followers"
                          ? "border-sky-200 bg-sky-50 shadow-sm ring-1 ring-sky-200"
                          : "border-slate-100 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <BadgeCheck className="h-5 w-5 text-sky-500 mt-0.5" />
                        <div>
                          <div className="font-semibold text-slate-800">Chỉ bạn bè theo dõi chéo</div>
                          <p className="text-sm text-slate-500">Hạn chế tin nhắn mới chỉ với những người đã kết nối hai chiều.</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-slate-800">Tin nhắn chờ</div>
                      <p className="text-sm text-slate-500">Người lạ sẽ vào hộp thư chờ thay vì thông báo trực tiếp.</p>
                    </div>
                    <Switch
                      checked={privacySettings.requireApproval}
                      onCheckedChange={(checked) =>
                        setPrivacySettings((prev) => ({ ...prev, requireApproval: checked }))
                      }
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-slate-800">Hiển thị trạng thái hoạt động</div>
                      <p className="text-sm text-slate-500">Cho phép người khác biết bạn đang online trong khu vực nhắn tin.</p>
                    </div>
                    <Switch
                      checked={callPreferences.showActiveStatus}
                      onCheckedChange={(checked) =>
                        setCallPreferences((prev) => ({ ...prev, showActiveStatus: checked }))
                      }
                    />
                  </div>

                  <Button
                    className="mt-6 h-10 rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-5"
                    onClick={handleSavePrivacy}
                    disabled={isSavingPrivacy}
                  >
                    {isSavingPrivacy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "calls" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-800">Cuộc gọi & Trải nghiệm nhắn tin</h2>
                  <p className="text-sm text-slate-500 mt-1">Bật/tắt quyền gọi, thông báo và kiểu hiển thị composer.</p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {[
                      {
                        key: "allowAudioCalls",
                        label: "Cho phép cuộc gọi thoại",
                        description: "Hiển thị nút audio call trong khung chat và profile hội thoại.",
                        icon: Phone,
                      },
                      {
                        key: "allowVideoCalls",
                        label: "Cho phép video call",
                        description: "Hiển thị nút video call và overlay cho stream camera.",
                        icon: Camera,
                      },
                      {
                        key: "desktopNotifications",
                        label: "Thông báo desktop",
                        description: "Nhận thông báo cho tin nhắn mới và lời mời tham gia cuộc gọi.",
                        icon: Bell,
                      },
                      {
                        key: "autoPlayMedia",
                        label: "Tự động phát media",
                        description: "Tự động chuẩn bị media preview khi bạn mở call overlay.",
                        icon: Video,
                      },
                    ].map((item) => (
                      <div key={item.key} className="rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-sky-50 p-2 text-sky-500">
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{item.label}</div>
                              <p className="text-sm text-slate-500">{item.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={callPreferences[item.key as keyof CallPreferences] as boolean}
                            onCheckedChange={(checked) =>
                              setCallPreferences((prev) => ({ ...prev, [item.key]: checked }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-800">Compact composer</div>
                        <p className="text-sm text-slate-500">Thu gọn action composer để giao diện chat gọn hơn khi làm việc trên laptop nhỏ.</p>
                      </div>
                      <Switch
                        checked={callPreferences.compactComposer}
                        onCheckedChange={(checked) =>
                          setCallPreferences((prev) => ({ ...prev, compactComposer: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-slate-700">Profile note cho khu vực nhắn tin</label>
                    <Textarea
                      value={callPreferences.profileNote}
                      onChange={(e) => setCallPreferences((prev) => ({ ...prev, profileNote: e.target.value }))}
                      className="mt-2 min-h-[100px] rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200"
                      placeholder="Thêm một dòng ghi chú ngắn để hiển thị trong profile thông tin hội thoại..."
                    />
                  </div>

                  <Button
                    className="mt-6 h-10 rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-5"
                    onClick={handleSaveCallPreferences}
                    disabled={isSavingCalls}
                  >
                    {isSavingCalls ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu tùy chọn
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800">Phiên đăng nhập</h3>
                    <p className="text-xs text-slate-400 mt-0.5 mb-4">Quản lý các session hiện có trên nhiều trình duyệt hoặc máy tính.</p>
                    {isLoadingSecurity ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="rounded-lg bg-slate-50 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu phiên.</div>
                    ) : (
                      <div className="space-y-3">
                        {sessions.map((session, idx) => {
                          const sessionId = session.token || session.id || `session-${idx}`;
                          const deviceName = session.deviceName || session.userAgent || "Thiết bị không rõ";
                          return (
                            <div key={sessionId} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                              <div className="flex items-center gap-2">
                                <Laptop className="h-4 w-4 text-slate-400" />
                                <div>
                                  <div className="text-sm font-medium">{deviceName}</div>
                                  <div className="text-xs text-slate-400">{session.createdAt || session.lastActive || "Không rõ thời gian"}</div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={() => handleRevokeSession(sessionId)}>
                                Thu hồi
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800">Thiết bị đã đăng ký</h3>
                    <p className="text-xs text-slate-400 mt-0.5 mb-4">Theo dõi và gỡ bỏ những thiết bị đang được lưu trong hệ thống.</p>
                    {isLoadingSecurity ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                      </div>
                    ) : devices.length === 0 ? (
                      <div className="rounded-lg bg-slate-50 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu thiết bị.</div>
                    ) : (
                      <div className="space-y-3">
                        {devices.map((device, idx) => {
                          const deviceId = device.id || `device-${idx}`;
                          const deviceName = device.deviceName || device.name || "Thiết bị không rõ";
                          return (
                            <div key={deviceId} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                              <div className="flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-slate-400" />
                                <div>
                                  <div className="text-sm font-medium">{deviceName}</div>
                                  <div className="text-xs text-slate-400">{device.userAgent || device.platform || "Không rõ thông tin"}</div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={() => handleDeleteDevice(deviceId)}>
                                Xóa
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-800">Danh sách chặn</h3>
                  <p className="text-xs text-slate-400 mt-0.5 mb-4">Những người dùng này sẽ không thể nhắn tin hoặc tương tác trực tiếp với bạn.</p>
                  {isLoadingBlocked ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                    </div>
                  ) : blockedUsers.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 py-10 text-center">
                      <Ban className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">Bạn chưa chặn người dùng nào.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {blockedUsers.map((blockedUser) => (
                        <div key={blockedUser.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                          <div className="flex items-center gap-3">
                            <img src={getAvatarUrl(blockedUser)} alt={blockedUser.name} className="h-10 w-10 rounded-full object-cover" />
                            <div>
                              <div className="text-sm font-medium">{blockedUser.name}</div>
                              <div className="text-xs text-slate-400">{blockedUser.email}</div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={() => handleUnblock(blockedUser.id, blockedUser.name)}>
                            <Unlock className="mr-1 h-3 w-3" /> Bỏ chặn
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
