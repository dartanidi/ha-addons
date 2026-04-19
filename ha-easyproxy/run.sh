#!/bin/bash
echo "[INFO] Avvio EasyProxy Add-on (Versione Light - Rete Host) ..."

CONFIG_PATH="/data/options.json"

# 1. Lettura parametri da Home Assistant
export PORT=$(jq -r '.port // 7860' $CONFIG_PATH)
export GLOBAL_PROXY=$(jq -r '.global_proxy // empty' $CONFIG_PATH)
export TRANSPORT_ROUTES=$(jq -r '.transport_routes // empty' $CONFIG_PATH)
export MPD_MODE=$(jq -r '.mpd_mode // "legacy"' $CONFIG_PATH)
export API_PASSWORD=$(jq -r '.password // empty' $CONFIG_PATH)
export LOG_LEVEL=$(jq -r '.log_level // "WARNING"' $CONFIG_PATH)

# 2. Forzature assolute
export DVR_ENABLED="false"

cd /app
echo "[INFO] Configurazioni caricate:"
echo "       - Porta in ascolto: $PORT"
echo "       - Log Level: $LOG_LEVEL"
echo "       - DVR: Disattivato"

echo "[INFO] Avvio del server nativo AIOHTTP tramite Xvfb..."

# 3. Avvio con display virtuale (necessario per Playwright/Chromium)
exec xvfb-run -a --server-args='-screen 0 1366x768x24' python3 app.py
