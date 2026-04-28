import { useState } from "react";
import type { User as UserType, Post, Badge as BadgeType } from "../lib/mockData";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Avatar } from "./ui/avatar";
import {
  Edit, Save, X, Mail, MapPin, Calendar, Award, TrendingUp,
  Users, BookOpen, Heart, MessageCircle, Eye, Trophy, Star, Target
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { PostCard } from "./PostCard";

interface ProfilePageProps {
  user: UserType;
  posts: Post[];
  isOwnProfile: boolean;
  onUpdateProfile?: (data: any) => void;
  onFollow?: () => void;
  onPostClick: (post: Post) => void;
  onPostLike: (postId: string) => void;
}

export function ProfilePage({
  user,
  posts,
  isOwnProfile,
  onUpdateProfile,
  onFollow,
  onPostClick,
  onPostLike
}: ProfilePageProps) {
  // Bảo vệ khởi tạo state bằng optional chaining
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");
  const [editedBio, setEditedBio] = useState("");
  const [activeTab, setActiveTab] = useState("posts");

  const handleSave = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        name: editedName,
        bio: editedBio
      });
    }
    setIsEditing(false);
  };

  // Bảo vệ việc lọc dữ liệu
  const userPosts = posts?.filter(p => p.authorId === user?.id) || [];
  const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);
  const totalViews = userPosts.reduce((sum, post) => sum + post.views, 0);
  const totalComments = userPosts.reduce((sum, post) => sum + post.commentsCount, 0);

  const userBadges = user?.badges || [];
  const nextBadge = userBadges.length < 5 ? userBadges[userBadges.length] : null;
  const progressToNextBadge = nextBadge && user?.points
    ? Math.min((user.points / nextBadge.requiredPoints) * 100, 100)
    : 100;

  const memberSince = (() => {
    try {
      if (!user?.joinedDate) return "không rõ";
      const date = new Date(user.joinedDate);
      if (isNaN(date.getTime())) return "không rõ";
      return formatDistanceToNow(date, { addSuffix: false, locale: vi });
    } catch (e) {
      return "không rõ";
    }
  })();

  // CHẶN HIỂN THỊ NẾU USER CHƯA TẢI XONG
  if (!user) {
    return <div className="py-20 text-center text-gray-500">Đang tải hồ sơ...</div>;
  }

  // Ensure avatar has a valid URL
  const avatarUrl = user?.avatar && typeof user.avatar === 'string' && user.avatar.trim()
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-r from-orange-500 to-red-500 relative">
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="container mx-auto px-4 -mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Profile Info */}
          <div className="lg:col-span-1">
            <Card className="relative">
              <CardContent className="pt-16">
                {/* Avatar */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
                    }}
                  />
                  {userBadges.length > 0 && (
                    <div className="absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg text-2xl border-2 border-orange-200">
                      {userBadges[userBadges.length - 1]?.icon}
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="text-center mt-4">
                  {isEditing ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-center mb-2"
                    />
                  ) : (
                    <h2 className="mb-1">{user.name}</h2>
                  )}
                  
                  <Badge
                    variant="secondary"
                    className={
                      user.role === "lecturer"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {user.role === "lecturer" ? "Giảng viên" : "Sinh viên"}
                  </Badge>

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{user.major}</span>
                    </div>
                    {user.class && (
                      <div className="flex items-center justify-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Lớp {user.class}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Tham gia {memberSince} trước</span>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4">
                      <Textarea
                        placeholder="Giới thiệu về bản thân..."
                        value={editedBio}
                        onChange={(e) => setEditedBio(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    isEditing ? (
                      <>
                        <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSave}>
                          <Save className="h-4 w-4 mr-2" /> Lưu
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4 mr-2" /> Hủy
                        </Button>
                      </>
                    ) : (
                      <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" /> Chỉnh sửa hồ sơ
                      </Button>
                    )
                  ) : (
                    <>
                      <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={onFollow}>
                        <Users className="h-4 w-4 mr-2" /> Theo dõi
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <MessageCircle className="h-4 w-4 mr-2" /> Nhắn tin
                      </Button>
                    </>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl text-orange-600">{user.postsCount || 0}</div>
                    <div className="text-xs text-gray-600">Bài viết</div>
                  </div>
                  <div>
                    <div className="text-2xl text-orange-600">{user.followers || 0}</div>
                    <div className="text-xs text-gray-600">Người theo dõi</div>
                  </div>
                  <div>
                    <div className="text-2xl text-orange-600">{user.following || 0}</div>
                    <div className="text-xs text-gray-600">Đang theo dõi</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gamification Card */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-orange-600" />
                  Thành tích
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Points */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Điểm tích lũy</span>
                    <span className="text-orange-600">{(user.points || 0).toLocaleString()}</span>
                  </div>
                  {nextBadge && (
                    <>
                      <Progress value={progressToNextBadge} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">
                        Còn {nextBadge.requiredPoints - (user.points || 0)} điểm để đạt "{nextBadge.name}"
                      </p>
                    </>
                  )}
                </div>

                {/* Badges */}
                <div>
                  <h4 className="text-sm mb-3">Huy hiệu ({userBadges.length})</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {userBadges.map((badge) => (
                      <div key={badge.id} className="text-center p-3 border rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors" title={badge.description}>
                        <div className="text-3xl mb-1">{badge.icon}</div>
                        <div className="text-xs">{badge.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engagement Stats */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm mb-3">Thống kê hoạt động</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>Tổng lượt thích</span>
                      </div>
                      <span className="text-gray-900">{totalLikes}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span>Tổng lượt xem</span>
                      </div>
                      <span className="text-gray-900">{totalViews.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        <span>Tổng bình luận</span>
                      </div>
                      <span className="text-gray-900">{totalComments}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Posts & Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="posts">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Bài viết ({userPosts.length})
                    </TabsTrigger>
                    <TabsTrigger value="liked">
                      <Heart className="h-4 w-4 mr-2" /> Đã thích
                    </TabsTrigger>
                    <TabsTrigger value="saved">
                      <Star className="h-4 w-4 mr-2" /> Đã lưu
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="posts" className="mt-6 space-y-4">
                    {userPosts.length > 0 ? (
                      userPosts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onClick={() => onPostClick(post)}
                          onLike={() => onPostLike(post.id)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="mb-2">Chưa có bài viết nào</h3>
                        <p className="text-gray-600">
                          {isOwnProfile
                            ? "Hãy bắt đầu chia sẻ kiến thức của bạn!"
                            : "Người dùng này chưa đăng bài viết nào"}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="liked" className="mt-6">
                    <div className="text-center py-12">
                      <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="mb-2">Chưa có bài viết đã thích</h3>
                      <p className="text-gray-600">Bài viết bạn thích sẽ hiển thị ở đây</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="saved" className="mt-6">
                    <div className="text-center py-12">
                      <Star className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="mb-2">Chưa có bài viết đã lưu</h3>
                      <p className="text-gray-600">Bài viết bạn lưu sẽ hiển thị ở đây</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}