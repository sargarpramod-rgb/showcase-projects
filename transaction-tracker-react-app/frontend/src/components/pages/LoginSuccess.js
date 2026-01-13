import React, { useEffect,useState  } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const LoginSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const loggedInUser = params.get("name")

    if (token) {
      localStorage.setItem("jwt", token);
      localStorage.setItem("loggedInUser",loggedInUser)
      login(token);
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, []);

  return <p>Signing you in...</p>;
};

export default LoginSuccess;