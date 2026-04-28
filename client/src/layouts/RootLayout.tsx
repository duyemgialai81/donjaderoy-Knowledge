import { Outlet } from "react-router-dom";
import { AuthProvider } from "../lib/authContext";
import { Toaster } from "../components/ui/sonner";
import { ErrorBoundary } from "../components/ErrorBoundary";

export function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ErrorBoundary>
  );
}
