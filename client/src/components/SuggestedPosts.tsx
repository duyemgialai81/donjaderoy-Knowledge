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

  useEffect(() => {
    let mounted = true;
    api.getPosts(0, 10).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (!mounted) return;
      if (Array.isArray(list)) {
        setSuggested(list.slice(0, 5));
        setTrending([...list].sort((a: any, b: any) => b.views - a.views).slice(0, 5));
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
    <div className="space-y-4">
      {/* ── Suggested Posts ── */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4 text-[#F26B38]" />
          <h3 className="font-semibold text-slate-800 text-sm">Gợi ý cho bạn</h3>
        </div>
        <div className="space-y-1">
          {suggested.map((post) => {
            const author = users.find(u => u.id === post.authorId);
            const majorName = post.major || '';
            const subjectName = post.subject || '';

            return (
              <div
                key={post.id}
                className="group cursor-pointer hover:bg-slate-50 p-2.5 rounded-xl transition-colors border border-transparent hover:border-slate-100"
              >
                <h4 className="text-sm font-medium text-slate-700 line-clamp-2 mb-1.5 group-hover:text-[#F26B38] transition-colors">
                  {post.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <span className="text-slate-600">{author?.name}</span>
                  <span>•</span>
                  <span className="truncate max-w-[80px]">{subjectName || majorName}</span>
                  <span>•</span>
                  <span>{post.views || 0} views</span>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {post.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} className="text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 border-none px-1.5 py-0">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Trending Posts ── */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Xu hướng</h3>
        </div>
        <div className="space-y-1.5">
          {trending.map((post, index) => {
            return (
              <div
                key={post.id}
                className="group cursor-pointer hover:bg-slate-50 p-2.5 rounded-xl transition-colors flex gap-3 border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-700 line-clamp-2 mb-1 group-hover:text-emerald-600 transition-colors">
                    {post.title}
                  </h4>
                  <div className="text-[10px] font-medium text-slate-400">
                    {(post.views || 0).toLocaleString()} lượt xem
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active Users ── */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-blue-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Người dùng tích cực</h3>
        </div>
        <div className="space-y-1">
          {users.slice(0, 5).map((user) => {
            const userBadges = user.badges || [];
            const latestBadge = userBadges.length > 0 ? userBadges[userBadges.length - 1] : null;
            
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2.5 rounded-xl transition-colors border border-transparent hover:border-slate-100"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-9 w-9 rounded-full object-cover shadow-sm"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-700 truncate">{user.name}</p>
                    {latestBadge && (
                      <span className="text-sm" title={latestBadge.name}>
                        {latestBadge.icon}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-medium text-slate-400">{user.postsCount || 0} bài viết</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}