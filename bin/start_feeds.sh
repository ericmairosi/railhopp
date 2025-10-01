#!/usr/bin/env sh
# POSIX-compliant helper to start the Railhopp web dev server (which initializes feeds)
# Usage: bin/start_feeds.sh [--port PORT]

set -eu

PORT=3003

# Parse args (very small POSIX parser)
while [ $# -gt 0 ]; do
  case "$1" in
    --port)
      shift
      PORT=${1:-$PORT}
      shift || true
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP_DIR="$ROOT_DIR/apps/web"

if [ ! -d "$APP_DIR" ]; then
  echo "apps/web not found at $APP_DIR" >&2
  exit 1
fi

# Choose package manager: prefer pnpm, then npm
if command -v pnpm >/dev/null 2>&1; then
  PM=pnpm
elif command -v npm >/dev/null 2>&1; then
  PM=npm
else
  echo "Neither pnpm nor npm found in PATH" >&2
  exit 1
fi

# Ensure env is present (Next.js convention uses .env.local)
if [ -f "$ROOT_DIR/.env.local" ]; then
  ENV_FILE="$ROOT_DIR/.env.local"
elif [ -f "$ROOT_DIR/.env" ]; then
  ENV_FILE="$ROOT_DIR/.env"
else
  ENV_FILE=""
fi

if [ -n "$ENV_FILE" ]; then
  echo "Loading environment from $ENV_FILE"
  # shellcheck source=/dev/null
  set -a; . "$ENV_FILE"; set +a
fi

# Run dev server from apps/web so Next.js picks config correctly
cd "$APP_DIR"

# Next dev accepts --port; ensure consistency
if [ "$PM" = "pnpm" ]; then
  exec pnpm dev -- --port "$PORT"
else
  exec npm run dev -- --port "$PORT"
fi
