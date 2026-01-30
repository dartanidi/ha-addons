#!/bin/bash
set -e
echo "[Traccar] Avvio..."

# --- 1. CONFIGURAZIONE PERCORSI ---
CONFIG_DIR="/config"  # <-- QUESTO È IL PERCORSO CORRETTO
USER_XML="$CONFIG_DIR/traccar.xml"
TEMPLATE_XML="/opt/traccar/conf/traccar.template.xml"
RUN_XML="/opt/traccar/conf/traccar.xml"
OPTIONS_PATH="/data/options.json"

# --- 2. GESTIONE CONFIGURAZIONE UTENTE ---
if [ ! -d "$CONFIG_DIR" ]; then
    echo "[Traccar] ERRORE: La cartella $CONFIG_DIR non è montata!"
    mkdir -p "$CONFIG_DIR"
fi

# Se il file utente non esiste, crealo dal template
if [ ! -f "$USER_XML" ]; then
    echo "[Traccar] Primo avvio: Creo file config utente in $USER_XML"
    cp "$TEMPLATE_XML" "$USER_XML"
    echo "[Traccar] File creato. Modifica il file tramite File Editor in /addon_configs/local_traccar/"
fi

# --- 3. LETTURA E PULIZIA CREDENZIALI (Fix XML) ---
if [ -f "$OPTIONS_PATH" ]; then
    export DB_DRIVER=$(jq --raw-output '.database_driver // empty' $OPTIONS_PATH)
    export DB_USER=$(jq --raw-output '.database_user // empty' $OPTIONS_PATH)
    export DB_PASSWORD=$(jq --raw-output '.database_password // empty' $OPTIONS_PATH)
    
    # FIX CRITICO: Sostituisce '&' con '&amp;' nell'URL per renderlo XML-compatibile
    RAW_DB_URL=$(jq --raw-output '.database_url // empty' $OPTIONS_PATH)
    export DB_URL=$(echo "$RAW_DB_URL" | sed 's/&/&amp;/g')
else
    echo "[Traccar] Errore: options.json non trovato."
    exit 1
fi

# --- 4. PREPARAZIONE XML FINALE ---
echo "[Traccar] Applico configurazione con credenziali..."
envsubst < "$USER_XML" > "$RUN_XML"

# --- 5. RICERCA JAVA E AVVIO ---
JAVA_BIN="java"
if [ -f "/opt/traccar/jre/bin/java" ]; then
    JAVA_BIN="/opt/traccar/jre/bin/java"
fi

echo "[Traccar] Java: $JAVA_BIN"
echo "[Traccar] Attesa DB (5s)..."
sleep 5
echo "[Traccar] Avvio Server Traccar..."
cd /opt/traccar
exec $JAVA_BIN -Xms512m -Xmx512m -Djava.net.preferIPv4Stack=true -jar tracker-server.jar conf/traccar.xml
