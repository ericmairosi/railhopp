#!/bin/sh

# Startup script for Railhopp in Docker

echo "🚂 Starting Railhopp Railway Application..."

# Check if we're in the right directory
if [ ! -f "apps/web/server.js" ]; then
    echo "❌ Error: server.js not found in apps/web/"
    echo "Current directory contents:"
    ls -la
    echo "apps/web contents:"
    ls -la apps/web/ || echo "apps/web directory not found"
    exit 1
fi

echo "✅ Found server.js, starting application..."

# Start the Next.js application
exec node apps/web/server.js
