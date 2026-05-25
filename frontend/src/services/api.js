import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const API = axios.create({
  baseURL: API_BASE_URL
});

// Helper to get uploads URL dynamically based on current API base URL
export const getUploadsUrl = (fileName) => {
  if (!fileName) return "";
  const base = API_BASE_URL.endsWith("/api") 
    ? API_BASE_URL.slice(0, -4) 
    : API_BASE_URL;
  return `${base}/uploads/${fileName}`;
};

// Request interceptor to automatically attach authorization token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;