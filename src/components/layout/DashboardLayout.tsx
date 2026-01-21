import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { DashboardSidebar } from "./DashboardSidebar";
import { Loader2 } from "lucide-react";

export function DashboardLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container py-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
