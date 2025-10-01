# Migration Plan: Render → Fly.io

## When to Migrate

**Migrate to Fly.io when you experience:**

- ✅ Users complaining about connection delays (due to sleeping)
- ✅ More than 50+ daily active users
- ✅ Need better performance for UK users
- ✅ Want always-on WebSocket connections
- ✅ Ready to pay $2-5/month for better service

## Migration Process (30 minutes)

### Phase 1: Set Up Fly.io (Parallel to Render)

1. **Install Fly CLI**:

   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Deploy to Fly.io**:

   ```bash
   cd websocket-server
   fly auth login
   fly launch --name railhopp-websocket-prod
   # Choose London (lhr) region
   ```

3. **Test both services** running in parallel

### Phase 2: Update Your Web App

4. **Update WebSocket URL** in your Next.js app:

   ```javascript
   // Before (Render)
   const wsUrl = 'wss://railhopp-websocket.onrender.com'

   // After (Fly.io)
   const wsUrl = 'wss://railhopp-websocket-prod.fly.dev'
   ```

### Phase 3: Switch DNS/URLs

5. **Deploy web app** with new WebSocket URL
6. **Monitor both services** for a day
7. **Shut down Render service** once confident

### Phase 4: Update CI/CD

8. **Update GitHub secrets**:

   ```
   FLY_API_TOKEN=your_fly_token
   WEBSOCKET_URL=https://railhopp-websocket-prod.fly.dev
   ```

9. **Update workflow** to deploy to Fly.io instead of Render

## Cost Comparison

| Service         | Render Free | Render Paid | Fly.io     |
| --------------- | ----------- | ----------- | ---------- |
| **Cost**        | $0          | $7/month    | $2-5/month |
| **Always On**   | ❌ Sleeps   | ✅ Yes      | ✅ Yes     |
| **Performance** | ⭐⭐⭐      | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐ |
| **Global Edge** | ❌ No       | ❌ No       | ✅ Yes     |

## Benefits After Migration

✅ **No more sleeping** - instant connections  
✅ **Better UK performance** - deployed in London  
✅ **Lower latency** - edge deployment  
✅ **Better monitoring** - built-in metrics  
✅ **Easier scaling** - automatic  
✅ **Professional grade** - production ready

## Rollback Plan

If something goes wrong:

1. **Keep Render running** during migration
2. **Switch back URLs** in web app
3. **Re-deploy** with old WebSocket URL
4. **Debug Fly.io** without pressure

## Migration Checklist

- [ ] Fly.io account created
- [ ] Service deployed to Fly.io
- [ ] Both services tested and working
- [ ] Web app updated with new WebSocket URL
- [ ] Users notified of potential brief downtime
- [ ] DNS/URLs switched
- [ ] Monitoring both services
- [ ] Old Render service shut down
- [ ] GitHub workflow updated

## Estimated Timeline

- **Setup Fly.io**: 30 minutes
- **Testing phase**: 1-2 days
- **Switch over**: 30 minutes
- **Monitoring**: 1 week
- **Total**: 1-2 weeks for safe migration

## When NOT to Migrate

- ❌ If you have < 10 regular users
- ❌ If Render free tier works fine for your needs
- ❌ If you're not ready for any monthly costs
- ❌ If your app is still in early development

## Notes

- **No data loss**: WebSocket servers are stateless
- **Zero downtime possible**: Run both in parallel
- **Easy rollback**: Just change URLs back
- **Future-proof**: Fly.io scales much better
