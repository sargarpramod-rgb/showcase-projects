import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Only track display name — never the token
  const [user, setUser] = useState(() => localStorage.getItem("loggedInUser") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On app load, verify session is still valid with backend
    // This handles page refresh — cookie exists but we need to confirm it's valid
    const verifySession = async () => {
      try {
        const response = await fetch("/auth/verify", {
          method: "GET",
          credentials: "include", // sends HttpOnly cookie automatically
        });

        if (response.ok) {
          // Session valid — restore user from localStorage
          const name = localStorage.getItem("loggedInUser");
          setUser(name);
        } else {
          // Cookie expired or invalid — clear everything
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
    const name = localStorage.getItem("loggedInUser");
    setUser(name);
  };

  const logout = async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include", // sends cookies so backend can blacklist them
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear local state even if backend call fails
      localStorage.removeItem("loggedInUser");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      loading           // use this to avoid flash of login page on refresh
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);