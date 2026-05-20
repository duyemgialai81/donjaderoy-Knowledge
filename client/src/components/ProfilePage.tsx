import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { User as UserType, Post } from "../lib/mockData";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import {
  Edit, Save, X, Mail, Calendar, Award, TrendingUp,
  Users, BookOpen, Heart, MessageCircle, Eye, Trophy, Star,
  GraduationCap, User
} from "lucide-react";
import { PostCard } from "./PostCard";
import api, { normalizeAvatarUrl } from "../lib/api";
import { localStorage_service } from "../lib/localStorage";
import { formatVietnamDistance } from "../lib/time";

interface ProfilePageProps {
  user: UserType;
  posts: Post[];
  currentUser?: any;
  isOwnProfile: boolean;
  onUpdateProfile?: (data: any) => void;
  onFollow?: () => void;
  onPostClick: (post: Post) => void;
  onPostLike: (postId: string) => void;
}

export function ProfilePage({
  user, posts, currentUser, isOwnProfile, onUpdateProfile, onFollow, onPostClick, onPostLike,
}: ProfilePageProps) {
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");
  const [editedBio, setEditedBio] = useState((user as any)?.bio || "");
  const [editedAvatar, setEditedAvatar] = useState((user as any)?.avatar || "");
  const [editedMajorId, setEditedMajorId] = useState((user as any)?.majorId || (user as any)?.major || "");
  const [editedClassName, setEditedClassName] = useState((user as any)?.className || (user as any)?.class || "");
  const [activeTab, setActiveTab] = useState("posts");
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [followUsers, setFollowUsers] = useState<any[]>([]);
  const [isLoadingFollowUsers, setIsLoadingFollowUsers] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowBusy, setIsFollowBusy] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [followersCount, setFollowersCount] = useState(Number((user as any)?.followers || 0));
  const [profileVisitCount, setProfileVisitCount] = useState(0);
  const [profileVisitors, setProfileVisitors] = useState<any[]>([]);
  const [showProfileVisitors, setShowProfileVisitors] = useState(false);
  const [isLoadingProfileVisitors, setIsLoadingProfileVisitors] = useState(false);

  useEffect(() => {
    setEditedName(user?.name || "");
    setEditedBio((user as any)?.bio || "");
    setEditedAvatar((user as any)?.avatar || "");
    setEditedMajorId((user as any)?.majorId || (user as any)?.major || "");
    setEditedClassName((user as any)?.className || (user as any)?.class || "");
    setFollowersCount(Number((user as any)?.followers || 0));
  }, [user?.id, user?.name, (user as any)?.bio, (user as any)?.avatar, (user as any)?.majorId, (user as any)?.major, (user as any)?.className, (user as any)?.class, (user as any)?.followers]);

  useEffect(() => {
    let mounted = true;
    const loadFollowStatus = async () => {
      if (isOwnProfile || !currentUser?.id || !user?.id) {
        setIsFollowing(false);
        return;
      }
      try {
        const token = localStorage_service.getAuthToken() || undefined;
        const status = await api.getFollowStatus(currentUser.id, user.id, token);
        if (mounted) setIsFollowing(Boolean(status?.isFollowing));
      } catch {
        if (mounted) setIsFollowing(false);
      }
    };
    loadFollowStatus();
    return () => { mounted = false; };
  }, [currentUser?.id, user?.id, isOwnProfile]);

  useEffect(() => {
    if (!user?.id || !currentUser?.id) return;
    const token = localStorage_service.getAuthToken() || undefined;

    if (isOwnProfile) {
      api.getProfileVisitCount(user.id, token)
        .then((count: number) => setProfileVisitCount(Number(count) || 0))
        .catch(() => setProfileVisitCount(0));
      return;
    }

    api.recordProfileVisit(user.id, token).catch(() => {});
  }, [user?.id, currentUser?.id, isOwnProfile]);

  const handleSave = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        name: editedName.trim(),
        bio: editedBio.trim(),
        avatar: editedAvatar.trim(),
        majorId: editedMajorId.trim(),
        className: editedClassName.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleFollowToggle = async () => {
    if (!currentUser?.id || !user?.id || isFollowBusy) {
      onFollow?.();
      return;
    }
    setIsFollowBusy(true);
    try {
      const token = localStorage_service.getAuthToken() || undefined;
      if (isFollowing) {
        await api.unfollowUser(currentUser.id, user.id, token);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await api.followUser(currentUser.id, user.id, token);
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
      onFollow?.();
    } finally {
      setIsFollowBusy(false);
    }
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.id) return;
    if (!file.type.startsWith("image/")) return;
    const previousAvatar = editedAvatar;
    const previewUrl = URL.createObjectURL(file);
    setEditedAvatar(previewUrl);
    setIsUploadingAvatar(true);
    try {
      const token = localStorage_service.getAuthToken() || undefined;
      const uploaded = await api.uploadUserAvatar(currentUser.id, file, token);
      if (uploaded?.avatar) setEditedAvatar(uploaded.avatar);
    } catch {
      setEditedAvatar(previousAvatar);
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
      URL.revokeObjectURL(previewUrl);
    }
  };

  const openMessageThread = () => {
    if (!user?.id) return;
    navigate(`/tin-nhan?user=${encodeURIComponent(user.id)}`);
  };

  const openFollowModal = async (type: "followers" | "following") => {
    if (!user?.id) return;
    setFollowModal(type);
    setFollowUsers([]);
    setIsLoadingFollowUsers(true);
    try {
      const token = localStorage_service.getAuthToken() || undefined;
      const users = type === "followers"
        ? await api.getFollowers(user.id, token)
        : await api.getFollowing(user.id, token);
      setFollowUsers(Array.isArray(users) ? users : []);
    } catch {
      setFollowUsers([]);
    } finally {
      setIsLoadingFollowUsers(false);
    }
  };

  const openProfileVisitors = async () => {
    if (!isOwnProfile || !user?.id) return;
    setShowProfileVisitors(true);
    setIsLoadingProfileVisitors(true);
    try {
      const token = localStorage_service.getAuthToken() || undefined;
      const data = await api.getProfileVisitors(user.id, token);
      setProfileVisitCount(Number(data?.count || 0));
      setProfileVisitors(Array.isArray(data?.visitors) ? data.visitors : []);
    } catch {
      setProfileVisitors([]);
    } finally {
      setIsLoadingProfileVisitors(false);
    }
  };

  const safeNumber = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };
  const userPosts    = posts?.filter((p) => p.authorId === user?.id) || [];
  const totalLikes   = userPosts.reduce((s, p: any) => s + safeNumber(p.likes ?? p.likesCount), 0);
  const totalViews   = userPosts.reduce((s, p: any) => s + safeNumber(p.views), 0);
  const totalComments = userPosts.reduce((s, p: any) => s + safeNumber(p.commentsCount), 0);

  const userBadges = user?.badges || [];
  const nextBadge  = userBadges.length < 5 ? userBadges[userBadges.length] : null;
  const progressToNextBadge = nextBadge && user?.points
    ? Math.min((user.points / nextBadge.requiredPoints) * 100, 100)
    : 100;

  const memberSince = (() => {
    try {
      if (!user?.joinedDate) return "không rõ";
      const d = new Date(user.joinedDate);
      if (isNaN(d.getTime())) return "không rõ";
      return formatVietnamDistance(user.joinedDate, false);
    } catch { return "không rõ"; }
  })();

  if (!user) return <div className="py-20 text-center text-slate-500">Đang tải hồ sơ...</div>;

  const avatarSource = isEditing ? editedAvatar : user?.avatar;
  const avatarUrl = avatarSource && typeof avatarSource === "string" && avatarSource.trim()
    ? avatarSource
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "default"}`;

  const activityStats = [
    { icon: Heart,         label: "Tổng lượt thích", value: totalLikes.toLocaleString(),   color: "text-rose-500",    bg: "bg-rose-50"    },
    { icon: Eye,           label: "Tổng lượt xem",   value: totalViews.toLocaleString(),   color: "text-blue-500",    bg: "bg-blue-50"    },
    { icon: MessageCircle, label: "Tổng bình luận",  value: totalComments.toLocaleString(), color: "text-emerald-500", bg: "bg-emerald-50" },
    { icon: Trophy,        label: "Điểm tích lũy",   value: (user.points || 0).toLocaleString(), color: "text-[#F26B38]", bg: "bg-orange-50" },
  ];

  const profileVisitorStats = isOwnProfile
    ? [{ icon: Eye, label: "Lượt ghé hồ sơ", value: profileVisitCount.toLocaleString(), color: "text-cyan-500", bg: "bg-cyan-50", onClick: openProfileVisitors }]
    : [];

  return (
    <div className="min-h-screen" style={{ background: "#F7F9FC" }}>
      {/* ── Cover Banner ── */}
      <div className="h-52 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F26B38] via-[#e55a2a] to-[#c44415]" />
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 left-20 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute top-8 left-1/3 h-20 w-20 rounded-full bg-white/5" />
      </div>

      <div className="profile-content-layer container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-28 pb-10">

          {/* ── Left – Profile Card ── */}
          <div className="lg:col-span-1 space-y-4">

            <div className="card-premium p-6 relative">
              {/* Avatar */}
              <div className="absolute -top-14 left-1/2 -translate-x-1/2">
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    className="h-28 w-28 rounded-2xl object-cover shadow-xl border-4 border-white"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
                    }}
                  />
                  {isOwnProfile && isEditing && (
                    <>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="absolute inset-x-1 bottom-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
                      >
                        {isUploadingAvatar ? "Đang tải..." : "Đổi ảnh"}
                      </button>
                    </>
                  )}
                  {userBadges.length > 0 && (
                    <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md text-xl border border-orange-100">
                      {userBadges[userBadges.length - 1]?.icon}
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="text-center mt-16">
                {isEditing ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-center mb-2 font-bold"
                  />
                ) : (
                  <h2 className="font-bold text-xl text-slate-800 mb-1">{user.name}</h2>
                )}

                <Badge
                  className={`text-xs font-semibold mb-3 inline-flex items-center gap-1 ${
                    user.role === "lecturer"
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {user.role === "lecturer" ? (
                    <>
                      <GraduationCap className="h-3 w-3" />
                      Giảng viên
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      Sinh viên
                    </>
                  )}
                </Badge>

                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{(user as any).major || (user as any).majorId || "Chưa cập nhật ngành"}</span>
                  </div>
                  {((user as any).class || (user as any).className) && (
                    <div className="flex items-center justify-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>Lớp {(user as any).class || (user as any).className}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[180px]">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Tham gia {memberSince} trước</span>
                  </div>
                </div>

                {isEditing && (
                  <div className="space-y-2 text-left">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Ảnh đại diện</label>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full rounded-xl border-orange-200 bg-orange-50 text-sm font-semibold text-[#F26B38] hover:bg-orange-100"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                      >
                        {isUploadingAvatar ? "Đang tải ảnh..." : "Tải ảnh lên"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-500">Ngành học</label>
                        <Input
                          value={editedMajorId}
                          onChange={(e) => setEditedMajorId(e.target.value)}
                          placeholder="Ví dụ: CNTT"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-500">Lớp</label>
                        <Input
                          value={editedClassName}
                          onChange={(e) => setEditedClassName(e.target.value)}
                          placeholder="Ví dụ: SD19301"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <label className="block text-xs font-semibold text-slate-500">Giới thiệu</label>
                    <Textarea
                    placeholder="Giới thiệu về bản thân..."
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                      className="min-h-[80px] text-sm mb-3"
                    />
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              {/* Actions */}
              <div className="flex gap-2">
                {isOwnProfile ? (
                  isEditing ? (
                    <>
                      <Button className="flex-1 h-9 text-sm btn-gradient-orange rounded-lg" onClick={handleSave}>
                        <Save className="h-3.5 w-3.5 mr-1.5" /> Lưu
                      </Button>
                      <Button variant="outline" className="flex-1 h-9 text-sm rounded-lg" onClick={() => setIsEditing(false)}>
                        <X className="h-3.5 w-3.5 mr-1.5" /> Hủy
                      </Button>
                    </>
                  ) : (
                    <Button className="flex-1 h-9 text-sm btn-gradient-orange rounded-lg" onClick={() => setIsEditing(true)}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" /> Chỉnh sửa hồ sơ
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      className={`flex-1 h-9 text-sm rounded-lg ${isFollowing ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "btn-gradient-orange"}`}
                      onClick={handleFollowToggle}
                      disabled={isFollowBusy}
                    >
                      <Users className="h-3.5 w-3.5 mr-1.5" /> {isFollowing ? "Bỏ theo dõi" : "Theo dõi"}
                    </Button>
                    <Button variant="outline" className="flex-1 h-9 text-sm rounded-lg border-orange-200 bg-orange-50 text-[#F26B38] hover:bg-orange-100 hover:text-[#D9541E]" onClick={openMessageThread}>
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Nhắn tin
                    </Button>
                  </>
                )}
              </div>

              <Separator className="my-3" />

              {/* Post/Follower stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { value: user.postsCount || 0,   label: "Bài viết" },
                  { value: followersCount,    label: "Theo dõi" },
                  { value: user.following || 0,    label: "Đang theo" },
                ].map(({ value, label }, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (index === 1) openFollowModal("followers");
                      if (index === 2) openFollowModal("following");
                    }}
                    disabled={index === 0}
                    className="rounded-xl bg-slate-50 py-2.5 transition-colors hover:bg-orange-50 disabled:hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-[#F26B38]">{value}</div>
                    <div className="text-[10px] text-slate-500">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Achievement Card ── */}
            <div className="card-premium p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-[#F26B38]" />
                <h3 className="font-semibold text-slate-800 text-sm">Thành tích</h3>
              </div>

              {/* Activity stats grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[...activityStats, ...profileVisitorStats].map((stat: any) => {
                  const { icon: Icon, label, value, color, bg, onClick } = stat;
                  return (
                    <button key={label} type="button" onClick={onClick} disabled={!onClick} className={`${bg} rounded-xl p-3 flex flex-col gap-1 text-left transition hover:shadow-sm disabled:cursor-default`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                      <p className="text-sm font-bold text-slate-700">{value}</p>
                      <p className="text-[10px] text-slate-500">{label}</p>
                    </button>
                  );
                })}
              </div>

              {/* Points progress */}
              {nextBadge && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Tiến độ đến <span className="font-medium">"{nextBadge.name}"</span></span>
                    <span className="font-semibold text-[#F26B38]">{user.points || 0}/{nextBadge.requiredPoints}</span>
                  </div>
                  <div className="progress-fpt">
                    <Progress value={progressToNextBadge} className="h-2" />
                  </div>
                </div>
              )}

              {/* Badge grid */}
              {userBadges.length > 0 && (
                <>
                  <p className="text-xs text-slate-500 mb-2">Huy hiệu ({userBadges.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {userBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className="text-center p-2.5 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-colors"
                        title={badge.description}
                      >
                        <div className="text-2xl mb-1">{badge.icon}</div>
                        <div className="text-[10px] text-slate-500 font-medium truncate">{badge.name}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Right – Posts & Tabs ── */}
          <div className="lg:col-span-2">
            <div className="card-premium overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b border-slate-100 px-4 pt-4">
                  <TabsList className="h-9 bg-transparent p-0 gap-1">
                    {[
                      { value: "posts",  label: `Bài viết (${userPosts.length})`, icon: BookOpen },
                      { value: "liked",  label: "Đã thích",                        icon: Heart },
                      { value: "saved",  label: "Đã lưu",                          icon: Star },
                    ].map(({ value, label, icon: Icon }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="h-9 px-4 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-[#F26B38] data-[state=active]:text-[#F26B38] data-[state=active]:bg-transparent"
                      >
                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="p-4">
                  <TabsContent value="posts" className="mt-0 space-y-3">
                    {userPosts.length > 0 ? (
                      userPosts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onClick={() => onPostClick(post)}
                          onLike={() => onPostLike(post.id)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-16">
                        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-slate-600 font-semibold mb-1">Chưa có bài viết nào</h3>
                        <p className="text-sm text-slate-400">
                          {isOwnProfile ? "Hãy bắt đầu chia sẻ kiến thức của bạn!" : "Người dùng này chưa đăng bài nào"}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {["liked", "saved"].map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-0">
                      <div className="text-center py-16">
                        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          {tab === "liked"
                            ? <Heart className="h-8 w-8 text-slate-300" />
                            : <Star  className="h-8 w-8 text-slate-300" />}
                        </div>
                        <h3 className="text-slate-600 font-semibold mb-1">
                          {tab === "liked" ? "Chưa có bài viết đã thích" : "Chưa có bài viết đã lưu"}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {tab === "liked" ? "Bài viết bạn thích sẽ hiển thị ở đây" : "Bài viết bạn lưu sẽ hiển thị ở đây"}
                        </p>
                      </div>
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {showProfileVisitors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-800">Ai hay vào hồ sơ của bạn</h3>
              <button type="button" onClick={() => setShowProfileVisitors(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              <div className="mb-3 rounded-xl bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700">
                Tổng lượt ghé: {profileVisitCount.toLocaleString()}
              </div>
              {isLoadingProfileVisitors ? (
                <div className="py-8 text-center text-sm text-slate-500">Đang tải...</div>
              ) : profileVisitors.length > 0 ? (
                <div className="space-y-2">
                  {profileVisitors.map((visitor) => {
                    const avatar = normalizeAvatarUrl(visitor.avatar, visitor.userId);
                    return (
                      <button
                        key={visitor.userId}
                        type="button"
                        onClick={() => {
                          setShowProfileVisitors(false);
                          navigate(`/nguoi-dung/${visitor.userId}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-orange-50"
                      >
                        <img src={avatar} alt={visitor.name || "User"} className="h-10 w-10 rounded-full object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{visitor.name || visitor.email || visitor.userId}</p>
                          <p className="text-xs text-slate-500">{Number(visitor.visitCount || 0).toLocaleString()} lượt ghé</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-500">Chưa có lượt ghé hồ sơ nào</div>
              )}
            </div>
          </div>
        </div>
      )}

      {followModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-800">
                {followModal === "followers" ? "Người theo dõi" : "Đang theo dõi"}
              </h3>
              <button
                type="button"
                onClick={() => setFollowModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {isLoadingFollowUsers ? (
                <div className="py-10 text-center text-sm text-slate-500">Đang tải...</div>
              ) : followUsers.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">Chưa có người dùng nào</div>
              ) : (
                followUsers.map((item) => {
                  const avatar = item.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id || item.email || "default"}`;
                  return (
                    <a
                      key={item.id}
                      href={`/nguoi-dung/${item.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50"
                    >
                      <img src={avatar} alt={item.name || ""} className="h-11 w-11 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{item.name || "Người dùng"}</div>
                        <div className="truncate text-xs text-slate-500">{item.email || item.role || ""}</div>
                      </div>
                      <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-semibold text-[#F26B38]">Xem</span>
                    </a>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
