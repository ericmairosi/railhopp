#!/bin/bash

# Pre-deployment validation script for Railhopp

echo "🔍 Validating deployment configuration for Railhopp..."

ERRORS=0

# Check required files exist
echo "📁 Checking required files..."

REQUIRED_FILES=(
    "fly.toml"
    "Dockerfile.production"
    "apps/web/package.json"
    "apps/web/next.config.ts"
    "apps/web/src/app/api/health/route.ts"
    "turbo.json"
    "pnpm-lock.yaml"
    "pnpm-workspace.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ Found: $file"
    fi
done

# Check package.json scripts
echo "📋 Checking package.json scripts..."
if ! grep -q "fly:deploy" package.json; then
    echo "❌ Missing fly:deploy script in package.json"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Found fly:deploy script"
fi

# Check fly.toml configuration
echo "⚙️  Checking fly.toml configuration..."
if ! grep -q "dockerfile.*Dockerfile.production" fly.toml; then
    echo "❌ fly.toml doesn't reference Dockerfile.production"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Dockerfile.production referenced in fly.toml"
fi

if ! grep -q "primary_region.*lhr" fly.toml; then
    echo "⚠️  Warning: Primary region is not set to 'lhr' (London) - optimal for UK railway APIs"
fi

# Check Next.js configuration
echo "⚛️  Checking Next.js configuration..."
if ! grep -q "output.*standalone" apps/web/next.config.ts; then
    echo "❌ Next.js not configured for standalone output"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Next.js standalone mode enabled"
fi

# Check environment setup
echo "🔐 Checking environment variables..."
if [ ! -f ".env.local" ] && [ ! -f "apps/web/.env.local" ]; then
    echo "⚠️  Warning: No .env.local file found - make sure to set environment variables in Fly.io"
fi

# Check startup script permissions
echo "🚀 Checking startup script..."
if [ ! -x "scripts/start.sh" ]; then
    echo "⚠️  Making start.sh executable..."
    chmod +x scripts/start.sh
fi

# Summary
echo ""
echo "📊 Validation Summary:"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Ready for deployment."
    echo ""
    echo "🚀 To deploy to Fly.io:"
    echo "   1. Run: fly launch --no-deploy"
    echo "   2. Set secrets: fly secrets set DARWIN_API_KEY=your_key_here"
    echo "   3. Deploy: fly deploy"
    exit 0
else
    echo "❌ Found $ERRORS error(s). Please fix these issues before deploying."
    exit 1
fi
