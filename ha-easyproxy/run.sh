#!/bin/bash
CONFIG_PATH=/data/options.json

echo "[INFO] Avvio EasyProxy Light (Versione 64-bit Only)"

# Estrazione variabili base
export PORT=$(jq -r '.port // 7860' $CONFIG_PATH)
export LOG_LEVEL=$(jq -r '.log_level // "WARNING"' $CONFIG_PATH)

# Gestione API Password
API_PWD=$(jq -r '.api_password // empty' $CONFIG_PATH)
if [ -n "$API_PWD" ]; then
    export API_PASSWORD="$API_PWD"
fi

# Gestione Proxy Globale
G_PROXY=$(jq -r '.global_proxy // empty' $CONFIG_PATH)
if [ -n "$G_PROXY" ]; then
    export GLOBAL_PROXY="$G_PROXY"
fi

# Gestione Transport Routes
T_ROUTES=$(jq -r '.transport_routes // empty' $CONFIG_PATH)
if [ -n "$T_ROUTES" ]; then
    export TRANSPORT_ROUTES="$T_ROUTES"
fi

# Gestione FlareSolverr Esterno
FS_URL=$(jq -r '.flaresolverr_url // empty' $CONFIG_PATH)
if [ -n "$FS_URL" ]; then
    export FLARESOLVERR_URL="$FS_URL"
    export FLARESOLVERR_TIMEOUT=$(jq -r '.flaresolverr_timeout // 60' $CONFIG_PATH)
    echo "[INFO] FlareSolverr esterno collegato a: $FS_URL"
fi

# Forzatura parametri di efficienza per Home Assistant
export MPD_MODE="legacy"
export WORKERS=1

echo "[INFO] 🚀 Avvio server sulla porta $PORT..."
exec python3 -u app.py
