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
        destination: 'http://localhost:8080/', // To your backend
      },
      // You can add more rewrite rules here for other backend services if needed
    ];
  },
};

export default nextConfig;
