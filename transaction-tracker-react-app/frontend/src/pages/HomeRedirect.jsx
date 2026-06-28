import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const HomeRedirect = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated || localStorage.getItem("jwt")
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
};

export default HomeRedirect;