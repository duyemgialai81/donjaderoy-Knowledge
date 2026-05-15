import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/index.tsx";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "./lib/authContext"; // Đảm bảo đường dẫn import đúng
import "./index.css";

// THAY BẰNG CLIENT ID THẬT LẤY TỪ GOOGLE CLOUD CONSOLE CỦA BẠN
const GOOGLE_CLIENT_ID = "253903642109-hu7ugdqrtfjhldj787eldarolunr7ric.apps.googleusercontent.com";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);