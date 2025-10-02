#!/usr/bin/env bash
set -euo pipefail

: "${WEB_URL:=}"

if [[ -z "$WEB_URL" ]]; then
  echo "Usage: WEB_URL=https://your-web.fly.dev $0" >&2
  exit 1
fi

ENDPOINT="${1:-/api/darwin/departures?crs=KGX}"
COUNT="${2:-80}"

errors=0
for i in $(seq 1 "$COUNT"); do
  code=$(curl -o /dev/null -s -w "%{http_code}" "$WEB_URL$ENDPOINT") || true
  echo "[$i/$COUNT] HTTP $code"
  if [[ "$code" == "429" ]]; then
    errors=$((errors+1))
  fi
  sleep 0.2
done

echo "429 responses: $errors"