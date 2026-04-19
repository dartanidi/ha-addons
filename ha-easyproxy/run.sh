#!/bin/bash

echo "[INFO] Avvio EasyProxy Add-on (Versione Light) ..."

CONFIG_PATH="/data/options.json"

# Verifica che il file di configurazione esista
if [ ! -f "$CONFIG_PATH" ]; then
    echo "[ERRORE] File di configurazione non trovato in $CONFIG_PATH!"
    exit 1
fi

# 1. Recupero configurazioni da Home Assistant usando jq
# (Ignoriamo volontariamente la porta esterna per evitare il disallineamento)
GLOBAL=$(jq -r '.global_proxy // empty' $CONFIG_PATH)
ROUTES=$(jq -r '.transport_routes // empty' $CONFIG_PATH)
MPD=$(jq -r '.mpd_mode // empty' $CONFIG_PATH)
USER_PASS=$(jq -r '.password // empty' $CONFIG_PATH)
USER_LOG=$(jq -r '.log_level // "WARNING"' $CONFIG_PATH)
USER_WORKERS=$(jq -r '.workers // 2' $CONFIG_PATH)

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
echo "[INFO] Modalità MPD impostata su: $MPD_MODE"

# Log Level
export LOG_LEVEL="$USER_LOG"
echo "[INFO] Livello di log impostato su: $LOG_LEVEL"

# Gestione Password
if [ -n "$USER_PASS" ]; then
    export API_PASSWORD="$USER_PASS"
    echo "[INFO] Protezione Password API ATTIVA."
else
    echo "[INFO] Nessuna password impostata. Accesso libero."
fi

# --- FORZATURE VERSIONE LIGHT E SICUREZZA DI RETE ---

# Disabilitazione esplicita del DVR per risparmiare risorse e spazio
export DVR_ENABLED="false"
echo "[INFO] Modulo DVR/Registrazioni disabilitato (Versione Light)."

# Forza la porta interna a 7860 per combaciare perfettamente con il mapping di config.yaml
export PORT=7860

# Spostamento nella cartella
cd /app
echo "[INFO] Avvio di Gunicorn tramite Xvfb sulla porta interna fissa 7860 con $USER_WORKERS workers..."

# 3. Avvio tramite Xvfb (Modalità DEBUG Estremo)
echo "[INFO] Esecuzione di Gunicorn in modalità DEBUG..."

exec xvfb-run -a -e /dev/stderr --server-args='-screen 0 1366x768x24' \
    gunicorn --bind 0.0.0.0:7860 \
    --workers 1 \
    --worker-class aiohttp.worker.GunicornWebWorker \
    --log-level debug \
    --error-logfile - \
    --access-logfile - \
    --capture-output \
    --timeout 120 \
    app:app
