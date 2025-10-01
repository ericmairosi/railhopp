#!/usr/bin/env sh
# POSIX-compliant helper to fetch/test Network Rail data using existing Node tester
# Usage: bin/fetch_test_data.sh [--feed NAME] [--since DATE] [--raw]
# Examples:
#   bin/fetch_test_data.sh --feed TRAIN_MOVEMENTS --since today
#   bin/fetch_test_data.sh --raw

set -eu

FEED=""
SINCE=""
RAW=0

# Minimal arg parsing
while [ $# -gt 0 ]; do
  case "$1" in
    --feed)
      shift
      FEED=${1:-}
      shift || true
      ;;
    --since)
      shift
      SINCE=${1:-}
      shift || true
      ;;
    --raw)
      RAW=1
      shift
      ;;
    -h|--help)
      cat <<EOF
Usage: $0 [--feed NAME] [--since DATE] [--raw]
Runs the Node-based Network Rail test harness in apps/web/test-network-rail.js
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP_DIR="$ROOT_DIR/apps/web"
TEST_FILE="$APP_DIR/test-network-rail.js"

if [ ! -f "$TEST_FILE" ]; then
  echo "Test harness not found: $TEST_FILE" >&2
  exit 1
fi

# Load env (.env.local preferred)
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

# Build command
CMD="node $TEST_FILE"
if [ "$RAW" -eq 1 ]; then
  CMD="$CMD"
fi

# Provide FEED/SINCE as env hints for future extension; the current test harness ignores them
if [ -n "$FEED" ]; then export TEST_FEED="$FEED"; fi
if [ -n "$SINCE" ]; then export TEST_SINCE="$SINCE"; fi

# Execute
cd "$APP_DIR"
exec $CMD
