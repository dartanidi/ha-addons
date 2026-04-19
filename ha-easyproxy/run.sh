#!/bin/bash

echo "[INFO] Avvio EasyProxy Add-on (Versione Light) ..."

CONFIG_PATH="/data/options.json"

if [ ! -f "$CONFIG_PATH" ]; then
    echo "[ERRORE] File di configurazione non trovato in $CONFIG_PATH!"
    exit 1
fi

# 1. Recupero configurazioni (ignoriamo i workers, non servono più)
GLOBAL=$(jq -r '.global_proxy // empty' $CONFIG_PATH)
ROUTES=$(jq -r '.transport_routes // empty' $CONFIG_PATH)
MPD=$(jq -r '.mpd_mode // "legacy"' $CONFIG_PATH)
USER_PASS=$(jq -r '.password // empty' $CONFIG_PATH)
USER_LOG=$(jq -r '.log_level // "WARNING"' $CONFIG_PATH)

# 2. Export Variabili d'Ambiente
if [ -n "$GLOBAL" ]; then export GLOBAL_PROXY="$GLOBAL"; fi
if [ -n "$ROUTES" ]; then export TRANSPORT_ROUTES="$ROUTES"; fi
if [ -n "$USER_PASS" ]; then export API_PASSWORD="$USER_PASS"; fi

export MPD_MODE="$MPD"
export LOG_LEVEL="$USER_LOG"
export DVR_ENABLED="false"
export PORT=7860

# Spostamento nella cartella app
cd /app
echo "[INFO] Avvio del server nativo AIOHTTP tramite Xvfb sulla porta 7860..."

# 3. Avvio di app.py nativo con Xvfb (niente Gunicorn!)
exec xvfb-run -a --server-args='-screen 0 1366x768x24' python3 app.py
