import { useState, useEffect, useRef } from "react";
import { X, Heart, Share2, Bookmark, FileText, Download, Video, Flag, Eye, MessageCircle, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent } from "./ui/dialog";
import type { Post, Comment } from "../lib/mockData";
import api from "../lib/api";
import { useAuth } from "../lib/authContext";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Hàm xử lý thời gian chuẩn để sửa lỗi Java trả về mảng [2026, 4, 24...]
const parseDateSafely = (dateVal: any): Date => {
  if (!dateVal) return new Date();
  if (Array.isArray(dateVal)) {
    return new Date(dateVal[0], (dateVal[1] || 1) - 1, dateVal[2] || 1, dateVal[3] || 0, dateVal[4] || 0, dateVal[5] || 0);
  }
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

interface PostDetailProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onLike: () => void;
  onUserUpdate?: () => void;
}

export function PostDetail({ post, isOpen, onClose, onLike, onUserUpdate }: PostDetailProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  
  const [postComments, setPostComments] = useState<Comment[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, any>>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);

  const [author, setAuthor] = useState<any | null>(null);
  const [currentLikesCount, setCurrentLikesCount] = useState(post.likes || 0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isLiking, setIsLiking] = useState(false);
  
  const { user: currentUser } = useAuth();
  const stompClientRef = useRef<Client | null>(null);
  const tempCommentIdsRef = useRef<Set<string>>(new Set());

  // ==========================================
  // 1. TẢI DỮ LIỆU BAN ĐẦU
  // ==========================================
  useEffect(() => {
    let mounted = true;
    if (!isOpen) return;

    const token = localStorage.getItem('ksp_auth_token') || undefined; 
    
    api.getUser(post.authorId, token).then((res) => {
      if (mounted) setAuthor(res || null);
    }).catch(() => {});

    if (currentUser?.id && post.authorId !== currentUser.id) {
      api.getFollowStatus(currentUser.id, post.authorId, token).then((res: any) => {
        if (mounted) setIsFollowing(!!res?.isFollowing || !!res?.data?.isFollowing); 
      }).catch(() => {});
    }

    api.getCommentsByPost(post.id, token).then((res) => {
      if (!mounted) return;
      const list = Array.isArray(res) ? res : (res?.data || res) || [];
      
      const flatList: Comment[] = [];
      const authorIds = new Set<string>();

      const flatten = (comments: any[]) => {
        comments.forEach(c => {
          flatList.push(c);
          if (c.authorId) authorIds.add(c.authorId);
          if (c.replies && Array.isArray(c.replies)) {
            flatten(c.replies);
          }
        });
      };
      flatten(list);
      
      const uniqueComments = Array.from(new Map(flatList.map(c => [c.id, c])).values());
      setPostComments(uniqueComments);
      
      Promise.all(Array.from(authorIds).map(id => api.getUser(id, token).catch(() => null))).then(results => {
        if (!mounted) return;
        const map: Record<string, any> = {};
        results.forEach((u: any) => { if (u && u.id) map[u.id] = u; });
        setCommentAuthors(map);
      }).catch(() => {});
    }).catch(() => {
      setPostComments([]);
    });
    
    return () => { mounted = false; };
  }, [post.id, post.authorId, currentUser?.id, isOpen]);

  // ==========================================
  // 2. KẾT NỐI STOMP ĐỂ NHẬN TIN REALTIME
  // ==========================================
  useEffect(() => {
    if (!isOpen) return;

    const token = localStorage.getItem('ksp_auth_token') || "";
    const client = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'https://donjaderoy-knowledge-iy-5ba.fly.dev/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: () => {}, 
      onConnect: () => {
        
        // 📢 LOA 1: BÀI VIẾT ĐƯỢC LIKE
        client.subscribe(`/topic/post/${post.id}/likes`, (message) => {
          setCurrentLikesCount(Number(message.body)); 
        });

        // 📢 LOA 2: CÓ BÌNH LUẬN MỚI
        client.subscribe(`/topic/post/${post.id}/new-comment`, (message) => {
          const newComment = JSON.parse(message.body);
          
          setPostComments(prev => {
            const isMyOwnComment = tempCommentIdsRef.current.has(newComment.content);
            let cleanList = prev;
            
            if (isMyOwnComment) {
                cleanList = prev.filter(c => !(c.id.startsWith("temp_") && c.content === newComment.content));
                tempCommentIdsRef.current.delete(newComment.content);
            }

            if (cleanList.some(c => c.id === newComment.id)) return cleanList;
            return [...cleanList, newComment];
          });

          api.getUser(newComment.authorId, token).then(u => {
            if (u) setCommentAuthors(old => ({ ...old, [u.id]: u }));
          });
        });

        // 📢 LOA 3: CÓ BÌNH LUẬN BỊ XÓA
        client.subscribe(`/topic/post/${post.id}/delete-comment`, (message) => {
            const deletedId = message.body;
            setPostComments(prev => prev.filter(c => c.id !== deletedId && c.parentId !== deletedId));
        });

        // 📢 LOA 4: BÌNH LUẬN ĐƯỢC LIKE/SỬA
        client.subscribe(`/topic/post/${post.id}/update-comment`, (message) => {
            const updatedComment = JSON.parse(message.body);
            setPostComments(prev => prev.map(c => c.id === updatedComment.id ? updatedComment : c));
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
  }, [post.id, isOpen]);

  // ==========================================
  // 3. CÁC HÀM XỬ LÝ (LIKE, FOLLOW, BÌNH LUẬN)
  // ==========================================
  const handleLikeToggle = async () => {
    if (!currentUser?.id || isLiking) return;
    try {
      setIsLiking(true);
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      const prevIsLiked = isLiked;

      setIsLiked(!prevIsLiked);
      setCurrentLikesCount(prev => prevIsLiked ? Math.max(0, prev - 1) : prev + 1);

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
      setIsLiking(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser?.id || !author?.id || isFollowingLoading) return;
    try {
      setIsFollowingLoading(true);
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      if (isFollowing) {
        await api.unfollowUser(currentUser.id, author.id, token);
        setIsFollowing(false);
        toast.success('Đã bỏ theo dõi');
      } else {
        await api.followUser(currentUser.id, author.id, token);
        setIsFollowing(true);
        toast.success('Đã theo dõi');
      }
    } catch (err) {
      toast.error('Lỗi khi theo dõi người dùng');
    } finally {
      setIsFollowingLoading(false);
    }
  };

  // GỬI BÌNH LUẬN OPTIMISTIC UI TỨC THÌ
  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser?.id) return;

    const content = newComment.trim();
    const currentReplyTo = replyTo;
    
    setNewComment(""); 
    setReplyTo(null);

    tempCommentIdsRef.current.add(content);

    const tempId = `temp_${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      postId: post.id,
      authorId: currentUser.id,
      content: content,
      parentId: currentReplyTo || undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
      isReported: false,
    };

    setPostComments(prev => [...prev, optimisticComment]);

    if (!commentAuthors[currentUser.id]) {
      setCommentAuthors(prev => ({ ...prev, [currentUser.id]: currentUser }));
    }

    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      const created = await api.addComment({
        postId: post.id,
        content: content,
        parentId: currentReplyTo || undefined,
      }, token);

      if (created) {
        setPostComments(prev => prev.map(c => c.id === tempId ? created : c));
        tempCommentIdsRef.current.delete(content); 
        if (onUserUpdate) onUserUpdate();
      }
    } catch (e) {
      setPostComments(prev => prev.filter(c => c.id !== tempId));
      tempCommentIdsRef.current.delete(content);
      toast.error('Lỗi khi thêm bình luận');
      setNewComment(content); 
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      setPostComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c
      ));
      await api.likeComment(commentId, token);
    } catch (err) {
      toast.error('Lỗi khi thích bình luận');
    }
  };

  const handleReportComment = async (commentId: string) => {
    if (!currentUser?.id) return;
    const reason = window.prompt('Vui lòng nhập lý do báo cáo bình luận này:');
    if (!reason) return;
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.reportComment(commentId, reason, token);
      toast.success('Đã gửi báo cáo');
    } catch (err) {
      toast.error('Lỗi khi báo cáo');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return;
    try {
      const token = localStorage.getItem('ksp_auth_token') || undefined;
      await api.deleteComment(commentId, token);
      setPostComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
      toast.success('Đã xóa bình luận');
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      toast.error('Lỗi khi xóa bình luận');
    }
  };

  // ==========================================
  // 4. RENDER GIAO DIỆN BÌNH LUẬN (ĐỆ QUY)
  // ==========================================
  const renderComment = (comment: Comment, isReply = false) => {
    let commentAuthor = commentAuthors[comment.authorId];
    if (!commentAuthor && currentUser?.id === comment.authorId) {
      commentAuthor = currentUser;
    }
    if (!commentAuthor) return null;

    const commentTime = formatDistanceToNow(parseDateSafely(comment.createdAt), {
      addSuffix: true,
      locale: vi
    });

    const childReplies = postComments
      .filter(c => c.parentId === comment.id)
      .sort((a, b) => parseDateSafely(a.createdAt).getTime() - parseDateSafely(b.createdAt).getTime());

    return (
      <div key={comment.id} className={isReply ? "ml-10 border-l-2 border-slate-100 pl-4 mt-3" : "mt-4"}>
        <div className="flex gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
          <img
            src={commentAuthor.avatar && typeof commentAuthor.avatar === 'string' && commentAuthor.avatar.trim()
              ? commentAuthor.avatar
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${commentAuthor.id}`}
            alt={commentAuthor.name}
            className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${commentAuthor.id}`;
            }}
          />
          <div className="flex-1 min-w-0">
            <div className={`bg-slate-100/80 rounded-2xl rounded-tl-none p-3.5 inline-block min-w-[200px] max-w-full ${replyTo === comment.id ? 'ring-2 ring-orange-200 bg-orange-50/80' : ''}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-bold text-slate-800">{commentAuthor.name}</span>
                {commentAuthor.role === 'lecturer' && (
                  <Badge className="bg-purple-100 text-purple-700 border-none px-1.5 py-0 text-[10px]">Giảng viên</Badge>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
            </div>
            <div className="flex items-center gap-4 mt-1.5 ml-2 text-xs font-semibold text-slate-500">
              <span className="text-slate-400 font-medium">{commentTime}</span>
              <button className="hover:text-blue-600 flex items-center gap-1 transition-colors" onClick={() => handleLikeComment(comment.id)}>
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{comment.likes || 0}</span>
              </button>
              <button className={`transition-colors ${replyTo === comment.id ? 'text-[#F26B38] font-bold' : 'hover:text-[#F26B38]'}`} onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                Trả lời
              </button>
              <button className="hover:text-red-600 flex items-center gap-1 transition-colors" onClick={() => handleReportComment(comment.id)}>
                <Flag className="h-3.5 w-3.5" /> Báo cáo
              </button>
              {currentUser?.id === comment.authorId && (
                <button className="hover:text-red-600 flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100 ml-auto" onClick={() => handleDeleteComment(comment.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Xóa
                </button>
              )}
            </div>
          </div>
        </div>
        {childReplies.length > 0 && (
          <div className="mt-1">
            {childReplies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  // Root comments: Xếp Mới -> Cũ (DESC)
  const rootComments = postComments
    .filter(c => !c.parentId)
    .sort((a, b) => parseDateSafely(b.createdAt).getTime() - parseDateSafely(a.createdAt).getTime());

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi });
  const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',').map(t => t.trim()).filter(Boolean) : []);

  // ==========================================
  // 5. RENDER CHÍNH
  // ==========================================
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
        {/* ── Header ── */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#F26B38] to-[#D9541E] flex items-center justify-center shadow-sm">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold">Chi tiết bài viết</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-6 py-6 pb-20">
          {/* ── Author Info ── */}
          {author ? (
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={author.avatar && typeof author.avatar === 'string' && author.avatar.trim()
                      ? author.avatar
                      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id}`}
                    alt={author.name}
                    className="h-14 w-14 rounded-full object-cover shadow-sm ring-2 ring-white"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id}`;
                    }}
                  />
                  {author.badges && author.badges.length > 0 && author.badges[author.badges.length - 1] && (
                    <span className="absolute -bottom-1 -right-1 text-base bg-white rounded-full p-px shadow-sm" title={author.badges[author.badges.length - 1].name}>
                      {author.badges[author.badges.length - 1].icon}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-slate-800">{author.name}</h3>
                    {author.role === 'lecturer' && (
                      <Badge className="bg-purple-100 text-purple-700 border-none px-1.5 py-0 text-[10px]">Giảng viên</Badge>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    {author.major} {author.class && `• Lớp ${author.class}`}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{timeAgo}</div>
                </div>
              </div>
              <Button 
                onClick={handleFollow}
                disabled={isFollowingLoading || currentUser?.id === post.authorId}
                className={`h-9 px-4 rounded-xl text-sm font-semibold transition-all ${
                  isFollowing 
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                    : "btn-gradient-orange"
                }`}
              >
                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </Button>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
              <div className="skeleton h-14 w-14 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-48" />
              </div>
            </div>
          )}

          {/* ── Post Title & Metadata ── */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mb-4">{post.title}</h1>

          <div className="flex flex-wrap gap-2 mb-8">
            <Badge className="bg-[#FEF0E8] text-[#D9541E] hover:bg-[#FEF0E8] border-none px-2.5 py-0.5 text-xs font-semibold">
              {post.topic || 'Chủ đề chung'}
            </Badge>
            <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-none px-2.5 py-0.5 text-xs font-semibold">
              {post.major as any || 'N/A'}
            </Badge>
            {tags.map((tag) => (
              <Badge key={tag} className="bg-slate-100 text-slate-500 hover:bg-slate-200 border-none px-2 py-0.5 text-[10px] font-medium">
                #{tag}
              </Badge>
            ))}
          </div>

          {/* ── Post Content ── */}
          <div className="prose prose-slate max-w-none mb-10 prose-p:leading-relaxed prose-p:text-slate-700 prose-a:text-[#F26B38]">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* ── Attachments ── */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="mb-8 p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <FileText className="h-4 w-4 text-slate-500" />
                Tệp đính kèm ({post.attachments.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {post.attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-[#F26B38] transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FEF0E8] text-[#F26B38] group-hover:scale-105 transition-transform">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{file.size}</p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 group-hover:text-[#F26B38] rounded-lg shrink-0">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Video ── */}
          {post.videoUrl && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <Video className="h-4 w-4 text-blue-500" />
                Video đính kèm
              </h3>
              <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 flex items-center justify-center relative group cursor-pointer">
                <Video className="h-16 w-16 text-white/50 group-hover:text-white group-hover:scale-110 transition-all" />
              </div>
            </div>
          )}

          {/* ── Stats & Actions Bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-y border-slate-100 mb-8">
            <div className="flex items-center gap-5 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-slate-400" />
                <span>{(post.views || 0).toLocaleString()} <span className="hidden sm:inline">lượt xem</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-slate-400" />
                <span>{postComments.length} <span className="hidden sm:inline">bình luận</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                onClick={handleLikeToggle}
                disabled={!currentUser?.id || isLiking}
                className={`h-9 px-4 rounded-xl text-sm font-semibold transition-all ${
                  isLiked 
                    ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Heart className={`h-4 w-4 mr-1.5 ${isLiked ? 'fill-current text-rose-500' : ''}`} />
                {currentLikesCount} 
              </Button>
              <Button variant="outline" className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                <Share2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Chia sẻ</span>
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Comments Section ── */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-800 mb-5">Bình luận ({postComments.length})</h3>

            {/* Comment Input Box */}
            <div className="mb-8 p-4 rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-[#F26B38] focus-within:ring-2 focus-within:ring-[#F26B38]/20 transition-all">
              {replyTo && (
                <div className="flex items-center justify-between mb-3 px-3 py-1.5 bg-[#FEF0E8] border border-orange-100 rounded-lg">
                  <span className="text-xs font-semibold text-[#D9541E]">Đang trả lời bình luận...</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-orange-200 text-[#D9541E]" onClick={() => setReplyTo(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex gap-3">
                <img
                  src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
                  alt="Current user"
                  className="h-10 w-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                />
                <div className="flex-1">
                  <Textarea
                    placeholder="Viết bình luận của bạn..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] border-none bg-transparent resize-none p-0 focus-visible:ring-0 text-sm"
                    disabled={!currentUser}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => { setNewComment(""); setReplyTo(null); }} className="h-8 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200">
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      className="h-8 px-4 rounded-lg text-xs font-semibold btn-gradient-orange"
                      disabled={!currentUser || !newComment.trim()}
                    >
                      Gửi bình luận
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {rootComments.map(comment => renderComment(comment))}
            </div>

            {postComments.length === 0 && (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">Chưa có bình luận nào</p>
                <p className="text-sm text-slate-500">Hãy là người đầu tiên chia sẻ cảm nghĩ của bạn!</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}