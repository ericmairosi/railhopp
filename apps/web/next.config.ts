import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip ESLint during builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
