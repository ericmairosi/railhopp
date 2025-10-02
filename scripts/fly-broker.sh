#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="apps/darwin-broker/fly.toml"

if ! command -v fly >/dev/null 2>&1; then
  echo "Error: fly CLI not found. Install from https://fly.io/docs/hands-on/install/" >&2
  exit 1
fi

CMD="${1:-}"
case "$CMD" in
  deploy)
    fly deploy -c "$CONFIG_PATH"
    ;;
  logs)
    fly logs -c "$CONFIG_PATH"
    ;;
  open)
    fly open -c "$CONFIG_PATH"
    ;;
  status)
    fly status -c "$CONFIG_PATH"
    ;;
  ssh)
    fly ssh console -c "$CONFIG_PATH"
    ;;
  *)
    echo "Usage: $0 {deploy|logs|open|status|ssh}" >&2
    exit 2
    ;;
 esac