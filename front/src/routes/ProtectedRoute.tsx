import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/authContext";

export function ProtectedRoute() {
  const { user, isLoading, sessionError } = useAuth();
  if (isLoading)
    return (
      <p className="route-message" role="status">
        Verificando sua sessão...
      </p>
    );
  if (sessionError && !user) return <Navigate to="/entrar" replace />;
  if (!user) return <Navigate to="/entrar" replace />;
  return <Outlet />;
}
