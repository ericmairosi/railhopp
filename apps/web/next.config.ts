import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  // Skip ESLint during builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable standalone mode for lean Docker runtime (disabled for Windows build)
  // output: 'standalone',
  // Compress responses for better performance
  compress: true,
  // Optimize for production deployment
  poweredByHeader: false,
  // Experimental features
  experimental: {
    // Remove if causing issues in production
  },
  // Keep server-side rendering for API routes and real-time features
}

export default withSentryConfig(nextConfig, { silent: true })
