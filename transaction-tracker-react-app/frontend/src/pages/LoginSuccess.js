import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const LoginSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const name = params.get("name");

    if (name) {
      // No token handling needed — HttpOnly cookies are sent automatically
      // Just store the display name and mark user as logged in
      localStorage.setItem("loggedInUser", name);
      login(); // no token argument needed anymore
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, []);

  return <p>Signing you in...</p>;
};

export default LoginSuccess;