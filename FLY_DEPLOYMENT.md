# 🚀 Fly.io Deployment Guide for Railhopp

This guide will help you deploy your Railhopp railway application to Fly.io, which is **perfectly suited** for your real-time, API-heavy application.

## Why Fly.io is Perfect for Railhopp

✅ **Full Next.js Support** - All your API routes work perfectly  
✅ **WebSocket Support** - Real-time train updates work seamlessly  
✅ **Global Edge Deployment** - 35 regions for optimal performance  
✅ **Hardware Isolation** - Reliable performance for railway data  
✅ **Monorepo Compatible** - Handles your Turbo setup excellently

## Prerequisites

### 1. Install Fly.io CLI

**macOS/Linux:**

```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell):**

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### 2. Create Fly.io Account

```bash
fly auth signup
# or if you have an account
fly auth login
```

### 3. Verify Installation

```bash
fly version
```

## Initial Setup

### 1. Launch Your App (One-Time Setup)

```bash
# This creates the app on Fly.io (run from your project root)
fly launch --no-deploy

# When prompted:
# - App Name: railhopp (or your preferred name)
# - Region: lhr (London Heathrow - optimal for UK railway APIs)
# - PostgreSQL: No (unless you plan to add a database)
# - Redis: No (unless you need caching)
```

This command will:

- Create the app on Fly.io
- Use your existing `fly.toml` configuration
- Set up the application without deploying yet

### 2. Set Environment Variables

Set your railway API keys and other environment variables:

```bash
# Required for Darwin API (UK National Rail)
fly secrets set DARWIN_API_KEY=your_darwin_api_key_here

# Required for RTT.io API
fly secrets set RTT_API_KEY=your_rtt_api_key_here

# Optional: Knowledge Station API
fly secrets set KNOWLEDGE_STATION_API_KEY=your_knowledge_station_key

# Optional: Any other environment variables your app needs
fly secrets set NEXT_PUBLIC_APP_URL=https://railhopp.fly.dev
```

**Note:** Use `fly secrets` instead of environment variables for sensitive data.

## Deployment

### 1. Deploy Your Application

```bash
# Deploy using the configured Dockerfile
fly deploy

# Or use the npm script
npm run fly:deploy
```

### 2. Monitor the Deployment

```bash
# Watch deployment logs
fly logs

# Check application status
fly status

# Open your deployed app
fly open
```

## Configuration Details

### App Configuration (`fly.toml`)

The configuration is optimized for your railway application:

- **Primary Region**: `lhr` (London) - closest to UK railway APIs
- **Memory**: 1GB - sufficient for your API aggregation
- **Always Running**: `min_machines_running = 1` - keeps WebSocket connections alive
- **Health Checks**: Monitors `/api/health` endpoint
- **Auto-rollback**: Enabled for reliability

### Docker Configuration (`Dockerfile.fly`)

Multi-stage build optimized for:

- **Fast builds** with dependency caching
- **Small image size** using Alpine Linux
- **Security** with non-root user
- **Health checks** for monitoring

## Post-Deployment

### 1. Verify Your Deployment

Check that all services are working:

```bash
# Test health endpoint
curl https://your-app.fly.dev/api/health

# Test Darwin API integration
curl https://your-app.fly.dev/api/darwin/departures?crs=KGX

# Monitor real-time logs
fly logs --app your-app-name
```

### 2. Set Up Custom Domain (Optional)

```bash
# Add your custom domain
fly certs add yourdomain.com

# Follow DNS setup instructions
fly certs show yourdomain.com
```

## Scaling and Performance

### 1. Scale Your Application

```bash
# Scale to multiple machines for redundancy
fly scale count 2

# Scale memory if needed
fly scale memory 2048

# Add machines in additional regions
fly scale count 1 --region ams  # Amsterdam
fly scale count 1 --region fra  # Frankfurt
```

### 2. Monitor Performance

```bash
# View metrics
fly dashboard

# Monitor logs in real-time
fly logs -f

# Check machine status
fly status --all
```

## Environment-Specific Configuration

### Development vs Production

Your `fly.toml` automatically sets `NODE_ENV=production`. For different environments:

```bash
# Create staging app
fly launch --copy-config --name railhopp-staging

# Deploy to staging
fly deploy --app railhopp-staging
```

## Troubleshooting

### Common Issues

**1. Build Failures**

```bash
# Check build logs
fly logs --app your-app-name

# Common fixes:
# - Ensure pnpm-lock.yaml is committed
# - Check Node.js version in Dockerfile
# - Verify turbo.json configuration
```

**2. API Route Issues**

```bash
# Test health endpoint
curl https://your-app.fly.dev/api/health

# Check environment variables
fly secrets list

# Verify API keys are set correctly
```

**3. WebSocket Connection Issues**

```bash
# Ensure machines don't auto-stop
fly scale count 1  # Keep at least 1 running

# Check machine status
fly status
```

**4. Memory Issues**

```bash
# Scale memory up
fly scale memory 2048

# Monitor usage
fly dashboard
```

### Debugging

```bash
# SSH into your machine for debugging
fly ssh console

# View application logs
fly logs -f

# Check machine resources
fly status --all
```

## Useful Commands

```bash
# Deployment
npm run fly:deploy          # Deploy application
npm run fly:open            # Open app in browser
npm run fly:status          # Check app status
npm run fly:logs            # View logs
npm run fly:ssh             # SSH into machine

# Management
fly apps list               # List all your apps
fly scale show              # Show current scaling
fly secrets list            # List environment variables
fly releases                # Show deployment history
fly dashboard               # Open web dashboard

# Debugging
fly doctor                  # Check for common issues
fly ping                    # Test connectivity
fly checks list             # Show health check status
```

## Cost Optimization

### Free Tier Limits

- 3 shared-cpu-1x machines
- 160GB data transfer/month
- Automatic suspension after inactivity

### Optimization Tips

```bash
# Use shared CPUs for lower costs
fly scale vm shared-cpu-1x

# Enable auto-stop for dev/staging environments
# (Not recommended for production with WebSockets)
fly scale count 0 --region ams  # Remove extra regions if not needed
```

## Production Best Practices

### 1. High Availability

```bash
# Deploy in multiple regions
fly scale count 1 --region lhr  # London (primary)
fly scale count 1 --region ams  # Amsterdam (backup)
```

### 2. Monitoring

- Set up alerts in Fly.io dashboard
- Monitor `/api/health` endpoint
- Use structured logging in your app

### 3. Database (When Ready)

```bash
# Add PostgreSQL when needed
fly postgres create

# Connect to your app
fly postgres attach <postgres-app-name>
```

### 4. Backup and Recovery

```bash
# Create app backups
fly volumes list
fly volumes snapshot create <volume-id>
```

## Next Steps

1. **Test thoroughly** - Verify all your railway APIs work
2. **Set up monitoring** - Configure alerts and logging
3. **Custom domain** - Point your domain to the Fly.io app
4. **Performance tuning** - Monitor and scale as needed
5. **Database integration** - Add PostgreSQL when you're ready for user data

## Support Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Next.js on Fly.io Guide](https://fly.io/docs/js/frameworks/nextjs/)
- [Fly.io Community Forum](https://community.fly.io/)
- [Fly.io Discord](https://fly.io/discord)

---

Your Railhopp application is now perfectly configured for Fly.io deployment with:

- ✅ Real-time WebSocket support
- ✅ All API routes functioning
- ✅ Optimized for UK railway data
- ✅ Production-ready configuration
- ✅ Comprehensive monitoring and health checks

Deploy with confidence! 🚂
