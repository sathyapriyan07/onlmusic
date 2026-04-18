import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthProvider";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

