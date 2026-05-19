import { Search, Plus, LogOut, User, Settings, Shield, Home, MessageCircle, Bell, Trophy } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { NotificationCenter } from "./NotificationCenter";

interface HeaderProps {
  currentUser: any;
  onSearch: (query: string) => void;
  onCreatePost: () => void;
  searchQuery: string;
  onViewProfile?: () => void;
  onLogout?: () => void;
  onViewAdmin?: () => void;
  onViewFeed?: () => void;
  isAdmin?: boolean;
  onViewSettings?: () => void;
  onViewMessages?: () => void;
}

export function Header({
  currentUser,
  onSearch,
  onCreatePost,
  searchQuery,
  onViewProfile,
  onLogout,
  onViewAdmin,
  onViewFeed,
  onViewSettings,
  onViewMessages,
  isAdmin = false,
}: Readonly<HeaderProps>) {
  return (
    <header className="header-glass app-header sticky top-0 z-50 w-full">
      <div className="app-header-inner container mx-auto flex h-16 items-center justify-between px-4 gap-3">

        {/* ── Logo ── */}
        <button
          onClick={onViewFeed}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity bg-transparent border-0 p-0 shrink-0"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F26B38] to-[#D9541E] shadow-[0_3px_10px_rgba(242,107,56,0.4)]">
            <span className="text-white font-extrabold text-sm tracking-tight">FP</span>
          </div>
          <div className="flex flex-col text-left hidden sm:flex">
            <span className="text-[#D9541E] font-bold text-sm leading-tight tracking-tight">
              FPT Polytechnic
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">Knowledge Hub</span>
          </div>
        </button>

        {/* ── Search Bar ── */}
        <div className="relative flex-1 max-w-md mx-2 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm bài viết, tài liệu, môn học..."
            className="pl-9 pr-4 h-9 bg-slate-50 border-slate-200 rounded-xl text-sm
              focus:bg-white focus:border-[#F26B38] focus:ring-2 focus:ring-[#F26B38]/20
              transition-all placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* ── Actions ── */}
        <div className="app-header-actions flex items-center gap-1.5 sm:gap-2">

          {/* Mobile search icon */}
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100">
            <Search className="h-4 w-4" />
          </Button>

          {/* Create post button – gradient */}
          <Button
            onClick={onCreatePost}
            className="btn-gradient-orange h-9 px-3 sm:px-4 rounded-xl font-semibold text-sm"
          >
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Đăng bài</span>
          </Button>

          {/* Messages */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onViewMessages}
            className="h-9 w-9 rounded-xl text-slate-500 hover:text-[#F26B38] hover:bg-[#FEF0E8] relative"
            title="Tin nhắn"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* Avatar / User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-1.5 sm:px-2 rounded-xl hover:bg-slate-100 h-9"
              >
                <img
                  src={
                    currentUser?.avatar &&
                    typeof currentUser?.avatar === "string" &&
                    currentUser?.avatar.trim()
                      ? currentUser.avatar
                      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || "guest"}`
                  }
                  alt={currentUser?.name || "Khách"}
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || "guest"}`;
                  }}
                />
                <div className="flex flex-col items-start hidden md:flex">
                  <span className="text-xs font-semibold line-clamp-1 max-w-[90px] text-slate-700">
                    {currentUser?.name || "Đang tải..."}
                  </span>
                  <span className="text-[10px] text-[#F26B38] font-medium">
                    {(currentUser?.points || 0).toLocaleString()} điểm
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-slate-100 p-1">
              {/* User info header */}
              <div className="px-3 py-2.5 mb-1 rounded-lg bg-gradient-to-r from-[#FEF0E8] to-[#FFF7F3]">
                <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                  {currentUser?.name || "Người dùng"}
                </p>
                <p className="text-xs text-[#F26B38] font-medium mt-0.5 flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  {(currentUser?.points || 0).toLocaleString()} điểm tích lũy
                </p>
              </div>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={onViewFeed}
                className="rounded-lg cursor-pointer text-sm gap-2 py-2"
              >
                <Home className="h-4 w-4 text-slate-400" />
                Trang chủ
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={onViewProfile}
                className="rounded-lg cursor-pointer text-sm gap-2 py-2"
              >
                <User className="h-4 w-4 text-slate-400" />
                Hồ sơ cá nhân
              </DropdownMenuItem>

              {isAdmin && (
                <DropdownMenuItem
                  onClick={onViewAdmin}
                  className="rounded-lg cursor-pointer text-sm gap-2 py-2"
                >
                  <Shield className="h-4 w-4 text-purple-500" />
                  Quản trị hệ thống
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={onViewSettings}
                className="rounded-lg cursor-pointer text-sm gap-2 py-2"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Cài đặt
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                className="rounded-lg cursor-pointer text-sm gap-2 py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
