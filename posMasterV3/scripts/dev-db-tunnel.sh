#!/usr/bin/env bash
#
# Dev-only: tunnel the production MongoDB to localhost:27017.
#
# posmaster-mongo publishes no host port (by design), so it cannot be reached
# from a developer machine directly. This forwards to the container's Docker IP
# via SSH and reconnects automatically if the link drops.
#
# Pair it with this in .env.online:
#   MONGODB_URI=mongodb://<user>:<pass>@127.0.0.1:27017/POSmaster?authSource=admin&directConnection=true
#
# directConnection=true is required: the replica set advertises the internal
# hostname "posmaster-mongo", which this machine cannot resolve, so normal
# topology discovery would hang.
#
#   Usage:  ./scripts/dev-db-tunnel.sh          (foreground, Ctrl-C to stop)
#           ./scripts/dev-db-tunnel.sh &        (background)
#
# WARNING: this points local development at LIVE production data. Sales rung up
# locally become real sales.

set -uo pipefail

SSH_HOST="${POS_DB_TUNNEL_HOST:-root@37.60.226.84}"
MONGO_IP="${POS_DB_TUNNEL_IP:-10.0.20.3}"
LOCAL_PORT="${POS_DB_TUNNEL_PORT:-27017}"

if lsof -tiTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[tunnel] port $LOCAL_PORT is already in use — stop the existing tunnel first:"
  echo "         lsof -tiTCP:$LOCAL_PORT -sTCP:LISTEN | xargs kill"
  exit 1
fi

echo "[tunnel] 127.0.0.1:$LOCAL_PORT -> $MONGO_IP:27017 via $SSH_HOST"
echo "[tunnel] reconnects automatically; Ctrl-C to stop"

trap 'echo; echo "[tunnel] stopped"; exit 0' INT TERM

while true; do
  ssh -N \
    -o BatchMode=yes \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=3 \
    -o TCPKeepAlive=yes \
    -o ConnectTimeout=15 \
    -L "${LOCAL_PORT}:${MONGO_IP}:27017" \
    "$SSH_HOST"

  # Reached only when ssh exits — network blip, idle timeout, server restart.
  echo "[tunnel] link dropped, reconnecting in 3s..."
  sleep 3
done
