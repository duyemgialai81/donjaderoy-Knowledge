import { Heart, MessageCircle, Eye, Share2, FileText, Video, Bookmark, Flag } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
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
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: () => {}, // Tắt log cho danh sách đỡ rối
      onConnect: () => {
        
        // 📢 NGHE LƯỢT THÍCH
        client.subscribe(`/topic/post/${post.id}/likes`, (message) => {
          setLikesCount(Number(message.body));
        });

        // 📢 NGHE BÌNH LUẬN MỚI -> CỘNG 1
        client.subscribe(`/topic/post/${post.id}/new-comment`, () => {
          setCommentsCount(prev => prev + 1);
        });

        // 📢 NGHE XÓA BÌNH LUẬN -> TRỪ 1 (Không cho rớt dưới 0)
        client.subscribe(`/topic/post/${post.id}/delete-comment`, () => {
          setCommentsCount(prev => Math.max(0, prev - 1));
        });

        // 📢 NGHE LƯỢT XEM MỚI (NẾU BACKEND CÓ BẮN)
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

  // 3. XỬ LÝ SỰ KIỆN
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
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={author.avatar} alt={author.name} className="h-12 w-12 rounded-full object-cover" />
          <div>
            <div className="flex items-center gap-2">
              <span className="hover:text-orange-600 font-semibold">{author.name}</span>
              {author.role === 'lecturer' && (
                <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-transparent">
                  Giảng viên
                </Badge>
              )}
              {latestBadge && (
                <span className="text-lg" title={latestBadge.name}>{latestBadge.icon}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span>{author.major}</span>
              {author.class && <span className="font-normal text-gray-400">• {author.class}</span>}
              <span className="font-normal text-gray-400">• {timeAgo}</span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className={`rounded-full ${isSaved ? "bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"}`}
          onClick={handleSave}
          disabled={isLoading}
        >
          <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
        </Button>
      </div>

      <div className="mb-4">
        <h2 className="mb-2 text-xl font-bold text-gray-900 hover:text-orange-600 transition-colors">
          {post.title}
        </h2>
        <p className="text-gray-600 line-clamp-3 leading-relaxed">{post.content}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {post.topic || 'Chủ đề chung'}
        </Badge>
        {post.major && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {post.major}
          </Badge>
        )}
        {tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none">
            #{tag}
          </Badge>
        ))}
        {tags.length > 3 && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none">+{tags.length - 3}</Badge>
        )}
      </div>

      {(post.attachments && post.attachments.length > 0) || post.videoUrl ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.attachments && post.attachments.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium">
              <FileText className="h-4 w-4 text-orange-500" />
              <span className="text-gray-700">{post.attachments.length} tệp đính kèm</span>
            </div>
          )}
          {post.videoUrl && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium">
              <Video className="h-4 w-4 text-blue-500" />
              <span className="text-gray-700">Video đính kèm</span>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
          <div className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {/* Hiển thị Views từ State */}
            <span>{viewsCount.toLocaleString()} <span className="hidden sm:inline">lượt xem</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            {/* Hiển thị Comments từ State */}
            <span>{commentsCount} <span className="hidden sm:inline">bình luận</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            className={`rounded-full px-4 ${isLiked ? "bg-red-500 hover:bg-red-600 text-white border-transparent" : "hover:bg-gray-50 bg-white"}`}
            onClick={handleLike}
            disabled={isLoading}
          >
            <Heart className={`h-4 w-4 mr-1.5 ${isLiked ? 'fill-current text-white' : 'text-gray-400'}`} />
            {likesCount}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full w-9 p-0 bg-white hover:bg-gray-50" onClick={handleShare}>
            <Share2 className="h-4 w-4 text-gray-400" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-full w-9 p-0 bg-white hover:bg-gray-50" onClick={handleReport} disabled={isLoading}>
            <Flag className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>
    </Card>
  );
}