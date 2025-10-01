# UK Rail Data APIs Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for integrating all 19 UK rail data APIs and feeds into the Railhopp application. The implementation follows a phased approach prioritizing user value and technical feasibility.

## API Categories & Analysis

### 1. Real-time Passenger Information (High Priority)

**APIs:**

- Darwin Real Time Train Information ✓ (Already implemented)
- Live Arrival and Departure Boards - Staff Version
- Live Departure Board ✓ (Partially implemented)
- Service Details ✓ (Already implemented)

**Authentication:** Darwin API tokens
**Update Frequency:** Real-time (WebSocket/polling every 30s)
**User Value:** Critical - Core functionality
**Implementation Status:** 75% complete

### 2. Train Tracking & Movement (High Priority)

**APIs:**

- NWR Train Movements
- NWR Very Short-Term Planning (VSTP)
- NWR Train Describer (TD)

**Authentication:** Network Rail API tokens
**Update Frequency:** Real-time STOMP feeds
**User Value:** High - Live tracking, delays, cancellations
**Implementation Status:** 0% complete

### 3. Static Reference Data (Medium Priority)

**APIs:**

- Knowledgebase Stations data feed ✓ (Partially implemented)
- Knowledgebase TOC data
- Service Providers Reference Data
- NWR Track Model
- Darwin Timetable Files

**Authentication:** Various (Darwin, NWR, Knowledge Station)
**Update Frequency:** Daily/Weekly updates
**User Value:** Medium - Enhanced information
**Implementation Status:** 20% complete

### 4. Disruptions & Service Status (High Priority)

**APIs:**

- NationalRail Disruptions API
- Knowledgebase Incidents data ✓ (Partially implemented)
- Knowledgebase National Service Indicator data

**Authentication:** National Rail, Knowledge Station tokens
**Update Frequency:** Real-time to hourly
**User Value:** Critical - Service reliability info
**Implementation Status:** 30% complete

### 5. Planning & Scheduling (Medium Priority)

**APIs:**

- NWR Event Planning Lookahead Calendar
- NWR Train Planning Network Model
- NWR Schedule

**Authentication:** Network Rail API tokens
**Update Frequency:** Daily updates
**User Value:** Medium - Advanced planning features
**Implementation Status:** 0% complete

### 6. Advanced Analytics (Low Priority)

**APIs:**

- NWR CORPUS
- NWR SMART

**Authentication:** Network Rail API tokens
**Update Frequency:** Periodic analysis
**User Value:** Low - Analytics and insights
**Implementation Status:** 0% complete

## Implementation Phases

### Phase 1: Core Real-time Enhancement (Weeks 1-3)

**Goal:** Enhance existing real-time capabilities

**Tasks:**

1. Implement NWR Train Movements STOMP feed
2. Add NWR VSTP integration for short-term changes
3. Enhance Live Departure Boards with staff-level detail
4. Implement real-time WebSocket updates for frontend

**Expected Outcome:**

- Real-time train positions
- Live delay/cancellation updates
- Enhanced departure boards

### Phase 2: Reference Data Expansion (Weeks 4-6)

**Goal:** Add comprehensive static data

**Tasks:**

1. Implement TOC (Train Operating Company) data feed
2. Add Service Providers Reference integration
3. Implement NWR Track Model for route information
4. Import Darwin Timetable Files for schedule data

**Expected Outcome:**

- Complete station information
- Operator details and branding
- Route and track information
- Historical timetable data

### Phase 3: Disruptions & Service Intelligence (Weeks 7-9)

**Goal:** Comprehensive service status awareness

**Tasks:**

1. Implement NationalRail Disruptions API
2. Add National Service Indicator integration
3. Enhanced incident data processing
4. Predictive service alerts

**Expected Outcome:**

- Real-time disruption notifications
- Network-wide service indicators
- Predictive delay warnings

### Phase 4: Advanced Planning & Analytics (Weeks 10-12)

**Goal:** Advanced features for power users

**Tasks:**

1. Implement Train Planning Network Model
2. Add Event Planning Calendar integration
3. Implement Train Describer for detailed tracking
4. Add CORPUS/SMART analytics feeds

**Expected Outcome:**

- Future service planning information
- Detailed train tracking
- Network analytics and insights

## Technical Architecture

### Enhanced Multi-API Client Architecture

```typescript
// Core API Managers
- DarwinAPIManager (existing, enhance)
- NetworkRailAPIManager (new)
- NationalRailAPIManager (new)
- KnowledgeStationAPIManager (existing, enhance)

// Data Aggregation Layer
- RealTimeDataAggregator
- StaticDataAggregator
- DisruptionDataAggregator
- PlanningDataAggregator

// Caching & Performance
- RedisCache for static data
- In-memory cache for real-time data
- WebSocket connection manager
- STOMP feed manager for Network Rail
```

### Data Flow Architecture

```
[Multiple API Sources]
    ↓
[Authentication & Rate Limiting Layer]
    ↓
[Data Validation & Transformation Layer]
    ↓
[Intelligent Data Aggregation Engine]
    ↓
[Unified API Endpoints]
    ↓
[Frontend Components]
```

### Authentication Strategy

**Darwin APIs:**

- Token-based authentication
- Rate limiting: 5000 requests/hour

**Network Rail APIs:**

- STOMP credentials for feeds
- REST API tokens for queries
- Rate limiting: Varies by feed

**National Rail APIs:**

- API key authentication
- Rate limiting: 1000 requests/hour

**Knowledge Station APIs:**

- Bearer token authentication ✓ (existing)
- Rate limiting: 2000 requests/hour

## Database Schema Enhancements

### New Tables Required

```sql
-- Train Movements
CREATE TABLE train_movements (
    id UUID PRIMARY KEY,
    train_id VARCHAR(20),
    event_type VARCHAR(20), -- departure, arrival, pass
    location_stanox INTEGER,
    location_crs VARCHAR(3),
    planned_timestamp TIMESTAMP,
    actual_timestamp TIMESTAMP,
    delay_minutes INTEGER,
    source VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Service Providers
CREATE TABLE service_providers (
    id UUID PRIMARY KEY,
    code VARCHAR(10) UNIQUE,
    name VARCHAR(100),
    short_name VARCHAR(20),
    logo_url TEXT,
    primary_color VARCHAR(7),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Track Model
CREATE TABLE track_segments (
    id UUID PRIMARY KEY,
    segment_id VARCHAR(20) UNIQUE,
    start_stanox INTEGER,
    end_stanox INTEGER,
    distance_meters INTEGER,
    speed_limit_mph INTEGER,
    electrified BOOLEAN DEFAULT false,
    track_type VARCHAR(20)
);

-- Disruptions Enhanced
CREATE TABLE disruptions_enhanced (
    id UUID PRIMARY KEY,
    disruption_id VARCHAR(50) UNIQUE,
    title VARCHAR(255),
    description TEXT,
    severity VARCHAR(20),
    status VARCHAR(20),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    affected_operators TEXT[],
    affected_routes TEXT[],
    alternative_transport TEXT,
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoint Structure

### Enhanced Unified Endpoints

```typescript
// Enhanced departure boards with all data sources
GET /api/v2/departures/{crs}
  ?includeMovements=true
  &includeDisruptions=true
  &includeTracking=true
  &includeAnalytics=true

// Service tracking with multiple sources
GET /api/v2/service/{serviceId}
  ?includeRealTimePosition=true
  &includeDisruptions=true
  &includePredictions=true

// Network status dashboard
GET /api/v2/network/status
  ?includeIndicators=true
  &includeDisruptions=true
  &includeAnalytics=true

// Advanced planning
GET /api/v2/planning/events
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &affectedRoutes=true
```

## Performance & Caching Strategy

### Caching Layers

**Level 1: In-Memory (Node.js)**

- Real-time data: 30 seconds
- API responses: 1 minute
- User sessions: 30 minutes

**Level 2: Redis Cache**

- Static reference data: 24 hours
- Timetable data: 7 days
- Disruption data: 15 minutes

**Level 3: Database Cache**

- Historical data: Permanent
- Analytics data: 90 days
- Audit logs: 365 days

### Real-time Updates Strategy

**WebSocket Connections:**

- Client connections for live updates
- Server-sent events for departure boards
- Push notifications for disruptions

**STOMP Feed Management:**

- Persistent connections to Network Rail
- Automatic reconnection on failure
- Message queuing for reliability

## Implementation Timeline

### Week 1-3: Foundation & Core APIs

- [ ] Set up Network Rail API clients
- [ ] Implement Train Movements feed
- [ ] Add VSTP integration
- [ ] Enhance WebSocket infrastructure

### Week 4-6: Reference Data

- [ ] TOC data integration
- [ ] Service Providers API
- [ ] Track Model implementation
- [ ] Timetable file processing

### Week 7-9: Disruptions & Intelligence

- [ ] National Rail Disruptions API
- [ ] Service Indicator integration
- [ ] Enhanced incident processing
- [ ] Predictive analytics foundation

### Week 10-12: Advanced Features

- [ ] Planning calendar integration
- [ ] Train Describer implementation
- [ ] CORPUS analytics
- [ ] SMART data integration

### Week 13-15: Integration & Polish

- [ ] Frontend component updates
- [ ] Performance optimization
- [ ] Testing & documentation
- [ ] Deployment & monitoring

## Success Metrics

### Technical KPIs

- API response times < 500ms (95th percentile)
- Data freshness < 30 seconds for real-time
- System availability > 99.5%
- Error rate < 0.1%

### User Experience KPIs

- Real-time accuracy > 95%
- Disruption notification speed < 2 minutes
- User engagement increase > 30%
- Support ticket reduction > 50%

## Risk Mitigation

### Technical Risks

- **API Rate Limits:** Implement intelligent caching and request batching
- **Data Quality:** Multiple source validation and conflict resolution
- **Performance:** Progressive loading and efficient caching
- **Reliability:** Fallback mechanisms and graceful degradation

### Business Risks

- **API Costs:** Monitor usage and optimize requests
- **Compliance:** Ensure data handling meets UK transport regulations
- **Scalability:** Design for 10x current usage
- **Maintenance:** Comprehensive monitoring and alerting

## Cost Analysis

### API Costs (Monthly Estimates)

- Darwin APIs: £0 (free tier sufficient)
- Network Rail APIs: £200-500 (depending on usage)
- National Rail APIs: £100-300
- Knowledge Station: £150-400
- **Total: £450-1200/month**

### Infrastructure Costs

- Enhanced Redis cache: £50/month
- Increased database storage: £30/month
- WebSocket infrastructure: £40/month
- Monitoring tools: £60/month
- **Total: £180/month**

**Grand Total: £630-1380/month for comprehensive rail data**

## Next Steps

1. **Immediate Actions (This Week):**
   - Set up Network Rail developer accounts
   - Apply for API access tokens
   - Review existing authentication setup

2. **Sprint 1 (Next Week):**
   - Begin Phase 1 implementation
   - Set up development/testing environment
   - Create detailed technical specifications

3. **Ongoing:**
   - Weekly progress reviews
   - Performance monitoring setup
   - User feedback collection

This comprehensive plan will transform Railhopp into the most complete UK rail information platform, providing users with unprecedented access to real-time, accurate, and detailed railway information.
