#!/usr/bin/with-contenv bashio

echo "Avvio EasyProxy Add-on (v2.5.0)..."

# 1. Recupero configurazioni da Home Assistant
GLOBAL=$(bashio::config 'global_proxy')
ROUTES=$(bashio::config 'transport_routes')
MPD=$(bashio::config 'mpd_mode')
USER_PORT=$(bashio::config 'port')
USER_PASS=$(bashio::config 'password')

# 2. Export Variabili d'Ambiente

# Global Proxy
if bashio::config.has_value 'global_proxy'; then
    export GLOBAL_PROXY="$GLOBAL"
    bashio::log.info "Global Proxy configurato."
fi

# Transport Routes (Nuovo sistema routing)
if bashio::config.has_value 'transport_routes'; then
    export TRANSPORT_ROUTES="$ROUTES"
    bashio::log.info "Transport Routes configurati."
fi

# MPD Mode (legacy o ffmpeg)
export MPD_MODE="$MPD"
bashio::log.info "Modalità MPD impostata su: $MPD"

# Gestione Password (API_PASSWORD)
if bashio::config.has_value 'password'; then
    export API_PASSWORD="$USER_PASS"
    bashio::log.info "Protezione Password ATTIVA."
else
    bashio::log.info "Nessuna password impostata. Accesso libero."
fi

# Impostiamo la porta
export PORT="$USER_PORT"

# Spostamento nella cartella
cd /app
bashio::log.info "Avvio del server Gunicorn sulla porta $USER_PORT..."

# 3. Avvio (Aggiornato con parametri timeout dal repo originale)
exec gunicorn --bind 0.0.0.0:"$USER_PORT" \
    --workers 4 \
    --worker-class aiohttp.worker.GunicornWebWorker \
    app:app
