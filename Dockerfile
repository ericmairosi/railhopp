# Production-ready Dockerfile for Railhopp Railway App
# Optimized for pnpm monorepo with proper binary handling

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack and set pnpm as the only package manager
RUN corepack enable
RUN corepack prepare pnpm@10.15.0 --activate
# Remove npm to force pnpm usage
RUN rm -f /usr/local/bin/npm /usr/local/bin/npx
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# ---- Dependencies Stage ----
FROM base AS deps

# Copy package files for dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/ 
COPY packages/rail-data/package.json ./packages/rail-data/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ---- Build Stage ----
FROM base AS builder
WORKDIR /app

# Copy source files
COPY . .

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Ensure proper workspace linking - pnpm needs to create local node_modules links
RUN pnpm install --frozen-lockfile

# Debug: Check which package managers are available
RUN echo "=== Package managers available ===" && \
    which pnpm && pnpm --version && \
    (which npm || echo "npm not found (good)") && \
    echo "=== Attempting build ===" && \
    pnpm build:web

# Verify build succeeded
RUN ls -la apps/web/.next/ || (echo "Build failed - no .next directory found" && exit 1)

# ---- Runtime Stage ----
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy Next.js build output and dependencies for runtime
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./

# Set permissions for app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))" || exit 1

# Start the Next.js server using pnpm exec
WORKDIR /app/apps/web
CMD ["pnpm", "exec", "next", "start"]
