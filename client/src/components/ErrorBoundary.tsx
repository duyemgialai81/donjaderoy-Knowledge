import React, { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <CardTitle className="text-red-600">Lỗi ứng dụng</CardTitle>
              </div>
              <CardDescription>Đã xảy ra lỗi không mong muốn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-mono text-red-700 break-words">
                  {this.state.error?.message || "Lỗi không xác định"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={this.resetError}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Thử lại
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  className="flex-1"
                >
                  Về trang chủ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
