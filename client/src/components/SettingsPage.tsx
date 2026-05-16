import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../lib/authContext";
import { localStorage_service } from "../lib/localStorage";
import type { User as UserType } from "../lib/mockData";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
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
  if (role === "lecturer") return "Giang vien";
  if (role === "admin") return "Quan tri vien";
  return "Sinh vien";
}

function getAvatarUrl(user?: any) {
  if (user?.avatar && typeof user.avatar === "string" && user.avatar.trim()) {
    return user.avatar;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || user?.email || "default"}`;
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

  const overviewStats = useMemo(
    () => [
      { label: "Diem hien tai", value: user?.points || 0 },
      { label: "Nguoi theo doi", value: user?.followers || 0 },
      { label: "Bai viet", value: user?.postsCount || 0 },
    ],
    [user],
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
      toast.error("Khong the tai cai dat quyen rieng tu.");
    }
  };

  const fetchBlockedUsers = async () => {
    if (!token) return;
    setIsLoadingBlocked(true);
    try {
      const res = await api.getBlockedUsers(0, 50, token);
      setBlockedUsers(Array.isArray(res) ? res : []);
    } catch (error) {
      toast.error("Khong the tai danh sach chan.");
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
      toast.error("Khong the tai thong tin thiet bi va phien dang nhap.");
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
      toast.success("Da cap nhat cai dat quyen rieng tu.");
    } catch (error) {
      toast.error("Khong the luu thay doi quyen rieng tu.");
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleSaveCallPreferences = () => {
    setIsSavingCalls(true);
    try {
      localStorage.setItem(CALL_PREFERENCE_KEY, JSON.stringify(callPreferences));
      toast.success("Da luu tuy chon goi va nhan tin.");
    } catch (error) {
      toast.error("Khong the luu tuy chon giao dien.");
    } finally {
      setTimeout(() => setIsSavingCalls(false), 350);
    }
  };

  const handleUnblock = async (blockedId: string, name: string) => {
    if (!token) return;

    try {
      await api.unblockUser(blockedId, token);
      setBlockedUsers((previous) => previous.filter((blockedUser) => blockedUser.id !== blockedId));
      toast.success(`Da bo chan ${name}.`);
    } catch (error) {
      toast.error("Khong the bo chan nguoi dung nay luc nay.");
    }
  };

  const handleRevokeSession = async (sessionToken: string) => {
    if (!token) return;

    try {
      await api.revokeSession(sessionToken, token);
      setSessions((previous) => previous.filter((session) => session.token !== sessionToken && session.id !== sessionToken));
      toast.success("Da thu hoi phien dang nhap.");
    } catch (error) {
      toast.error("Khong the thu hoi phien dang nhap.");
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!token) return;

    try {
      await api.deleteDevice(deviceId, token);
      setDevices((previous) => previous.filter((device) => device.id !== deviceId));
      toast.success("Da go thiet bi khoi tai khoan.");
    } catch (error) {
      toast.error("Khong the xoa thiet bi nay.");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-0 sm:px-4 py-4 sm:py-8">
      <div className="sm:rounded-[32px] border-orange-100 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_28%,#fffaf5_100%)] p-4 sm:p-6 shadow-[0_24px_70px_rgba(249,115,22,0.08)]">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                <SettingsIcon className="h-3.5 w-3.5" />
                Control Center
              </div>
              <div className="flex items-center gap-3">
                <img src={userAvatar} alt={user?.name || "User"} className="h-14 w-14 rounded-[18px] border border-orange-100 object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-950">{user?.name || "Tai khoan hien tai"}</div>
                  <div className="mt-1 text-sm text-slate-500">{user?.email || "Chua co email"}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-orange-500 px-3 py-1 text-white hover:bg-orange-500">
                  {formatRole(user?.role)}
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {callPreferences.showActiveStatus ? "Dang hien trang thai online" : "Da an trang thai online"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 rounded-[28px] border border-orange-100 bg-white p-3 shadow-sm">
              {[
                { id: "overview", label: "Tong quan", icon: User },
                { id: "privacy", label: "Quyen rieng tu", icon: Shield },
                { id: "calls", label: "Goi va nhan tin", icon: Phone },
                { id: "security", label: "Bao mat", icon: Lock },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={`h-12 w-full justify-start rounded-2xl ${
                    activeTab === item.id
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "text-slate-700 hover:bg-orange-50"
                  }`}
                  onClick={() => setActiveTab(item.id as SettingsTab)}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </aside>

          <main className="min-w-0">
            {activeTab === "overview" ? (
              <div className="space-y-6">
                <Card className="overflow-hidden rounded-[30px] border-orange-100 shadow-sm">
                  <CardContent className="p-0">
                    <div className="bg-[linear-gradient(135deg,#f97316_0%,#fb923c_45%,#fdba74_100%)] px-6 py-8 text-white">
                      <div className="max-w-3xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Settings overview
                        </div>
                        <h1 className="text-3xl font-semibold">Quan ly tai khoan, quyen rieng tu va giao dien chat</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-orange-50">
                          Day la khu settings moi de ban theo doi trang thai tai khoan, chinh quyen nhan tin va cai dat audio/video call.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 px-6 py-6 sm:grid-cols-3">
                      {overviewStats.map((item) => (
                        <div key={item.label} className="rounded-[24px] border border-orange-100 bg-orange-50/60 p-4">
                          <div className="text-sm text-slate-500">{item.label}</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="rounded-[28px] border-orange-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Thong tin tai khoan</CardTitle>
                      <CardDescription>Thong tin chinh dang duoc su dung trong he thong.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Ho va ten</label>
                          <Input value={user?.name || ""} readOnly className="h-11 rounded-2xl border-orange-100 bg-orange-50/60" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Vai tro</label>
                          <Input value={formatRole(user?.role)} readOnly className="h-11 rounded-2xl border-orange-100 bg-orange-50/60" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Email</label>
                          <Input value={user?.email || ""} readOnly className="h-11 rounded-2xl border-orange-100 bg-orange-50/60" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Nganh hoc</label>
                          <Input value={user?.major || ""} readOnly className="h-11 rounded-2xl border-orange-100 bg-orange-50/60" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border-orange-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Tong quan giao tiep</CardTitle>
                      <CardDescription>Trang thai hien tai cho khu nhan tin va goi.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-[24px] border border-orange-100 bg-orange-50/70 p-4">
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-semibold text-slate-900">Audio call</div>
                            <div className="text-sm text-slate-500">
                              {callPreferences.allowAudioCalls ? "Dang cho phep" : "Dang tam tat"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-orange-100 bg-orange-50/70 p-4">
                        <div className="flex items-center gap-3">
                          <Video className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-semibold text-slate-900">Video call</div>
                            <div className="text-sm text-slate-500">
                              {callPreferences.allowVideoCalls ? "Dang cho phep" : "Dang tam tat"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-orange-100 bg-orange-50/60 p-4">
                        <div className="flex items-center gap-3">
                          <Bell className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-semibold text-slate-900">Thong bao desktop</div>
                            <div className="text-sm text-slate-500">
                              {callPreferences.desktopNotifications ? "Dang bat" : "Dang tat"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}

            {activeTab === "privacy" ? (
              <div className="space-y-6">
                <Card className="rounded-[30px] border-orange-100 shadow-sm">
                  <CardHeader>
                    <CardTitle>Quyen rieng tu va nhan tin</CardTitle>
                    <CardDescription>Quan ly ai co the nhan tin, thay trang thai va dua tin vao hop thu cho.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setPrivacySettings((previous) => ({ ...previous, allowMessagesFrom: "everyone" }))}
                        className={`rounded-[24px] border p-5 text-left transition ${
                          privacySettings.allowMessagesFrom === "everyone"
                            ? "border-orange-200 bg-orange-50 shadow-sm"
                            : "border-orange-100 bg-white hover:bg-orange-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-semibold text-slate-900">Moi nguoi</div>
                            <div className="mt-1 text-sm leading-6 text-slate-500">
                              Cho phep tat ca nguoi dung duoc bat dau hoi thoai voi ban.
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrivacySettings((previous) => ({ ...previous, allowMessagesFrom: "mutual_followers" }))}
                        className={`rounded-[24px] border p-5 text-left transition ${
                          privacySettings.allowMessagesFrom === "mutual_followers"
                            ? "border-orange-200 bg-orange-50 shadow-sm"
                            : "border-orange-100 bg-white hover:bg-orange-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <BadgeCheck className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-semibold text-slate-900">Chi ban be follow cheo</div>
                            <div className="mt-1 text-sm leading-6 text-slate-500">
                              Han che hoi thoai moi chi voi nhung nguoi da ket noi hai chieu.
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[24px] border border-orange-100 bg-orange-50/60 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-slate-900">Tin nhan cho</div>
                            <div className="mt-1 text-sm leading-6 text-slate-500">
                              Nguoi la se vao hop thu cho thay vi thong bao truc tiep.
                            </div>
                          </div>
                          <Switch
                            checked={privacySettings.requireApproval}
                            onCheckedChange={(checked) =>
                              setPrivacySettings((previous) => ({ ...previous, requireApproval: checked }))
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-orange-100 bg-orange-50/60 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-slate-900">Hien trang thai hoat dong</div>
                            <div className="mt-1 text-sm leading-6 text-slate-500">
                              Cho phep nguoi khac biet ban dang online trong khu nhan tin.
                            </div>
                          </div>
                          <Switch
                            checked={callPreferences.showActiveStatus}
                            onCheckedChange={(checked) =>
                              setCallPreferences((previous) => ({ ...previous, showActiveStatus: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      className="h-11 rounded-2xl bg-orange-500 px-5 text-white hover:bg-orange-600"
                      onClick={handleSavePrivacy}
                      disabled={isSavingPrivacy}
                    >
                      {isSavingPrivacy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Luu thay doi
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeTab === "calls" ? (
              <div className="space-y-6">
                <Card className="rounded-[30px] border-orange-100 shadow-sm">
                  <CardHeader>
                    <CardTitle>Cai dat goi va tra nghiem nhan tin</CardTitle>
                    <CardDescription>Bat tat quyen goi, thong bao va kieu hien thi composer trong chat.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                      {[
                        {
                          key: "allowAudioCalls",
                          label: "Cho phep goi thoai",
                          description: "Hien button audio call trong khung chat va profile hoi thoai.",
                          icon: Phone,
                        },
                        {
                          key: "allowVideoCalls",
                          label: "Cho phep video call",
                          description: "Hien button video call va call overlay cho stream camera.",
                          icon: Camera,
                        },
                        {
                          key: "desktopNotifications",
                          label: "Thong bao desktop",
                          description: "Nhan thong bao cho tin nhan moi va loi moi tham gia cuoc goi.",
                          icon: Bell,
                        },
                        {
                          key: "autoPlayMedia",
                          label: "Tu dong phat media",
                          description: "Tu dong chuan bi media preview khi ban mo call overlay.",
                          icon: Video,
                        },
                      ].map((item) => (
                        <div key={item.key} className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="pr-4">
                              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                                <item.icon className="h-5 w-5" />
                              </div>
                              <div className="font-semibold text-slate-900">{item.label}</div>
                              <div className="mt-1 text-sm leading-6 text-slate-500">{item.description}</div>
                            </div>
                            <Switch
                              checked={callPreferences[item.key as keyof CallPreferences] as boolean}
                              onCheckedChange={(checked) =>
                                setCallPreferences((previous) => ({ ...previous, [item.key]: checked }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[24px] border border-orange-100 bg-orange-50/60 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">Compact composer</div>
                          <div className="mt-1 text-sm leading-6 text-slate-500">
                            Thu gon action composer de giao dien chat gon hon khi ban lam viec tren laptop nho.
                          </div>
                        </div>
                        <Switch
                          checked={callPreferences.compactComposer}
                          onCheckedChange={(checked) =>
                            setCallPreferences((previous) => ({ ...previous, compactComposer: checked }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">Profile note cho khu nhan tin</label>
                      <Textarea
                        value={callPreferences.profileNote}
                        onChange={(event) =>
                          setCallPreferences((previous) => ({ ...previous, profileNote: event.target.value }))
                        }
                        className="min-h-[120px] rounded-[24px] border-orange-100 bg-white"
                        placeholder="Them mot dong ghi chu ngan de hien thi trong profile thong tin hoi thoai..."
                      />
                    </div>

                    <Button
                      className="h-11 rounded-2xl bg-orange-500 px-5 text-white hover:bg-orange-600"
                      onClick={handleSaveCallPreferences}
                      disabled={isSavingCalls}
                    >
                      {isSavingCalls ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Luu tuy chon
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeTab === "security" ? (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="rounded-[28px] border-orange-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Phien dang nhap</CardTitle>
                      <CardDescription>Quan ly cac session hien co tren nhieu trinh duyet hoac may tinh.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingSecurity ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-4 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Dang tai danh sach phien dang nhap...
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-orange-100 bg-orange-50/60 px-4 py-8 text-center text-sm text-slate-500">
                          Chua co du lieu session de hien thi.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sessions.map((session: any, index) => {
                            const sessionId = session.token || session.id || `session-${index}`;
                            const deviceName = session.deviceName || session.userAgent || "Session khong ro";

                            return (
                              <div key={sessionId} className="rounded-[24px] border border-orange-100 bg-white p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <Laptop className="mt-1 h-5 w-5 text-slate-500" />
                                    <div>
                                      <div className="font-semibold text-slate-900">{deviceName}</div>
                                      <div className="mt-1 text-sm text-slate-500">
                                        {session.createdAt || session.lastActive || "Khong ro thoi gian"}
                                      </div>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm" className="rounded-full border-orange-100 hover:bg-orange-50" onClick={() => handleRevokeSession(sessionId)}>
                                    Thu hoi
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border-orange-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Thiet bi da dang ky</CardTitle>
                      <CardDescription>Theo doi va go bo nhung thiet bi dang duoc luu trong he thong.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingSecurity ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-4 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Dang tai danh sach thiet bi...
                        </div>
                      ) : devices.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-orange-100 bg-orange-50/60 px-4 py-8 text-center text-sm text-slate-500">
                          Chua co du lieu thiet bi.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {devices.map((device: any, index) => {
                            const deviceId = device.id || `device-${index}`;
                            const deviceName = device.deviceName || device.name || "Thiet bi khong ro";

                            return (
                              <div key={deviceId} className="rounded-[24px] border border-orange-100 bg-white p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <Smartphone className="mt-1 h-5 w-5 text-slate-500" />
                                    <div>
                                      <div className="font-semibold text-slate-900">{deviceName}</div>
                                      <div className="mt-1 text-sm text-slate-500">
                                        {device.userAgent || device.platform || "Khong ro thong tin thiet bi"}
                                      </div>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm" className="rounded-full border-orange-100 hover:bg-orange-50" onClick={() => handleDeleteDevice(deviceId)}>
                                    Xoa
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-[28px] border-orange-100 shadow-sm">
                  <CardHeader>
                    <CardTitle>Danh sach chan</CardTitle>
                    <CardDescription>Nhung nguoi dung nay se khong the nhan tin hoac tuong tac truc tiep voi ban.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingBlocked ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-4 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dang tai danh sach chan...
                      </div>
                    ) : blockedUsers.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-orange-100 bg-orange-50/60 px-4 py-10 text-center">
                        <Ban className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <div className="text-sm font-medium text-slate-700">Ban chua chan nguoi dung nao.</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {blockedUsers.map((blockedUser) => (
                          <div key={blockedUser.id} className="rounded-[24px] border border-orange-100 bg-white p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getAvatarUrl(blockedUser)}
                                  alt={blockedUser.name}
                                  className="h-12 w-12 rounded-[16px] border border-orange-100 object-cover"
                                />
                                <div>
                                  <div className="font-semibold text-slate-900">{blockedUser.name}</div>
                                  <div className="mt-1 text-sm text-slate-500">{blockedUser.email}</div>
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                className="rounded-full border-orange-100 hover:bg-orange-50"
                                onClick={() => handleUnblock(blockedUser.id, blockedUser.name)}
                              >
                                <Unlock className="mr-2 h-4 w-4" />
                                Bo chan
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
