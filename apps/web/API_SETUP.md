# API Configuration Guide

This guide explains how to configure real rail data APIs for the Railhopp application.

## Current Status

The system is designed to use real APIs but falls back to realistic mock data when APIs are unavailable. You can check API status at: `http://localhost:3000/api/status`

## RTT (Real Time Trains) API

### Configuration

The RTT API credentials are stored in `.env.local`:

```
KNOWLEDGE_STATION_API_URL=https://api.rtt.io/api/v1
KNOWLEDGE_STATION_API_TOKEN=P-88ffe920-471c-4fd9-8e0d-95d5b9b7a257
KNOWLEDGE_STATION_ENABLED=true
```

### Current Issue

The API is returning 401 Unauthorized. This could be due to:

1. **Token Format**: RTT might expect a different authentication format
2. **Token Validity**: The token might have expired or been revoked
3. **API Endpoint**: The endpoint structure might have changed

### Troubleshooting Steps

1. **Verify Token**: Check with RTT support that your token is valid
2. **Check Documentation**: Review RTT API docs for current authentication method
3. **Test Manually**: Try the API with curl:
   ```bash
   curl -H "Authorization: Basic $(echo -n 'P-88ffe920-471c-4fd9-8e0d-95d5b9b7a257:' | base64)" \
        -H "User-Agent: Railhopp/1.0" \
        "https://api.rtt.io/api/v1/json/search/THL"
   ```

### Alternative Authentication

RTT API might use different auth formats:

- API Key in header: `Authorization: Bearer YOUR_TOKEN`
- Username/password: `Authorization: Basic base64(username:password)`
- Query parameter: `?token=YOUR_TOKEN`

## Darwin API (National Rail)

### Configuration

```
DARWIN_API_URL=https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb11.asmx
DARWIN_API_TOKEN=P-d3bf124c-1058-4040-8a62-87181a877d59
```

### Current Status

Darwin API is configured but not implemented yet because it uses SOAP protocol, which requires additional setup.

### Implementation Notes

Darwin API requires:

1. SOAP client library
2. Proper XML request/response handling
3. More complex authentication

## Fallback Strategy

When real APIs are unavailable, the system uses realistic mock data that:

- **Updates dynamically** with realistic timestamps
- **Rotates disruptions** to feel more realistic
- **Includes variety** of disruption types (planned, technical, weather, industrial)
- **Follows UK rail patterns** based on real-world scenarios

## API Endpoints

- **Disruptions**: `/api/disruptions` - Network status and service disruptions
- **Departures**: `/api/darwin/departures` - Live departure boards
- **Status Check**: `/api/status` - API connectivity diagnostics

## Getting Real APIs Working

To get the real APIs working:

1. **Contact RTT Support**: Verify your API token and authentication method
2. **Update Authentication**: Modify the auth headers in `/src/app/api/disruptions/route.ts`
3. **Test Changes**: Use the `/api/status` endpoint to verify connectivity
4. **Implement Darwin**: Add SOAP client for Darwin API integration

The system is designed to gracefully handle API failures and provide a fully functional experience with or without real API access.
