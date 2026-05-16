import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import  MessagesPage  from "./components/MessagesPage";
import { Button } from "./components/ui/button";
import type { Post } from "./lib/mockData";
import api from "./lib/api";
import { BookOpen, TrendingUp, Users as UsersIcon, Clock, Shield, MessageCircle } from "lucide-react";
import { toast } from "sonner";

function MainApp() {
  const navigate = useNavigate();
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
    await refreshUserData();
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = !post.isLiked;
        toast.success(isLiked ? "Đã thích bài viết!" : "Đã bỏ thích bài viết");
        return { ...post, isLiked, likes: isLiked ? post.likes + 1 : post.likes - 1 };
      }
      return post;
    }));
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
      <div className="h-screen flex flex-col overflow-hidden bg-white">
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

  // 5. Default Main Feed View
  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...headerProps} />

      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        isOpen={isFilterOpen}
        onToggle={() => setIsFilterOpen(!isFilterOpen)}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              <UserSidebar user={currentUser} onViewProfile={() => handleViewProfile()} />
              {isAdmin && (
                <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700" onClick={() => setCurrentView("admin")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Quản trị hệ thống
                </Button>
              )}
            </div>
          </div>

          {/* Main Feed */}
          <div className="col-span-1 lg:col-span-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-4 bg-white">
                <TabsTrigger value="all" className="gap-2 px-2 text-xs sm:text-sm"><BookOpen className="h-4 w-4 hidden xs:block" /> Tất cả</TabsTrigger>
                <TabsTrigger value="following" className="gap-2 px-2 text-xs sm:text-sm"><UsersIcon className="h-4 w-4 hidden xs:block" /> Theo dõi</TabsTrigger>
                <TabsTrigger value="saved" className="gap-2 px-2 text-xs sm:text-sm"><TrendingUp className="h-4 w-4 hidden xs:block" /> Đã lưu</TabsTrigger>
                <TabsTrigger value="my-posts" className="gap-2 px-2 text-xs sm:text-sm"><Clock className="h-4 w-4 hidden xs:block" /> Của tôi</TabsTrigger>
              </TabsList>
            </Tabs>

            {searchQuery && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm">Tìm thấy <span className="text-blue-600">{filteredPosts.length}</span> kết quả cho "{searchQuery}"</p>
              </div>
            )}

            <div className="space-y-4">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => setSelectedPost(post)}
                    onLike={() => handleLikePost(post.id)}
                    onUserUpdate={refreshUserData}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="mb-2">Không tìm thấy bài viết</h3>
                  <p className="text-gray-600 mb-4">Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Hidden on small tablets and mobile */}
          <div className="hidden xl:block lg:col-span-3">
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
