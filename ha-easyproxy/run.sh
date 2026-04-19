#!/bin/bash

echo "[INFO] Avvio EasyProxy Add-on (Versione Light) ..."

CONFIG_PATH="/data/options.json"

# Verifica che il file di configurazione esista
if [ ! -f "$CONFIG_PATH" ]; then
    echo "[ERRORE] File di configurazione non trovato in $CONFIG_PATH!"
    exit 1
fi

# 1. Recupero configurazioni da Home Assistant usando jq
# Nota: La porta viene letta ma poi forzata internamente a 7860 per il mapping Docker
GLOBAL=$(jq -r '.global_proxy // empty' $CONFIG_PATH)
ROUTES=$(jq -r '.transport_routes // empty' $CONFIG_PATH)
MPD=$(jq -r '.mpd_mode // "legacy"' $CONFIG_PATH)
USER_PASS=$(jq -r '.password // empty' $CONFIG_PATH)
USER_LOG=$(jq -r '.log_level // "WARNING"' $CONFIG_PATH)

# 2. Export Variabili d'Ambiente per l'applicazione Python
if [ -n "$GLOBAL" ]; then 
    export GLOBAL_PROXY="$GLOBAL"
    echo "[INFO] Global Proxy configurato."
fi

if [ -n "$ROUTES" ]; then 
    export TRANSPORT_ROUTES="$ROUTES"
    echo "[INFO] Transport Routes configurati."
fi

if [ -n "$USER_PASS" ]; then 
    export API_PASSWORD="$USER_PASS"
    echo "[INFO] Protezione Password API attiva."
fi

export MPD_MODE="$MPD"
export LOG_LEVEL="$USER_LOG"

# FORZATURE VERSIONE LIGHT
# Disabilitiamo il DVR per risparmiare risorse
export DVR_ENABLED="false"

# FORZATURA PORTA INTERNA
# Questa DEVE essere 7860 per combaciare con il mapping "7860/tcp: 7860" nel config.yaml
export PORT=7860

# Spostamento nella cartella di lavoro
cd /app

echo "[INFO] Configurazione completata:"
echo "       - Porta Interna: $PORT"
echo "       - Log Level: $LOG_LEVEL"
echo "       - Modalità MPD: $MPD_MODE"
echo "       - DVR: Disattivato"

echo "[INFO] Avvio del server nativo tramite Xvfb (necessario per Playwright)..."

# 3. Avvio tramite xvfb-run
# Questo comando crea un display virtuale in memoria, essenziale per i provider 
# che richiedono Chromium (come DLStreams) per evitare crash immediati.
exec xvfb-run -a --server-args='-screen 0 1366x768x24' python3 app.py
