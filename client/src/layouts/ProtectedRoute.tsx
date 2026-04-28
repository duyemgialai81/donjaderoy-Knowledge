import { useAuth } from "../lib/authContext";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && location.pathname !== "/dang-nha") {
      navigate("/dang-nha");
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (!isAuthenticated && location.pathname !== "/dang-nha") {
    return null;
  }

  return <>{children}</>;
}
