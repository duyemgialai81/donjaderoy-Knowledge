import { Lightbulb, TrendingUp, Users } from "lucide-react";
import { Card } from "./ui/card";
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
        setSuggested(list.slice(0,5));
        setTrending([...list].sort((a: any,b: any) => b.views - a.views).slice(0,5));
      }
    }).catch(() => {});
    api.getUsers(0, 10).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (!mounted) return;
      if (Array.isArray(list)) {
        setUsers(list.slice(0,5));
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-4">
      {/* Suggested Posts */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-orange-600" />
          <h3>Gợi ý cho bạn</h3>
        </div>
        <div className="space-y-3">
          {suggested.map((post) => {
            const author = users.find(u => u.id === post.authorId);
            const majorName = post.major || '';
            const subjectName = post.subject || '';

            return (
              <div
                key={post.id}
                className="group cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                <h4 className="text-sm line-clamp-2 mb-1 group-hover:text-orange-600">
                  {post.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{author?.name}</span>
                  <span>•</span>
                  <span>{subjectName || majorName}</span>
                  <span>•</span>
                  <span>{post.views || 0} lượt xem</span>
                </div>
                {/* [FIX] Kiểm tra post.tags trước khi slice */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {post.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Trending Posts */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <h3>Xu hướng</h3>
        </div>
        <div className="space-y-3">
          {trending.map((post, index) => {
            const author = users.find(u => u.id === post.authorId);
            return (
              <div
                key={post.id}
                className="group cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors flex gap-3"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm line-clamp-2 mb-1 group-hover:text-orange-600">
                    {post.title}
                  </h4>
                  <div className="text-xs text-gray-500">
                    {/* [FIX] Kiểm tra post.views */}
                    {(post.views || 0).toLocaleString()} lượt xem
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Active Users */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-orange-600" />
          <h3>Người dùng tích cực</h3>
        </div>
        <div className="space-y-3">
          {users.slice(0, 5).map((user) => {
            // [FIX] Kiểm tra user.badges trước khi truy cập
            const userBadges = user.badges || [];
            const latestBadge = userBadges.length > 0 ? userBadges[userBadges.length - 1] : null;
            
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm truncate">{user.name}</p>
                    {/* [FIX] Chỉ hiển thị badge nếu tồn tại */}
                    {latestBadge && (
                      <span className="text-sm">
                        {latestBadge.icon}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{user.postsCount || 0} bài viết</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}