import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const HomeRedirect = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // wait for /auth/verify before redirecting

  return isAuthenticated
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
};

export default HomeRedirect;