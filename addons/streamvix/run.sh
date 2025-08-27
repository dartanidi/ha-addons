#!/usr/bin/with-contenv bashio

set -e

# Get configuration options
MFP_URL=$(bashio::config 'MFP_URL')
MFP_PSW=$(bashio::config 'MFP_PSW')
TMDB_API_KEY=$(bashio::config 'TMDB_API_KEY')
ANIMEUNITY_ENABLED=$(bashio::config 'ANIMEUNITY_ENABLED')
ANIMESATURN_ENABLED=$(bashio::config 'ANIMESATURN_ENABLED')
ENABLE_MPD_STREAMS=$(bashio::config 'ENABLE_MPD_STREAMS')
ENABLE_LIVE_TV=$(bashio::config 'ENABLE_LIVE_TV')
FAST_DYNAMIC=$(bashio::config 'FAST_DYNAMIC')
DYNAMIC_EXTRACTOR_CONC=$(bashio::config 'DYNAMIC_EXTRACTOR_CONC')
DYNAMIC_PURGE_HOUR=$(bashio::config 'DYNAMIC_PURGE_HOUR')
DYNAMIC_DISABLE_RUNTIME_FILTER=$(bashio::config 'DYNAMIC_DISABLE_RUNTIME_FILTER')
DYNAMIC_KEEP_YESTERDAY=$(bashio::config 'DYNAMIC_KEEP_YESTERDAY')

bashio::log.info "Starting StreamViX..."

# Set environment variables
export PORT=7860
export NODE_ENV=production

# Set MFP configuration if provided
if [ -n "$MFP_URL" ]; then
    export MFP_URL="$MFP_URL"
    bashio::log.info "MediaFlow Proxy URL configured"
fi

if [ -n "$MFP_PSW" ]; then
    export MFP_PSW="$MFP_PSW"
    bashio::log.info "MediaFlow Proxy password configured"
fi

# Set TMDB API key if provided
if [ -n "$TMDB_API_KEY" ]; then
    export TMDB_API_KEY="$TMDB_API_KEY"
    bashio::log.info "TMDB API key configured"
fi

# Set feature flags
export ANIMEUNITY_ENABLED="$ANIMEUNITY_ENABLED"
export ANIMESATURN_ENABLED="$ANIMESATURN_ENABLED"
export ENABLE_MPD_STREAMS="$ENABLE_MPD_STREAMS"
export ENABLE_LIVE_TV="$ENABLE_LIVE_TV"

# Set dynamic configuration
if [ "$FAST_DYNAMIC" = "true" ]; then
    export FAST_DYNAMIC=1
    bashio::log.info "FAST Dynamic mode enabled"
else
    export FAST_DYNAMIC=0
    bashio::log.info "Extractor mode enabled"
fi

export DYNAMIC_EXTRACTOR_CONC="$DYNAMIC_EXTRACTOR_CONC"
export DYNAMIC_PURGE_HOUR="$DYNAMIC_PURGE_HOUR"

if [ "$DYNAMIC_DISABLE_RUNTIME_FILTER" = "true" ]; then
    export DYNAMIC_DISABLE_RUNTIME_FILTER=1
    bashio::log.info "Runtime filter disabled - using JSON as-is"
else
    export DYNAMIC_DISABLE_RUNTIME_FILTER=0
    bashio::log.info "Runtime filter enabled"
fi

if [ "$DYNAMIC_KEEP_YESTERDAY" = "true" ]; then
    export DYNAMIC_KEEP_YESTERDAY=1
else
    export DYNAMIC_KEEP_YESTERDAY=0
fi

bashio::log.info "Configuration loaded:"
bashio::log.info "- AnimeUnity: $ANIMEUNITY_ENABLED"
bashio::log.info "- AnimeSaturn: $ANIMESATURN_ENABLED"
bashio::log.info "- Live TV: $ENABLE_LIVE_TV"
bashio::log.info "- MPD Streams: $ENABLE_MPD_STREAMS"
bashio::log.info "- Fast Dynamic: $FAST_DYNAMIC"
bashio::log.info "- Extractor Concurrency: $DYNAMIC_EXTRACTOR_CONC"
bashio::log.info "- Purge Hour: $DYNAMIC_PURGE_HOUR"

# Ensure config directory exists and is writable
mkdir -p /config/streamvix
chown -R root:root /config/streamvix

# Create symlink to config directory in app
ln -sf /config/streamvix /app/config

# Change to app directory
cd /app

# Start the application
bashio::log.info "StreamViX is starting on port 7860..."
bashio::log.info "Access the web interface at: http://homeassistant.local:7860"

exec pnpm start
