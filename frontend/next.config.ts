import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/auth/:path*', // Proxy requests starting with /auth/
        // Ensure the destination is a fully qualified URL or an absolute path for internal routing.
        // If NEXT_PUBLIC_API_BASE_URL is something like http://backend:3001/api
        // and you want to proxy /auth/login to http://backend:3001/api/auth/login,
        // then the destination should be process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/:path*'
        // For a simpler local setup, assuming backend is at http://localhost:3001 and handles /auth routes directly:
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/:path*`,
      },
      // You can add more rewrite rules here for other backend services if needed
    ];
  },
};

export default nextConfig;
