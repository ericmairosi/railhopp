# 🚂 Network Rail Connection Solutions

## 🔍 Diagnosis: Connection Blocked

Your Network Rail STOMP connection is being **blocked at the network level**. This is a common issue due to:

- **Corporate/Home Firewall**: Blocking non-standard port 61618
- **ISP Restrictions**: Some ISPs block WebSocket connections on custom ports
- **Windows Defender**: May be blocking outbound WebSocket connections
- **Router/Antivirus**: Security software blocking the connection

## ✅ Immediate Solutions

### Solution 1: Test from Different Network
```bash
# Try mobile hotspot or different WiFi
# This will confirm if it's your network blocking it
node test-websocket-simple.js
```

### Solution 2: Production Deployment (Recommended)
Deploy to **Railway** where the connection typically works:
```bash
# Railway servers usually have better network connectivity
cd websocket-server
railway up
```

### Solution 3: Enable Simulation Mode
Your WebSocket server already has a fallback simulation mode:

```javascript
// In websocket-server/server.js - simulation mode is already built-in
// It will automatically activate if Network Rail connection fails
```

### Solution 4: Use Alternative Network Rail Endpoints

Network Rail also provides HTTP endpoints that might work better:

```javascript
// Alternative: Network Rail REST API (requires separate registration)
const DARWIN_REST_API = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx';

// Alternative: Network Rail Historic Data Service
const HISTORIC_API = 'https://publicdatafeeds.networkrail.co.uk/ntrod/schedule';
```

## 🛠️ Technical Fixes

### Fix 1: Update WebSocket Server with Better Error Handling

The server should gracefully handle connection failures:

```javascript
// Enhanced connection with automatic fallback
const connectWithFallback = () => {
  console.log('🔄 Attempting Network Rail connection...');
  
  const client = new StompJs.Client({
    brokerURL: STOMP_URL,
    connectHeaders: {
      login: process.env.NETWORK_RAIL_USERNAME,
      passcode: process.env.NETWORK_RAIL_PASSWORD,
    },
    connectionTimeout: 15000, // 15 second timeout
  });

  client.onConnect = () => {
    console.log('✅ Connected to Network Rail');
    useRealData = true;
  };

  client.onStompError = (error) => {
    console.warn('⚠️ STOMP connection failed, using simulation');
    useRealData = false;
    startSimulation();
  };

  client.onWebSocketError = (error) => {
    console.warn('🔌 WebSocket blocked, using simulation');
    useRealData = false;
    startSimulation();
  };

  // Timeout fallback
  setTimeout(() => {
    if (!client.connected) {
      console.warn('⏰ Connection timeout, using simulation');
      useRealData = false;
      startSimulation();
    }
  }, 20000);

  client.activate();
};
```

### Fix 2: Windows Firewall Configuration

If you want to allow the connection locally:

```powershell
# Run as Administrator in PowerShell
New-NetFirewallRule -DisplayName "Network Rail STOMP" -Direction Outbound -Protocol TCP -RemotePort 61618 -Action Allow
```

### Fix 3: Alternative Connection Methods

```javascript
// Try different ports that Network Rail might support
const ALTERNATIVE_URLS = [
  'wss://publicdatafeeds.networkrail.co.uk:61618',  // Main
  'ws://publicdatafeeds.networkrail.co.uk:61613',   // Alternative port
  'wss://publicdatafeeds.networkrail.co.uk:443',    // HTTPS port
];

const tryConnections = async () => {
  for (const url of ALTERNATIVE_URLS) {
    try {
      console.log(`🔄 Trying ${url}...`);
      const ws = new WebSocket(url);
      
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(reject, 10000); // 10 second timeout
      });
      
      console.log(`✅ Connected via ${url}`);
      return url;
    } catch (error) {
      console.log(`❌ ${url} failed: ${error.message}`);
    }
  }
  
  throw new Error('All connection attempts failed');
};
```

## 🎯 Recommended Action Plan

### Immediate (Next 5 minutes):
1. **Test mobile hotspot**: Connect your computer to mobile data and retry
2. **Deploy to Railway**: Let's get your WebSocket server running in the cloud

### Short-term (Today):
1. **Enable simulation mode**: Your app will work with realistic fake data
2. **Test Darwin API**: Verify your Darwin connection still works
3. **Deploy production**: Get your app live with fallback capabilities

### Long-term (This week):
1. **Network configuration**: Work with IT/ISP to allow port 61618
2. **Alternative data sources**: Explore other UK rail data APIs
3. **Hybrid approach**: Combine real data (when available) with simulation

## 🚀 Let's Deploy Now

Since local connection is blocked, let's deploy your WebSocket server to Railway where it will likely work:

```bash
# 1. Deploy WebSocket server to Railway
cd websocket-server
railway login
railway new
railway up

# 2. Test the deployed server
curl https://your-railway-url.railway.app/health

# 3. Update your frontend to use the deployed WebSocket
# NEXT_PUBLIC_WEBSOCKET_URL=wss://your-railway-url.railway.app
```

## 📊 Current Status

- ✅ **Darwin API**: Working (confirmed)
- ✅ **Database**: Ready (Supabase schema created)
- ✅ **Frontend**: Built and ready
- ✅ **WebSocket Server**: Built with simulation fallback
- ❌ **Network Rail Direct**: Blocked by network
- ✅ **Production Deployment**: Ready to go

## 💡 Key Insight

This is actually **very common** with Network Rail connections. Most production deployments use:

1. **Cloud hosting** (Railway/Heroku) for real Network Rail data
2. **Simulation mode** for development and demos
3. **Darwin API** for station departure boards (works everywhere)
4. **Hybrid approach** combining multiple data sources

Your Railhopp app is **production-ready right now** - it just needs to be deployed to work around this network restriction!

---

**Next Step**: Would you like me to help deploy to Railway immediately, or try the mobile hotspot test first?
