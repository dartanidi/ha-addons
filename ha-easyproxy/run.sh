#!/bin/bash
echo "[INFO] Avvio EasyProxy Add-on (Versione Super Semplificata) ..."

CONFIG_PATH="/data/options.json"

# 1. Lettura parametri base da Home Assistant
export GLOBAL_PROXY=$(jq -r '.global_proxy // empty' $CONFIG_PATH)
export TRANSPORT_ROUTES=$(jq -r '.transport_routes // empty' $CONFIG_PATH)
export MPD_MODE=$(jq -r '.mpd_mode // "legacy"' $CONFIG_PATH)
export API_PASSWORD=$(jq -r '.password // empty' $CONFIG_PATH)
export LOG_LEVEL=$(jq -r '.log_level // "WARNING"' $CONFIG_PATH)

# 2. Forzature assolute per farlo funzionare sempre
export DVR_ENABLED="false"
export PORT=7860

cd /app
echo "[INFO] Variabili caricate. Avvio del server nativo AIOHTTP sulla porta fissa 7860..."

# 3. Avvio con display virtuale
exec xvfb-run -a --server-args='-screen 0 1366x768x24' python3 app.py
