import axios from "axios";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: configuredApiBaseUrl || (import.meta.env.PROD
    ? "https://career-link-dun.vercel.app"
    : "/api"),
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
