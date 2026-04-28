import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { User } from "./mockData";
import api from "./api";
import { localStorage_service } from "./localStorage";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  updateUser: (data: Partial<User>) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Normalize user avatar - ensures it always has a valid URL
 */
function normalizeUserAvatar(user: User | null): User | null {
  if (!user) return user;
  
  // Use avatar from user, fallback to DiceBear generated avatar
  const avatar = user.avatar && typeof user.avatar === 'string' && user.avatar.trim()
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id || user.email || 'default'}`;
  
  return {
    ...user,
    avatar: avatar
  };
}export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(() => {
		const savedUser = localStorage_service.getUser();
		return savedUser || null;
	});
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user) {
      localStorage_service.saveUser(user);
    }
  }, [user]);

  useEffect(() => {
    // if there's an auth token and no user, try to fetch /me
    const token = localStorage_service.getAuthToken();
    if (!user && token) {
      api.me(token).then((res) => {
        const profile = res || null;
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
        }
      }).catch(() => {
        // ignore
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
        ipAddress: undefined
      };
      const res = await api.login(payload);
      // Support different shapes: res may be { token, userId } or { data: { token, userId } }
      const token = res?.token || res?.data?.token || res?.data?.data?.token;
      const userId = res?.userId || res?.data?.userId || res?.data?.data?.userId;
      if (!token || !userId) {
        throw new Error("Invalid login response");
      }
      localStorage_service.saveAuthToken(token);
      // save device id if server returned session/device info
      const returnedDeviceId = res?.deviceId || res?.data?.deviceId || res?.data?.data?.deviceId;
      if (returnedDeviceId) {
        localStorage_service.saveDeviceId(returnedDeviceId);
      }
      // fetch user profile
      // [FIX]: Truyền token trực tiếp vào api.getUser để đảm bảo request được xác thực NGAY LẬP TỨC
      const userResp = await api.getUser(userId, token); 
      const userData = userResp || null;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage_service.saveUser(userData);
    } catch (e) {
      throw new Error((e as Error).message || "Login failed");
    }
  };

  const register = async (userData: any) => {
    // Mock register - In production, this would call an API
    try {
      const payload = {
        ...userData,
        deviceId: localStorage_service.getDeviceId() || undefined,
        deviceName: window.navigator.platform || undefined,
        userAgent: window.navigator.userAgent || undefined,
      };
      const resp = await api.register(payload);
      // Optionally login automatically
      if (resp?.token || resp?.data?.token) {
        const token = resp?.token || resp?.data?.token;
        localStorage_service.saveAuthToken(token);
        const userId = resp?.userId || resp?.data?.userId;
        if (userId) {
          // [FIX]: Truyền token trực tiếp vào api.getUser để đảm bảo request được xác thực NGAY LẬP TỨC
          const uResp = await api.getUser(userId, token); 
          setUser(uResp || null);
          setIsAuthenticated(true);
          localStorage_service.saveUser(uResp || null);
        }
      }
      return resp;
    } catch (error) {
      throw new Error((error as Error).message || "Đăng ký thất bại");
    }
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

  const updateUser = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage_service.saveUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        updateUser,
        login,
        register,
        logout,
        setUser,
      }}
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