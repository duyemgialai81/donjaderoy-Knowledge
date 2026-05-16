import { Trophy, TrendingUp, FileText, MessageCircle, Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import api from "../lib/api";
import { useEffect, useState } from "react";

export function Leaderboard() {
  const [overall, setOverall] = useState<any[]>([]);
  const [week, setWeek] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    api.getOverallLeaderboard(10).then((res: any) => {
      if (mounted) {
        const list = Array.isArray(res) ? res : (res?.data || res);
        if (Array.isArray(list)) setOverall(list);
      }
    }).catch(() => {});

    api.getTopPostersThisWeek(10).then((res: any) => {
      if (mounted) {
        const list = Array.isArray(res) ? res : (res?.data || res);
        if (Array.isArray(list)) setWeek(list);
      }
    }).catch(() => {});

    return () => { mounted = false; };
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <div className="rank-gold">1</div>;
    if (rank === 2) return <div className="rank-silver">2</div>;
    if (rank === 3) return <div className="rank-bronze">3</div>;
    return <span className="text-xs font-semibold text-slate-400 w-7 text-center">#{rank}</span>;
  };

  const getRoleLabel = (role: string) => {
    if (role === "lecturer") return { label: "Giảng viên", cls: "bg-purple-100 text-purple-700" };
    if (role === "admin")    return { label: "Quản trị",  cls: "bg-red-100 text-red-700" };
    return { label: "Sinh viên", cls: "bg-blue-100 text-blue-700" };
  };

  const EntryRow = ({ entry, index, scoreKey = "points", scoreLabel = "điểm" }: any) => {
    const rank = entry.rank ?? index + 1;
    const isTop3 = rank <= 3;
    const role = getRoleLabel(entry.userRole);
    return (
      <div
        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
          isTop3
            ? "bg-gradient-to-r from-[#FEF0E8] to-[#FFF7F3] border border-orange-100"
            : "hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center justify-center w-7 shrink-0">
          {getRankBadge(rank)}
        </div>

        <div className="relative shrink-0">
          <img
            src={entry.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`}
            alt={entry.userName}
            className="h-9 w-9 rounded-full object-cover"
            style={isTop3 ? { boxShadow: "0 0 0 2px white, 0 0 0 3.5px rgba(242,107,56,0.3)" } : {}}
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`;
            }}
          />
          {entry.badgeIcon && (
            <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-px border border-orange-100">
              {entry.badgeIcon}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700 truncate">{entry.userName}</p>
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${role.cls}`}>
            {role.label}
          </span>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-[#F26B38]">{(entry[scoreKey] ?? 0).toLocaleString()}</p>
          <p className="text-[10px] text-slate-400">{scoreLabel}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-[#F26B38]" />
        <h3 className="font-semibold text-slate-800 text-sm">Bảng xếp hạng</h3>
      </div>

      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 bg-slate-100 rounded-lg p-0.5">
          <TabsTrigger value="overall" className="text-xs rounded-md h-7">Tổng thể</TabsTrigger>
          <TabsTrigger value="week"    className="text-xs rounded-md h-7">Tuần này</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-1.5 mt-3">
          {overall.length === 0 ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            overall.map((entry, i) => (
              <EntryRow key={entry.userId} entry={entry} index={i} scoreKey="points" scoreLabel="điểm" />
            ))
          )}
        </TabsContent>

        <TabsContent value="week" className="space-y-1.5 mt-3">
          {week.length === 0 ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            week
              .sort((a, b) => b.postsThisWeek - a.postsThisWeek)
              .map((entry, i) => (
                <EntryRow key={entry.userId} entry={{ ...entry, rank: i + 1 }} index={i} scoreKey="postsThisWeek" scoreLabel="bài viết" />
              ))
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center leading-relaxed flex items-center justify-center gap-2">
          <FileText className="h-3 w-3" /> Đăng bài: +10 điểm &nbsp;•&nbsp;
          <MessageCircle className="h-3 w-3" /> Bình luận: +2 điểm &nbsp;•&nbsp;
          <Heart className="h-3 w-3" /> Lượt thích: +1 điểm
        </p>
      </div>
    </div>
  );
}