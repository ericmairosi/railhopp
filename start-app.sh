#!/bin/bash
set -e

# Find the Next.js binary in the pnpm structure
NEXT_BIN=$(find /app/node_modules -name "next" -type f -path "*/dist/bin/next" | head -1)

if [ -z "$NEXT_BIN" ]; then
    echo "Error: Next.js binary not found!"
    echo "Searching in /app/node_modules..."
    find /app/node_modules -name "next" -type f | head -10
    exit 1
fi

echo "Found Next.js binary at: $NEXT_BIN"
echo "Starting Next.js server..."

cd /app/apps/web
exec node "$NEXT_BIN" start -p 3000
