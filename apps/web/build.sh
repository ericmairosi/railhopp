#!/bin/bash
set -e

echo "🚀 Starting Railhopp web build..."
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Check if we're in the Vercel build environment
if [[ -d "apps/web" && ! -f "package.json" ]]; then
    echo "📂 Detected monorepo structure, changing to apps/web directory"
    cd apps/web
fi

echo "Now in directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Make sure we're in the right directory
if [[ ! -f package.json ]]; then
    echo "❌ package.json not found in current directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Running build..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Build output:"
ls -la .next/ || echo "No .next directory found"
