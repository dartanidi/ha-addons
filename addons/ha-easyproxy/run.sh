#!/usr/bin/with-contenv bashio

echo "Avvio EasyProxy Add-on..."

# 1. Recupero configurazioni
GLOBAL=$(bashio::config 'global_proxy')
DLHD=$(bashio::config 'dlhd_proxy')
VAVOO=$(bashio::config 'vavoo_proxy')
# Leggiamo la porta scelta dall'utente (default 7860 se vuota)
USER_PORT=$(bashio::config 'port')

# 2. Export Variabili
if bashio::config.has_value 'global_proxy'; then
    export GLOBAL_PROXY="$GLOBAL"
fi

if bashio::config.has_value 'dlhd_proxy'; then
    export DLHD_PROXY="$DLHD"
fi

if bashio::config.has_value 'vavoo_proxy'; then
    export VAVOO_PROXY="$VAVOO"
fi

# Impostiamo la variabile PORT per l'applicazione (se la usa internamente)
export PORT="$USER_PORT"

cd /app
bashio::log.info "Avvio del server sulla porta $USER_PORT (Host Network)..."

# 3. Avvio con la porta dinamica
# Nota: --bind 0.0.0.0:$USER_PORT usa la porta scelta dall'utente
exec gunicorn --bind 0.0.0.0:"$USER_PORT" --workers 4 --worker-class aiohttp.worker.GunicornWebWorker app:app
