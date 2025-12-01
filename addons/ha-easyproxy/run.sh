#!/usr/bin/with-contenv bashio

echo "Avvio EasyProxy Add-on..."

# 1. Recupero configurazioni da Home Assistant
GLOBAL=$(bashio::config 'global_proxy')
DLHD=$(bashio::config 'dlhd_proxy')
VAVOO=$(bashio::config 'vavoo_proxy')
USER_PORT=$(bashio::config 'port')
USER_PASS=$(bashio::config 'password')

# 2. Export Variabili d'Ambiente
if bashio::config.has_value 'global_proxy'; then
    export GLOBAL_PROXY="$GLOBAL"
    bashio::log.info "Global Proxy configurato."
fi

if bashio::config.has_value 'dlhd_proxy'; then
    export DLHD_PROXY="$DLHD"
    bashio::log.info "DLHD Proxy configurato."
fi

if bashio::config.has_value 'vavoo_proxy'; then
    export VAVOO_PROXY="$VAVOO"
    bashio::log.info "Vavoo Proxy configurato."
fi

# GESTIONE PASSWORD
# Se l'utente ha scritto una password, impostiamo API_PASSWORD
if bashio::config.has_value 'password'; then
    export API_PASSWORD="$USER_PASS"
    bashio::log.info "Protezione Password ATTIVA. Ricorda di usare &api_password=... negli URL."
else
    bashio::log.info "Nessuna password impostata. Accesso libero."
fi

# Impostiamo la porta per l'applicazione
export PORT="$USER_PORT"

# Spostamento nella cartella
cd /app
bashio::log.info "Avvio del server sulla porta $USER_PORT (Host Network)..."

# 3. Avvio
exec gunicorn --bind 0.0.0.0:"$USER_PORT" --workers 4 --worker-class aiohttp.worker.GunicornWebWorker app:app
