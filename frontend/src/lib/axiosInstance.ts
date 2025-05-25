import axios from "axios";
import LocalStorageService from "./localStorage";

// Load from env
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

console.log("Axios Base URL:", baseURL); // For debug

const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add JWT to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = LocalStorageService.get<string>('rentmate_token');
    console.log('[Request Interceptor] Token:', token); // DEBUG
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Request Interceptor] Authorization header set:', config.headers.Authorization); // DEBUG
    } else {
      console.log('[Request Interceptor] No token found in localStorage.'); // DEBUG
    }
    return config;
  },
  (error) => {
    console.error('[Request Interceptor] Error:', error); // DEBUG
    return Promise.reject(error);
  }
);

// Response interceptor (keep existing logic for 401/403)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      if (typeof window !== "undefined") {
        // Redirect to login if not already on login page
        // Clear token and any user data from localStorage
        LocalStorageService.remove('rentmate_token');
        LocalStorageService.remove("loggedInUser"); // Ensure this is also cleared if used
        if (window.location.pathname !== "/login") {
          window.location.href = "/login"; // Force reload to clear app state
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
