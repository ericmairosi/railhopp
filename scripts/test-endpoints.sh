#!/usr/bin/env bash
set -euo pipefail

: "${WEB_URL:=}"
: "${BROKER_URL:=}"

if [[ -z "$WEB_URL" ]]; then
  echo "Usage: WEB_URL=https://your-web.fly.dev BROKER_URL=https://your-broker.fly.dev $0" >&2
  exit 1
fi

status() {
  echo "--- Testing web health" && curl -fsSL "$WEB_URL/api/health" | sed -e 's/{.*}/<json>/' || true
  echo "--- Testing Darwin departures (KGX)" && curl -fsSL "$WEB_URL/api/darwin/departures?crs=KGX" | head -c 200 || true
  echo "\n--- Testing unified departures (KGX)" && curl -fsSL "$WEB_URL/api/unified/departures?crs=KGX" | head -c 200 || true
  if [[ -n "${BROKER_URL}" ]]; then
    echo "\n--- Testing broker health" && curl -fsSL "$BROKER_URL/health" | head -c 200 || true
    echo "\n--- Testing broker station recent (KGX)" && curl -fsSL "$BROKER_URL/station/KGX/recent" | head -c 200 || true
  fi
}

status