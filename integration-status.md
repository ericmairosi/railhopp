# Darwin & Knowledge Station Integration Status

## Current Status ✅

Your Darwin and Knowledge Station integration is **properly set up** with the following components:

### ✅ What's Working
1. **Unified Rail Data Service** - Combines both APIs
2. **Knowledge Station Client** - Ready for enhanced data
3. **API Endpoints** - All routes exist and are configured
4. **Error Handling** - Graceful fallbacks when services are unavailable
5. **Environment Setup** - Configuration files are in place

### ⚠️ What Needs Configuration

1. **Darwin API Token** - Replace `your_darwin_api_token_here` in `.env.local`
2. **Knowledge Station Decision** - Either get a token OR disable it

## Quick Fix Guide

### Option 1: Darwin Only (Recommended to start)
```bash
# Edit .env.local and set:
KNOWLEDGE_STATION_ENABLED=false
```

### Option 2: Full Integration
```bash
# Edit .env.local and set:
KNOWLEDGE_STATION_ENABLED=true
KNOWLEDGE_STATION_API_TOKEN=your_actual_token_here
```

### Get Darwin API Token (Required)
1. Go to: https://www.nationalrail.co.uk/100296.aspx
2. Register for free Darwin API access
3. Replace `your_darwin_api_token_here` with your actual token
4. Restart development server

## API Endpoints Available

### Darwin Only
- `GET /api/darwin/departures?crs=KGX`

### Knowledge Station (if enabled)
- `GET /api/knowledge-station/status`
- `GET /api/knowledge-station/station?crs=KGX`
- `GET /api/knowledge-station/disruptions`

### Unified (Combines Both)
- `GET /api/unified/departures?crs=KGX&includeStationInfo=true&includeDisruptions=true`

## PowerShell "Broken Pipe" Fix

If you're seeing "broken pipe" errors, use **Command Prompt** instead:
1. Press `Win+R`, type `cmd`, press Enter
2. Navigate to project: `cd "C:\Users\ericm\Desktop\Rail app\Railhopp"`
3. Run: `npm run dev`

## Test Integration

After configuring your Darwin token:
```bash
node scripts/test-integration.js
```

## Your Frontend Integration

Update your frontend to use the unified endpoint:

```javascript
// Instead of just Darwin
const response = await fetch('/api/darwin/departures?crs=KGX');

// Use unified endpoint for enhanced data
const response = await fetch('/api/unified/departures?crs=KGX&includeStationInfo=true&includeDisruptions=true');

const data = await response.json();
console.log('Data source:', data.dataSource); // 'darwin' or 'combined'
console.log('Knowledge Station available:', data.knowledgeStationAvailable);
```

## Summary

✅ **Integration is ready** - just needs Darwin API token  
✅ **Architecture is sound** - Darwin primary, Knowledge Station enhancement  
✅ **Error handling works** - graceful fallbacks  
⚠️ **Need Darwin token** - get from National Rail  
⚠️ **Choose Knowledge Station option** - enable with token or disable  

Your system will work perfectly with just Darwin API. Knowledge Station adds extra features like:
- Station facilities information
- Enhanced disruption data  
- Real-time tracking details

But it's completely optional!
