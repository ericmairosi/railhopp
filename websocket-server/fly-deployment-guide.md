# Quick Fly.io Deployment Guide

## Why Fly.io is Perfect for Railhopp

1. **Global Edge**: Deploy close to your users
2. **Always On**: No cold starts for real-time data
3. **Great Pricing**: Pay only for what you use
4. **WebSocket Optimized**: Built for real-time apps
5. **UK Friendly**: Can deploy in London region

## Quick Setup (5 minutes)

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Windows
iwr https://fly.io/install.ps1 -useb | iex

# Linux
curl -L https://fly.io/install.sh | sh
```

### 2. Deploy Your WebSocket Server

```bash
# In your websocket-server directory
cd /c/Users/ericm/Desktop/Rail\ app/Railhopp/websocket-server

# Login and setup
fly auth login
fly launch --name railhopp-websocket

# Choose settings:
# - Region: London (lhr) - closest to UK users
# - Add Postgres? No
# - Deploy now? Yes
```

### 3. Configure for Production

Fly will auto-generate a `fly.toml` file:

```toml
app = "railhopp-websocket"
primary_region = "lhr"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = false
  auto_start_machines = false

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

[env]
  NODE_ENV = "production"
  PORT = "3001"
```

### 4. Deploy

```bash
fly deploy
```

### 5. Your Service Will Be Live At:

```
https://railhopp-websocket.fly.dev
wss://railhopp-websocket.fly.dev
```

## Cost Estimate

- **256MB VM**: ~$2/month
- **1GB VM**: ~$6/month
- **Network**: $0.02/GB (very cheap)
- **Total**: $2-5/month typically

## Advantages Over Others

✅ **No sleeping** - always ready for connections  
✅ **Edge deployment** - 1ms latency in London  
✅ **Auto-scaling** - handles traffic spikes  
✅ **WebSocket optimized** - perfect for real-time data  
✅ **Great monitoring** - built-in metrics  
✅ **Easy updates** - `fly deploy` anytime

## GitHub Actions Integration

We can easily update your workflow to deploy to Fly.io:

```yaml
deploy-websocket:
  steps:
    - name: Setup Fly.io CLI
      uses: superfly/flyctl-actions/setup-flyctl@master

    - name: Deploy to Fly.io
      run: flyctl deploy --remote-only
      env:
        FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
      working-directory: ./websocket-server
```

Much simpler than other platforms!
