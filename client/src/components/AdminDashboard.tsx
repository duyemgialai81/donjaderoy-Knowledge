import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  Eye,
  ThumbsUp,
  MessageCircle,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  BarChart3
} from "lucide-react";
import type { Post, User } from "../lib/mockData";
import api from "../lib/api";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { localStorage_service } from "../lib/localStorage";

interface Report {
  id: string;
  postId: string;
  reportedBy: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: string;
}

const mockReports: Report[] = [
  {
    id: "r1",
    postId: "2",
    reportedBy: "3",
    reason: "Spam",
    description: "Bài viết này chứa nội dung spam và quảng cáo",
    status: "pending",
    createdAt: "2025-10-24T10:00:00",
  },
  {
    id: "r2",
    postId: "5",
    reportedBy: "4",
    reason: "Inappropriate",
    description: "Nội dung không phù hợp với cộng đồng",
    status: "pending",
    createdAt: "2025-10-23T14:30:00",
  },
];

export function AdminDashboard() {
  const token = localStorage_service.getAuthToken();
  const [activeTab, setActiveTab] = useState("overview");
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  // Load data from API
  useEffect(() => {
    let mounted = true;
    api.getUsers(0, 100).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (mounted && Array.isArray(list)) setUsers(list);
    }).catch(() => setUsers([]));

    api.getPosts(0, 100).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (mounted && Array.isArray(list)) setPosts(list);
    }).catch(() => setPosts([]));

    return () => { mounted = false; };
  }, [token]);

  // Statistics
  const totalUsers = users.length;
  const totalPosts = posts.length;
  const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
  const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  const handleReportAction = (reportId: string, action: "approve" | "reject") => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status: action === "approve" ? "resolved" : "reviewed" }
          : r
      )
    );
    setSelectedReport(null);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(postSearchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(postSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl mb-2">Quản trị hệ thống</h1>
              <p className="text-gray-600 text-sm sm:text-base">Tổng quan và quản lý nền tảng FPT Polytechnic</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Xuất báo cáo</span>
                <span className="xs:hidden">Xuất</span>
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700 flex-1 sm:flex-none">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Phân tích chi tiết</span>
                <span className="xs:hidden">Phân tích</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Người dùng</p>
                  <h3 className="text-2xl">{totalUsers}</h3>
                  <p className="text-xs text-green-600 mt-1">+12% tháng này</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bài viết</p>
                  <h3 className="text-2xl">{totalPosts}</h3>
                  <p className="text-xs text-green-600 mt-1">+8% tuần này</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tổng lượt xem</p>
                  <h3 className="text-2xl">{totalViews.toLocaleString()}</h3>
                  <p className="text-xs text-green-600 mt-1">+24% tháng này</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Báo cáo chờ</p>
                  <h3 className="text-2xl">{pendingReports}</h3>
                  <p className="text-xs text-red-600 mt-1">Cần xử lý</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Tổng quan
                </TabsTrigger>
                <TabsTrigger value="users">
                  <Users className="h-4 w-4 mr-2" />
                  Người dùng
                </TabsTrigger>
                <TabsTrigger value="posts">
                  <FileText className="h-4 w-4 mr-2" />
                  Bài viết
                </TabsTrigger>
                <TabsTrigger value="reports">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Báo cáo ({pendingReports})
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Engagement Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Thống kê tương tác</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">Tổng lượt thích</span>
                          </div>
                          <span className="text-gray-900">{totalLikes.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Tổng bình luận</span>
                          </div>
                          <span className="text-gray-900">{totalComments.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-purple-600" />
                            <span className="text-sm">Tổng lượt xem</span>
                          </div>
                          <span className="text-gray-900">{totalViews.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Contributors */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top người đóng góp</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {users
                          .sort((a, b) => b.points - a.points)
                          .slice(0, 5)
                          .map((user, index) => (
                            <div key={user.id} className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm">
                                {index + 1}
                              </div>
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <p className="text-sm">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.points} điểm</p>
                              </div>
                              <Badge
                                variant={user.role === "lecturer" ? "secondary" : "outline"}
                              >
                                {user.role === "lecturer" ? "GV" : "SV"}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Hoạt động gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {posts.slice(0, 5).map((post: any) => {
                          const author = users.find((u) => u.id === post.authorId);
                          return (
                            <div key={post.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                              <img
                                src={author?.avatar}
                                alt={author?.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <p className="text-sm">
                                  <span className="text-gray-900">{author?.name}</span> đã đăng bài mới
                                </p>
                                <p className="text-sm text-gray-600 truncate">{post.title}</p>
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(post.createdAt), {
                                    addSuffix: true,
                                    locale: vi,
                                  })}
                                </p>
                              </div>
                              <Badge variant="outline">{post.major}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="mt-6">
                <div className="mb-4 flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm người dùng..."
                      className="pl-10"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Lọc theo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="student">Sinh viên</SelectItem>
                      <SelectItem value="lecturer">Giảng viên</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Ngành</TableHead>
                      <TableHead>Điểm</TableHead>
                      <TableHead>Bài viết</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-sm">{user.name}</p>
                              {user.class && (
                                <p className="text-xs text-gray-500">{user.class}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "lecturer" ? "secondary" : "outline"}
                          >
                            {user.role === "lecturer" ? "Giảng viên" : "Sinh viên"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{user.major}</TableCell>
                        <TableCell className="text-sm">{user.points.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{user.postsCount}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Ban className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Posts Tab */}
              <TabsContent value="posts" className="mt-6">
                <div className="mb-4 flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm bài viết..."
                      className="pl-10"
                      value={postSearchQuery}
                      onChange={(e) => setPostSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="published">Đã đăng</SelectItem>
                      <SelectItem value="pending">Chờ duyệt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tiêu đề</TableHead>
                      <TableHead>Tác giả</TableHead>
                      <TableHead>Ngành</TableHead>
                      <TableHead>Lượt xem</TableHead>
                      <TableHead>Thích</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosts.map((post) => {
                      const author = users.find((u) => u.id === post.authorId);
                      return (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm line-clamp-1">{post.title}</p>
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(post.createdAt), {
                                  addSuffix: true,
                                  locale: vi,
                                })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{author?.name}</TableCell>
                          <TableCell className="text-sm">{post.major}</TableCell>
                          <TableCell className="text-sm">{post.views.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{post.likes}</TableCell>
                          <TableCell>
                            <Badge
                              variant={post.status === "published" ? "default" : "secondary"}
                            >
                              {post.status === "published" ? "Đã đăng" : "Nháp"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <XCircle className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="mt-6">
                <div className="space-y-4">
                  {reports.map((report) => {
                    const post = posts.find((p: any) => p.id === report.postId);
                    const reporter = users.find((u) => u.id === report.reportedBy);
                    return (
                      <Card key={report.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant={
                                    report.status === "pending"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {report.status === "pending"
                                    ? "Chờ xử lý"
                                    : report.status === "resolved"
                                    ? "Đã giải quyết"
                                    : "Đã xem xét"}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(report.createdAt), {
                                    addSuffix: true,
                                    locale: vi,
                                  })}
                                </span>
                              </div>
                              <h4 className="mb-2">
                                Báo cáo: {report.reason}
                              </h4>
                              <p className="text-sm text-gray-600 mb-3">
                                {report.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm">
                                <span>
                                  Người báo cáo:{" "}
                                  <span className="text-gray-900">{reporter?.name}</span>
                                </span>
                                <span>
                                  Bài viết:{" "}
                                  <span className="text-gray-900 truncate max-w-xs inline-block">
                                    {post?.title}
                                  </span>
                                </span>
                              </div>
                            </div>
                            {report.status === "pending" && (
                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedReport(report)}
                                >
                                  Chi tiết
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleReportAction(report.id, "approve")}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleReportAction(report.id, "reject")}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {reports.length === 0 && (
                    <div className="text-center py-12">
                      <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="mb-2">Không có báo cáo nào</h3>
                      <p className="text-gray-600">
                        Tất cả báo cáo đã được xử lý
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Report Detail Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chi tiết báo cáo</DialogTitle>
              <DialogDescription>
                Xem xét và xử lý báo cáo vi phạm
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Lý do</p>
                <p className="text-gray-900">{selectedReport.reason}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Mô tả</p>
                <p className="text-gray-900">{selectedReport.description}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                Đóng
              </Button>
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() => handleReportAction(selectedReport.id, "reject")}
              >
                Từ chối
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => handleReportAction(selectedReport.id, "approve")}
              >
                Xác nhận vi phạm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
