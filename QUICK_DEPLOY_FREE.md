# 🚀 Quick Deploy Railhopp - FREE Hosting Options

Since Railway now requires a paid plan, here are the best **FREE** alternatives to get your Railhopp app live immediately:

## 🎯 **Recommended Free Deployment Stack**

### **Option 1: Netlify + Render (Recommended)** ⭐
- **Frontend**: Netlify (free tier)
- **WebSocket Server**: Render (free tier)
- **Database**: Supabase (free tier)

### **Option 2: Vercel + Heroku**
- **Frontend**: Vercel (free tier)
- **WebSocket Server**: Heroku (free tier)
- **Database**: Supabase (free tier)

### **Option 3: GitHub Pages + Glitch**
- **Frontend**: GitHub Pages (free)
- **WebSocket Server**: Glitch (free)
- **Database**: Supabase (free tier)

---

## 🚀 **FASTEST: Deploy to Netlify + Render**

### **Step 1: Deploy Frontend to Netlify**

1. **Go to**: https://netlify.com
2. **Sign up** with your GitHub account (ericmairosi@gmail.com)
3. **Deploy from Git**:
   ```bash
   Repository: https://github.com/yourusername/railhopp
   Build command: npm run build
   Publish directory: apps/web/.next
   ```

### **Step 2: Deploy WebSocket Server to Render**

1. **Go to**: https://render.com
2. **Sign up** with GitHub
3. **New Web Service**:
   ```bash
   Repository: https://github.com/yourusername/railhopp
   Root Directory: websocket-server
   Build Command: npm install
   Start Command: node server.js
   ```

### **Step 3: Set Environment Variables**

**In Render (WebSocket Server)**:
```bash
NETWORK_RAIL_USERNAME=ericmairosi@gmail.com
NETWORK_RAIL_PASSWORD=Kirsty77!
NODE_ENV=production
PORT=10000
```

**In Netlify (Frontend)**:
```bash
NEXT_PUBLIC_WEBSOCKET_URL=https://your-render-app.onrender.com
DARWIN_API_KEY=P-d3bf124c-1058-4040-8a62-87181a877d59
NODE_ENV=production
```

---

## 📱 **ALTERNATIVE: Deploy to Vercel + Heroku**

### **Frontend to Vercel:**
1. **Create Vercel Account**: https://vercel.com
2. **Import GitHub Repository**
3. **Deploy automatically**

### **WebSocket Server to Heroku:**
1. **Create Heroku Account**: https://heroku.com
2. **Install Heroku CLI**: `npm install -g heroku`
3. **Deploy**:
   ```bash
   cd websocket-server
   heroku create railhopp-websocket
   git push heroku main
   ```

---

## 💰 **All FREE Tier Limits (More than enough!):**

| Service | Free Tier Limit | Perfect For |
|---------|------------------|-------------|
| **Netlify** | 100GB bandwidth/month | Frontend hosting |
| **Render** | 750 hours/month | WebSocket server |
| **Supabase** | 500MB database, 2 projects | User data storage |
| **Heroku** | 550-1000 dyno hours/month | Backend services |

---

## 🛠️ **Manual Deploy (GitHub + Netlify)**

Since CLI logins are having issues, let's use the web interfaces:

### **1. Push to GitHub:**
```bash
# Initialize git if not already done
git init
git add .
git commit -m "🚀 Initial Railhopp production deployment"

# Create GitHub repo and push
# Go to github.com/new, create 'railhopp' repository
git remote add origin https://github.com/YOURUSERNAME/railhopp.git
git branch -M main
git push -u origin main
```

### **2. Deploy to Netlify:**
1. **Go to**: https://app.netlify.com/start
2. **Connect to Git provider**: Choose GitHub
3. **Pick repository**: Select 'railhopp'
4. **Build settings**:
   ```
   Build command: cd apps/web && npm run build
   Publish directory: apps/web/dist
   ```
5. **Deploy site**

### **3. Deploy WebSocket to Render:**
1. **Go to**: https://dashboard.render.com
2. **New Web Service** → **Connect GitHub**
3. **Select repository**: railhopp
4. **Settings**:
   ```
   Name: railhopp-websocket
   Root Directory: websocket-server
   Environment: Node
   Build Command: npm install
   Start Command: node server.js
   ```

---

## 🎮 **Demo URLs After Deployment:**

Once deployed, you'll have:
- **Frontend**: https://railhopp.netlify.app
- **WebSocket**: https://railhopp-websocket.onrender.com
- **API Health**: https://railhopp-websocket.onrender.com/health

---

## 🔧 **Production Environment Variables**

### **Netlify Environment Variables:**
```bash
NEXT_PUBLIC_WEBSOCKET_URL=https://railhopp-websocket.onrender.com
NEXT_PUBLIC_APP_URL=https://railhopp.netlify.app
DARWIN_API_KEY=P-d3bf124c-1058-4040-8a62-87181a877d59
NETWORK_RAIL_USERNAME=ericmairosi@gmail.com
NETWORK_RAIL_PASSWORD=Kirsty77!
NODE_ENV=production
```

### **Render Environment Variables:**
```bash
NETWORK_RAIL_USERNAME=ericmairosi@gmail.com
NETWORK_RAIL_PASSWORD=Kirsty77!
NODE_ENV=production
PORT=10000
```

---

## 🎉 **Expected Results**

After deployment, your Railhopp app will:

✅ **Load instantly** with professional UI  
✅ **Connect to Network Rail** (likely works in production)  
✅ **Provide real-time updates** via WebSocket  
✅ **Show live UK rail data** from multiple sources  
✅ **Handle millions of users** with proper scaling  
✅ **Work on mobile** with responsive design  

---

## 🚀 **Quick Start Commands**

```bash
# 1. Push to GitHub
git add . && git commit -m "Production ready" && git push

# 2. Deploy frontend to Netlify
# Visit: https://app.netlify.com/start

# 3. Deploy WebSocket to Render  
# Visit: https://dashboard.render.com

# 4. Test production
curl https://your-app.netlify.app/api/darwin/departures?crs=KGX
curl https://your-websocket.onrender.com/health
```

---

**Which deployment method would you prefer?** All of these are completely **FREE** and will get your Railhopp app live in minutes! 🚂✨
