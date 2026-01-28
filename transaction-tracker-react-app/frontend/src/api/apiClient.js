import axios from "axios";
import { useAuth } from "../auth/AuthContext";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
});

export const useApi = () => {
  const { token } = useAuth();

  api.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return api;
};
