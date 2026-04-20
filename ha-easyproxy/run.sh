#!/bin/bash
echo "[INFO] Avvio EasyProxy Add-on (Versione Light - Rete Host) ..."

CONFIG_PATH="/data/options.json"

export PORT=$(jq -r '.port // 7860' $CONFIG_PATH)
export GLOBAL_PROXY=$(jq -r '.global_proxy // empty' $CONFIG_PATH)
export TRANSPORT_ROUTES=$(jq -r '.transport_routes // empty' $CONFIG_PATH)
export API_PASSWORD=$(jq -r '.password // empty' $CONFIG_PATH)
export LOG_LEVEL=$(jq -r '.log_level // "WARNING"' $CONFIG_PATH)
export DVR_ENABLED="false"

cd /app

echo "[INFO] Creazione display virtuale Xvfb in background..."
rm -f /tmp/.X99-lock
Xvfb :99 -screen 0 1366x768x24 -nolisten tcp &
export DISPLAY=:99

# Pausa per far inizializzare Xvfb
sleep 2

echo "[INFO] Avvio del server nativo AIOHTTP sulla porta $PORT..."

# Avvio di Python senza 'exec' per poter catturare l'exit code
python3 -u app.py

# Se arriviamo qui, l'app si è chiusa
EXIT_CODE=$?
echo "[ERROR] app.py terminato inaspettatamente con codice $EXIT_CODE" >&2
exit $EXIT_CODE
