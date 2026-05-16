const API_BASE = import.meta.env.VITE_API_URL || 'https://donjaderoy-knowledge-iy-5ba.fly.dev';
import { localStorage_service } from './localStorage';
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch (e) {
    return undefined;
  }
}
/**
 * Low-level request wrapper.
 * Returns the parsed JSON body (if any). Higher-level helpers should unwrap .data if needed.
 */
export async function request(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const _token = token || localStorage_service.getAuthToken();
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
    if (path.startsWith('/api/users') || path.startsWith('/api/sessions') || path.startsWith('/api/devices')) {
      console.info(`[API INFO] Protected call to ${method} ${path}. Token status: Present (Length: ${_token.length}).`);
    }
  } else {
    if (path.startsWith('/api/users') || path.startsWith('/api/sessions') || path.startsWith('/api/devices')) {
      console.error(`[CRITICAL WARNING] Accessing protected path (${path}) without Authorization Token. This caused the 401.`);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    console.error(`401 UNAUTHORIZED for ${method} ${path}. Check if the Bearer Token is correctly stored/passed: ${_token ? 'Token present but invalid.' : 'Token is missing.'}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error: ${res.status} ${text}`);
  }
  return safeJson(res);
}

function unwrapResponse(res: any) {
  if (!res) return res;
  if (Array.isArray(res)) return res;
  if (res.data && Array.isArray(res.data)) return res.data;
  if (res.data && res.data.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data && res.data.content && Array.isArray(res.data.content)) return res.data.content;
  if (res.items && Array.isArray(res.items)) return res.items;
  return res;
}

// ==================== AUTH ====================

export async function login(payload: any) {
  const res = await request('POST', '/api/auth/login', payload);
  const user = res?.data || res;
  return user ? normalizeUser(user) : user;
}

export async function logout(userId: string, token: string) {
  const res = await request('POST', `/api/auth/logout?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`);
  return res?.data || res;
}

export async function me(token?: string) {
  const res = await request('GET', '/api/auth/me', undefined, token);
  const user = res?.data || res;
  return user ? normalizeUser(user) : user;
}

// --- LUỒNG ĐĂNG KÝ (OTP) ---

// 1. Yêu cầu gửi OTP đăng ký
export async function requestRegisterOtp(userData: any) {
  const res = await request('POST', '/api/auth/register/request-otp', userData);
  return res?.data || res;
}

// 2. Xác thực OTP và hoàn tất đăng ký (Thay thế cho hàm register cũ)
export async function verifyRegisterOtp(userData: any) {
  const res = await request('POST', '/api/auth/register', userData);
  const user = res?.data || res;
  return user ? normalizeUser(user) : user;
}

// --- LUỒNG GOOGLE LOGIN ---
export async function googleLogin(payload: any) {
  const res = await request('POST', '/api/auth/google/login', payload);
  const user = res?.data || res;
  return user ? normalizeUser(user) : user;
}

// --- LUỒNG QUÊN MẬT KHẨU ---

// 1. Yêu cầu OTP lấy lại mật khẩu
export async function requestPasswordResetOtp(email: string) {
  const res = await request('POST', '/api/auth/forgot-password/request-otp', { email });
  return res?.data || res;
}

// 2. Xác nhận OTP và đổi mật khẩu mới
export async function resetPassword(data: any) {
  const res = await request('POST', '/api/auth/forgot-password/reset', data);
  return res?.data || res;
}
// ==================== POSTS ====================
export async function getPosts(page = 0, size = 20) {
  const res = await request('GET', `/api/posts?page=${page}&size=${size}`);
  const list = unwrapResponse(res);
  if (Array.isArray(list)) return list.map(normalizePost);
  return list;
}

export async function getPost(id: string) {
  const res = await request('GET', `/api/posts/${id}`);
  const data = res?.data || res;
  if (!data) return data;
  return normalizePost(data);
}

function normalizePost(post: any) {
  if (!post) return post;
  const tags = post.tags;
  let normalizedTags: string[] = [];
  if (Array.isArray(tags)) {
    normalizedTags = tags
      .map((t) => {
        if (!t && t !== 0) return null;
        if (typeof t === 'string') return t.trim();
        if (typeof t === 'number') return String(t);
        if (typeof t === 'object') return String(t.name || t.label || t.id || JSON.stringify(t));
        return String(t);
      })
      .filter(Boolean) as string[];
  } else if (typeof tags === 'string') {
    normalizedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
  } else if (tags && typeof tags === 'object') {
    if (Array.isArray(tags.items)) normalizedTags = tags.items.map((t: any) => String(t).trim()).filter(Boolean);
    else if (Array.isArray(tags.data)) normalizedTags = tags.data.map((t: any) => String(t).trim()).filter(Boolean);
    else normalizedTags = [];
  } else {
    normalizedTags = [];
  }

  const normalized = { 
    ...post, 
    tags: normalizedTags,
    major: post.major || post.majorId,
    subject: post.subject || post.subjectId,
  };
  return normalized;
}

function normalizeUser(user: any) {
  if (!user) return user;
  const avatar = user.avatar && typeof user.avatar === 'string' && user.avatar.trim()
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id || user.email || 'default'}`;
  return { ...user, avatar: avatar };
}

function normalizeComment(comment: any) {
  if (!comment) return comment;
  const normalized = {
    ...comment,
    createdAt: comment.createdAt || new Date().toISOString(),
    likes: comment.likes || 0,
    replies: Array.isArray(comment.replies) ? comment.replies.map(normalizeComment) : []
  };
  return normalized;
}

export async function getPostTags(postId: string) {
  const res = await request('GET', `/api/posts/${postId}/tags`);
  return unwrapResponse(res);
}

export async function createPost(data: any, token?: string) {
  const res = await request('POST', '/api/posts', data, token);
  const payload = res?.data || res;
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? normalizePost(payload) : payload;
}

// ==================== LIKES ====================
export async function likePost(postId: string, token?: string) {
  const res = await request('POST', `/api/posts-like/${postId}/like`, undefined, token);
  return res?.data || res;
}

export async function unlikePost(postId: string, token?: string) {
  const res = await request('POST', `/api/posts-like/${postId}/unlike`, undefined, token);
  return res?.data || res;
}

export async function getPostLikesCount(postId: string, token?: string) {
  const res = await request('GET', `/api/posts-like/${encodeURIComponent(postId)}/likes/count`, undefined, token);
  const innerResponse = res?.data; 
  const count = innerResponse?.data; 
  return Number(count) || 0; 
}

export async function checkLikeStatus(postId: string, userId: string, token?: string) {
  const res = await request('GET', `/api/posts-like/${encodeURIComponent(postId)}/like-status?userId=${encodeURIComponent(userId)}`, undefined, token);
  const innerResponse = res?.data; 
  const likeStatusDTO = innerResponse?.data;
  const isLiked = likeStatusDTO?.liked; 
  return Boolean(isLiked);
}

// ==================== COMMENTS ====================
export async function addComment(data: any, token?: string) {
  const res = await request('POST', '/api/comments', data, token);
  const comment = res?.data || res;
  return comment ? normalizeComment(comment) : comment;
}

export async function getCommentsByPost(postId: string, token?: string) {
  const res = await request('GET', `/api/comments/post/${postId}`, undefined, token);
  const comments = unwrapResponse(res);
  if (Array.isArray(comments)) return comments.map(normalizeComment);
  return comments;
}

// 👇 THÊM 3 HÀM NÀY VÀO ĐÂY 👇
export async function likeComment(commentId: string, token?: string) {
  const res = await request('POST', `/api/comments/${encodeURIComponent(commentId)}/like`, undefined, token);
  return res?.data || res;
}

export async function reportComment(commentId: string, reason: string, token?: string) {
  // Backend dùng @RequestBody String reason nên truyền raw data
  const res = await request('POST', `/api/comments/${encodeURIComponent(commentId)}/report`, reason, token);
  return res?.data || res;
}

export async function deleteComment(commentId: string, token?: string) {
  const res = await request('DELETE', `/api/comments/${encodeURIComponent(commentId)}`, undefined, token);
  return res?.data || res;
}

// ==================== SAVED POSTS ====================
export async function savePost(userId: string, postId: string, token?: string) {
  const res = await request('POST', `/api/saved-posts?userId=${encodeURIComponent(userId)}&postId=${encodeURIComponent(postId)}`, undefined, token);
  return res?.data || res;
}

export async function unsavePost(userId: string, postId: string, token?: string) {
  const res = await request('DELETE', `/api/saved-posts?userId=${encodeURIComponent(userId)}&postId=${encodeURIComponent(postId)}`, undefined, token);
  return res?.data || res;
}

export async function getSavedPosts(userId: string, token?: string) {
  const res = await request('GET', `/api/saved-posts/${encodeURIComponent(userId)}`, undefined, token);
  const list = unwrapResponse(res);
  if (Array.isArray(list)) return list.map(normalizePost); 
  return list;
}

export async function checkSavedPost(userId: string, postId: string, token?: string) {
  const res = await request('GET', `/api/saved-posts/check?userId=${encodeURIComponent(userId)}&postId=${encodeURIComponent(postId)}`, undefined, token);
  return res?.data || res;
}

export async function getSavedPostsCount(userId: string, token?: string) {
  const res = await request('GET', `/api/saved-posts/${encodeURIComponent(userId)}/count`, undefined, token);
  return res?.data || res;
}

// ==================== USERS ====================
export async function getUsers(page = 0, size = 50) {
  const res = await request('GET', `/api/users?page=${page}&size=${size}`);
  const users = unwrapResponse(res);
  if (Array.isArray(users)) return users.map(normalizeUser);
  return users;
}

export async function getUser(id: string, token?: string) {
  const res = await request('GET', `/api/users/${id}`, undefined, token);
  const user = res?.data || res;
  return user ? normalizeUser(user) : user;
}

export async function followUser(followerId: string, followeeId: string, token?: string) {
  const res = await request('POST', `/api/users/${encodeURIComponent(followerId)}/follow/${encodeURIComponent(followeeId)}`, undefined, token);
  return res?.data || res;
}

export async function unfollowUser(followerId: string, followeeId: string, token?: string) {
  const res = await request('DELETE', `/api/users/${encodeURIComponent(followerId)}/unfollow/${encodeURIComponent(followeeId)}`, undefined, token);
  return res?.data || res;
}

export async function getFollowers(userId: string, token?: string) {
  const res = await request('GET', `/api/users/${encodeURIComponent(userId)}/followers`, undefined, token);
  const users = unwrapResponse(res);
  if (Array.isArray(users)) return users.map(normalizeUser);
  return users;
}

export async function getFollowing(userId: string, token?: string) {
  const res = await request('GET', `/api/users/${encodeURIComponent(userId)}/following`, undefined, token);
  const users = unwrapResponse(res);
  if (Array.isArray(users)) return users.map(normalizeUser);
  return users;
}

export async function getFollowStatus(followerId: string, followeeId: string, token?: string) {
    const res = await request('GET', `/api/users/follow-status?followeeId=${encodeURIComponent(followeeId)}`, undefined, token); 
    let data = res?.data?.data || res?.data;
    let isFollowing: boolean | undefined;
    
    if (typeof data === 'boolean') {
        isFollowing = data;
    } else if (typeof data === 'object' && data !== null) {
        isFollowing = data.isFollowing !== undefined 
            ? data.isFollowing 
            : data.followed !== undefined
                ? data.followed
                : data.following; 
    }
    return { isFollowing: Boolean(isFollowing) };
}

export async function updateUserProfile(userId: string, data: any, token?: string) {
  const res = await request('PUT', `/api/users/${encodeURIComponent(userId)}`, data, token);
  return res?.data || res;
}

export async function searchUsers(keyword: string, page = 0, size = 10, token?: string) {
  const res = await request('GET', `/api/users/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`, undefined, token);
  return res?.data || res;
}

export async function getUserStats(userId: string, token?: string) {
  const res = await request('GET', `/api/users/${encodeURIComponent(userId)}/stats`, undefined, token);
  return res?.data || res;
}

// ==================== PRIVACY & BLOCK ====================
export async function getPrivacySettings(token?: string) {
  const res = await request('GET', '/api/users/privacy', undefined, token);
  return res?.data || res;
}

export async function updatePrivacySettings(data: any, token?: string) {
  const res = await request('PUT', '/api/users/privacy', data, token);
  return res?.data || res;
}

export async function blockUser(blockedId: string, token?: string) {
  const res = await request('POST', `/api/users/${encodeURIComponent(blockedId)}/block`, undefined, token);
  return res?.data || res;
}

export async function unblockUser(blockedId: string, token?: string) {
  const res = await request('DELETE', `/api/users/${encodeURIComponent(blockedId)}/unblock`, undefined, token);
  return res?.data || res;
}

export async function getBlockedUsers(page = 0, size = 10, token?: string) {
  const res = await request('GET', `/api/users/blocks?page=${page}&size=${size}`, undefined, token);
  const users = unwrapResponse(res);
  if (Array.isArray(users)) return users.map(normalizeUser);
  return users;
}
// ==================== VIDEO CALLS ====================

/**
 * Lấy lịch sử cuộc gọi của một cuộc hội thoại cụ thể
 */
export async function getCallHistory(conversationId: string, token?: string) {
  const res = await request('GET', `/api/chat/calls/${conversationId}`, undefined, token);
  return unwrapResponse(res);
}

/**
 * Cập nhật trạng thái cuộc gọi (Ví dụ: kết thúc hoặc nhỡ) qua REST API 
 * (Dùng làm backup nếu WebSocket bị ngắt kết nối đột ngột)
 */
export async function updateCallStatus(callId: string, status: 'completed' | 'missed' | 'declined', token?: string) {
  const res = await request('PUT', `/api/chat/calls/${callId}?status=${status}`, undefined, token);
  return res?.data || res;
}
// ==================== CHAT & MESSAGING (NEW) ====================

/**
 * Lấy danh sách những người bạn follow chéo (Mutual Followers) để bắt đầu nhắn tin
 */
export async function getMutualFollowersForChat(token?: string) {
  console.log(`[API] getMutualFollowersForChat()`);
  const res = await request('GET', '/api/chat/mutual-followers', undefined, token);
  const users = unwrapResponse(res);
  if (Array.isArray(users)) return users.map(normalizeUser);
  return users;
}

/**
 * Tìm kiếm người dùng để nhắn tin (loại trừ những người đã bị chặn)
 */
export async function searchUsersToChat(keyword: string, token?: string) {
  console.log(`[API] searchUsersToChat(keyword: ${keyword})`);
  const res = await request('GET', `/api/chat/search-users?keyword=${encodeURIComponent(keyword)}`, undefined, token);
  const users = unwrapResponse(res);
  if (Array.isArray(users)) return users.map(normalizeUser);
  return users;
}

// ==================== BADGES ====================
export async function getBadges(token?: string) {
  const res = await request('GET', '/api/badges', undefined, token);
  return unwrapResponse(res);
}

export async function getBadgeById(id: string, token?: string) {
  const res = await request('GET', `/api/badges/${encodeURIComponent(id)}`, undefined, token);
  return res?.data || res;
}

export async function getUserBadges(userId: string, token?: string) {
  const res = await request('GET', `/api/badges/user/${userId}`, undefined, token);
  return unwrapResponse(res);
}

export async function getBadgeProgress(userId: string, token?: string) {
  const res = await request('GET', `/api/badges/user/${encodeURIComponent(userId)}/progress`, undefined, token);
  return unwrapResponse(res);
}

// ==================== NOTIFICATIONS ====================
export async function getNotifications(userId: string, page = 0, size = 20, token?: string) {
  const res = await request('GET', `/api/notifications/${encodeURIComponent(userId)}?page=${page}&size=${size}`, undefined, token);
  return res?.data || res;
}

export async function getUnreadNotificationsCount(userId: string, token?: string) {
  const res = await request('GET', `/api/notifications/${encodeURIComponent(userId)}/unread-count`, undefined, token);
  return res?.data || res;
}

export async function markNotificationAsRead(id: string, token?: string) {
  const res = await request('PUT', `/api/notifications/${id}/read`, undefined, token);
  return res?.data || res;
}

export async function markAllNotificationsAsRead(userId: string, token?: string) {
  const res = await request('PUT', `/api/notifications/${encodeURIComponent(userId)}/read-all`, undefined, token);
  return res?.data || res;
}

export async function deleteNotification(id: string, userId: string, token?: string) {
  const res = await request('DELETE', `/api/notifications/${id}?userId=${encodeURIComponent(userId)}`, undefined, token);
  return res?.data || res;
}

export async function deleteAllNotifications(userId: string, token?: string) {
  const res = await request('DELETE', `/api/notifications/${encodeURIComponent(userId)}/all`, undefined, token);
  return res?.data || res;
}

// ==================== REPORTS ====================
export async function createReport(data: any, token?: string) {
  const res = await request('POST', '/api/reports', data, token);
  return res?.data || res;
}

export async function getReport(id: string, token?: string) {
  const res = await request('GET', `/api/reports/${encodeURIComponent(id)}`, undefined, token);
  return res?.data || res;
}

export async function getReportsByStatus(status: string, token?: string) {
  const res = await request('GET', `/api/reports/status/${encodeURIComponent(status)}`, undefined, token);
  return unwrapResponse(res);
}

export async function getReportsByPost(postId: string, token?: string) {
  const res = await request('GET', `/api/reports/post/${encodeURIComponent(postId)}`, undefined, token);
  return unwrapResponse(res);
}

export async function getReportsByUser(userId: string, token?: string) {
  const res = await request('GET', `/api/reports/user/${encodeURIComponent(userId)}`, undefined, token);
  return unwrapResponse(res);
}

export async function updateReportStatus(reportId: string, data: any, token?: string) {
  const res = await request('PUT', `/api/reports/${encodeURIComponent(reportId)}/status`, data, token);
  return res?.data || res;
}

export async function deleteReport(reportId: string, token?: string) {
  const res = await request('DELETE', `/api/reports/${encodeURIComponent(reportId)}`, undefined, token);
  return res?.data || res;
}

export async function getReportStats(token?: string) {
  const res = await request('GET', '/api/reports/stats', undefined, token);
  return res?.data || res;
}

// ==================== LEADERBOARD ====================
export async function getOverallLeaderboard(limit = 10, token?: string) {
  const res = await request('GET', `/api/leaderboard/top?limit=${limit}`, undefined, token);
  return unwrapResponse(res);
}

export async function getUserRank(userId: string, token?: string) {
  const res = await request('GET', `/api/leaderboard/user/${encodeURIComponent(userId)}`, undefined, token);
  return res?.data || res;
}

export async function updateLeaderboard(token?: string) {
  const res = await request('POST', '/api/leaderboard/update', {}, token);
  return res?.data || res;
}

export async function getLeaderboardByMajor(majorId: string, limit = 10, token?: string) {
  const res = await request('GET', `/api/leaderboard/major/${encodeURIComponent(majorId)}?limit=${limit}`, undefined, token);
  return unwrapResponse(res);
}

export async function getTopPostersThisWeek(limit = 10, token?: string) {
  const res = await request('GET', `/api/leaderboard/top-posters-week?limit=${limit}`, undefined, token);
  return unwrapResponse(res);
}

export async function getMyRank(token?: string) {
  const user = await me(token);
  if (!user?.id) return null;
  return await getUserRank(user.id, token);
}

// ==================== MAJORS & SUBJECTS ====================
export async function getMajors(token?: string) {
  const res = await request('GET', '/api/majors', undefined, token);
  return unwrapResponse(res);
}

export async function getMajor(id: string, token?: string) {
  const res = await request('GET', `/api/majors/${id}`, undefined, token);
  return res?.data || res;
}

export async function getSubjectsForMajor(majorId: string, token?: string) {
  try {
    const res = await request('GET', `/api/subject/${majorId}`, undefined, token);
    return unwrapResponse(res) || [];
  } catch (e) {
    return [];
  }
}

// ==================== SESSIONS & DEVICES ====================
export async function getSessions(token?: string) {
  const res = await request('GET', '/api/sessions', undefined, token);
  return unwrapResponse(res);
}

export async function revokeSession(tokenToRevoke: string, token?: string) {
  const res = await request('POST', `/api/sessions/${encodeURIComponent(tokenToRevoke)}/revoke`, undefined, token);
  return res?.data || res;
}

export async function getDevices(token?: string) {
  const res = await request('GET', '/api/devices', undefined, token);
  return unwrapResponse(res);
}

export async function deleteDevice(id: string, token?: string) {
  const res = await request('DELETE', `/api/devices/${encodeURIComponent(id)}`, undefined, token);
  return res?.data || res;
}

// ==================== DEFAULT EXPORT ====================
export default {
  // Core
  request,
  
  // Auth
  login,
  logout,
  me,
  requestRegisterOtp,
  verifyRegisterOtp,
  googleLogin,
  requestPasswordResetOtp,
  resetPassword,
  
  // Posts
  getPosts,
  getPost,
  getPostTags,
  likePost,
  unlikePost,
  getPostLikesCount, 
  checkLikeStatus,
  createPost,
  
  // Comments
  addComment,
  getCommentsByPost,
  likeComment,
  reportComment,
  deleteComment,
  
  // Saved Posts
  savePost,
  unsavePost,
  getSavedPosts,
  checkSavedPost,
  getSavedPostsCount,

  // Users
  getUsers,
  getUser,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  updateUserProfile,
  searchUsers,
  getUserStats,

  // Privacy & Block 
  getPrivacySettings,
  updatePrivacySettings,
  blockUser,
  unblockUser,
  getBlockedUsers,

  // Chat & Messaging (NEW)
  getMutualFollowersForChat,
  searchUsersToChat,
  
  // Video Calls
  getCallHistory,
  updateCallStatus,
  
  // Badges
  getBadges,
  getBadgeById,
  getUserBadges,
  getBadgeProgress,
  
  // Notifications
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  
  // Reports
  createReport,
  getReport,
  getReportsByStatus,
  getReportsByPost,
  getReportsByUser,
  updateReportStatus,
  deleteReport,
  getReportStats,
  
  // Leaderboard
  getOverallLeaderboard,
  getUserRank,
  updateLeaderboard,
  getLeaderboardByMajor,
  getTopPostersThisWeek,
  getMyRank,
  
  // Majors
  getMajors,
  getMajor,
  getSubjectsForMajor,
  
  // Sessions & Devices
  getSessions,
  revokeSession,
  getDevices,
  deleteDevice
};