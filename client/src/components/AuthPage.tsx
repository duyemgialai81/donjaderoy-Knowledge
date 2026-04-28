import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Mail, Lock, User, GraduationCap, Building } from "lucide-react";
import { useEffect } from "react";
import api from "../lib/api";

interface AuthPageProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (userData: any) => void;
}

export function AuthPage({ onLogin, onRegister }: AuthPageProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerMajor, setRegisterMajor] = useState("");
  const [registerClass, setRegisterClass] = useState("");
  const [registerRole, setRegisterRole] = useState<"student" | "lecturer">("student");
  const [majors, setMajors] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    api.getMajors().then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (mounted && Array.isArray(list)) {
        setMajors(list.map((m: any) => ({ id: m.id, name: m.name, code: m.code })));
      }
    }).catch(() => {
      setMajors([]);
    });
    return () => { mounted = false; };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }
    onLogin(loginEmail, loginPassword);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerName || !registerEmail || !registerPassword || !registerMajor) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }
    
    if (registerPassword !== registerConfirmPassword) {
      alert("Mật khẩu xác nhận không khớp");
      return;
    }
    
    if (registerPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    onRegister({
      name: registerName,
      email: registerEmail,
      password: registerPassword,
      major: registerMajor,
      class: registerClass,
      role: registerRole
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden md:block">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-xl">
                <span className="text-white text-4xl">FP</span>
              </div>
            </div>
            <div>
              <h1 className="text-4xl text-orange-600 mb-2">FPT Polytechnic</h1>
              <p className="text-xl text-gray-600">Knowledge Hub</p>
            </div>
            <div className="space-y-3 text-left bg-white rounded-lg p-6 shadow-lg">
              <h3 className="text-lg text-gray-800 mb-3">Tham gia ngay để:</h3>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                  📚
                </div>
                <div>
                  <p className="text-sm">Chia sẻ và học hỏi kiến thức</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                  🏆
                </div>
                <div>
                  <p className="text-sm">Tích lũy điểm và huy hiệu</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                  👥
                </div>
                <div>
                  <p className="text-sm">Kết nối với cộng đồng sinh viên</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                  📈
                </div>
                <div>
                  <p className="text-sm">Theo dõi tiến độ học tập</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Chào mừng trở lại!</CardTitle>
            <CardDescription>
              Đăng nhập hoặc tạo tài khoản mới để bắt đầu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                <TabsTrigger value="register">Đăng ký</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="example@fe.edu.vn"
                        className="pl-10"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span>Ghi nhớ đăng nhập</span>
                    </label>
                    <a href="#" className="text-orange-600 hover:underline">
                      Quên mật khẩu?
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    Đăng nhập
                  </Button>
                </form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Họ và tên</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-name"
                        placeholder="Nguyễn Văn A"
                        className="pl-10"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="example@fe.edu.vn hoặc @student.fpt.edu.vn"
                        className="pl-10"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-role">Vai trò</Label>
                      <Select 
                        value={registerRole} 
                        onValueChange={(value: any) => setRegisterRole(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Sinh viên</SelectItem>
                          <SelectItem value="lecturer">Giảng viên</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-major">Chuyên ngành</Label>
                      <Select value={registerMajor} onValueChange={setRegisterMajor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ngành" />
                        </SelectTrigger>
                        <SelectContent>
                          {majors.map((m: any) => (
                            <SelectItem key={m.id} value={m.name}>
                              {m.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {registerRole === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="register-class">Lớp (tùy chọn)</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-class"
                          placeholder="VD: WD18301"
                          className="pl-10"
                          value={registerClass}
                          onChange={(e) => setRegisterClass(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Ít nhất 6 ký tự"
                        className="pl-10"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        className="pl-10"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    Đăng ký tài khoản
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Bằng việc đăng ký, bạn đồng ý với{" "}
                    <a href="#" className="text-orange-600 hover:underline">
                      Điều khoản sử dụng
                    </a>{" "}
                    và{" "}
                    <a href="#" className="text-orange-600 hover:underline">
                      Chính sách bảo mật
                    </a>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
