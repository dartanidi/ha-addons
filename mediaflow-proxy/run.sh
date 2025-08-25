#!/usr/bin/with-contenv bashio

# Funzione per il logging
function log() {
    bashio::log.info "$1"
}

log "Starting MediaFlow Proxy Add-on..."

# Leggi configurazione dalle opzioni
API_PASSWORD=$(bashio::config 'api_password')
LOG_LEVEL=$(bashio::config 'log_level')
ENABLE_STREAMING_PROGRESS=$(bashio::config 'enable_streaming_progress')
DISABLE_HOME_PAGE=$(bashio::config 'disable_home_page')
DISABLE_DOCS=$(bashio::config 'disable_docs')
DISABLE_SPEEDTEST=$(bashio::config 'disable_speedtest')
PROXY_URL=$(bashio::config 'proxy_url')
ALL_PROXY=$(bashio::config 'all_proxy')
STREMIO_PROXY_URL=$(bashio::config 'stremio_proxy_url')
M3U8_CONTENT_ROUTING=$(bashio::config 'm3u8_content_routing')
ENABLE_HLS_PREBUFFER=$(bashio::config 'enable_hls_prebuffer')
HLS_PREBUFFER_SEGMENTS=$(bashio::config 'hls_prebuffer_segments')
HLS_PREBUFFER_CACHE_SIZE=$(bashio::config 'hls_prebuffer_cache_size')
HLS_PREBUFFER_MAX_MEMORY_PERCENT=$(bashio::config 'hls_prebuffer_max_memory_percent')
HLS_PREBUFFER_EMERGENCY_THRESHOLD=$(bashio::config 'hls_prebuffer_emergency_threshold')
ENABLE_DASH_PREBUFFER=$(bashio::config 'enable_dash_prebuffer')
DASH_PREBUFFER_SEGMENTS=$(bashio::config 'dash_prebuffer_segments')
DASH_PREBUFFER_CACHE_SIZE=$(bashio::config 'dash_prebuffer_cache_size')
DASH_PREBUFFER_MAX_MEMORY_PERCENT=$(bashio::config 'dash_prebuffer_max_memory_percent')
DASH_PREBUFFER_EMERGENCY_THRESHOLD=$(bashio::config 'dash_prebuffer_emergency_threshold')
FORWARDED_ALLOW_IPS=$(bashio::config 'forwarded_allow_ips')

# Esporta le variabili d'ambiente necessarie
export API_PASSWORD="${API_PASSWORD}"

# Imposta variabili opzionali se specificate
if bashio::config.has_value 'enable_streaming_progress'; then
    export ENABLE_STREAMING_PROGRESS="${ENABLE_STREAMING_PROGRESS}"
fi

if bashio::config.has_value 'disable_home_page'; then
    export DISABLE_HOME_PAGE="${DISABLE_HOME_PAGE}"
fi

if bashio::config.has_value 'disable_docs'; then
    export DISABLE_DOCS="${DISABLE_DOCS}"
fi

if bashio::config.has_value 'disable_speedtest'; then
    export DISABLE_SPEEDTEST="${DISABLE_SPEEDTEST}"
fi

if bashio::config.has_value 'proxy_url'; then
    export PROXY_URL="${PROXY_URL}"
fi

if bashio::config.has_value 'all_proxy'; then
    export ALL_PROXY="${ALL_PROXY}"
fi

if bashio::config.has_value 'stremio_proxy_url'; then
    export STREMIO_PROXY_URL="${STREMIO_PROXY_URL}"
fi

if bashio::config.has_value 'm3u8_content_routing'; then
    export M3U8_CONTENT_ROUTING="${M3U8_CONTENT_ROUTING}"
fi

if bashio::config.has_value 'enable_hls_prebuffer'; then
    export ENABLE_HLS_PREBUFFER="${ENABLE_HLS_PREBUFFER}"
fi

if bashio::config.has_value 'hls_prebuffer_segments'; then
    export HLS_PREBUFFER_SEGMENTS="${HLS_PREBUFFER_SEGMENTS}"
fi

if bashio::config.has_value 'hls_prebuffer_cache_size'; then
    export HLS_PREBUFFER_CACHE_SIZE="${HLS_PREBUFFER_CACHE_SIZE}"
fi

if bashio::config.has_value 'hls_prebuffer_max_memory_percent'; then
    export HLS_PREBUFFER_MAX_MEMORY_PERCENT="${HLS_PREBUFFER_MAX_MEMORY_PERCENT}"
fi

if bashio::config.has_value 'hls_prebuffer_emergency_threshold'; then
    export HLS_PREBUFFER_EMERGENCY_THRESHOLD="${HLS_PREBUFFER_EMERGENCY_THRESHOLD}"
fi

if bashio::config.has_value 'enable_dash_prebuffer'; then
    export ENABLE_DASH_PREBUFFER="${ENABLE_DASH_PREBUFFER}"
fi

if bashio::config.has_value 'dash_prebuffer_segments'; then
    export DASH_PREBUFFER_SEGMENTS="${DASH_PREBUFFER_SEGMENTS}"
fi

if bashio::config.has_value 'dash_prebuffer_cache_size'; then
    export DASH_PREBUFFER_CACHE_SIZE="${DASH_PREBUFFER_CACHE_SIZE}"
fi

if bashio::config.has_value 'dash_prebuffer_max_memory_percent'; then
    export DASH_PREBUFFER_MAX_MEMORY_PERCENT="${DASH_PREBUFFER_MAX_MEMORY_PERCENT}"
fi

if bashio::config.has_value 'dash_prebuffer_emergency_threshold'; then
    export DASH_PREBUFFER_EMERGENCY_THRESHOLD="${DASH_PREBUFFER_EMERGENCY_THRESHOLD}"
fi

if bashio::config.has_value 'forwarded_allow_ips'; then
    export FORWARDED_ALLOW_IPS="${FORWARDED_ALLOW_IPS}"
else
    # Imposta IPs fidati per Home Assistant
    export FORWARDED_ALLOW_IPS="172.30.32.2,127.0.0.1"
fi

log "Configuration loaded:"
log "  API Password: [PROTECTED]"
log "  Log Level: ${LOG_LEVEL:-info}"
log "  Forwarded Allow IPs: ${FORWARDED_ALLOW_IPS}"

# Avvia MediaFlow Proxy
log "Starting MediaFlow Proxy server..."
exec uvicorn mediaflow_proxy.main:app \
    --host 0.0.0.0 \
    --port 8888 \
    --log-level "${LOG_LEVEL:-info}" \
    --forwarded-allow-ips "${FORWARDED_ALLOW_IPS}"