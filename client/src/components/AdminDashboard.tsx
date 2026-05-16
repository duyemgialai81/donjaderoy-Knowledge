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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_28%,#fffaf5_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700 shadow-sm">
                <Shield className="h-3.5 w-3.5" /> Quản trị viên
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Trung tâm điều khiển</h1>
              <p className="text-slate-500 font-medium text-sm sm:text-base max-w-2xl">
                Giám sát người dùng, xử lý báo cáo và theo dõi chỉ số tương tác hệ thống.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-11 rounded-xl border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 shadow-sm flex-1 sm:flex-none transition-all">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline font-semibold">Xuất báo cáo</span>
                <span className="xs:hidden font-semibold">Xuất</span>
              </Button>
              <Button className="h-11 rounded-xl bg-gradient-to-r from-[#F26B38] to-[#F37B4D] hover:from-[#e35d2a] hover:to-[#e36a3e] text-white shadow-sm flex-1 sm:flex-none transition-all">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline font-semibold">Phân tích chi tiết</span>
                <span className="xs:hidden font-semibold">Phân tích</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-premium group hover:-translate-y-1 transition-all duration-300 border-none shadow-sm hover:shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Người dùng</p>
                  <h3 className="text-3xl font-extrabold text-slate-900">{totalUsers}</h3>
                  <p className="text-xs font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +12% tháng này
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100/50 text-blue-600 group-hover:scale-110 group-hover:bg-blue-100 transition-all">
                  <Users className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium group hover:-translate-y-1 transition-all duration-300 border-none shadow-sm hover:shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Bài viết</p>
                  <h3 className="text-3xl font-extrabold text-slate-900">{totalPosts}</h3>
                  <p className="text-xs font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +8% tuần này
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF0E8] text-[#F26B38] group-hover:scale-110 group-hover:bg-orange-100 transition-all">
                  <FileText className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium group hover:-translate-y-1 transition-all duration-300 border-none shadow-sm hover:shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Tổng lượt xem</p>
                  <h3 className="text-3xl font-extrabold text-slate-900">{totalViews.toLocaleString()}</h3>
                  <p className="text-xs font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +24% tháng này
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100/50 text-purple-600 group-hover:scale-110 group-hover:bg-purple-100 transition-all">
                  <Eye className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium group hover:-translate-y-1 transition-all duration-300 border-none shadow-sm hover:shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Báo cáo chờ</p>
                  <h3 className="text-3xl font-extrabold text-slate-900">{pendingReports}</h3>
                  <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Cần xử lý
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100/50 text-rose-600 group-hover:scale-110 group-hover:bg-rose-100 transition-all">
                  <AlertTriangle className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Main Content ── */}
        <Card className="card-premium border-none shadow-sm overflow-hidden">
          <CardContent className="p-0 sm:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-slate-100 px-4 sm:px-0">
                <TabsList className="flex w-full sm:w-auto overflow-x-auto bg-transparent gap-2 pb-0 mb-[-1px] no-scrollbar">
                  <TabsTrigger value="overview" className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl rounded-b-none data-[state=active]:bg-white data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-slate-100 data-[state=active]:shadow-none data-[state=active]:text-[#D9541E] text-slate-500 font-semibold transition-all whitespace-nowrap">
                    <TrendingUp className="h-4 w-4" /> Tổng quan
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl rounded-b-none data-[state=active]:bg-white data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-slate-100 data-[state=active]:shadow-none data-[state=active]:text-[#D9541E] text-slate-500 font-semibold transition-all whitespace-nowrap">
                    <Users className="h-4 w-4" /> Người dùng
                  </TabsTrigger>
                  <TabsTrigger value="posts" className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl rounded-b-none data-[state=active]:bg-white data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-slate-100 data-[state=active]:shadow-none data-[state=active]:text-[#D9541E] text-slate-500 font-semibold transition-all whitespace-nowrap">
                    <FileText className="h-4 w-4" /> Bài viết
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl rounded-b-none data-[state=active]:bg-white data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-slate-100 data-[state=active]:shadow-none data-[state=active]:text-rose-600 text-slate-500 font-semibold transition-all whitespace-nowrap">
                    <AlertTriangle className="h-4 w-4" /> Báo cáo
                    {pendingReports > 0 && <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[10px] text-rose-600">{pendingReports}</span>}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── Overview Tab ── */}
              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-0">
                  {/* Engagement Stats */}
                  <Card className="rounded-[24px] border-slate-100 shadow-sm bg-slate-50/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-800">Thống kê tương tác</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                              <ThumbsUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Tổng lượt thích</span>
                          </div>
                          <span className="font-bold text-slate-900">{totalLikes.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                              <MessageCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Tổng bình luận</span>
                          </div>
                          <span className="font-bold text-slate-900">{totalComments.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                              <Eye className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Tổng lượt xem</span>
                          </div>
                          <span className="font-bold text-slate-900">{totalViews.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Contributors */}
                  <Card className="rounded-[24px] border-slate-100 shadow-sm bg-slate-50/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-800">Top người đóng góp</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {users
                          .sort((a, b) => b.points - a.points)
                          .slice(0, 5)
                          .map((user, index) => (
                            <div key={user.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                {index + 1}
                              </div>
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                                <p className="text-xs font-medium text-[#F26B38]">{user.points} điểm</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`border-none ${user.role === "lecturer" ? "bg-purple-100 text-purple-700" : "bg-blue-50 text-blue-600"}`}
                              >
                                {user.role === "lecturer" ? "Giảng viên" : "Sinh viên"}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="lg:col-span-2 rounded-[24px] border-slate-100 shadow-sm bg-slate-50/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-800">Hoạt động gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {posts.slice(0, 5).map((post: any) => {
                          const author = users.find((u) => u.id === post.authorId);
                          return (
                            <div key={post.id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 transition-colors hover:border-orange-200">
                              <img
                                src={author?.avatar}
                                alt={author?.name}
                                className="h-10 w-10 rounded-full object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-600 mb-0.5">
                                  <span className="font-bold text-slate-900">{author?.name}</span> đã đăng bài mới
                                </p>
                                <p className="text-sm font-semibold text-slate-800 truncate mb-1">{post.title}</p>
                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                                  {formatDistanceToNow(new Date(post.createdAt), {
                                    addSuffix: true,
                                    locale: vi,
                                  })}
                                </p>
                              </div>
                              <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none shrink-0">{post.major}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Users Tab ── */}
              <TabsContent value="users" className="mt-6">
                <div className="mb-4 flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Tìm kiếm người dùng..."
                      className="pl-10 h-11 bg-slate-50 border-transparent focus:border-orange-200 focus:bg-white rounded-xl transition-all"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl bg-slate-50 border-transparent focus:border-orange-200">
                      <SelectValue placeholder="Lọc theo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Tất cả vai trò</SelectItem>
                      <SelectItem value="student">Sinh viên</SelectItem>
                      <SelectItem value="lecturer">Giảng viên</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-[24px] border border-slate-100 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                      <TableHeader className="bg-slate-50 border-b border-slate-100">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold text-slate-600 h-12">Người dùng</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12">Email</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12">Vai trò</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12">Ngành</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12 text-center">Điểm</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12 text-center">Bài viết</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12 text-right">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="h-10 w-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-orange-100 transition-all"
                                />
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                                  {user.class && (
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{user.class}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`border-none ${user.role === "lecturer" ? "bg-purple-100 text-purple-700" : "bg-blue-50 text-blue-600"}`}
                              >
                                {user.role === "lecturer" ? "Giảng viên" : "Sinh viên"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 font-medium">{user.major}</TableCell>
                            <TableCell className="text-sm text-center font-bold text-[#F26B38]">{user.points.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-center font-medium text-slate-700">{user.postsCount}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-600">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600 text-slate-400">
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* ── Posts Tab ── */}
              <TabsContent value="posts" className="mt-6">
                <div className="mb-4 flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Tìm kiếm bài viết..."
                      className="pl-10 h-11 bg-slate-50 border-transparent focus:border-orange-200 focus:bg-white rounded-xl transition-all"
                      value={postSearchQuery}
                      onChange={(e) => setPostSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl bg-slate-50 border-transparent focus:border-orange-200">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="published">Đã đăng</SelectItem>
                      <SelectItem value="pending">Chờ duyệt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-[24px] border border-slate-100 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                      <TableHeader className="bg-slate-50 border-b border-slate-100">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold text-slate-600 h-12 w-[35%]">Tiêu đề</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12">Tác giả</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12">Ngành</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12 text-center">Lượt xem</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12 text-center">Thích</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12">Trạng thái</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-12 text-right">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPosts.map((post) => {
                          const author = users.find((u) => u.id === post.authorId);
                          return (
                            <TableRow key={post.id} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
                              <TableCell className="py-4">
                                <div className="pr-4">
                                  <p className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-[#F26B38] transition-colors">{post.title}</p>
                                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-1">
                                    {formatDistanceToNow(new Date(post.createdAt), {
                                      addSuffix: true,
                                      locale: vi,
                                    })}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {author && <img src={author.avatar} alt={author.name} className="w-6 h-6 rounded-full object-cover" />}
                                  <span className="text-sm font-medium text-slate-700">{author?.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600 font-medium">{post.major}</TableCell>
                              <TableCell className="text-sm text-center font-semibold text-slate-700">{post.views.toLocaleString()}</TableCell>
                              <TableCell className="text-sm text-center font-semibold text-slate-700">{post.likes}</TableCell>
                              <TableCell>
                                <Badge
                                  className={`border-none ${post.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`}
                                  variant="outline"
                                >
                                  {post.status === "published" ? "Đã đăng" : "Nháp"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-600">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600 text-slate-400">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* ── Reports Tab ── */}
              <TabsContent value="reports" className="mt-6">
                <div className="space-y-4">
                  {reports.map((report) => {
                    const post = posts.find((p: any) => p.id === report.postId);
                    const reporter = users.find((u) => u.id === report.reportedBy);
                    return (
                      <Card key={report.id} className="rounded-[24px] border-slate-100 shadow-sm bg-white overflow-hidden transition-shadow hover:shadow-md">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <Badge
                                  className={`border-none ${
                                    report.status === "pending"
                                      ? "bg-rose-100 text-rose-700"
                                      : report.status === "resolved"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                  variant="outline"
                                >
                                  {report.status === "pending"
                                    ? "Chờ xử lý"
                                    : report.status === "resolved"
                                    ? "Đã giải quyết"
                                    : "Đã xem xét"}
                                </Badge>
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                                  {formatDistanceToNow(new Date(report.createdAt), {
                                    addSuffix: true,
                                    locale: vi,
                                  })}
                                </span>
                              </div>
                              <h4 className="mb-2 text-lg font-bold text-slate-900">
                                Báo cáo: {report.reason}
                              </h4>
                              <p className="text-sm text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                {report.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-medium">Người báo cáo:</span>
                                  {reporter && <img src={reporter.avatar} alt={reporter.name} className="w-5 h-5 rounded-full" />}
                                  <span className="font-semibold text-slate-800">{reporter?.name}</span>
                                </div>
                                <div className="flex items-center gap-2 max-w-full">
                                  <span className="text-slate-500 font-medium">Bài viết:</span>
                                  <span className="font-semibold text-slate-800 truncate max-w-xs block hover:text-[#F26B38] cursor-pointer transition-colors">
                                    {post?.title}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {report.status === "pending" && (
                              <div className="flex flex-row md:flex-col gap-2 shrink-0 md:ml-4 w-full md:w-auto">
                                <Button
                                  variant="outline"
                                  className="rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 flex-1 md:flex-none"
                                  onClick={() => setSelectedReport(report)}
                                >
                                  Chi tiết
                                </Button>
                                <div className="flex gap-2 flex-1 md:flex-none">
                                  <Button
                                    variant="outline"
                                    className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 flex-1"
                                    onClick={() => handleReportAction(report.id, "approve")}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex-1"
                                    onClick={() => handleReportAction(report.id, "reject")}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {reports.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-[24px] border border-dashed border-slate-200">
                      <Shield className="h-16 w-16 mx-auto mb-4 text-emerald-200" />
                      <h3 className="mb-2 text-xl font-bold text-slate-800">Không có báo cáo nào</h3>
                      <p className="text-slate-500 font-medium">
                        Tất cả báo cáo đã được xử lý. Tuyệt vời!
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