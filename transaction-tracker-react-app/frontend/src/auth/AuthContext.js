import { createContext, useContext, useState, useEffect } from "react";
import { backendFetch } from "../api/backendFetch";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => localStorage.getItem("loggedInUser") || null);
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState(null);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await backendFetch("/auth/verify", { cache: "no-store" });
        if (response.ok) {
          setUser(localStorage.getItem("loggedInUser"));
        } else {
          localStorage.removeItem("loggedInUser");
          setUser(null);
        }
      } catch (error) {
        localStorage.removeItem("loggedInUser");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = () => {
    setLogoutError(null);
    setUser(localStorage.getItem("loggedInUser"));
  };

  const logout = async () => {
    setLogoutError(null);
    try {
      const response = await backendFetch("/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Server logout failed");
      return true;
    } catch (error) {
      setLogoutError("Server logout could not be confirmed. Your session may still be active.");
      return false;
    } finally {
      localStorage.removeItem("loggedInUser");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, logoutError, isAuthenticated: !!user, loading }}>
      {logoutError && <p role="alert">{logoutError}</p>}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
