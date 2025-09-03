#!/bin/bash

# Heroku WebSocket Deployment Script
echo "🚀 Deploying Railhopp WebSocket Server to Heroku..."

# 1. Install Heroku CLI (if not already installed)
# npm install -g heroku

# 2. Login to Heroku
echo "📝 Logging into Heroku..."
heroku login

# 3. Create Heroku app
echo "🏗️  Creating Heroku app..."
heroku create railhopp-websocket --region us

# 4. Set environment variables
echo "⚙️  Setting environment variables..."
heroku config:set NODE_ENV=production -a railhopp-websocket
heroku config:set PORT=\$PORT -a railhopp-websocket

# 5. Deploy using git subtree (deploy only websocket-server folder)
echo "🚀 Deploying WebSocket server..."
git subtree push --prefix websocket-server heroku main

# 6. Open app
heroku open -a railhopp-websocket

echo "✅ WebSocket server deployed successfully!"
echo "📋 Next steps:"
echo "   1. Add to GitHub secrets:"
echo "      HEROKU_API_KEY=(get from heroku auth:token)"
echo "      HEROKU_APP_NAME=railhopp-websocket"  
echo "      WEBSOCKET_URL=https://railhopp-websocket.herokuapp.com"
echo "   2. Update your GitHub workflow to use Heroku instead of Render"
