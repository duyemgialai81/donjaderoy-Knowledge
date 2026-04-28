import { Trophy, TrendingUp, Award, Target, User as UserIcon } from "lucide-react";
import { Card } from "./ui/card";
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
  // State management
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  
  const sortedBadges = [...allBadges].sort((a, b) => (a.requiredPoints || 0) - (b.requiredPoints || 0));
  const achievedBadges = sortedBadges.filter((b) => (user?.points || 0) >= (b.requiredPoints || 0));
  const currentBadge = achievedBadges.length > 0 ? achievedBadges[achievedBadges.length - 1] : null;
  const nextBadge = sortedBadges.find((b) => (user?.points || 0) < (b.requiredPoints || 0));
  
  const currentBadgePoints = currentBadge?.requiredPoints ?? 0;
  const progressToNext = nextBadge
    ? Math.max(
        0,
        Math.min(
          100,
          (((user?.points || 0) - currentBadgePoints) / (nextBadge.requiredPoints - currentBadgePoints)) * 100
        )
      )
    : 100;

  // Fetch badges data - Refresh khi user.points hoặc user.id thay đổi
  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('ksp_auth_token') || undefined;
        const badgesRes = await api.getBadges(token);
        const badgesList = Array.isArray(badgesRes) ? badgesRes : (badgesRes?.data || badgesRes);
        
        if (mounted && Array.isArray(badgesList)) {
          const sorted = badgesList.sort((a, b) => (a.requiredPoints || 0) - (b.requiredPoints || 0));
          setAllBadges(sorted);
        }
        
        if (user?.id) {
          const userBadgesRes = await api.getUserBadges(user.id, token);
          const userBadgesList = Array.isArray(userBadgesRes) ? userBadgesRes : (userBadgesRes?.data || userBadgesRes);
          
          if (mounted && Array.isArray(userBadgesList)) {
            setUserBadges(userBadgesList);
          }
        }
      } catch (error) {
        console.error('[UserSidebar] Error fetching badges:', error);
      }
    };
    
    fetchData();
    
    return () => { mounted = false; };
  }, [user?.id, user?.points]);

  // ✅ CHẶN HIỂN THỊ NẾU USER CHƯA TẢI XONG ĐỂ TRÁNH LỖI undefined
  if (!user) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">Đang tải thông tin...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* User Profile Card */}
      <Card className="p-6">
        <div className="text-center">
          <img
            src={user?.avatar && typeof user.avatar === 'string' && user.avatar.trim() 
              ? user.avatar 
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
            alt={user.name}
            className="h-24 w-24 rounded-full mx-auto mb-4 object-cover border-4 border-orange-100"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
            }}
          />
          <h3 className="mb-1 font-semibold text-lg">{user.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{user.major}</p>
          {user.class && (
            <Badge variant="outline" className="mb-4">{user.class}</Badge>
          )}
          
          {onViewProfile && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-4"
              onClick={onViewProfile}
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Xem hồ sơ
            </Button>
          )}
          
          <div className="flex justify-around text-center pt-4 border-t">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-orange-600">{user.points || 0}</span>
              </div>
              <p className="text-xs text-gray-600">Điểm</p>
            </div>
            <div>
              <p className="font-semibold mb-1">{user.postsCount || 0}</p>
              <p className="text-xs text-gray-600">Bài viết</p>
            </div>
            <div>
              <p className="font-semibold mb-1">{user.followers || 0}</p>
              <p className="text-xs text-gray-600">Người theo dõi</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Badges Progress */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold">Danh hiệu hiện tại</h3>
        </div>
        
        <div className="space-y-3">
          {/* Current Badge */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
            <span className="text-3xl">{currentBadge?.icon ?? "🏅"}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {currentBadge?.name ?? "Chưa có danh hiệu"}
              </p>
              <p className="text-xs text-gray-600">
                {currentBadge?.description ?? "Hãy hoàn thành các nhiệm vụ để nhận danh hiệu"}
              </p>
            </div>
          </div>

          {/* Progress to Next Badge */}
          {nextBadge && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tiến độ đến {nextBadge.name}</span>
                <span className="font-semibold text-orange-600">
                  {user.points || 0}/{nextBadge.requiredPoints}
                </span>
              </div>
              <Progress value={progressToNext} className="h-2" />
              <p className="text-xs text-gray-500">
                Còn {nextBadge.requiredPoints - (user.points || 0)} điểm nữa
              </p>
            </div>
          )}

          {/* All Badges */}
          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600 mb-2">
              Danh hiệu đã đạt ({achievedBadges.length}/{sortedBadges.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {sortedBadges.map((badge) => {
                const achieved = achievedBadges.some(b => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all ${
                      achieved 
                        ? `${badge.color} border-transparent shadow-md` 
                        : 'bg-gray-100 border-gray-200 grayscale opacity-50'
                    }`}
                    title={`${badge.name} - ${badge.description} (${badge.requiredPoints} điểm)`}
                  >
                    <span className="text-xl">{badge.icon}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Weekly Goal */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold">Mục tiêu tuần này</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Đăng bài viết</span>
              <span className="font-semibold text-orange-600">2/3</span>
            </div>
            <Progress value={66} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Bình luận</span>
              <span className="font-semibold text-orange-600">8/10</span>
            </div>
            <Progress value={80} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Nhận lượt thích</span>
              <span className="font-semibold text-orange-600">45/50</span>
            </div>
            <Progress value={90} className="h-2" />
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold">Thống kê tuần này</h3>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Lượt xem</span>
            <span className="font-semibold text-green-600">+234</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Lượt thích</span>
            <span className="font-semibold text-green-600">+45</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Bình luận</span>
            <span className="font-semibold text-green-600">+28</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-medium">Điểm kiếm được</span>
            <span className="font-semibold text-orange-600">+78</span>
          </div>
        </div>
      </Card>
    </div>
  );
}