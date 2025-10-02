# Darwin API Setup - Real-Time Train Data Integration

## Overview

Railhopp uses real-time data from National Rail's Darwin API via a Pub/Sub broker. SOAP has been removed and there is no mock data fallback. This guide shows you how to get live Darwin data flowing through the broker.

## ✅ Current Status

- ✅ **Pub/Sub client implemented** - Lightweight, cache-aware client for Darwin broker
- ✅ **Error handling** - Clear errors when broker/API unavailable (no mock fallback)
- ✅ **Type safety** - Full TypeScript types for all data structures
- ✅ **Logging & debugging** - Comprehensive logging for troubleshooting
- 🔧 **Credentials validation** - Ensure Darwin broker credentials are valid

## 🚀 Quick Setup for Real Data

### 1. Get a Darwin API Key

1. **Register at National Rail**: https://www.nationalrail.co.uk/developers/
2. **Apply for Darwin OpenLDBWS Access**: Request access to the Live Departure Boards Web Service
3. **Get your API token**: You'll receive a token like `P-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 2. Configure Environment

Update your `.env.local` file:

```bash
# Darwin Pub/Sub Configuration (for real-time data)
DARWIN_ENABLED=true
DARWIN_BROKER_URL={{DARWIN_BROKER_URL}}
DARWIN_USERNAME={{DARWIN_USERNAME}}
DARWIN_PASSWORD={{DARWIN_PASSWORD}}
# Optional tuning
DARWIN_DEPARTURES_CACHE_TTL_SECONDS=30
```

### 3. Test Your Configuration

```bash
# Test Darwin API connectivity
node test-darwin-api.js

# Expected output for working API:
# ✅ Darwin API configuration found
# ✅ API request successful!
# ✅ Station board data found in response
# 🎉 Darwin API test completed successfully!
```

### 4. Verify in Application

```bash
# Start development server
npm run dev

# Test API endpoint
curl "http://localhost:3000/api/darwin/departures?crs=KGX&numRows=5"

# Look for "source": "darwin" in response (vs "source": "mock")
```

## 🔧 Current System Behavior

### With Valid Darwin API Key

- ✅ Makes real SOAP requests to National Rail Darwin API
- ✅ Parses XML responses to JSON
- ✅ Returns live departure information
- ✅ Shows accurate train times, platforms, delays
- ✅ Includes real disruption messages

### With Invalid/Missing Credentials

- ❌ No mock fallback is used
- ✅ Returns clear error with guidance to configure broker/credentials
- ✅ Health endpoints and logs help diagnose issues

## 📊 Data Structure

Both real and mock data use the same structure:

```typescript
interface LiveStationBoard {
  stationName: string // "London Kings Cross"
  stationCode: string // "KGX"
  generatedAt: string // ISO timestamp
  departures: LiveDeparture[] // Train services
  messages?: StationMessage[] // Alerts/notices
  platformsAvailable?: boolean
}

interface LiveDeparture {
  serviceID: string // Unique service identifier
  operator: string // "London North Eastern Railway"
  operatorCode: string // "GR"
  destination: string // "Edinburgh"
  destinationCRS: string // "EDB"
  std: string // Scheduled time "14:30"
  etd: string // Expected time "14:33" or "On time"
  platform?: string // "1A" or undefined
  cancelled?: boolean // Service cancellation status
  delayReason?: string // Reason for delays
  serviceType: string // Usually "train"
  length?: number // Number of carriages
}
```

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized Error**

- API key is invalid, expired, or not registered
- Check your National Rail developer account
- Verify key format: `P-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**No Data Returned**

- Station code might be invalid (use 3-letter CRS codes)
- No services at requested time
- Weekend/holiday schedules differ

**SOAP Parsing Errors**

- API response format changed (contact developers)
- Network connectivity issues
- Temporary API outage

### Debug Mode

Enable detailed logging:

```bash
# In .env.local
NODE_ENV=development
DEBUG=darwin:*

# Check browser network tab and server console for detailed logs
```

## 🎯 API Endpoints

### Get Departure Board

```
GET /api/darwin/departures?crs=KGX&numRows=10
```

**Parameters:**

- `crs` (required): 3-letter station code
- `numRows` (optional): Number of services to return (default: 10)
- `filterCrs` (optional): Filter by destination station
- `filterType` (optional): 'to' or 'from' filter

**Response:**

```json
{
  "success": true,
  "data": {
    /* LiveStationBoard */
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "source": "darwin", // or "mock"
  "apiStatus": {
    "configured": true,
    "working": true,
    "servicesFound": 8
  }
}
```

### Get Service Details

```
GET /api/darwin/service/SERVICE_ID
```

Returns detailed information about a specific train service, including calling points.

## 🔄 Migration Path

### Phase 1: ✅ **COMPLETED** - Infrastructure Ready

- [x] SOAP client implementation
- [x] XML parsing with fast-xml-parser
- [x] Error handling and fallbacks
- [x] Mock data system
- [x] API endpoint structure

### Phase 2: 🔧 **IN PROGRESS** - Real Data Integration

- [x] Test framework for Darwin API
- [ ] Obtain valid Darwin API credentials
- [ ] Production deployment configuration
- [ ] Frontend updates for real data

### Phase 3: 🚀 **NEXT** - Enhanced Features

- [ ] Real-time updates via WebSockets
- [ ] Caching layer for better performance
- [ ] Multiple data source integration
- [ ] Advanced error recovery

## 💡 Pro Tips

1. **Development**: Use mock data during development to avoid API rate limits
2. **Testing**: The mock data includes realistic scenarios (delays, cancellations)
3. **Fallback**: System gracefully handles API outages
4. **Performance**: Real data responses are cached for 30 seconds
5. **Monitoring**: All API calls are logged for debugging

## 🚦 System Status

**Current State**: Ready for real Darwin API integration
**Mock Data**: High-quality development experience
**Production Ready**: Yes (with valid API key)
**Error Handling**: Comprehensive
**Type Safety**: Full TypeScript coverage

---

**Next Steps:**

1. Obtain valid Darwin API key from National Rail
2. Update environment configuration
3. Test with real API endpoints
4. Deploy to production

For questions or issues, check the application logs or contact the development team.
