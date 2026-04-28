import { Search, Plus, LogOut, User, Settings, Shield, Home,MessageCircle } from "lucide-react";
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
  isAdmin = false
}: Readonly<HeaderProps>) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <button onClick={onViewFeed} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <span className="text-white">FP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-orange-600">FPT Polytechnic</span>
              <span className="text-xs text-gray-500">Knowledge Hub</span>
            </div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl mx-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm bài viết, tài liệu, người dùng..."
            className="pl-10 pr-4"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button onClick={onCreatePost} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            Đăng bài
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onViewMessages} 
            className="text-gray-500 hover:text-orange-600 hover:bg-orange-50 relative"
            title="Tin nhắn"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <img
                  // Đã thêm ? để bảo vệ an toàn cho avatar và id
                  src={currentUser?.avatar && typeof currentUser?.avatar === 'string' && currentUser?.avatar.trim()
                    ? currentUser.avatar
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || 'guest'}`}
                  alt={currentUser?.name || "Khách"}
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || 'guest'}`;
                  }}
                />
                <div className="flex flex-col items-start hidden sm:flex">
                  <span className="text-sm">{currentUser?.name || "Đang tải..."}</span>
                  <span className="text-xs text-gray-500">{currentUser?.points || 0} điểm</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onViewFeed}>
                <Home className="mr-2 h-4 w-4" />
                Trang chủ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewProfile}>
                <User className="mr-2 h-4 w-4" />
                Hồ sơ cá nhân
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={onViewAdmin}>
                  <Shield className="mr-2 h-4 w-4" />
                  Quản trị hệ thống
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onViewSettings}>
  <Settings className="mr-2 h-4 w-4" />
  Cài đặt
</DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
