#!/bin/sh
CONFIG_PATH=/data/options.json

echo "[Add-on] Lettura configurazione da Home Assistant..."

export PORT=$(jq --raw-output '.port // 3000' $CONFIG_PATH)
export DAMI_FILTER=$(jq --raw-output '.dami_filter // empty' $CONFIG_PATH)
export EPG_URL=$(jq --raw-output '.epg_url // empty' $CONFIG_PATH)
export REFRESH_INTERVAL_MIN=$(jq --raw-output '.refresh_interval_minutes // 60' $CONFIG_PATH)
export EASYPROXY_URL=$(jq --raw-output '.easyproxy_url // empty' $CONFIG_PATH)
export EASYPROXY_PASSWORD=$(jq --raw-output '.easyproxy_password // empty' $CONFIG_PATH)
export LOGO_BASE_URL=$(jq --raw-output '.logo_base_url // empty' $CONFIG_PATH)

echo "[Add-on] Avvio server Stremio sulla porta $PORT..."
exec node /usr/src/app/index.js
