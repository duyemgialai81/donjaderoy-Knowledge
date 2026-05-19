import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./lib/authContext";
import { localStorage_service } from "./lib/localStorage";
import { ProfilePage } from "./components/ProfilePage";
import { AdminDashboard } from "./components/AdminDashboard";
import { Header } from "./components/Header";
import { FilterPanel } from "./components/FilterPanel";
import { PostCard } from "./components/PostCard";
import { PostDetail } from "./components/PostDetail";
import { UserSidebar } from "./components/UserSidebar";
import { Leaderboard } from "./components/Leaderboard";
import { SuggestedPosts } from "./components/SuggestedPosts";
import { CreatePostModal } from "./components/CreatePostModal";
import { SettingsPage } from "./components/SettingsPage";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import MessagesPage from "./components/MessagesPage";
import { Button } from "./components/ui/button";
import type { Post } from "./lib/mockData";
import api from "./lib/api";
import { BookOpen, TrendingUp, Users as UsersIcon, Clock, Shield, MessageCircle, Home, User, Settings, Plus } from "lucide-react";
import { toast } from "sonner";

function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: profileUserId } = useParams<{ id: string }>();
  const { user, isAuthenticated, isAdmin, logout, updateUser, setUser } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>(() => {
    const savedPosts = localStorage_service.getPosts();
    return savedPosts.length > 0 ? savedPosts : [];
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(() => {
    const savedFilters = localStorage_service.getFilters();
    return savedFilters || {
      major: 'all',
      subject: 'all',
      tags: [] as string[],
      sortBy: 'newest'
    };
  });
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // ✅ Thêm "messages" vào union type của state
  const [currentView, setCurrentView] = useState<"feed" | "profile" | "admin" | "settings" | "messages">("feed");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<any | null>(null);

  const currentUser = user || undefined as any;

  // Hàm refresh user data từ server
  const refreshUserData = async () => {
    try {
      const token = localStorage_service.getAuthToken();
      if (!token || !user?.id) return;
      
      const updatedUser = await api.me(token);
      
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('[App] Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    localStorage_service.savePosts(posts);
  }, [posts]);

  useEffect(() => {
    let mounted = true;
    api.getPosts(0, 50).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data?.data || res?.data || []);
      if (mounted) setPosts(list);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    localStorage_service.saveFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (profileUserId) {
      setSelectedUserId(profileUserId);
      setCurrentView("profile");
      api.getUser(profileUserId).then((res) => {
        setProfileUser(res || null);
      }).catch((err) => {
        setProfileUser(null);
      });
    }
  }, [profileUserId]);

  useEffect(() => {
    if (profileUserId) return;
    if (location.pathname === "/tin-nhan") setCurrentView("messages");
    else if (location.pathname === "/cai-dat") setCurrentView("settings");
    else if (location.pathname === "/quan-tri" && isAdmin) setCurrentView("admin");
    else if (location.pathname === "/") setCurrentView("feed");
  }, [location.pathname, profileUserId, isAdmin]);

  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        (Array.isArray(post.tags) && post.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    const getPostMajorId = (post: Post) => {
      const mAny: any = (post as any).major;
      if (!mAny) return '';
      if (typeof mAny === 'string') return mAny;
      if (typeof mAny === 'object') return mAny.id || mAny.name || '';
      return String(mAny);
    };

    if (filters.major !== 'all') {
      filtered = filtered.filter(post => {
        const majorId = getPostMajorId(post);
        return majorId === filters.major;
      });
    }

    const getPostSubjectId = (post: Post) => {
      const sAny: any = (post as any).subject;
      if (!sAny) return '';
      if (typeof sAny === 'string') return sAny;
      if (typeof sAny === 'object') return sAny.id || sAny.name || '';
      return String(sAny);
    };

    if (filters.subject !== 'all') {
      filtered = filtered.filter(post => {
        const subjectId = getPostSubjectId(post);
        return subjectId === filters.subject;
      });
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(post =>
        filters.tags.some((tag: string) => Array.isArray(post.tags) && post.tags.includes(tag))
      );
    }

    if (activeTab === 'following') {
      filtered = filtered.filter(post => ['1', '4'].includes(post.authorId));
    } else if (activeTab === 'saved') {
      filtered = filtered.slice(0, 3);
    } else if (activeTab === 'my-posts') {
      filtered = filtered.filter(post => post.authorId === currentUser?.id);
    }

    switch (filters.sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.likes + b.commentsCount) - (a.likes + a.commentsCount));
        break;
      case 'mostLiked':
        filtered.sort((a, b) => b.likes - a.likes);
        break;
      case 'mostCommented':
        filtered.sort((a, b) => b.commentsCount - a.commentsCount);
        break;
      case 'mostViewed':
        filtered.sort((a, b) => b.views - a.views);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return filtered;
  }, [posts, searchQuery, filters, activeTab, currentUser?.id]);

  const handleLikePost = async (postId: string) => {
    const token = localStorage_service.getAuthToken() || undefined;
    const userId = currentUser?.id;

    try {
      const [likes, liked] = await Promise.all([
        api.getPostLikesCount(postId, token),
        userId ? api.checkLikeStatus(postId, userId, token) : Promise.resolve(false),
      ]);

      setPosts(prev => prev.map(post =>
        post.id === postId ? { ...post, likes, isLiked: liked } : post
      ));
      setSelectedPost(prev =>
        prev?.id === postId ? { ...prev, likes, isLiked: liked } : prev
      );
      toast.success(liked ? "Đã thích bài viết!" : "Đã bỏ thích bài viết");
    } catch (error) {
      console.error("[LIKE SYNC] Error:", error);
    }

    await refreshUserData();
  };

  const handleCreatePost = async (newPostData: any) => {
    if (!currentUser?.id) {
      toast.error("Bạn cần đăng nhập để đăng bài viết!");
      return;
    }

    const token = localStorage_service.getAuthToken();
    try {
      if (token) {
        const payload = {
          ...newPostData,
          authorId: currentUser?.id,
          majorId: newPostData.major || newPostData.majorId,
          subjectId: newPostData.subject || newPostData.subjectId,
        };
        const created = await api.createPost(payload, token);
        const newPost = (created?.id ? created : created?.data) as Post | undefined;
        if (newPost) {
          setPosts(prev => [newPost as Post, ...prev]);
          toast.success("Bài viết đã được đăng thành công!");
          await refreshUserData();
          return;
        }
      }
    } catch (e) {
      console.error('[CREATE POST] Error:', e);
    }

    const localPost: Post = {
      id: `post-${Date.now()}`,
      ...newPostData,
      authorId: currentUser?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0, likes: 0, commentsCount: 0, isLiked: false
    };
    setPosts(prev => [localPost, ...prev]);
    toast.success("Bài viết đã được đăng thành công (offline)!");
  };

  const handleViewProfile = (userId?: string) => {
    const id = userId || currentUser?.id;
    if (!id) {
      toast.error("Vui lòng đăng nhập để xem trang cá nhân!");
      return;
    }
    setSelectedUserId(id);
    setCurrentView("profile");
    navigate(`/nguoi-dung/${id}`);
  };

  const handleUpdateProfile = (data: any) => {
    updateUser({
      name: data.name || user?.name,
      ...(data.bio ? { bio: data.bio } : {}),
    } as any);
    toast.success("Cập nhật hồ sơ thành công!");
  };

  // ✅ CHUẨN BỊ PROP CHUNG CHO HEADER TRÁNH LẶP CODE NHIỀU LẦN
  const headerProps = {
    currentUser,
    searchQuery,
    onSearch: setSearchQuery,
    onCreatePost: () => setIsCreateModalOpen(true),
    onViewProfile: () => handleViewProfile(),
    onLogout: () => {
      logout();
      toast.success("Đã đăng xuất");
      navigate("/dang-nhap");
    },
    onViewAdmin: () => { setCurrentView("admin"); navigate("/quan-tri"); },
    onViewFeed: () => { setCurrentView("feed"); navigate("/"); },
    onViewSettings: () => { setCurrentView("settings"); navigate("/cai-dat"); },
    onViewMessages: () => { setCurrentView("messages"); navigate("/tin-nhan"); }, // ✅ Thêm nút nhắn tin
    isAdmin
  };

  // ================= VIEWS MÀN HÌNH CHÍNH =================

  // 1. Admin view
  if (currentView === "admin" && isAdmin) {
    return (
      <div>
        <Header {...headerProps} />
        <AdminDashboard />
      </div>
    );
  }

  // 2. Settings View
  if (currentView === "settings") {
    return (
      <div>
        <Header {...headerProps} />
        <div className="bg-[#eef3f8]">
          <SettingsPage />
        </div>
      </div>
    );
  }
  // 3. Messages View
  if (currentView === "messages") {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-white" style={{ height: "var(--app-visual-height, 100dvh)" }}>
        <Header {...headerProps} />
        <div className="flex-1 min-h-0 overflow-hidden bg-white">
          <MessagesPage currentUser={currentUser} />
        </div>
      </div>
    );
  }

  // 4. Profile view
  if (currentView === "profile") {
    const _profileUser = profileUser || currentUser;
    if (!_profileUser || !currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p>Đang tải...</p>
        </div>
      );
    }
    return (
      <div>
        <Header {...headerProps} />
        <div className="mt-16">
          <ProfilePage
            user={_profileUser}
            posts={posts}
            currentUser={currentUser} 
            isOwnProfile={_profileUser.id === currentUser?.id}
            onUpdateProfile={handleUpdateProfile}
            onPostClick={(post) => setSelectedPost(post)}
            onPostLike={handleLikePost}
          />
        </div>
        <CreatePostModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreatePost}
        />
      </div>
    );
  }

  // Left sidebar navigation items
  const navItems = [
    { id: "feed",     label: "Trang chủ",     icon: Home,          onClick: () => { setCurrentView("feed"); navigate("/"); } },
    { id: "profile",  label: "Hồ sơ của tôi", icon: User,          onClick: () => handleViewProfile() },
    { id: "messages", label: "Tin nhắn",       icon: MessageCircle, onClick: () => { setCurrentView("messages"); navigate("/tin-nhan"); } },
    { id: "settings", label: "Cài đặt",        icon: Settings,      onClick: () => { setCurrentView("settings"); navigate("/cai-dat"); } },
  ];

  // 5. Default Main Feed View
  return (
    <div className="app-page-shell min-h-screen" style={{ background: "#F7F9FC" }}>
      <Header {...headerProps} />

      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        isOpen={isFilterOpen}
        onToggle={() => setIsFilterOpen(!isFilterOpen)}
      />

      <div className="app-feed-container container mx-auto px-4 py-6">
        <div className="app-feed-grid grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── Left Sidebar ── */}
          <div className="feed-side-panel hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Nav card */}
              <div className="card-premium p-3">
                <nav className="space-y-0.5">
                  {navItems.map(({ id, label, icon: Icon, onClick }) => (
                    <button
                      key={id}
                      onClick={onClick}
                      className={`nav-item ${currentView === id ? "active" : ""}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                  {isAdmin && (
                    <button
                      onClick={() => { setCurrentView("admin"); navigate("/quan-tri"); }}
                      className={`nav-item ${currentView === "admin" ? "active" : ""}`}
                    >
                      <Shield className="h-4 w-4 shrink-0 text-purple-500" />
                      <span className="text-purple-600">Quản trị hệ thống</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Create post CTA */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-gradient-to-r from-[#F26B38] to-[#D9541E] text-white text-sm font-semibold shadow-[0_4px_14px_rgba(242,107,56,0.35)] hover:shadow-[0_6px_20px_rgba(242,107,56,0.45)] transition-shadow"
              >
                <Plus className="h-4 w-4" />
                Tạo bài viết mới
              </button>

              {/* User profile widget */}
              <UserSidebar user={currentUser} onViewProfile={() => handleViewProfile()} />
            </div>
          </div>

          {/* ── Main Feed ── */}
          <div className="feed-main-column col-span-1 lg:col-span-6">
            {/* Tab bar */}
            <div className="feed-tabs-card card-premium mb-4 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="feed-tabs-list flex w-full bg-transparent border-b border-slate-100 h-auto p-0 rounded-none gap-0">
                  {[
                    { value: "all",       label: "Tất cả",    icon: BookOpen  },
                    { value: "following", label: "Theo dõi",  icon: UsersIcon },
                    { value: "saved",     label: "Đã lưu",    icon: TrendingUp },
                    { value: "my-posts",  label: "Của tôi",   icon: Clock     },
                  ].map(({ value, label, icon: Icon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                        className="feed-tab-trigger flex-1 h-11 gap-1.5 text-xs font-medium rounded-none border-b-2 border-transparent
                        data-[state=active]:border-[#F26B38] data-[state=active]:text-[#F26B38]
                        data-[state=active]:bg-transparent text-slate-500 hover:text-slate-700"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {searchQuery && (
              <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
                <span className="text-sm text-blue-600">
                  Tìm thấy <strong>{filteredPosts.length}</strong> kết quả cho "{searchQuery}"
                </span>
              </div>
            )}

            <div className="space-y-3">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <div key={post.id} className="post-card-hover">
                    <PostCard
                      post={post}
                      onClick={() => setSelectedPost(post)}
                      onLike={() => handleLikePost(post.id)}
                      onUserUpdate={refreshUserData}
                    />
                  </div>
                ))
              ) : (
                <div className="feed-empty-state card-premium text-center py-16">
                  <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-slate-600 font-semibold mb-2">Không tìm thấy bài viết</h3>
                  <p className="text-sm text-slate-400 mb-5">Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác</p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-gradient-orange"
                  >
                    <Plus className="h-4 w-4" /> Tạo bài viết đầu tiên
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="feed-side-panel feed-right-panel hidden xl:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              <Leaderboard />
              <SuggestedPosts />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={() => handleLikePost(selectedPost.id)}
          onUserUpdate={refreshUserData}
        />
      )}

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePost}
      />
    </div>
  );
}

export default function App() {
  return <MainApp />;
}
