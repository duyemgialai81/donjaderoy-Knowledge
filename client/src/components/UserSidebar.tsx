import { Trophy, TrendingUp, Award, Target, User as UserIcon, Eye, Heart, MessageCircle, Star } from "lucide-react";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import type { User as UserType } from "../lib/mockData";
import { useEffect, useState } from "react";
import api from "../lib/api";

interface UserSidebarProps {
  user: UserType;
  onViewProfile?: () => void;
}

export function UserSidebar({ user, onViewProfile }: UserSidebarProps) {
  const [allBadges, setAllBadges] = useState<any[]>([]);

  const sortedBadges = [...allBadges].sort((a, b) => (a.requiredPoints || 0) - (b.requiredPoints || 0));
  const achievedBadges = sortedBadges.filter((b) => (user?.points || 0) >= (b.requiredPoints || 0));
  const currentBadge = achievedBadges.length > 0 ? achievedBadges[achievedBadges.length - 1] : null;
  const nextBadge = sortedBadges.find((b) => (user?.points || 0) < (b.requiredPoints || 0));

  const currentBadgePoints = currentBadge?.requiredPoints ?? 0;
  const progressToNext = nextBadge
    ? Math.max(0, Math.min(100, (((user?.points || 0) - currentBadgePoints) / (nextBadge.requiredPoints - currentBadgePoints)) * 100))
    : 100;

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("ksp_auth_token") || undefined;
        const badgesRes = await api.getBadges(token);
        const badgesList = Array.isArray(badgesRes) ? badgesRes : (badgesRes?.data || badgesRes);
        if (mounted && Array.isArray(badgesList)) {
          setAllBadges(badgesList.sort((a, b) => (a.requiredPoints || 0) - (b.requiredPoints || 0)));
        }
      } catch (error) {
        console.error("[UserSidebar] Error fetching badges:", error);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [user?.id, user?.points]);

  if (!user) {
    return (
      <div className="card-premium p-6 text-center">
        <div className="skeleton h-20 w-20 rounded-full mx-auto mb-4" />
        <div className="skeleton h-4 w-32 mx-auto mb-2" />
        <div className="skeleton h-3 w-24 mx-auto" />
      </div>
    );
  }

  const weekStats = [
    { label: "Lượt xem", value: "+234", icon: Eye, colorClass: "stat-card-blue", iconColor: "text-blue-500" },
    { label: "Lượt thích", value: "+45",  icon: Heart, colorClass: "stat-card-orange", iconColor: "text-[#F26B38]" },
    { label: "Bình luận", value: "+28",  icon: MessageCircle, colorClass: "stat-card-green", iconColor: "text-emerald-500" },
    { label: "Điểm +",    value: "+78",  icon: Star, colorClass: "stat-card-purple", iconColor: "text-purple-500" },
  ];

  const weeklyGoals = [
    { label: "Đăng bài viết", current: 2, target: 3 },
    { label: "Bình luận",     current: 8, target: 10 },
    { label: "Nhận lượt thích", current: 45, target: 50 },
  ];

  return (
    <div className="space-y-4">

      {/* ── User Profile Card ── */}
      <div className="card-premium p-5">
        <div className="text-center">
          {/* Avatar */}
          <div className="relative inline-block mb-3">
            <img
              src={user?.avatar && typeof user.avatar === "string" && user.avatar.trim()
                ? user.avatar
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
              alt={user.name}
              className="h-20 w-20 rounded-full mx-auto object-cover shadow-md"
              style={{ boxShadow: "0 0 0 3px white, 0 0 0 5px rgba(242,107,56,0.25)" }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
              }}
            />
            {currentBadge && (
              <span className="absolute -bottom-1 -right-1 text-xl bg-white rounded-full shadow-md p-0.5 border border-orange-100">
                {currentBadge.icon}
              </span>
            )}
          </div>

          <h3 className="font-bold text-slate-800 text-base mb-0.5">{user.name}</h3>
          <p className="text-xs text-slate-500 mb-2">{user.major}</p>

          {user.class && (
            <Badge variant="outline" className="text-xs mb-3 border-slate-200 text-slate-600">
              {user.class}
            </Badge>
          )}

          {/* View Profile Button */}
          {onViewProfile && (
            <Button
              size="sm"
              className="w-full mb-4 h-8 text-xs rounded-lg btn-gradient-orange font-semibold"
              onClick={onViewProfile}
            >
              <UserIcon className="h-3.5 w-3.5 mr-1.5" />
              Xem hồ sơ
            </Button>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 text-center pt-3 border-t border-slate-100 gap-2">
            <div>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Trophy className="h-3.5 w-3.5 text-[#F26B38]" />
                <span className="font-bold text-sm text-[#F26B38]">{(user.points || 0).toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-500">Điểm</p>
            </div>
            <div>
              <p className="font-bold text-sm text-slate-700 mb-0.5">{user.postsCount || 0}</p>
              <p className="text-[10px] text-slate-500">Bài viết</p>
            </div>
            <div>
              <p className="font-bold text-sm text-slate-700 mb-0.5">{user.followers || 0}</p>
              <p className="text-[10px] text-slate-500">Theo dõi</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Badge Progress ── */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-4 w-4 text-[#F26B38]" />
          <h3 className="font-semibold text-slate-800 text-sm">Danh hiệu</h3>
        </div>

        {/* Current badge */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#FEF0E8] to-[#FFF7F3] border border-orange-100 mb-3">
          <span className="text-2xl">{currentBadge?.icon ?? "🏅"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{currentBadge?.name ?? "Chưa có danh hiệu"}</p>
            <p className="text-xs text-slate-500 truncate">{currentBadge?.description ?? "Hoàn thành nhiệm vụ để nhận danh hiệu"}</p>
          </div>
        </div>

        {/* Progress to next */}
        {nextBadge && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Tiến đến <span className="font-medium text-slate-700">{nextBadge.name}</span></span>
              <span className="font-semibold text-[#F26B38]">{user.points || 0}/{nextBadge.requiredPoints}</span>
            </div>
            <div className="progress-fpt">
              <Progress value={progressToNext} className="h-2" />
            </div>
            <p className="text-[10px] text-slate-400">Còn {nextBadge.requiredPoints - (user.points || 0)} điểm nữa</p>
          </div>
        )}

        {/* All badges grid */}
        {sortedBadges.length > 0 && (
          <div className="pt-3 mt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">
              Huy hiệu đạt được ({achievedBadges.length}/{sortedBadges.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sortedBadges.map((badge) => {
                const achieved = achievedBadges.some((b) => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all ${
                      achieved ? `${badge.color} border-transparent shadow-sm` : "bg-slate-100 border-slate-200 grayscale opacity-40"
                    }`}
                    title={`${badge.name} – ${badge.requiredPoints} điểm`}
                  >
                    <span className="text-lg">{badge.icon}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Weekly Stats – 4 mini cards ── */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-[#F26B38]" />
          <h3 className="font-semibold text-slate-800 text-sm">Thống kê tuần này</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {weekStats.map(({ label, value, icon: Icon, colorClass, iconColor }) => (
            <div key={label} className={`${colorClass} rounded-xl p-3 flex flex-col gap-1`}>
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${iconColor}`} />
                <span className="font-bold text-sm text-slate-700">{value}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Weekly Goals ── */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-[#F26B38]" />
          <h3 className="font-semibold text-slate-800 text-sm">Mục tiêu tuần này</h3>
        </div>
        <div className="space-y-3">
          {weeklyGoals.map(({ label, current, target }) => {
            const pct = Math.round((current / target) * 100);
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className={`font-semibold ${pct >= 100 ? "text-emerald-600" : "text-[#F26B38]"}`}>
                    {current}/{target}
                  </span>
                </div>
                <div className="progress-fpt">
                  <Progress value={pct} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}