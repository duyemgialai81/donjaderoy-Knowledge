import { Heart, MessageCircle, Eye, Share2, FileText, Video, Bookmark, Flag } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

import type { Post, User } from "../lib/mockData";
import api from "../lib/api";
import { useAuth } from "../lib/authContext";
import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface PostCardProps {
  post: Post;
  onClick: () => void;
  onLike: () => void;
  onUserUpdate?: () => void; 
}

export function PostCard({ post, onClick, onLike, onUserUpdate }: PostCardProps) {
  const { user: currentUser } = useAuth();
  const [author, setAuthor] = useState<User | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // States quản lý dữ liệu Realtime
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [viewsCount, setViewsCount] = useState(post.views || 0);

  const stompClientRef = useRef<Client | null>(null);

  // Đồng bộ lại State nếu component cha truyền props mới xuống
  useEffect(() => {
    setCommentsCount(post.commentsCount || 0);
    setViewsCount(post.views || 0);
  }, [post.commentsCount, post.views]);

  // 1. TẢI DỮ LIỆU BAN ĐẦU
  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('ksp_auth_token') || undefined;
    
    api.getUser(post.authorId, token).then((res) => {
      if (mounted && res) setAuthor(res as User);
    }).catch(() => {});

    if (currentUser?.id) {
      api.checkSavedPost(currentUser.id, post.id, token).then((res: any) => {
        if (mounted) setIsSaved(res?.isSaved || false);
      }).catch(() => {});
    }

    api.getPostLikesCount(post.id, token).then((count: any) => {
      if (mounted && count !== undefined && count !== null) {
        setLikesCount(Number(count) || 0);
      }
    }).catch(() => {});

    if (currentUser?.id) {
      api.checkLikeStatus(post.id, currentUser.id, token).then((res: any) => {
        if (mounted) setIsLiked(Boolean(res));
      }).catch(() => {});
    }

    return () => { mounted = false };
  }, [post.authorId, post.id, currentUser?.id]);

  // 2. KẾT NỐI STOMP NHẬN REALTIME (Like, Comment, View)
  useEffect(() => {
    const token = localStorage.getItem('ksp_auth_token') || "";
    const client = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'https://donjaderoy-knowledge-iy-5ba.fly.dev/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: () => {},
      onConnect: () => {
        client.subscribe(`/topic/post/${post.id}/likes`, (message) => {
          setLikesCount(Number(message.body));
        });
        client.subscribe(`/topic/post/${post.id}/new-comment`, () => {
          setCommentsCount(prev => prev + 1);
        });
        client.subscribe(`/topic/post/${post.id}/delete-comment`, () => {
          setCommentsCount(prev => Math.max(0, prev - 1));
        });
        client.subscribe(`/topic/post/${post.id}/views`, (message) => {
          setViewsCount(Number(message.body));
        });
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      setTimeout(() => {
        if (stompClientRef.current?.active) {
          stompClientRef.current.deactivate();
        }
      }, 100);
    };
  }, [post.id]);

  if (!author) return null;

  const authorBadges = author.badges || [];
  const latestBadge = authorBadges.length > 0 ? authorBadges[authorBadges.length - 1] : null;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id || isLoading) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('ksp_auth_token') || undefined;

      const prevIsLiked = isLiked;
      setIsLiked(!prevIsLiked);
      setLikesCount(prev => prevIsLiked ? Math.max(0, prev - 1) : prev + 1);

      if (prevIsLiked) {
        await api.unlikePost(post.id, token);
      } else {
        await api.likePost(post.id, token);
      }
      
      onLike();
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      toast.error('Lỗi khi cập nhật lượt thích');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id || isLoading) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('ksp_auth_token') || undefined;

      if (isSaved) {
        await api.unsavePost(currentUser.id, post.id, token);
        setIsSaved(false);
        toast.success('Đã bỏ lưu bài viết');
      } else {
        await api.savePost(currentUser.id, post.id, token);
        setIsSaved(true);
        toast.success('Đã lưu bài viết');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu bài viết');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id || isLoading) return;

    const reason = window.prompt('Lý do báo cáo:');
    if (!reason) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('ksp_auth_token') || undefined;

      await api.createReport({
          postId: post.id,
          reportedBy: currentUser.id,
          reason,
          description: 'Báo cáo từ ứng dụng'
        }, token);
      toast.success('Báo cáo đã được gửi');
    } catch (err) {
      toast.error('Lỗi khi báo cáo bài viết');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.content,
          url: window.location.href
        });
      } else {
        const url = `${window.location.href}#post-${post.id}`;
        await navigator.clipboard.writeText(url);
        toast.success('Đã sao chép liên kết');
      }
    } catch (err) {
      console.error('[PostCard] Share error:', err);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi });
  const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',').map(t => t.trim()).filter(Boolean) : []);

  return (
    <div
      className="card-premium group p-5 cursor-pointer bg-white border border-slate-100 hover:border-orange-200 transition-all duration-300 shadow-sm hover:shadow-xl rounded-2xl relative overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative z-10 flex items-start justify-between mb-5">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img 
              src={author.avatar} 
              alt={author.name} 
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm group-hover:ring-orange-200 transition-all" 
            />
            {latestBadge && (
              <span className="absolute -bottom-1 -right-1 text-base bg-white rounded-full p-0.5 shadow-sm" title={latestBadge.name}>
                {latestBadge.icon}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-900 group-hover:text-orange-600 font-bold transition-colors text-base">{author.name}</span>
              {author.role === 'lecturer' && (
                <Badge className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 hover:bg-purple-100 border-none px-2 py-0.5 rounded-md">
                  Giảng viên
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
              <span>{author.major}</span>
              {author.class && <span className="text-slate-400">• Lớp {author.class}</span>}
              <span className="text-slate-400">• {timeAgo}</span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className={`rounded-xl h-9 w-9 transition-all duration-200 ${
            isSaved 
              ? "bg-orange-100 text-orange-600 hover:bg-orange-200" 
              : "text-slate-400 hover:text-orange-500 hover:bg-orange-50"
          }`}
          onClick={handleSave}
          disabled={isLoading}
        >
          <Bookmark className={`h-4.5 w-4.5 ${isSaved ? 'fill-current' : ''}`} />
        </Button>
      </div>

      <div className="relative z-10 mb-5">
        <h2 className="mb-2 text-xl font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors tracking-tight leading-snug line-clamp-2">
          {post.title}
        </h2>
        <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
          {post.content}
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap gap-2 mb-5">
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-semibold px-3 py-1 rounded-full text-xs">
          {post.topic || 'Chủ đề chung'}
        </Badge>
        {post.major && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-3 py-1 rounded-full text-xs">
            {post.major}
          </Badge>
        )}
        {tags.slice(0, 3).map((tag) => (
          <Badge 
            key={tag} 
            variant="secondary" 
            className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium px-3 py-1 rounded-full text-xs transition-all hover:scale-105 cursor-pointer border-transparent"
          >
            #{tag}
          </Badge>
        ))}
        {tags.length > 3 && (
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium px-2 py-1 rounded-full text-xs">
            +{tags.length - 3}
          </Badge>
        )}
      </div>

      {(post.attachments && post.attachments.length > 0) || post.videoUrl ? (
        <div className="relative z-10 flex flex-wrap gap-3 mb-5">
          {post.attachments && post.attachments.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold transition-all hover:bg-slate-100 cursor-pointer">
              <FileText className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-slate-700">{post.attachments.length} tệp đính kèm</span>
            </div>
          )}
          {post.videoUrl && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold transition-all hover:bg-slate-100 cursor-pointer">
              <Video className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-slate-700">Video đính kèm</span>
            </div>
          )}
        </div>
      ) : null}

      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-5 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            <span>{viewsCount.toLocaleString()} <span className="hidden sm:inline">lượt xem</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            <span>{commentsCount} <span className="hidden sm:inline">bình luận</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            className={`rounded-xl px-4 h-9 text-sm font-semibold transition-all duration-200 shadow-sm ${
              isLiked 
                ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white border-transparent shadow-md" 
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
            onClick={handleLike}
            disabled={isLoading}
          >
            <Heart className={`h-4 w-4 mr-1.5 transition-all ${isLiked ? 'fill-current' : ''}`} />
            {likesCount}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-9 w-9 p-0 bg-white border-slate-200 hover:bg-slate-50 hover:text-orange-600 transition-all shadow-sm"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-9 w-9 p-0 bg-white border-slate-200 hover:bg-slate-50 hover:text-red-500 transition-all shadow-sm"
            onClick={handleReport} 
            disabled={isLoading}
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}