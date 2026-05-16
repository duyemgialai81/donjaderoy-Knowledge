// // PostDetail.tsx - Hoàn chỉnh với real-time likes và đầy đủ chức năng

// import { useState, useEffect } from "react";
// import { X, Heart, Share2, Bookmark, FileText, Download, Video, Flag, Eye, MessageCircle, ThumbsUp } from "lucide-react";
// import { Button } from "./ui/button";
// import { Badge } from "./ui/badge";
// import { Textarea } from "./ui/textarea";
// import { Dialog, DialogContent } from "./ui/dialog";
// import { Separator } from "./ui/separator";
// import type { Post, Comment } from "../lib/mockData";
// import api from "../lib/api";
// import { useAuth } from "../lib/authContext";
// import { formatDistanceToNow } from "date-fns";
// import { vi } from "date-fns/locale";

// interface PostDetailProps {
//   post: Post;
//   isOpen: boolean;
//   onClose: () => void;
//   onLike: () => void;
// }

// export function PostDetail({ post, isOpen, onClose, onLike }: PostDetailProps) {
//   const [newComment, setNewComment] = useState("");
//   const [replyTo, setReplyTo] = useState<string | null>(null);
//   const [postComments, setPostComments] = useState<Comment[]>([]);
//   const [commentAuthors, setCommentAuthors] = useState<Record<string, any>>({});
//   const [isFollowing, setIsFollowing] = useState(false);
//   const [isFollowingLoading, setIsFollowingLoading] = useState(false);

//   const [author, setAuthor] = useState<any | null>(null);
//   const [currentLikesCount, setCurrentLikesCount] = useState(post.likes || 0);
//   const [isLiked, setIsLiked] = useState(post.isLiked || false);
//   const { user: currentUser } = useAuth();

//   const handleLike = async () => {
//     // Gọi onLike từ parent để cập nhật list
//     await onLike();
    
//     // Cập nhật state local
//     const token = localStorage.getItem('ksp_auth_token') || undefined;
//     try {
//       const newLikesCount = await api.getPostLikesCount(post.id, token);
//       const newLikeStatus = currentUser?.id ? await api.checkLikeStatus(post.id, currentUser.id, token) : false;
//       console.log('[PostDetail] After like - Count:', newLikesCount, 'Status:', newLikeStatus);
//       setCurrentLikesCount(Number(newLikesCount) || 0);
//       setIsLiked(Boolean(newLikeStatus));
//     } catch (err) {
//       console.error('[PostDetail] Error refreshing likes:', err);
//     }
//   };
  
//   useEffect(() => {
//     let mounted = true;
//     const token = localStorage.getItem('ksp_auth_token') || undefined; 
    
//     // Load author info
//     api.getUser(post.authorId, token).then((res) => {
//       if (mounted) setAuthor(res || null);
//     }).catch(() => { /* ignore */ });

//     // Check if following
//     if (currentUser?.id && post.authorId !== currentUser.id) {
//       api.getFollowStatus(currentUser.id, post.authorId, token).then((res: any) => {
//         if (mounted) setIsFollowing(!!res?.isFollowing || !!res?.data?.isFollowing); 
//       }).catch(() => {});
//     }

//     // Load real-time likes count and status
//     Promise.all([
//       api.getPostLikesCount(post.id, token),
//       currentUser?.id ? api.checkLikeStatus(post.id, currentUser.id, token) : Promise.resolve(false)
//     ]).then(([likesCount, likeStatus]) => {
//       if (mounted) {
//         console.log('[PostDetail] Loaded likes:', { likesCount, likeStatus });
//         setCurrentLikesCount(Number(likesCount) || 0);
//         setIsLiked(Boolean(likeStatus));
//       }
//     }).catch(err => {
//       console.error('[PostDetail] Error loading likes:', err);
//     });

//     // Load comments
//     api.getCommentsByPost(post.id, token).then((res) => {
//       if (!mounted) return;
//       const list = Array.isArray(res) ? res : (res?.data || res) || [];
//       setPostComments(list as Comment[]);
      
//       // Collect unique author ids
//       const authorIds = new Set<string>();
//       (list as Comment[]).forEach(c => {
//         authorIds.add(c.authorId);
//         if (c.replies) c.replies.forEach(r => authorIds.add(r.authorId));
//       });
      
//       // Fetch authors in parallel
//       Promise.all(Array.from(authorIds).map(id => api.getUser(id, token).catch(() => null))).then(results => {
//         if (!mounted) return;
//         const map: Record<string, any> = {};
//         results.forEach((u: any) => { if (u && u.id) map[u.id] = u; });
//         setCommentAuthors(map);
//       }).catch(() => {});
//     }).catch(() => {
//       setPostComments([]);
//     });
    
//     return () => { mounted = false; };
//   }, [post.id, post.authorId, currentUser?.id]);

//   const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
//     addSuffix: true,
//     locale: vi
//   });

//   const handleFollow = async () => {
//     if (!currentUser?.id || !author?.id || isFollowingLoading) return;

//     try {
//       setIsFollowingLoading(true);
//       const token = localStorage.getItem('ksp_auth_token') || undefined;

//       if (isFollowing) {
//         await api.unfollowUser(currentUser.id, author.id, token);
//         setIsFollowing(false);
//       } else {
//         await api.followUser(currentUser.id, author.id, token);
//         setIsFollowing(true);
//       }
//     } catch (err) {
//       console.error('[PostDetail] Error following user:', err);
//     } finally {
//       setIsFollowingLoading(false);
//     }
//   };

//   const handleAddComment = async () => {
//     if (!newComment.trim() || !currentUser?.id) {
//         console.error('[COMMENT] Comment content is empty or user not logged in.');
//         return;
//     }

//     try {
//       const token = (localStorage.getItem('ksp_auth_token') || undefined) as any;
      
//       console.log('[COMMENT] Sending payload:', { 
//         postId: post.id, 
//         content: newComment, 
//         parentId: replyTo || undefined 
//       });
      
//       const created = await api.addComment({
//         postId: post.id,
//         content: newComment,
//         parentId: replyTo || undefined,
//       }, token);

//       if (created) {
//         console.log('[COMMENT] Response:', created);
        
//         // Thêm currentUser vào danh sách author nếu chưa có
//         if (!commentAuthors[currentUser.id]) {
//             setCommentAuthors(prev => ({ ...prev, [currentUser.id]: currentUser }));
//         }

//         // Normalize and add to UI
//         if (replyTo) {
//           setPostComments(prev => prev.map(c => {
//             if (c.id === replyTo) {
//               return { 
//                 ...c, 
//                 replies: [...(c.replies || []), created] 
//               };
//             }
//             return c;
//           }));
//         } else {
//           setPostComments(prev => [...prev, created]);
//         }
//       }
//     } catch (e) {
//       console.error('[COMMENT] Error:', e);
//       const error = e as any;
//       if (error?.response?.status === 401) {
//         console.error('[COMMENT] Unauthorized - please login');
//       } else if (error?.response?.status === 403) {
//         console.error('[COMMENT] Forbidden - permission denied');
//       } else {
//         console.error('[COMMENT] Failed to add comment:', error?.message);
//       }
//     } finally {
//       setNewComment("");
//       setReplyTo(null);
//     }
//   };

//   const renderComment = (comment: Comment, isReply = false) => {
//     const commentAuthor = commentAuthors[comment.authorId];
//     if (!commentAuthor) return null;

//     const commentTime = formatDistanceToNow(new Date(comment.createdAt), {
//       addSuffix: true,
//       locale: vi
//     });

//     return (
//       <div key={comment.id} className={isReply ? "ml-12" : ""}>
//         <div className="flex gap-3 p-4 hover:bg-gray-50 rounded-lg">
//           <img
//             src={commentAuthor.avatar && typeof commentAuthor.avatar === 'string' && commentAuthor.avatar.trim()
//               ? commentAuthor.avatar
//               : `https://api.dicebear.com/7.x/avataaars/svg?seed=${commentAuthor.id}`}
//             alt={commentAuthor.name}
//             className="h-10 w-10 rounded-full object-cover"
//             onError={(e) => {
//               (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${commentAuthor.id}`;
//             }}
//           />
//           <div className="flex-1">
//             <div className="bg-gray-100 rounded-lg p-3">
//               <div className="flex items-center gap-2 mb-1">
//                 <span className="text-sm font-semibold">{commentAuthor.name}</span>
//                 {commentAuthor.role === 'lecturer' && (
//                   <Badge variant="secondary" className="text-xs">Giảng viên</Badge>
//                 )}
//                 <span className="text-xs text-gray-500">• {commentTime}</span>
//               </div>
//               <p className="text-sm text-gray-700">{comment.content}</p>
//             </div>
//             <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
//               <button className="hover:text-orange-600 flex items-center gap-1">
//                 <ThumbsUp className="h-3 w-3" />
//                 <span>{comment.likes || 0}</span>
//               </button>
//               <button
//                 className="hover:text-orange-600"
//                 onClick={() => setReplyTo(comment.id)}
//               >
//                 Trả lời
//               </button>
//               <button className="hover:text-red-600 flex items-center gap-1">
//                 <Flag className="h-3 w-3" />
//                 Báo cáo
//               </button>
//             </div>
//           </div>
//         </div>
//         {comment.replies && comment.replies.map(reply => renderComment(reply, true))}
//       </div>
//     );
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
//         {/* Header */}
//         <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
//           <h2 className="text-xl font-bold">Chi tiết bài viết</h2>
//           <Button variant="ghost" size="icon" onClick={onClose}>
//             <X className="h-5 w-5" />
//           </Button>
//         </div>

//         <div className="p-6">
//           {/* Author Info */}
//           {author ? (
//             <div className="flex items-start justify-between mb-6">
//               <div className="flex items-center gap-3">
//                 <img
//                   src={author.avatar && typeof author.avatar === 'string' && author.avatar.trim()
//                     ? author.avatar
//                     : `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id}`}
//                   alt={author.name}
//                   className="h-16 w-16 rounded-full object-cover"
//                   onError={(e) => {
//                     (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id}`;
//                   }}
//                 />
//                 <div>
//                   <div className="flex items-center gap-2 mb-1">
//                     <h3 className="font-semibold">{author.name}</h3>
//                     {author.role === 'lecturer' && (
//                       <Badge variant="secondary">Giảng viên</Badge>
//                     )}
//                     {author.badges && author.badges.length > 0 && author.badges[author.badges.length - 1] && (
//                       <span className="text-xl" title={author.badges[author.badges.length - 1].name}>
//                         {author.badges[author.badges.length - 1].icon}
//                       </span>
//                     )}
//                   </div>
//                   <div className="text-sm text-gray-600">
//                     {author.major} {author.class && `• ${author.class}`}
//                   </div>
//                   <div className="text-xs text-gray-500">{timeAgo}</div>
//                 </div>
//               </div>
//               <Button 
//                 variant="outline"
//                 onClick={handleFollow}
//                 disabled={isFollowingLoading || currentUser?.id === post.authorId}
//               >
//                 {isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'}
//               </Button>
//             </div>
//           ) : (
//             <div className="mb-6 text-center text-gray-500">Đang tải thông tin tác giả...</div>
//           )}

//           {/* Post Title */}
//           <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

//           {/* Tags & Topic */}
//           <div className="flex flex-wrap gap-2 mb-6">
//             <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
//                 {post.topic}
//             </Badge>
//             <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
//                 {post.major as any || 'N/A'}
//             </Badge>
//               {(Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',').map(t => t.trim()).filter(Boolean) : [])).map((tag) => (
//                 <Badge key={tag} variant="secondary">
//                   #{tag}
//                 </Badge>
//             ))}
//           </div>

//           {/* Post Content */}
//           <div className="prose max-w-none mb-6">
//             <p className="whitespace-pre-wrap text-gray-700">{post.content}</p>
//           </div>

//           {/* Attachments */}
//           {post.attachments && post.attachments.length > 0 && (
//             <div className="mb-6">
//               <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
//                 <FileText className="h-5 w-5" />
//                 Tệp đính kèm
//               </h3>
//               <div className="space-y-2">
//                 {post.attachments.map((file) => (
//                   <div
//                     key={file.id}
//                     className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className="flex h-10 w-10 items-center justify-center rounded bg-orange-100">
//                         <FileText className="h-5 w-5 text-orange-600" />
//                       </div>
//                       <div>
//                         <p className="text-sm font-medium">{file.name}</p>
//                         <p className="text-xs text-gray-500">{file.size}</p>
//                       </div>
//                     </div>
//                     <Button size="sm" variant="outline">
//                       <Download className="h-4 w-4 mr-1" />
//                       Tải xuống
//                     </Button>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Video */}
//           {post.videoUrl && (
//             <div className="mb-6">
//               <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
//                 <Video className="h-5 w-5" />
//                 Video hướng dẫn
//               </h3>
//               <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
//                 <Video className="h-12 w-12 text-gray-400" />
//               </div>
//             </div>
//           )}

//           {/* Stats & Actions */}
//           <div className="flex items-center justify-between py-4 border-y">
//             <div className="flex items-center gap-6 text-sm text-gray-600">
//               <div className="flex items-center gap-1">
//                 <Eye className="h-4 w-4" />
//                 <span>{(post.views || 0).toLocaleString()} lượt xem</span>
//               </div>
//               <div className="flex items-center gap-1">
//                 <MessageCircle className="h-4 w-4" />
//                 <span>{postComments.length} bình luận</span>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">
//               <Button
//                 variant={isLiked ? "default" : "outline"}
//                 size="sm"
//                 onClick={handleLike}
//                 className={isLiked ? "bg-red-500 hover:bg-red-600" : ""}
//               >
//                 <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
//                 {currentLikesCount} 
//               </Button>
//               <Button variant="outline" size="sm">
//                 <Share2 className="h-4 w-4 mr-1" />
//                 Chia sẻ
//               </Button>
//               <Button variant="outline" size="sm">
//                 <Bookmark className="h-4 w-4" />
//               </Button>
//             </div>
//           </div>

//           {/* Comments Section */}
//           <div className="mt-6">
//             <h3 className="text-lg font-semibold mb-4">Bình luận ({postComments.length})</h3>

//             {/* Add Comment */}
//             <div className="mb-6">
//               {replyTo && (
//                 <div className="flex items-center justify-between mb-2 p-2 bg-orange-50 rounded">
//                   <span className="text-sm text-gray-600">Đang trả lời bình luận...</span>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => setReplyTo(null)}
//                   >
//                     <X className="h-4 w-4" />
//                   </Button>
//                 </div>
//               )}
//               <div className="flex gap-3">
//                 <img
//                   src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
//                   alt="Current user"
//                   className="h-10 w-10 rounded-full object-cover"
//                 />
//                 <div className="flex-1">
//                   <Textarea
//                     placeholder="Viết bình luận..."
//                     value={newComment}
//                     onChange={(e) => setNewComment(e.target.value)}
//                     className="min-h-[80px]"
//                     disabled={!currentUser}
//                   />
//                   <div className="flex justify-end gap-2 mt-2">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => {
//                         setNewComment("");
//                         setReplyTo(null);
//                       }}
//                     >
//                       Hủy
//                     </Button>
//                     <Button
//                       size="sm"
//                       onClick={handleAddComment}
//                       className="bg-orange-600 hover:bg-orange-700"
//                       disabled={!currentUser || !newComment.trim()}
//                     >
//                       Gửi bình luận
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Comments List */}
//             <div className="space-y-2">
//               {postComments.filter(c => !c.parentId).map(comment => renderComment(comment))}
//             </div>

//             {postComments.length === 0 && (
//               <div className="text-center py-12 text-gray-500">
//                 <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
//                 <p>Chưa có bình luận nào</p>
//                 <p className="text-sm">Hãy là người đầu tiên bình luận!</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
// PostDetail.tsx - Hoàn chỉnh với real-time likes và đầy đủ chức năng

// // PostDetail.tsx - Hoàn chỉnh với real-time likes và đầy đủ chức năng

// import { useState, useEffect } from "react";
// import { X, Heart, Share2, Bookmark, FileText, Download, Video, Flag, Eye, MessageCircle, ThumbsUp } from "lucide-react";
// import { Button } from "./ui/button";
// import { Badge } from "./ui/badge";
// import { Textarea } from "./ui/textarea";
// import { Dialog, DialogContent } from "./ui/dialog";
// import { Separator } from "./ui/separator";
// import type { Post, Comment } from "../lib/mockData";
// import api from "../lib/api";
// import { useAuth } from "../lib/authContext";
// import { formatDistanceToNow } from "date-fns";
// import { vi } from "date-fns/locale";

// interface PostDetailProps {
//   post: Post;
//   isOpen: boolean;
//   onClose: () => void;
//   onLike: () => void;
// }

// export function PostDetail({ post, isOpen, onClose, onLike }: PostDetailProps) {
//   const [newComment, setNewComment] = useState("");
//   const [replyTo, setReplyTo] = useState<string | null>(null);
//   const [postComments, setPostComments] = useState<Comment[]>([]);
//   const [commentAuthors, setCommentAuthors] = useState<Record<string, any>>({});
//   const [isFollowing, setIsFollowing] = useState(false);
//   const [isFollowingLoading, setIsFollowingLoading] = useState(false);

//   const [author, setAuthor] = useState<any | null>(null);
//   const [currentLikesCount, setCurrentLikesCount] = useState(post.likes || 0);
//   const [isLiked, setIsLiked] = useState(post.isLiked || false);
//   const { user: currentUser } = useAuth();

//   const handleLike = async () => {
//     // Gọi onLike từ parent để cập nhật list
//     await onLike();
    
//     // Cập nhật state local
//     const token = localStorage.getItem('ksp_auth_token') || undefined;
//     try {
//       const newLikesCount = await api.getPostLikesCount(post.id, token);
//       const newLikeStatus = currentUser?.id ? await api.checkLikeStatus(post.id, currentUser.id, token) : false;
//       console.log('[PostDetail] After like - Count:', newLikesCount, 'Status:', newLikeStatus);
//       setCurrentLikesCount(Number(newLikesCount) || 0);
//       setIsLiked(Boolean(newLikeStatus));
//     } catch (err) {
//       console.error('[PostDetail] Error refreshing likes:', err);
//     }
//   };
  
//   useEffect(() => {
//     let mounted = true;
//     const token = localStorage.getItem('ksp_auth_token') || undefined; 
    
//     // Load author info
//     api.getUser(post.authorId, token).then((res) => {
//       if (mounted) setAuthor(res || null);
//     }).catch(() => { /* ignore */ });

//     // Check if following
//     if (currentUser?.id && post.authorId !== currentUser.id) {
//       api.getFollowStatus(currentUser.id, post.authorId, token).then((res: any) => {
//         if (mounted) setIsFollowing(!!res?.isFollowing || !!res?.data?.isFollowing); 
//       }).catch(() => {});
//     }

//     // Load real-time likes count and status
//     Promise.all([
//       api.getPostLikesCount(post.id, token),
//       currentUser?.id ? api.checkLikeStatus(post.id, currentUser.id, token) : Promise.resolve(false)
//     ]).then(([likesCount, likeStatus]) => {
//       if (mounted) {
//         console.log('[PostDetail] Loaded likes:', { likesCount, likeStatus });
//         setCurrentLikesCount(Number(likesCount) || 0);
//         setIsLiked(Boolean(likeStatus));
//       }
//     }).catch(err => {
//       console.error('[PostDetail] Error loading likes:', err);
//     });

//     // Load comments
//     api.getCommentsByPost(post.id, token).then((res) => {
//       if (!mounted) return;
//       const list = Array.isArray(res) ? res : (res?.data || res) || [];
//       setPostComments(list as Comment[]);
      
//       // Collect unique author ids
//       const authorIds = new Set<string>();
//       (list as Comment[]).forEach(c => {
//         authorIds.add(c.authorId);
//         if (c.replies) c.replies.forEach(r => authorIds.add(r.authorId));
//       });
      
//       // Fetch authors in parallel
//       Promise.all(Array.from(authorIds).map(id => api.getUser(id, token).catch(() => null))).then(results => {
//         if (!mounted) return;
//         const map: Record<string, any> = {};
//         results.forEach((u: any) => { if (u && u.id) map[u.id] = u; });
//         setCommentAuthors(map);
//       }).catch(() => {});
//     }).catch(() => {
//       setPostComments([]);
//     });
    
//     return () => { mounted = false; };
//   }, [post.id, post.authorId, currentUser?.id]);

//   const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
//     addSuffix: true,
//     locale: vi
//   });

//   const handleFollow = async () => {
//     if (!currentUser?.id || !author?.id || isFollowingLoading) return;

//     try {
//       setIsFollowingLoading(true);
//       const token = localStorage.getItem('ksp_auth_token') || undefined;

//       if (isFollowing) {
//         await api.unfollowUser(currentUser.id, author.id, token);
//         setIsFollowing(false);
//       } else {
//         await api.followUser(currentUser.id, author.id, token);
//         setIsFollowing(true);
//       }
//     } catch (err) {
//       console.error('[PostDetail] Error following user:', err);
//     } finally {
//       setIsFollowingLoading(false);
//     }
//   };

//   const handleAddComment = async () => {
//     if (!newComment.trim() || !currentUser?.id) {
//         console.error('[COMMENT] Comment content is empty or user not logged in.');
//         return;
//     }

//     try {
//       const token = (localStorage.getItem('ksp_auth_token') || undefined) as any;
      
//       console.log('[COMMENT] Sending payload:', { 
//         postId: post.id, 
//         content: newComment, 
//         parentId: replyTo || undefined 
//       });
      
//       const created = await api.addComment({
//         postId: post.id,
//         content: newComment,
//         parentId: replyTo || undefined,
//       }, token);

//       if (created) {
//         console.log('[COMMENT] Response:', created);
        
//         // Thêm currentUser vào danh sách author nếu chưa có
//         if (!commentAuthors[currentUser.id]) {
//             setCommentAuthors(prev => ({ ...prev, [currentUser.id]: currentUser }));
//         }

//         // Normalize and add to UI
//         if (replyTo) {
//           setPostComments(prev => prev.map(c => {
//             if (c.id === replyTo) {
//               return { 
//                 ...c, 
//                 replies: [...(c.replies || []), created] 
//               };
//             }
//             return c;
//           }));
//         } else {
//           setPostComments(prev => [...prev, created]);
//         }
//       }
//     } catch (e) {
//       console.error('[COMMENT] Error:', e);
//       const error = e as any;
//       if (error?.response?.status === 401) {
//         console.error('[COMMENT] Unauthorized - please login');
//       } else if (error?.response?.status === 403) {
//         console.error('[COMMENT] Forbidden - permission denied');
//       } else {
//         console.error('[COMMENT] Failed to add comment:', error?.message);
//       }
//     } finally {
//       setNewComment("");
//       setReplyTo(null);
//     }
//   };

//   const renderComment = (comment: Comment, isReply = false) => {
//     const commentAuthor = commentAuthors[comment.authorId];
//     if (!commentAuthor) return null;

//     const commentTime = formatDistanceToNow(new Date(comment.createdAt), {
//       addSuffix: true,
//       locale: vi
//     });

//     return (
//       <div key={comment.id} className={isReply ? "ml-12" : ""}>
//         <div className="flex gap-3 p-4 hover:bg-gray-50 rounded-lg">
//           <img
//             src={commentAuthor.avatar && typeof commentAuthor.avatar === 'string' && commentAuthor.avatar.trim()
//               ? commentAuthor.avatar
//               : `https://api.dicebear.com/7.x/avataaars/svg?seed=${commentAuthor.id}`}
//             alt={commentAuthor.name}
//             className="h-10 w-10 rounded-full object-cover"
//             onError={(e) => {
//               (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${commentAuthor.id}`;
//             }}
//           />
//           <div className="flex-1">
//             <div className="bg-gray-100 rounded-lg p-3">
//               <div className="flex items-center gap-2 mb-1">
//                 <span className="text-sm font-semibold">{commentAuthor.name}</span>
//                 {commentAuthor.role === 'lecturer' && (
//                   <Badge variant="secondary" className="text-xs">Giảng viên</Badge>
//                 )}
//                 <span className="text-xs text-gray-500">• {commentTime}</span>
//               </div>
//               <p className="text-sm text-gray-700">{comment.content}</p>
//             </div>
//             <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
//               <button className="hover:text-orange-600 flex items-center gap-1">
//                 <ThumbsUp className="h-3 w-3" />
//                 <span>{comment.likes || 0}</span>
//               </button>
//               <button
//                 className="hover:text-orange-600"
//                 onClick={() => setReplyTo(comment.id)}
//               >
//                 Trả lời
//               </button>
//               <button className="hover:text-red-600 flex items-center gap-1">
//                 <Flag className="h-3 w-3" />
//                 Báo cáo
//               </button>
//             </div>
//           </div>
//         </div>
//         {comment.replies && comment.replies.map(reply => renderComment(reply, true))}
//       </div>
//     );
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
//         {/* Header */}
//         <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
//           <h2 className="text-xl font-bold">Chi tiết bài viết</h2>
//           <Button variant="ghost" size="icon" onClick={onClose}>
//             <X className="h-5 w-5" />
//           </Button>
//         </div>

//         <div className="p-6">
//           {/* Author Info */}
//           {author ? (
//             <div className="flex items-start justify-between mb-6">
//               <div className="flex items-center gap-3">
//                 <img
//                   src={author.avatar && typeof author.avatar === 'string' && author.avatar.trim()
//                     ? author.avatar
//                     : `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id}`}
//                   alt={author.name}
//                   className="h-16 w-16 rounded-full object-cover"
//                   onError={(e) => {
//                     (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id}`;
//                   }}
//                 />
//                 <div>
//                   <div className="flex items-center gap-2 mb-1">
//                     <h3 className="font-semibold">{author.name}</h3>
//                     {author.role === 'lecturer' && (
//                       <Badge variant="secondary">Giảng viên</Badge>
//                     )}
//                     {author.badges && author.badges.length > 0 && author.badges[author.badges.length - 1] && (
//                       <span className="text-xl" title={author.badges[author.badges.length - 1].name}>
//                         {author.badges[author.badges.length - 1].icon}
//                       </span>
//                     )}
//                   </div>
//                   <div className="text-sm text-gray-600">
//                     {author.major} {author.class && `• ${author.class}`}
//                   </div>
//                   <div className="text-xs text-gray-500">{timeAgo}</div>
//                 </div>
//               </div>
//               <Button 
//                 variant="outline"
//                 onClick={handleFollow}
//                 disabled={isFollowingLoading || currentUser?.id === post.authorId}
//               >
//                 {isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'}
//               </Button>
//             </div>
//           ) : (
//             <div className="mb-6 text-center text-gray-500">Đang tải thông tin tác giả...</div>
//           )}

//           {/* Post Title */}
//           <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

//           {/* Tags & Topic */}
//           <div className="flex flex-wrap gap-2 mb-6">
//             <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
//                 {post.topic}
//             </Badge>
//             <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
//                 {post.major as any || 'N/A'}
//             </Badge>
//               {(Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',').map(t => t.trim()).filter(Boolean) : [])).map((tag) => (
//                 <Badge key={tag} variant="secondary">
//                   #{tag}
//                 </Badge>
//             ))}
//           </div>

//           {/* Post Content */}
//           <div className="prose max-w-none mb-6">
//             <p className="whitespace-pre-wrap text-gray-700">{post.content}</p>
//           </div>

//           {/* Attachments */}
//           {post.attachments && post.attachments.length > 0 && (
//             <div className="mb-6">
//               <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
//                 <FileText className="h-5 w-5" />
//                 Tệp đính kèm
//               </h3>
//               <div className="space-y-2">
//                 {post.attachments.map((file) => (
//                   <div
//                     key={file.id}
//                     className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className="flex h-10 w-10 items-center justify-center rounded bg-orange-100">
//                         <FileText className="h-5 w-5 text-orange-600" />
//                       </div>
//                       <div>
//                         <p className="text-sm font-medium">{file.name}</p>
//                         <p className="text-xs text-gray-500">{file.size}</p>
//                       </div>
//                     </div>
//                     <Button size="sm" variant="outline">
//                       <Download className="h-4 w-4 mr-1" />
//                       Tải xuống
//                     </Button>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Video */}
//           {post.videoUrl && (
//             <div className="mb-6">
//               <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
//                 <Video className="h-5 w-5" />
//                 Video hướng dẫn
//               </h3>
//               <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
//                 <Video className="h-12 w-12 text-gray-400" />
//               </div>
//             </div>
//           )}

//           {/* Stats & Actions */}
//           <div className="flex items-center justify-between py-4 border-y">
//             <div className="flex items-center gap-6 text-sm text-gray-600">
//               <div className="flex items-center gap-1">
//                 <Eye className="h-4 w-4" />
//                 <span>{(post.views || 0).toLocaleString()} lượt xem</span>
//               </div>
//               <div className="flex items-center gap-1">
//                 <MessageCircle className="h-4 w-4" />
//                 <span>{postComments.length} bình luận</span>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">
//               <Button
//                 variant={isLiked ? "default" : "outline"}
//                 size="sm"
//                 onClick={handleLike}
//                 className={isLiked ? "bg-red-500 hover:bg-red-600" : ""}
//               >
//                 <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
//                 {currentLikesCount} 
//               </Button>
//               <Button variant="outline" size="sm">
//                 <Share2 className="h-4 w-4 mr-1" />
//                 Chia sẻ
//               </Button>
//               <Button variant="outline" size="sm">
//                 <Bookmark className="h-4 w-4" />
//               </Button>
//             </div>
//           </div>

//           {/* Comments Section */}
//           <div className="mt-6">
//             <h3 className="text-lg font-semibold mb-4">Bình luận ({postComments.length})</h3>

//             {/* Add Comment */}
//             <div className="mb-6">
//               {replyTo && (
//                 <div className="flex items-center justify-between mb-2 p-2 bg-orange-50 rounded">
//                   <span className="text-sm text-gray-600">Đang trả lời bình luận...</span>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => setReplyTo(null)}
//                   >
//                     <X className="h-4 w-4" />
//                   </Button>
//                 </div>
//               )}
//               <div className="flex gap-3">
//                 <img
//                   src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
//                   alt="Current user"
//                   className="h-10 w-10 rounded-full object-cover"
//                 />
//                 <div className="flex-1">
//                   <Textarea
//                     placeholder="Viết bình luận..."
//                     value={newComment}
//                     onChange={(e) => setNewComment(e.target.value)}
//                     className="min-h-[80px]"
//                     disabled={!currentUser}
//                   />
//                   <div className="flex justify-end gap-2 mt-2">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => {
//                         setNewComment("");
//                         setReplyTo(null);
//                       }}
//                     >
//                       Hủy
//                     </Button>
//                     <Button
//                       size="sm"
//                       onClick={handleAddComment}
//                       className="bg-orange-600 hover:bg-orange-700"
//                       disabled={!currentUser || !newComment.trim()}
//                     >
//                       Gửi bình luận
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Comments List */}
//             <div className="space-y-2">
//               {postComments.filter(c => !c.parentId).map(comment => renderComment(comment))}
//             </div>

//             {postComments.length === 0 && (
//               <div className="text-center py-12 text-gray-500">
//                 <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
//                 <p>Chưa có bình luận nào</p>
//                 <p className="text-sm">Hãy là người đầu tiên bình luận!</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
// PostDetail.tsx - Hoàn chỉnh với real-time likes và đầy đủ chức năng

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
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'https://donjaderoy81-knowledge.hf.space/ws'),
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

        // 📢 LOA 3: CÓ BÌNH LUẬN BỊ XÓA (CÁI BỊ QUÊN LÚC NÃY ĐÂY)
        client.subscribe(`/topic/post/${post.id}/delete-comment`, (message) => {
            const deletedId = message.body; // Lấy ID dạng Text trực tiếp
            setPostComments(prev => prev.filter(c => c.id !== deletedId && c.parentId !== deletedId));
        });

        // 📢 LOA 4: BÌNH LUẬN ĐƯỢC LIKE/SỬA (CÁI BỊ QUÊN LÚC NÃY NỮA NÈ)
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
      <div key={comment.id} className={isReply ? "ml-12" : ""}>
        <div className="flex gap-3 p-4 hover:bg-gray-50 rounded-lg">
          <img
            src={commentAuthor.avatar && typeof commentAuthor.avatar === 'string' && commentAuthor.avatar.trim()
              ? commentAuthor.avatar
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${commentAuthor.id}`}
            alt={commentAuthor.name}
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${commentAuthor.id}`;
            }}
          />
          <div className="flex-1">
            <div className={`bg-gray-100 rounded-lg p-3 ${replyTo === comment.id ? 'ring-2 ring-orange-200 bg-orange-50/50' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">{commentAuthor.name}</span>
                {commentAuthor.role === 'lecturer' && (
                  <Badge variant="secondary" className="text-xs">Giảng viên</Badge>
                )}
                <span className="text-xs text-gray-500">• {commentTime}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <button className="hover:text-blue-600 flex items-center gap-1" onClick={() => handleLikeComment(comment.id)}>
                <ThumbsUp className="h-3 w-3" />
                <span>{comment.likes || 0}</span>
              </button>
              <button className={`transition-colors ${replyTo === comment.id ? 'text-orange-600 font-bold' : 'hover:text-orange-600'}`} onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                Trả lời
              </button>
              <button className="hover:text-red-600 flex items-center gap-1" onClick={() => handleReportComment(comment.id)}>
                <Flag className="h-3 w-3" /> Báo cáo
              </button>
              {currentUser?.id === comment.authorId && (
                <button className="hover:text-red-600 flex items-center gap-1" onClick={() => handleDeleteComment(comment.id)}>
                  <Trash2 className="h-3 w-3" /> Xóa
                </button>
              )}
            </div>
          </div>
        </div>
        {childReplies.map(reply => renderComment(reply, true))}
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
      <DialogContent aria-describedby={undefined} className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">Chi tiết bài viết</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {author ? (
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={author.avatar && typeof author.avatar === 'string' && author.avatar.trim()
                    ? author.avatar
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id}`}
                  alt={author.name}
                  className="h-16 w-16 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id}`;
                  }}
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{author.name}</h3>
                    {author.role === 'lecturer' && (
                      <Badge variant="secondary">Giảng viên</Badge>
                    )}
                    {author.badges && author.badges.length > 0 && author.badges[author.badges.length - 1] && (
                      <span className="text-xl" title={author.badges[author.badges.length - 1].name}>
                        {author.badges[author.badges.length - 1].icon}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {author.major} {author.class && `• ${author.class}`}
                  </div>
                  <div className="text-xs text-gray-500">{timeAgo}</div>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleFollow}
                disabled={isFollowingLoading || currentUser?.id === post.authorId}
              >
                {isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'}
              </Button>
            </div>
          ) : (
            <div className="mb-6 text-center text-gray-500">Đang tải thông tin tác giả...</div>
          )}

          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {post.topic}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {post.major as any || 'N/A'}
            </Badge>
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>

          <div className="prose max-w-none mb-6">
            <p className="whitespace-pre-wrap text-gray-700">{post.content}</p>
          </div>

          {post.attachments && post.attachments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tệp đính kèm
              </h3>
              <div className="space-y-2">
                {post.attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-orange-100">
                        <FileText className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Tải xuống
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {post.videoUrl && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video hướng dẫn
              </h3>
              <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                <Video className="h-12 w-12 text-gray-400" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between py-4 border-y">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{(post.views || 0).toLocaleString()} lượt xem</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{postComments.length} bình luận</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                onClick={handleLikeToggle}
                disabled={!currentUser?.id || isLiking}
                className={isLiked ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-gray-100"}
              >
                <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current text-white' : 'text-gray-500'}`} />
                {currentLikesCount} 
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Chia sẻ
              </Button>
              <Button variant="outline" size="sm">
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Bình luận ({postComments.length})</h3>

            <div className="mb-6">
              {replyTo && (
                <div className="flex items-center justify-between mb-2 p-2 bg-orange-50 rounded">
                  <span className="text-sm text-gray-600">Đang trả lời bình luận...</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyTo(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-3">
                <img
                  src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
                  alt="Current user"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <Textarea
                    placeholder="Viết bình luận..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                    disabled={!currentUser}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewComment("");
                        setReplyTo(null);
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={!currentUser || !newComment.trim()}
                    >
                      Gửi bình luận
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              {rootComments.map(comment => renderComment(comment))}
            </div>
            {postComments.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Chưa có bình luận nào</p>
                <p className="text-sm">Hãy là người đầu tiên bình luận!</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}