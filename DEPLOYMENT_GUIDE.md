# 🚀 Railhopp Production Deployment Guide

This guide walks you through deploying Railhopp to production with full real-time capabilities.

## 📋 Prerequisites

- [ ] GitHub account with your Railhopp code
- [ ] Domain name (optional but recommended)
- [ ] Darwin API credentials (working)
- [ ] Network Rail credentials (working)

## 🏗️ Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Production Setup                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Vercel     │    │   Railway    │    │   Supabase   │   │
│  │ (Next.js App)│◄──►│ (WebSocket)  │◄──►│ (Database)   │   │
│  │              │    │              │    │              │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                     │                   │         │
│         ▼                     ▼                   ▼         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Web Frontend │    │Real-time Data│    │  Data Store  │   │
│  │ UK Rail Info │    │Train Updates │    │ User Prefs   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🌟 Step-by-Step Deployment

### Step 1: Prepare Your Repository

```bash
# Commit all your changes
git add .
git commit -m "🚀 Prepare for production deployment"
git push origin main

# Create a production branch (optional)
git checkout -b production
git push origin production
```

### Step 2: Deploy to Vercel (Web Application)

**2.1 Install Vercel CLI:**
```bash
npm i -g vercel
```

**2.2 Deploy to Vercel:**
```bash
# In your project root
vercel --prod

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: railhopp
# - Directory: ./
# - Override settings? No
```

**2.3 Configure Environment Variables in Vercel:**

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add these variables:
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Rail APIs
DARWIN_API_KEY=P-d3bf124c-1058-4040-8a62-87181a877d59
NETWORK_RAIL_USERNAME=ericmairosi@gmail.com
NETWORK_RAIL_PASSWORD=Kirsty77!
NETWORK_RAIL_ENABLED=true

# WebSocket (will be set after Step 3)
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket-domain.railway.app

# App Config
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### Step 3: Deploy WebSocket Server to Railway

**3.1 Create Railway Account:**
- Go to [Railway](https://railway.app)
- Sign up with GitHub

**3.2 Deploy WebSocket Server:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway new

# Deploy WebSocket server
cd websocket-server
railway up
```

**3.3 Configure Environment Variables in Railway:**

In Railway dashboard → Your Project → Variables:
```bash
NETWORK_RAIL_USERNAME=ericmairosi@gmail.com
NETWORK_RAIL_PASSWORD=Kirsty77!
NODE_ENV=production
PORT=3001
```

**3.4 Get WebSocket URL:**
- Copy the Railway deployment URL (e.g., `https://your-project.railway.app`)
- Update Vercel environment variable `NEXT_PUBLIC_WEBSOCKET_URL`

### Step 4: Set Up Database (Supabase)

**4.1 Create Supabase Project:**
- Go to [Supabase](https://supabase.com)
- Create new project
- Choose region (Europe West - London for UK app)

**4.2 Run Database Setup:**
```sql
-- Run this in Supabase SQL Editor
-- (Use the schema from supabase_schema_complete.sql)

-- Create tables for train data
CREATE TABLE train_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_id VARCHAR(20) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    location_stanox INTEGER,
    location_crs VARCHAR(3),
    planned_timestamp TIMESTAMP,
    actual_timestamp TIMESTAMP,
    delay_minutes INTEGER DEFAULT 0,
    platform VARCHAR(10),
    toc VARCHAR(10),
    source VARCHAR(20) DEFAULT 'network-rail',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_train_movements_train_id ON train_movements(train_id);
CREATE INDEX idx_train_movements_location_crs ON train_movements(location_crs);
CREATE INDEX idx_train_movements_created_at ON train_movements(created_at);

-- Create table for user preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    favorite_stations TEXT[],
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**4.3 Get Database Credentials:**
- Project Settings → API → Copy URL and keys
- Add to both Vercel and Railway environment variables

### Step 5: Configure Custom Domain (Optional)

**5.1 Vercel Domain:**
- Vercel Dashboard → Domains → Add Domain
- Configure DNS: Add CNAME record pointing to `cname.vercel-dns.com`

**5.2 Railway Domain:**
- Railway Dashboard → Settings → Domain
- Add custom domain for WebSocket server

**5.3 Update Environment Variables:**
```bash
# Update in Vercel
NEXT_PUBLIC_APP_URL=https://railhopp.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.railhopp.com

# Update frontend WebSocket hook
# apps/web/src/lib/hooks/useRealTimeUpdates.ts
url = 'wss://api.railhopp.com'
```

### Step 6: GitHub Actions CI/CD (Optional)

**6.1 Set up GitHub Secrets:**

Go to GitHub → Repository → Settings → Secrets → Actions

Add these secrets:
```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
RAILWAY_TOKEN=your_railway_token
RAILWAY_PROJECT_ID=your_railway_project_id
PRODUCTION_URL=https://railhopp.com
WEBSOCKET_URL=https://api.railhopp.com
```

**6.2 Enable Auto-Deploy:**
- Push to main/master branch triggers automatic deployment
- Pull requests get preview deployments

## 🧪 Testing Production Deployment

### Test Web Application
```bash
curl https://railhopp.com/api/health
# Should return: {"status": "healthy", ...}
```

### Test WebSocket Server
```bash
curl https://api.railhopp.com/health
# Should return: {"status": "healthy", "clients": 0, ...}
```

### Test Real-time Updates
1. Open: `https://railhopp.com/realtime-test.html`
2. Click "Connect" - should show "Connected" status
3. Click simulation buttons - should see live updates

### Test Darwin API
```bash
curl https://railhopp.com/api/darwin/departures?crs=KGX
# Should return real departure data (not mock)
```

## 🔧 Production Configuration

### Performance Settings

**Vercel Function Timeout:**
```json
// vercel.json
{
  "functions": {
    "apps/web/src/app/api/**": {
      "maxDuration": 30
    }
  }
}
```

**Railway Resource Allocation:**
- Memory: 512MB minimum
- CPU: 1 vCPU minimum
- Enable auto-scaling

### Monitoring Setup

**1. Add Health Check Endpoints:**
```javascript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      darwin: 'operational',
      networkRail: 'operational',
      database: 'connected'
    }
  });
}
```

**2. Set Up Uptime Monitoring:**
- Use services like Uptime Robot, Pingdom, or StatusPage
- Monitor both web app and WebSocket server
- Set up alerts for downtime

### Security Configuration

**Environment Variables:**
- ✅ Never commit API keys to Git
- ✅ Use strong passwords for Network Rail
- ✅ Rotate secrets regularly
- ✅ Enable 2FA on all services

**CORS Configuration:**
```javascript
// apps/web/next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://railhopp.com" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
        ],
      },
    ];
  },
};
```

## 📊 Production Checklist

### Pre-Launch
- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] WebSocket server responding to health checks
- [ ] Darwin API returning real data (not mock)
- [ ] Network Rail credentials working
- [ ] Real-time updates flowing
- [ ] Error handling tested
- [ ] Custom domain configured (if applicable)

### Launch
- [ ] Announce to users
- [ ] Monitor error rates
- [ ] Check API response times
- [ ] Verify WebSocket connections
- [ ] Monitor database performance
- [ ] Check real-time data accuracy

### Post-Launch
- [ ] Set up monitoring dashboards
- [ ] Configure alerting
- [ ] Plan capacity scaling
- [ ] Document troubleshooting procedures
- [ ] Schedule regular backups

## 🔍 Troubleshooting

### Common Issues

**1. Darwin API returns 401:**
```bash
# Check your Darwin API key
curl -H "Authorization: Bearer YOUR_KEY" https://railhopp.com/api/darwin/departures?crs=KGX
```

**2. WebSocket connection fails:**
```bash
# Check WebSocket server health
curl https://api.railhopp.com/health

# Check environment variables
# Ensure NEXT_PUBLIC_WEBSOCKET_URL is correct
```

**3. Network Rail not connecting:**
- Verify credentials in Railway dashboard
- Check server logs in Railway
- Ensure STOMP port 61618 is accessible

**4. Database connection issues:**
- Verify Supabase URLs and keys
- Check connection pooling limits
- Review database logs

### Getting Help

1. **Check Logs:**
   - Vercel: Function logs in dashboard
   - Railway: Real-time logs in dashboard
   - Supabase: Logs & monitoring section

2. **Test Endpoints:**
   ```bash
   # Health checks
   curl https://railhopp.com/api/health
   curl https://api.railhopp.com/health
   
   # API tests  
   curl https://railhopp.com/api/darwin/departures?crs=KGX
   curl https://railhopp.com/api/websocket
   ```

3. **Monitor Performance:**
   - Vercel Analytics
   - Railway Metrics
   - Supabase Performance

## 🎉 Success!

Once deployed, your Railhopp application will provide:

- **⚡ Real-time train updates** from Network Rail
- **📱 Live departure boards** with Darwin API
- **🔄 WebSocket connections** for instant updates
- **📈 Production scalability** with proper infrastructure
- **🔒 Secure API management** with environment variables
- **📊 Performance monitoring** and health checks

Your users will have access to the most comprehensive and fastest UK rail information platform available!

---

**Need help?** Check the logs, test the endpoints, and refer to this guide. Your Railhopp production deployment should now be live and serving real-time UK rail data to users! 🚂✨
