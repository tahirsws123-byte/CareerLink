import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function ProtectedAuth() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  return <Outlet />;
}