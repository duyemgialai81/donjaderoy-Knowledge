import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import type { User } from "../lib/mockData";
import api from "../lib/api";
import { useEffect, useState } from "react";

export function Leaderboard() {
  const [overall, setOverall] = useState<any[]>([]);
  const [week, setWeek] = useState<any[]>([]);
  
  useEffect(() => {
    let mounted = true;
    
    // Fetch overall leaderboard (top 10)
    api.getOverallLeaderboard(10).then((res: any) => {
      if (mounted) {
        const list = Array.isArray(res) ? res : (res?.data || res);
        console.log('[Leaderboard] Overall:', list);
        if (Array.isArray(list)) setOverall(list);
      }
    }).catch((err: any) => console.error('[Leaderboard] getOverallLeaderboard error:', err));
    
    // Fetch top posters this week (top 10)
    api.getTopPostersThisWeek(10).then((res: any) => {
      if (mounted) {
        const list = Array.isArray(res) ? res : (res?.data || res);
        console.log('[Leaderboard] Week:', list);
        if (Array.isArray(list)) setWeek(list);
      }
    }).catch((err: any) => console.error('[Leaderboard] getTopPostersThisWeek error:', err));
    
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-orange-600" />
        <h3>Bảng xếp hạng</h3>
      </div>

      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overall">Tổng thể</TabsTrigger>
          <TabsTrigger value="week">Tuần này</TabsTrigger>
          <TabsTrigger value="month">Tháng này</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-3 mt-4">
          {overall.map((entry, index) => {
            let rankIcon;
            if (entry.rank === 1) rankIcon = <Trophy className="h-5 w-5 text-yellow-500" />;
            else if (entry.rank === 2) rankIcon = <Medal className="h-5 w-5 text-gray-400" />;
            else if (entry.rank === 3) rankIcon = <Medal className="h-5 w-5 text-orange-400" />;

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  entry.rank <= 3 ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center w-8">
                  {rankIcon || <span className="text-gray-500">#{entry.rank}</span>}
                </div>
                
                <img
                  src={entry.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`}
                  alt={entry.userName}
                  className="h-10 w-10 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`;
                  }}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm truncate">{entry.userName}</p>
                    {entry.badgeIcon && (
                      <span className="text-lg" title={entry.badgeName}>
                        {entry.badgeIcon}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{entry.userRole}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-orange-600">{entry.points}</p>
                  <p className="text-xs text-gray-500">điểm</p>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="week" className="space-y-3 mt-4">
          {week
            .sort((a, b) => b.postsThisWeek - a.postsThisWeek)
            .map((entry, index) => {
              return (
                <div
                  key={entry.userId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-center w-8">
                    <span className="text-gray-500">#{index + 1}</span>
                  </div>
                  
                  <img
                    src={entry.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`}
                    alt={entry.userName}
                    className="h-10 w-10 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`;
                    }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{entry.userName}</p>
                    <p className="text-xs text-gray-600">{entry.userRole}</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-sm">{entry.postsThisWeek}</span>
                    </div>
                    <p className="text-xs text-gray-500">bài viết</p>
                  </div>
                </div>
              );
            })}
        </TabsContent>

        <TabsContent value="month" className="space-y-3 mt-4">
          {/* For month view, show overall by default */}
          {overall.map((entry, index) => {
            return (
              <div
                key={entry.userId}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-8">
                  <span className="text-gray-500">#{entry.rank}</span>
                </div>
                
                <img
                  src={entry.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`}
                  alt={entry.userName}
                  className="h-10 w-10 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`;
                  }}
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{entry.userName}</p>
                  <p className="text-xs text-gray-600">{entry.userRole}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-orange-600">{entry.points}</p>
                  <p className="text-xs text-gray-500">điểm</p>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Achievement Info */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-600 text-center">
          Đăng bài viết: +10 điểm • Bình luận: +2 điểm • Nhận lượt thích: +1 điểm
        </p>
      </div>
    </Card>
  );
}