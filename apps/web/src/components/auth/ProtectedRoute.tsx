import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "@localbms/shared";
import { useAuthStore } from "@/store/auth";

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
