import { Lightbulb, TrendingUp, Users } from "lucide-react";
import { Badge } from "./ui/badge";
import type { Post, User } from "../lib/mockData";
import api from "../lib/api";
import { useEffect, useState } from "react";

interface SuggestedPostsProps {
  currentPost?: string;
}

export function SuggestedPosts({ currentPost }: SuggestedPostsProps) {
  const [suggested, setSuggested] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const safeNumber = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  useEffect(() => {
    let mounted = true;
    api.getPosts(0, 10).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (!mounted) return;
      if (Array.isArray(list)) {
        setSuggested(list.slice(0, 5));
        setTrending([...list].sort((a: any, b: any) => safeNumber(b.views) - safeNumber(a.views)).slice(0, 5));
      }
    }).catch(() => {});
    api.getUsers(0, 10).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (!mounted) return;
      if (Array.isArray(list)) {
        setUsers(list.slice(0, 5));
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-5">
      {/* ── Suggested Posts – nâng cấp ── */}
      <div className="card-premium p-5 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-[#F26B38]" />
          <h3 className="font-semibold text-slate-800 text-base">Gợi ý cho bạn</h3>
        </div>
        <div className="space-y-2">
          {suggested.map((post) => {
            const author = users.find(u => u.id === post.authorId);
            const majorName = post.major || '';
            const subjectName = post.subject || '';

            return (
              <div
                key={post.id}
                className="group cursor-pointer hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent p-3 rounded-xl transition-all duration-200 border border-transparent hover:border-orange-100 hover:shadow-sm"
              >
                <h4 className="text-sm font-semibold text-slate-700 line-clamp-2 mb-2 group-hover:text-[#F26B38] transition-colors">
                  {post.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <span className="text-slate-600">{author?.name || "Ẩn danh"}</span>
                  <span>•</span>
                  <span className="truncate max-w-[80px]">{subjectName || majorName || "Chưa phân loại"}</span>
                  <span>•</span>
                  <span>{safeNumber(post.views)} lượt xem</span>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {post.tags.slice(0, 2).map(tag => (
                      <Badge 
                        key={tag} 
                        className="text-[10px] font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 border-none px-2 py-0.5 rounded-full transition-colors"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {suggested.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">Chưa có gợi ý</div>
          )}
        </div>
      </div>

      {/* ── Trending Posts – nâng cấp ── */}
      <div className="card-premium p-5 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-800 text-base">Xu hướng</h3>
        </div>
        <div className="space-y-2">
          {trending.map((post, index) => {
            return (
              <div
                key={post.id}
                className="group cursor-pointer hover:bg-gradient-to-r hover:from-emerald-50 hover:to-transparent p-2.5 rounded-xl transition-all duration-200 flex gap-3 border border-transparent hover:border-emerald-100"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold flex-shrink-0 group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-700 line-clamp-2 mb-1 group-hover:text-emerald-600 transition-colors">
                    {post.title}
                  </h4>
                  <div className="text-[10px] font-medium text-slate-400">
                    {safeNumber(post.views).toLocaleString()} lượt xem
                  </div>
                </div>
              </div>
            );
          })}
          {trending.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">Chưa có bài xu hướng</div>
          )}
        </div>
      </div>

      {/* ── Active Users – nâng cấp ── */}
      <div className="card-premium p-5 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-slate-800 text-base">Người dùng tích cực</h3>
        </div>
        <div className="space-y-2">
          {users.slice(0, 5).map((user) => {
            const userBadges = user.badges || [];
            const latestBadge = userBadges.length > 0 ? userBadges[userBadges.length - 1] : null;
            
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent p-2.5 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-100"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-white group-hover:ring-blue-200 transition-all"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-700 truncate">{user.name}</p>
                    {latestBadge && (
                      <span className="text-base" title={latestBadge.name}>
                        {latestBadge.icon}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-400">{user.postsCount || 0} bài viết</p>
                </div>
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">Chưa có người dùng</div>
          )}
        </div>
      </div>
    </div>
  );
}
