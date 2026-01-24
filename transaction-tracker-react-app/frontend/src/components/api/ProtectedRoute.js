import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
  const { token: contextToken } = useAuth();

  // Prefer token from context, but fall back to localStorage
  const token = contextToken || localStorage.getItem("jwt");

  console.log('token')
  console.log(token)

  const isTokenValid = () => {
    if (!token) return false;

    try {
      // Decode JWT payload
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp; // expiry in seconds (standard JWT claim)

      if (!exp) {
        // If no exp claim, enforce 1 hour max from issue time (iat)
        const iat = payload.iat;
        if (!iat) return false;
        const issuedAt = iat * 1000;
        return Date.now() - issuedAt < 60 * 60 * 1000; // 1 hour
      }

      // Check against exp claim
      return Date.now() < exp * 1000;
    } catch (err) {
      console.error("Invalid token format", err);
      return false;
    }
  };

  return isTokenValid() ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;