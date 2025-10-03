# 🚂 Railhopp

A modern, fast, and SEO-optimized web application for real-time UK railway information.

## ✨ Features

- **Real-time train data** from National Rail and Network Rail feeds
- **Lightning fast performance** with aggressive caching strategies
- **SEO-optimized** for maximum search engine and LLM discoverability
- **Modern UI** with Tailwind CSS and custom railway-themed components
- **Progressive Web App** capabilities for offline use
- **Structured data** for rich search results

## 🏗 Architecture

This is a monorepo built with:

- **Frontend**: Next.js 15+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Node.js with Express/Fastify (coming soon)
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Package Management**: PNPM with workspaces
- **Build System**: Turborepo for efficient builds
- **Deployment**: Fly.io (canonical, Docker) — Vercel optional for web only

## 📁 Project Structure

```
railhopp/
├── apps/
│   ├── web/                 # Next.js frontend application
│   └── api/                 # Backend API (coming soon)
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── types/               # TypeScript type definitions
│   ├── rail-data/           # Railway data processing utilities
│   └── database/            # Database schemas and utilities
├── docs/                    # Documentation
└── scripts/                 # Build and deployment scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PNPM 9+
- Git

### Installation

1. **Clone and install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Start development server:**

   ```bash
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Development

### Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Run ESLint across all packages
- `pnpm type-check` - Run TypeScript checks
- `pnpm test` - Run all tests
- `pnpm clean` - Clean all build outputs

### Package Scripts

Each package has its own scripts:

```bash
# Build specific package
pnpm --filter @railhopp/ui build

# Run specific app in dev mode
pnpm --filter web dev
```

## 📊 SEO Features

### Technical SEO

- ✅ Server-side rendering (SSR) for all public pages
- ✅ Dynamic meta tags and Open Graph
- ✅ Structured data (JSON-LD) for stations, routes, and services
- ✅ XML sitemaps (static and dynamic)
- ✅ Optimized robots.txt
- ✅ Core Web Vitals optimization

### Performance

- ✅ Image optimization with WebP/AVIF support
- ✅ Automatic code splitting
- ✅ Multi-layer caching strategy
- ✅ Lazy loading for non-critical components
- ✅ Critical CSS inlining

### Content Strategy

- Station-specific landing pages (2,500+ UK stations)
- Route guides and timetables
- Real-time service updates
- Travel guides and tips

## 🔌 API Integration

### Data Sources

- **National Rail Darwin (via Pub/Sub broker)**: Real-time departures/arrivals
- **Network Rail Feeds**: Train movements, TSRs, VSTP changes
- **Knowledgebase API**: Station and static data
- **Knowledge Station (RTT.io)**: Enhanced station and disruption data (auth required)

### Real-time Updates

- WebSocket connections for live data
- Server-Sent Events for notifications
- Optimistic UI updates
- No mock fallback: APIs must be configured; clear errors are returned otherwise

## 🎨 UI Components

Custom railway-themed components built with Radix UI:

- **DeparturesBoard**: Live departure/arrival displays
- **StationSearch**: Autocomplete station finder
- **Button**: Railway-specific button variants
- **Platform indicators** and **Status badges**

## 🔄 Caching Strategy

Multi-layer caching for optimal performance:

1. **CDN Edge Cache** (Vercel): Static assets, 1 year
2. **API Cache** (Redis via ioredis): Dynamic data, 1-60 minutes
3. **Database Cache**: Query results, configurable
4. **Browser Cache**: Assets and data, optimized headers

## 📱 Progressive Web App

- Offline functionality for saved journeys
- Push notifications for alerts
- App-like experience on mobile devices
- Service worker for caching strategies

## 🔒 Security & Privacy

- Secure API key management
- Rate limiting on all endpoints
- GDPR-compliant user data handling
- TLS encryption for all communications

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel:**

   ```bash
   npx vercel
   ```

2. **Configure environment variables** in Vercel dashboard

3. **Deploy:**
   ```bash
   npx vercel --prod
   ```

### Environment Variables

Required for production (no hardcoded secrets; use your platform's secret store):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Darwin Kafka (Pub/Sub)
# Backed by Rail Data Marketplace (Confluent) – used for SSE live updates
DARWIN_KAFKA_BROKERS=pkc-xxxxx.gcp.confluent.cloud:9092
DARWIN_KAFKA_USERNAME={{DARWIN_KAFKA_USERNAME}}
DARWIN_KAFKA_PASSWORD={{DARWIN_KAFKA_PASSWORD}}
DARWIN_KAFKA_TOPIC=prod-1010-Darwin-Train-Information-Push-Port-...-JSON
DARWIN_KAFKA_GROUP_ID=railhopp-darwin
DARWIN_KAFKA_SASL_MECHANISM=plain
DARWIN_KAFKA_SSL=true

# Optional HTTP broker bridge (if you run one)
DARWIN_ENABLED=true
DARWIN_BROKER_URL=https://your-broker.example.com   # e.g., http://localhost:4001

# Knowledgebase (RDM)
KNOWLEDGEBASE_API_URL={{KNOWLEDGEBASE_API_URL}}
KNOWLEDGEBASE_API_KEY={{KNOWLEDGEBASE_API_KEY}}

# Knowledge Station (RTT.io) – optional
KNOWLEDGE_STATION_API_URL={{KNOWLEDGE_STATION_API_URL}}
KNOWLEDGE_STATION_API_TOKEN={{KNOWLEDGE_STATION_API_TOKEN}}
KNOWLEDGE_STATION_ENABLED=true

# Network Rail (optional)
NETWORK_RAIL_API_URL={{NETWORK_RAIL_API_URL}}
NETWORK_RAIL_USERNAME={{NETWORK_RAIL_USERNAME}}
NETWORK_RAIL_PASSWORD={{NETWORK_RAIL_PASSWORD}}

# Redis (ioredis)
REDIS_URL={{REDIS_URL}}
REDIS_TOKEN={{REDIS_TOKEN}}

# Sentry (optional but recommended)
SENTRY_DSN={{SENTRY_DSN}}
SENTRY_ENVIRONMENT=production

# Rate limits (defaults provided)
RATE_LIMIT_DEPARTURES_PER_MIN=60
RATE_LIMIT_SUGGEST_PER_MIN=30
RATE_LIMIT_JOURNEY_PER_MIN=20

# Application
NEXT_PUBLIC_APP_URL=https://railhopp.com
```

## 📈 Monitoring & Analytics

- **Performance**: Vercel Analytics + Web Vitals
- **Errors**: Sentry error tracking
- **Usage**: Custom analytics dashboard
- **SEO**: Search Console integration

## 🎯 Roadmap

### Phase 1: ✅ Foundation (Weeks 1-2)

- [x] Project setup and monorepo structure
- [x] Next.js app with TypeScript
- [x] SEO-optimized homepage
- [x] Basic UI components
- [x] Development tooling

### Phase 2: 🔄 Data Integration (Weeks 3-4)

- [ ] Database schema design
- [ ] National Rail API integration
- [ ] Network Rail feed connections
- [ ] Real-time data pipeline

### Phase 3: 🎯 Frontend Core (Weeks 5-6)

- [ ] Station pages (2,500+ UK stations)
- [ ] Journey planner interface
- [ ] Live departure boards
- [ ] Service disruption pages

### Phase 4: 🚀 Advanced Features (Weeks 7-8)

- [ ] Interactive maps with live trains
- [ ] User accounts and preferences
- [ ] Push notifications
- [ ] Offline functionality

### Phase 5: 🎨 Polish & Launch (Weeks 9-10)

- [ ] Performance optimization
- [ ] SEO final pass
- [ ] Testing and QA
- [ ] Production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **National Rail Enquiries** for providing real-time data feeds
- **Network Rail** for open data access
- **UK Government** for supporting open transport data

---

Built with ❤️ for UK rail travelers
