# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Railhopp is a modern, SEO-optimized railway web application for real-time UK train information. It's a monorepo built with Turborepo, featuring a Next.js 15+ frontend with TypeScript, Tailwind CSS, and a planned backend API. The project focuses heavily on performance, SEO optimization, and real-time data from National Rail APIs.

## Development Environment

### Prerequisites
- Node.js 20+
- PNPM 9+ (required package manager)
- Git

### Common Commands

#### Setup & Installation
```bash
# Install all dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

#### Development
```bash
# Start all development servers (includes Next.js with Turbopack)
pnpm dev

# Start specific app only
pnpm --filter web dev
pnpm --filter api dev  # When backend is ready
```

#### Building
```bash
# Build all packages and apps
pnpm build

# Build specific package
pnpm --filter @railhopp/ui build
pnpm --filter web build
```

#### Code Quality
```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check

# Format code
pnpm format

# Run tests (when available)
pnpm test

# Clean build outputs
pnpm clean
```

#### Package-Specific Operations
```bash
# Build and watch specific package during development
pnpm --filter @railhopp/types dev
pnpm --filter @railhopp/ui dev
pnpm --filter @railhopp/rail-data dev
pnpm --filter @railhopp/database dev

# Test specific package
pnpm --filter @railhopp/rail-data test
```

## Architecture & Structure

### Monorepo Layout
```
railhopp/
├── apps/
│   ├── web/                 # Next.js 15+ frontend (primary app)
│   └── api/                 # Backend API (planned)
├── packages/
│   ├── ui/                  # Shared UI components (Radix UI + Tailwind)
│   ├── types/               # Shared TypeScript definitions
│   ├── rail-data/           # Railway data processing & API clients
│   └── database/            # Supabase schemas & utilities
├── docs/                    # Documentation
└── scripts/                 # Build and deployment scripts
```

### Technology Stack

#### Frontend (apps/web)
- **Framework**: Next.js 15+ with App Router
- **Runtime**: React 19+
- **Styling**: Tailwind CSS v4
- **Build**: Turbopack for development, standard Next.js for production
- **UI Components**: Radix UI primitives with custom railway-themed components
- **State**: Zustand + TanStack Query for data fetching
- **Icons**: Lucide React

#### Packages Architecture
- **@railhopp/ui**: Component library built with Radix UI, includes Button, DeparturesBoard, StationSearch, etc.
- **@railhopp/types**: Shared TypeScript types for trains, stations, journeys
- **@railhopp/rail-data**: Data processing utilities for National Rail APIs (Darwin API, Network Rail feeds)
- **@railhopp/database**: Supabase client, schemas, migrations using Drizzle ORM

#### Database & APIs
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **APIs**: National Rail Darwin API, Network Rail feeds via STOMP
- **Caching**: Redis (Upstash), multi-layer caching strategy
- **Real-time**: WebSocket connections, Server-Sent Events

### Build System
- **Turborepo**: Handles monorepo builds with dependency graph optimization
- **Package Manager**: PNPM with workspaces
- **TypeScript**: Shared config with path mapping for workspace packages

### Key Files & Configuration

#### Root Configuration
- `turbo.json`: Turborepo pipeline configuration
- `tsconfig.json`: Root TypeScript config with workspace path mapping
- `package.json`: Workspace definition and root scripts

#### Web App (apps/web)
- `next.config.ts`: Next.js configuration (minimal, defaults to Turbo)
- `eslint.config.mjs`: ESLint flat config with Next.js rules
- `tsconfig.json`: App-specific TypeScript config
- `src/app/layout.tsx`: Root layout with comprehensive SEO meta tags

## Development Patterns

### Package Dependencies
- Use workspace references (`workspace:*`) for internal packages
- All packages export through `./dist/index.js` with TypeScript declarations
- UI package also exports `./styles.css` for Tailwind components

### SEO & Performance Focus
- All public pages use SSR for SEO
- Comprehensive meta tags in `layout.tsx` with Open Graph and Twitter Cards  
- Image optimization and WebP/AVIF support planned
- Multi-layer caching strategy (CDN, API, Database, Browser)
- Core Web Vitals optimization is a priority

### Data Flow
- Real-time train data from National Rail Darwin API
- Historical and static data from Network Rail feeds
- STOMP client for live feed subscriptions
- Optimistic UI updates with TanStack Query

### Component Architecture
- Railway-themed components in `@railhopp/ui`
- Built with Radix UI primitives for accessibility
- Tailwind CSS for styling with railway-specific design system
- Components include: DeparturesBoard, StationSearch, Platform indicators, Status badges

### Testing Strategy
- Jest for `@railhopp/rail-data` package testing
- Component testing planned for UI package
- Integration tests for API endpoints when backend is built

## Environment Variables

### Required for Development
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# National Rail APIs
DARWIN_API_KEY=
NETWORK_RAIL_USERNAME=
NETWORK_RAIL_PASSWORD=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Additional
```bash
# Redis (Upstash)
REDIS_URL=
REDIS_TOKEN=

# Application
NEXT_PUBLIC_APP_URL=https://railhopp.com
```

## Deployment

### Vercel (Recommended)
- Optimized for Next.js deployment
- Automatic builds on push to main branch
- Edge caching for static assets
- Environment variables configured in Vercel dashboard

```bash
# Deploy commands
npx vercel        # Development deployment
npx vercel --prod # Production deployment
```

## Current Status & Roadmap

### Completed (Phase 1)
- [x] Monorepo setup with Turborepo
- [x] Next.js 15+ app with TypeScript
- [x] SEO-optimized homepage and layout
- [x] Package structure and workspace configuration
- [x] Development tooling (ESLint, Prettier, TypeScript)

### In Progress (Phase 2)
- [ ] Database schema design and Supabase integration
- [ ] National Rail API integration in `@railhopp/rail-data`
- [ ] Network Rail feed connections with STOMP
- [ ] Real-time data pipeline

### Planned Features
- Station-specific pages (2,500+ UK stations)
- Live departure boards with real-time updates
- Journey planner interface
- Interactive maps with live train positions
- Progressive Web App capabilities
- User accounts and personalized alerts

## Troubleshooting

### Common Issues
1. **PNPM not found**: Ensure PNPM 9+ is installed globally
2. **TypeScript path errors**: Run `pnpm type-check` to verify workspace references
3. **Build failures**: Check `turbo.json` pipeline dependencies and run `pnpm clean` first
4. **Module resolution issues**: Verify package exports in individual `package.json` files

### Development Tips
- Use `pnpm --filter <package>` to run commands on specific packages
- Build packages in dependency order: types → ui/rail-data/database → web
- Next.js uses Turbopack in dev mode for faster builds
- All packages support `dev` (watch mode) and `build` scripts
- The project emphasizes performance and SEO, so consider these in all implementations

## Important Notes

- This is a railway-focused application with specific domain knowledge requirements
- SEO optimization is critical - all public pages must be server-side rendered
- Real-time data accuracy is essential for user trust
- The UI should reflect railway industry standards and terminology
- Performance targets are aggressive due to competitive landscape
- GDPR compliance required for UK user base
