# Railhopp Multi-API Setup Guide

## Quick Start (Darwin API Only)

Since you don't have RTT.io API key yet, here's how to get started with just Darwin API:

### Step 1: Get Darwin API Token

1. **Visit National Rail Data Portal**
   - Go to: https://www.nationalrail.co.uk/100296.aspx
   - Click "Register for OpenLDBWS"
   - Fill out the registration form
   - You'll receive an API token via email (usually within a few minutes)

2. **Update Your Environment**
   ```bash
   # Open .env.local and replace the placeholder:
   DARWIN_API_TOKEN=your_actual_darwin_token_here
   ```

### Step 2: Test Darwin-Only Setup

1. **Restart your development server:**

   ```bash
   npm run dev
   ```

2. **Run the integration test:**

   ```bash
   node scripts/test-multi-api.js
   ```

3. **Test the API directly:**
   ```bash
   curl "http://localhost:3000/api/unified/departures?crs=KGX&numRows=10"
   ```

## Current Configuration Status

✅ **Multi-API Aggregator**: Ready  
✅ **Darwin API**: Configured (needs real token)  
❌ **RTT.io API**: Disabled (no API key)  
❌ **Knowledge Station**: Disabled  
❌ **Network Rail**: Disabled

## Adding RTT.io Later (Optional Enhancement)

When you're ready to get enhanced real-time data:

### Step 1: Get RTT.io API Key

1. **Visit RTT.io:**
   - Go to: https://www.realtimetrains.co.uk/api
   - Click "Get API Access"
   - Register for a free account
   - Free tier includes 5,000 API calls per month

2. **Enable RTT.io in your config:**
   ```bash
   # Update .env.local:
   RTT_API_KEY=your_rtt_api_key_here
   RTT_ENABLED=true
   ```

### RTT.io Benefits:

- Real-time train positions
- Enhanced delay predictions
- Historical data analysis
- Platform information
- Formation details (number of coaches)

## Environment Configuration Explained

```bash
# Current working setup (Darwin only):
DARWIN_API_TOKEN=your_actual_token_here
MULTI_API_ENABLED=true

# When adding RTT.io:
RTT_API_KEY=your_rtt_key_here
RTT_ENABLED=true

# Other APIs remain disabled for now:
KNOWLEDGE_STATION_ENABLED=false
NETWORK_RAIL_ENABLED=false
TRANSPORT_API_ENABLED=false
```

## Testing Your Setup

### 1. Environment Test

```bash
node scripts/test-multi-api.js
```

### 2. Live Data Test

```bash
node scripts/test-live-data.js
```

### 3. API Endpoint Test

```bash
# King's Cross departures
curl "http://localhost:3000/api/unified/departures?crs=KGX"

# Manchester Piccadilly with filter
curl "http://localhost:3000/api/unified/departures?crs=MAN&filterCrs=LIV&numRows=5"
```

## Expected Behavior

### With Darwin API Only:

- ✅ Real departure/arrival times
- ✅ Platform information
- ✅ Delay information
- ✅ Cancellation alerts
- ❌ Real-time train positions
- ❌ Formation details

### With Darwin + RTT.io:

- ✅ All Darwin features +
- ✅ Real-time train positions
- ✅ Enhanced delay predictions
- ✅ Formation details
- ✅ Historical performance data

## Troubleshooting

### Darwin API Issues:

```bash
# Check if token is valid
curl -H "Authorization: Bearer your_token" \
  "https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx"
```

### PowerShell Broken Pipe:

- Use Command Prompt, Git Bash, or WSL instead
- Or use the test scripts which are PowerShell-safe

### API Not Working:

1. Check `.env.local` has real tokens (not placeholders)
2. Restart dev server after environment changes
3. Check console logs for specific error messages

## Next Steps

1. **Get Darwin token and test basic functionality**
2. **Consider RTT.io for enhanced features**
3. **Explore Network Rail feeds for advanced real-time data**
4. **Add TransportAPI for journey planning features**

## API Cost Comparison

| API          | Free Tier            | Cost                | Features                  |
| ------------ | -------------------- | ------------------- | ------------------------- |
| Darwin       | ✅ Unlimited         | Free                | Basic departures/arrivals |
| RTT.io       | ✅ 5,000 calls/month | £15/month for more  | Enhanced real-time        |
| Network Rail | ✅ Limited           | Free (registration) | Raw train movements       |
| TransportAPI | ✅ 1,000 calls/month | £30/month           | Journey planning          |

**Recommendation**: Start with Darwin (free) + RTT.io (free tier) for the best balance of features and cost.

---

## Cache TTL and Status Endpoints (New)

### Configurable Aggregator Cache TTL

Set the TTL (in seconds) for the multi-API aggregator cache. Defaults to 30 seconds if unset:

```bash
# apps/web/.env.local
MULTI_API_AGGREGATOR_CACHE_TTL_SECONDS=30
```

### Health and Diagnostics

- Service status (availability checks):

```bash
curl "http://localhost:3000/api/status"
```

- Last aggregation diagnostics snapshot (optionally summarized):

```bash
# Raw diagnostics from last departures aggregation
curl "http://localhost:3000/api/status/diagnostics"

# Add summary counts (attempted/available/enhanced/failed)
curl "http://localhost:3000/api/status/diagnostics?summary=true"
```

Notes:
- Diagnostics are captured when you hit `/api/unified/departures` or `/api/v2/departures`.
- If you haven’t called those yet, diagnostics will be empty.
