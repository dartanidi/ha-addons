#!/usr/bin/env bash
set -e

CONFIG_PATH=/data/options.json

echo "Lettura configurazione da Home Assistant..."

# Configurazione Rete (stile EasyProxy)
export PORT=$(jq --raw-output '.port' $CONFIG_PATH)

# Parametri base
export MFP_URL=$(jq --raw-output '.mfp_url // empty' $CONFIG_PATH)
export MFP_PASSWORD=$(jq --raw-output '.mfp_password // empty' $CONFIG_PATH)
export MFP_PSW=$MFP_PASSWORD
export TMDB_API_KEY=$(jq --raw-output '.tmdb_api_key // empty' $CONFIG_PATH)
export ADDON_BASE_URL=$(jq --raw-output '.addon_base_url // empty' $CONFIG_PATH)
export DYNAMIC_EXTRACTOR_CONC=$(jq --raw-output '.dynamic_extractor_conc' $CONFIG_PATH)

# Funzione per convertire il booleano di HA in 1/0 per StreamViX
bool_to_binary() {
    if [ "$1" == "true" ]; then echo "1"; else echo "0"; fi
}

# Parametri abilitazione
export ANIMEUNITY_ENABLED=$(jq --raw-output '.animeunity_enabled' $CONFIG_PATH)
export ANIMESATURN_ENABLED=$(jq --raw-output '.animesaturn_enabled' $CONFIG_PATH)
export Enable_Live_TV=$(jq --raw-output '.enable_live_tv' $CONFIG_PATH)

# Parametri avanzati sport ed estrazioni
export STREAMED_ENABLE=$(bool_to_binary $(jq --raw-output '.streamed_enable' $CONFIG_PATH))
export RBTV_ENABLE=$(bool_to_binary $(jq --raw-output '.rbtv_enable' $CONFIG_PATH))
export SPSO_ENABLE=$(bool_to_binary $(jq --raw-output '.spso_enable' $CONFIG_PATH))
export PD_ENABLE=$(bool_to_binary $(jq --raw-output '.pd_enable' $CONFIG_PATH))
export TVTAP_ENABLE=$(bool_to_binary $(jq --raw-output '.tvtap_enable' $CONFIG_PATH))
export FAST_DYNAMIC=$(bool_to_binary $(jq --raw-output '.fast_dynamic' $CONFIG_PATH))

export BOTHLINK="true"

echo "=== Riepilogo Configurazioni Backend ==="
echo "Porta in ascolto: $PORT (Host Network)"
echo "MediaFlow Proxy: $(if [ -n "$MFP_URL" ]; then echo "CONFIGURATO"; else echo "NON CONFIGURATO"; fi)"
echo "Base URL: ${ADDON_BASE_URL:-"Non impostato (Usa fallback)"}"
echo "Eventi Sportivi -> STREAMED: $STREAMED_ENABLE | RBTV: $RBTV_ENABLE | SPSO: $SPSO_ENABLE | PD: $PD_ENABLE"
echo "Altro -> TVTAP: $TVTAP_ENABLE | FAST_DYNAMIC: $FAST_DYNAMIC (Cap: $DYNAMIC_EXTRACTOR_CONC)"
echo "========================================"

echo "Avvio di StreamViX..."
cd /opt/streamvix
exec node dist/addon.js
