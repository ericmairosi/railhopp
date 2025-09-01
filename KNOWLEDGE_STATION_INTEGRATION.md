# Knowledge Station Data Feed Integration

This document describes the implementation of the Knowledge Station data feed in your Railhopp environment. The Knowledge Station provides enhanced rail data that complements your existing Darwin API implementation.

## Overview

The Knowledge Station data feed has been integrated to work alongside Darwin API, respecting your preference for Darwin as the primary data source while enriching it with additional data where beneficial.

## Architecture

### Data Source Priority
1. **Darwin API** (Primary) - Your preferred data source for core rail information
2. **Knowledge Station** (Enhancement) - Provides additional data to supplement Darwin

### Key Components

#### 1. Environment Configuration
- Added Knowledge Station API configuration to `.env.local`
- Environment variables:
  - `KNOWLEDGE_STATION_API_URL` - API endpoint
  - `KNOWLEDGE_STATION_API_TOKEN` - Authentication token
  - `KNOWLEDGE_STATION_ENABLED` - Enable/disable the service

#### 2. Knowledge Station Client (`/lib/knowledge-station/`)
- **Types** (`types.ts`) - Comprehensive TypeScript definitions
- **Client** (`client.ts`) - API client with retry logic and error handling
- Features:
  - Enhanced station information with facilities and accessibility data
  - Service tracking and real-time updates
  - Comprehensive disruption information
  - Robust error handling and fallback strategies

#### 3. API Routes (`/api/knowledge-station/`)
- **Station Info** - `/api/knowledge-station/station`
- **Disruptions** - `/api/knowledge-station/disruptions`  
- **Status** - `/api/knowledge-station/status`
- All routes include proper error handling and service availability checks

#### 4. Unified Rail Data Service (`/lib/services/unified-rail-data.ts`)
- Combines Darwin and Knowledge Station data intelligently
- Prioritizes Darwin API as per your preference
- Enhances Darwin data with Knowledge Station information when available
- Graceful degradation when Knowledge Station is unavailable

#### 5. Rail Data Package (`/packages/rail-data/`)
- **Data Source Manager** - Manages multiple data sources with prioritization
- **Adapters** - Standardized interfaces for each data source
- **Aggregator** - Combines data from multiple sources with smart merging

## Usage Examples

### Getting Enhanced Station Information
```typescript
import { getUnifiedRailDataService } from '@/lib/services/unified-rail-data';

const railData = getUnifiedRailDataService();

// Get station info with Knowledge Station enhancements
const stationInfo = await railData.getStationInfo('KGX');
// Returns Darwin data enhanced with Knowledge Station facilities, accessibility info, etc.
```

### Getting Enhanced Departure Board
```typescript
const enhancedBoard = await railData.getEnhancedStationBoard({
  crs: 'KGX',
  numRows: 10,
  includeStationInfo: true,
  includeDisruptions: true
});

// Returns:
// - Darwin departure board (primary data)
// - Enhanced station facilities from Knowledge Station
// - Relevant disruptions from Knowledge Station
```

### Checking Data Source Status
```typescript
const status = await railData.getDataSourceStatus();
console.log(status.darwin.available);        // Darwin API status
console.log(status.knowledgeStation.enabled); // Knowledge Station status
```

## Configuration

### Initial Setup
1. **Update Environment Variables**
   ```env
   # Knowledge Station API Configuration
   KNOWLEDGE_STATION_API_URL=https://api.rtt.io/api/v1
   KNOWLEDGE_STATION_API_TOKEN=your_actual_token_here
   KNOWLEDGE_STATION_ENABLED=true
   ```

2. **Enable/Disable Knowledge Station**
   - Set `KNOWLEDGE_STATION_ENABLED=false` to disable the service
   - The system will gracefully fall back to Darwin-only mode

### API Token Setup
To get your Knowledge Station API token:
1. Visit the Knowledge Station API provider website
2. Register for an account
3. Generate an API token
4. Update the `KNOWLEDGE_STATION_API_TOKEN` environment variable

## Data Flow

### Primary Data Flow (Darwin Preference)
```
User Request → Darwin API (Primary) → Response Enhanced with Knowledge Station
```

### Fallback Strategy
```
Darwin Fails → Knowledge Station (Fallback) → Basic Response
```

### Enhancement Strategy  
```
Darwin Response + Knowledge Station Enhancement → Combined Response
```

## Error Handling

### Graceful Degradation
- If Knowledge Station is unavailable, the system continues with Darwin-only data
- No user-facing errors when enhancement services fail
- Proper logging for debugging enhancement failures

### Error Types
- `KnowledgeStationAPIError` - Specific errors from Knowledge Station
- `DarwinAPIError` - Darwin API errors (unchanged)
- Service-level errors with proper HTTP status codes

## Benefits

### Enhanced User Experience
- **Richer Station Information** - Facilities, accessibility, contact details
- **Better Disruption Awareness** - More comprehensive disruption data
- **Real-time Tracking** - Enhanced service tracking capabilities
- **Maintained Reliability** - Darwin remains primary source for core data

### Developer Experience
- **Type Safety** - Comprehensive TypeScript definitions
- **Consistent API** - Unified interface for both data sources
- **Error Resilience** - Robust error handling and fallbacks
- **Easy Configuration** - Simple environment-based setup

## API Endpoints

### Knowledge Station Endpoints
- `GET /api/knowledge-station/station?crs=KGX` - Station information
- `GET /api/knowledge-station/disruptions` - Current disruptions
- `GET /api/knowledge-station/status` - Service health status

### Response Format
All endpoints return consistent response format:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-08-31T14:00:00Z"
}
```

## Monitoring & Health

### Service Status
Check the health of all data sources:
```typescript
const status = await getUnifiedRailDataService().getDataSourceStatus();
```

### Availability Indicators
- Darwin API availability and response time
- Knowledge Station availability and response time
- Last health check timestamps

## Performance

### Optimization Features
- **Parallel Requests** - Darwin and Knowledge Station called simultaneously when possible
- **Caching Strategy** - Intelligent caching of enhancement data
- **Timeout Management** - Configurable timeouts prevent slowdowns
- **Retry Logic** - Automatic retries with exponential backoff

## Future Enhancements

### Potential Improvements
- **Caching Layer** - Redis-based caching for enhanced data
- **Real-time Updates** - WebSocket integration for live updates
- **Analytics** - Usage tracking and performance metrics
- **Additional Sources** - Framework to add more data sources easily

## Troubleshooting

### Common Issues
1. **Knowledge Station Not Working**
   - Check environment variables are set correctly
   - Verify API token is valid
   - Check service status endpoint

2. **Enhanced Data Missing**
   - Knowledge Station may be temporarily unavailable
   - Check logs for enhancement failures
   - Verify `KNOWLEDGE_STATION_ENABLED=true`

3. **Performance Issues**
   - Monitor response times in service status
   - Consider disabling Knowledge Station if causing slowdowns
   - Check timeout configurations

### Debug Mode
Set `NODE_ENV=development` to enable detailed logging:
- API request/response logging
- Enhancement operation status
- Error details and stack traces

## Migration Notes

This integration is designed to be non-breaking:
- Existing Darwin API functionality remains unchanged
- Knowledge Station features are additive
- Can be disabled at any time via environment variable
- No database schema changes required

## Support

For issues related to:
- **Darwin API** - Existing Darwin API support channels
- **Knowledge Station Integration** - Check this documentation and API logs
- **Configuration** - Verify environment variables and API tokens

The integration respects your preference for Darwin API as the primary data source while providing enhanced capabilities through Knowledge Station when available.
