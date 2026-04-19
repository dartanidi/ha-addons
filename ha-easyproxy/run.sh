#!/bin/bash

echo "[INFO] Avvio EasyProxy Add-on (Versione Light) ..."

CONFIG_PATH="/data/options.json"

if [ ! -f "$CONFIG_PATH" ]; then
    echo "[ERRORE] File di configurazione non trovato in $CONFIG_PATH!"
    exit 1
fi

# 1. Recupero configurazioni da Home Assistant usando jq
GLOBAL=$(jq -r '.global_proxy // empty' $CONFIG_PATH)
ROUTES=$(jq -r '.transport_routes // empty' $CONFIG_PATH)
MPD=$(jq -r '.mpd_mode // empty' $CONFIG_PATH)
USER_PORT=$(jq -r '.port // 7860' $CONFIG_PATH)
USER_PASS=$(jq -r '.password // empty' $CONFIG_PATH)
USER_LOG=$(jq -r '.log_level // "WARNING"' $CONFIG_PATH)
USER_WORKERS=$(jq -r '.workers // 2' $CONFIG_PATH)

# 2. Export Variabili d'Ambiente
if [ -n "$GLOBAL" ]; then
    export GLOBAL_PROXY="$GLOBAL"
    echo "[INFO] Global Proxy configurato."
fi

if [ -n "$ROUTES" ]; then
    export TRANSPORT_ROUTES="$ROUTES"
    echo "[INFO] Transport Routes configurati."
fi

export MPD_MODE="$MPD"
export PORT="$USER_PORT"
export LOG_LEVEL="$USER_LOG"

# Disabilitazione esplicita del DVR
export DVR_ENABLED="false"
echo "[INFO] Modulo DVR/Registrazioni disabilitato."

if [ -n "$USER_PASS" ]; then
    export API_PASSWORD="$USER_PASS"
    echo "[INFO] Protezione Password API ATTIVA."
else
    echo "[INFO] Nessuna password impostata. Accesso libero."
fi

# Spostamento nella cartella
cd /app
echo "[INFO] Avvio di Gunicorn tramite Xvfb sulla porta $USER_PORT con $USER_WORKERS workers..."

# 3. Avvio tramite Xvfb (necessario per Playwright/Chromium)
exec xvfb-run -a --server-args='-screen 0 1366x768x24' gunicorn --bind 0.0.0.0:"$USER_PORT" \
    --workers "$USER_WORKERS" \
    --worker-class aiohttp.worker.GunicornWebWorker \
    --timeout 120 \
    --graceful-timeout 120 \
    app:app
