import axios from 'axios';

// Determine the base URL based on the environment
// Vercel provides a system environment variable `VERCEL_URL` for the deployment URL.
// For local development, you can use a .env.local file or a default.
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // If deployed to Vercel, use the Vercel URL for the backend (assuming backend is on the same domain or a known subdomain)
  // This might need adjustment based on your actual backend URL structure.
  // For example, if your backend is at api.yourdomain.com, you'd construct that.
  // If backend and frontend are served from the same domain, it could be /api
  if (process.env.VERCEL_URL) {
    // If your backend is at api.yourdomain.com when deployed to Vercel:
    // return `https://${process.env.VERCEL_URL.replace(/^[^.]+\./, 'api.')}`;
    // If backend and frontend are served from the same Vercel deployment (e.g. Next.js API routes):
    return '/api'; // Adjust if your backend is hosted elsewhere or on a different path
  }
  return 'http://localhost:3001/api'; // Default for local backend (NestJS default port is 3000, adjust if yours is different)
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add a request interceptor to include the auth token
// You would typically get the token from your auth context or localStorage here
api.interceptors.request.use(
  (config) => {
    // Example: const token = useAuthStore.getState().token;
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export { api, API_BASE_URL }; 