import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { User } from "./mockData"; // Hoặc import từ type chung của bạn
import api from "./api";
import { localStorage_service } from "./localStorage";

// Mở rộng interface User nếu file mockData/types chưa có permissions
export interface AppUser extends User {
  permissions?: string[];
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  updateUser: (data: Partial<AppUser>) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>; // Giữ lại cho tương thích (nếu cần)
  loginWithGoogle: (idToken: string) => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    const savedUser = localStorage_service.getUser();
    return savedUser || null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(!!user);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user) {
      localStorage_service.saveUser(user);
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage_service.getAuthToken();
    if (!user && token) {
      api.me(token).then((res) => {
        const profile = res?.data || res || null;
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
        }
      }).catch(() => {
        logout(); // Token hết hạn hoặc không hợp lệ
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const deviceId = localStorage_service.getDeviceId() || undefined;
      const payload = {
        email,
        password,
        deviceId,
        deviceName: window.navigator.platform || undefined,
        userAgent: window.navigator.userAgent || undefined,
      };
      const res = await api.login(payload);
      
      const token = res?.token || res?.data?.token;
      const userId = res?.userId || res?.data?.userId;
      const permissions = res?.permissions || res?.data?.permissions || [];
      const returnedDeviceId = res?.deviceId || res?.data?.deviceId;

      if (!token || !userId) throw new Error("Invalid login response");
      
      localStorage_service.saveAuthToken(token);
      if (returnedDeviceId) localStorage_service.saveDeviceId(returnedDeviceId);

      // Fetch user profile
      const userResp = await api.getUser(userId, token); 
      const userData = { ...(userResp || {}), permissions };
      
      setUser(userData);
      setIsAuthenticated(true);
      localStorage_service.saveUser(userData);
    } catch (e) {
      throw new Error((e as Error).message || "Đăng nhập thất bại");
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      const deviceId = localStorage_service.getDeviceId() || undefined;
      const payload = {
        idToken,
        role: "student", // Default role khi Google Login (Backend sẽ xử lý)
        deviceId,
        deviceName: window.navigator.platform || undefined,
        userAgent: window.navigator.userAgent || undefined,
      };
      
      // Bạn cần tạo hàm api.googleLogin trong file api.ts
      const res = await api.googleLogin(payload); 
      
      const token = res?.token || res?.data?.token;
      const userId = res?.userId || res?.data?.userId;
      const permissions = res?.permissions || res?.data?.permissions || [];
      
      if (!token || !userId) throw new Error("Invalid Google login response");
      
      localStorage_service.saveAuthToken(token);
      
      const userResp = await api.getUser(userId, token); 
      const userData = { ...(userResp || {}), permissions };
      
      setUser(userData);
      setIsAuthenticated(true);
      localStorage_service.saveUser(userData);
    } catch (e) {
      throw new Error((e as Error).message || "Đăng nhập Google thất bại");
    }
  };

  const register = async (userData: any) => {
    // Hàm này giữ lại để tương thích nếu dùng ở nơi khác
    // Thực tế AuthPage đã tự xử lý OTP thông qua api.ts
    throw new Error("Vui lòng sử dụng luồng OTP trong AuthPage");
  };

  const logout = () => {
    const token = localStorage_service.getAuthToken();
    if (user && token) {
      api.logout(user.id, token).catch(() => {});
    }
    setUser(null);
    setIsAuthenticated(false);
    localStorage_service.removeUser();
    localStorage_service.removeAuthToken();
  };

  const updateUser = (data: Partial<AppUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage_service.saveUser(updated);
      return updated;
    });
  };

  const hasPermission = (permissionCode: string) => {
    return user?.permissions?.includes(permissionCode) || user?.role === 'admin';
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isAdmin, updateUser, login, loginWithGoogle, register, hasPermission, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}