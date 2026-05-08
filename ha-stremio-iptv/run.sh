#!/bin/sh
CONFIG_PATH=/data/options.json

echo "[Add-on] Lettura configurazione da Home Assistant..."

export PORT=$(jq --raw-output '.port // 3000' $CONFIG_PATH)
export M3U_URL=$(jq --raw-output '.m3u_url // empty' $CONFIG_PATH)
export EPG_URL=$(jq --raw-output '.epg_url // empty' $CONFIG_PATH)
export REFRESH_INTERVAL_MIN=$(jq --raw-output '.refresh_interval_minutes // 60' $CONFIG_PATH)
export EASYPROXY_URL=$(jq --raw-output '.easyproxy_url // empty' $CONFIG_PATH)
export EASYPROXY_PASSWORD=$(jq --raw-output '.easyproxy_password // empty' $CONFIG_PATH)

echo "[Add-on] Avvio server Stremio sulla porta $PORT..."
exec node /usr/src/app/index.js
