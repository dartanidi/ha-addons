#!/usr/bin/with-contenv bashio

# ------------------------------------------------------------------------------
# 1. SETUP PERSISTENZA E LINKING
# ------------------------------------------------------------------------------
# Percorsi: Dati persistenti su disco vs Percorsi interni attesi da Nanobot
PERSISTENT_DIR="/data/nanobot_root"
INTERNAL_DIR="/root/.nanobot"

# Assicuriamoci che la cartella persistente esista
mkdir -p "$PERSISTENT_DIR"

# Creiamo il symlink: Se Nanobot scrive in /root/.nanobot, scrive in realtà su /data
if [ -d "$INTERNAL_DIR" ] && [ ! -L "$INTERNAL_DIR" ]; then
    rm -rf "$INTERNAL_DIR"
fi
ln -sfn "$PERSISTENT_DIR" "$INTERNAL_DIR"

bashio::log.info "Persistenza configurata: $INTERNAL_DIR -> $PERSISTENT_DIR"

# ------------------------------------------------------------------------------
# 2. GENERAZIONE CONFIGURAZIONE (config.json)
# ------------------------------------------------------------------------------
# Recupero variabili dalla UI di Home Assistant
PROVIDER=$(bashio::config 'provider')
API_KEY=$(bashio::config 'api_key')
MODEL=$(bashio::config 'model')
RESTRICT=$(bashio::config 'restrict_to_workspace')
WORKSPACE=$(bashio::config 'workspace_path')
ADDITIONAL_JSON=$(bashio::config 'additional_config_json')
API_BASE=$(bashio::config 'api_base')

# Creiamo la cartella workspace per i file dell'utente
mkdir -p "$WORKSPACE"

bashio::log.info "Generazione configurazione per provider: $PROVIDER"

# Costruzione del JSON di base usando jq per sicurezza
BASE_CONFIG=$(jq -n \
  --arg prov "$PROVIDER" \
  --arg key "$API_KEY" \
  --arg mod "$MODEL" \
  --arg restr "$RESTRICT" \
  --arg work "$WORKSPACE" \
  '{
    "providers": { ($prov): { "apiKey": $key } },
    "agents": { "defaults": { "model": $mod } },
    "tools": { 
      "restrictToWorkspace": ($restr == "true"),
      "workspace": $work
    }
  }')

# Iniezione opzionale di apiBase (es. per server locali o cinesi)
if bashio::config.has_value 'api_base'; then
    BASE_CONFIG=$(echo "$BASE_CONFIG" | jq --arg base "$API_BASE" --arg prov "$PROVIDER" \
        '.providers[$prov].apiBase = $base')
fi

# Merge con configurazioni avanzate (es. MCP servers) fornite via JSON raw
FINAL_CONFIG=$(echo "$BASE_CONFIG" | jq --argjson add "$ADDITIONAL_JSON" '. * $add')

# Scrittura del file config.json
echo "$FINAL_CONFIG" > "$INTERNAL_DIR/config.json"

# ------------------------------------------------------------------------------
# 3. AVVIO DEL SERVIZIO
# ------------------------------------------------------------------------------
bashio::log.info "Avvio Nanobot Gateway..."
bashio::log.info "Interfaccia web disponibile sulla porta configurata nella sezione Rete."

# Esecuzione del gateway (default interna 18790)
exec nanobot gateway
