#!/bin/bash

echo "[INFO] Avvio EasyProxy Add-on ..."

CONFIG_PATH="/data/options.json"

# Verifica che il file di configurazione esista
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

# 2. Export Variabili d'Ambiente

# Global Proxy
if [ -n "$GLOBAL" ]; then
    export GLOBAL_PROXY="$GLOBAL"
    echo "[INFO] Global Proxy configurato."
fi

# Transport Routes
if [ -n "$ROUTES" ]; then
    export TRANSPORT_ROUTES="$ROUTES"
    echo "[INFO] Transport Routes configurati."
fi

# MPD Mode
export MPD_MODE="$MPD"
echo "[INFO] Modalità MPD impostata su: $MPD"

# Gestione Password
if [ -n "$USER_PASS" ]; then
    export API_PASSWORD="$USER_PASS"
    echo "[INFO] Protezione Password ATTIVA."
else
    echo "[INFO] Nessuna password impostata. Accesso libero."
fi

# Impostiamo la porta
export PORT="$USER_PORT"

# Spostamento nella cartella
cd /app
echo "[INFO] Avvio del server Gunicorn sulla porta $USER_PORT..."

# 3. Avvio
exec gunicorn --bind 0.0.0.0:"$USER_PORT" \
    --workers 4 \
    --worker-class aiohttp.worker.GunicornWebWorker \
    app:app
