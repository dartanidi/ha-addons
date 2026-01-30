#!/bin/bash
set -e

echo "[Traccar] Avvio..."

# --- 1. CONFIGURAZIONE PERCORSI ---
CONFIG_DIR="/addon_configs"
USER_XML="$CONFIG_DIR/traccar.xml"
TEMPLATE_XML="/opt/traccar/conf/traccar.template.xml"
RUN_XML="/opt/traccar/conf/traccar.xml"
OPTIONS_PATH="/data/options.json"

# --- 2. GESTIONE CONFIGURAZIONE UTENTE ---
if [ ! -d "$CONFIG_DIR" ]; then
    echo "[Traccar] ATTENZIONE: La cartella $CONFIG_DIR non risulta montata."
    echo "[Traccar] Se hai appena corretto il config.yaml, devi DISINSTALLARE e REINSTALLARE l'add-on."
else
    # Se il file utente non esiste, crealo dal template
    if [ ! -f "$USER_XML" ]; then
        echo "[Traccar] Primo avvio: Creo file config utente in $USER_XML"
        cp "$TEMPLATE_XML" "$USER_XML"
    fi
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
fi

# --- 4. PREPARAZIONE XML FINALE ---
if [ -f "$USER_XML" ]; then
    echo "[Traccar] Uso configurazione utente."
    envsubst < "$USER_XML" > "$RUN_XML"
else
    echo "[Traccar] Uso configurazione default."
    envsubst < "$TEMPLATE_XML" > "$RUN_XML"
fi

# --- 5. RICERCA JAVA E AVVIO ---
JAVA_BIN="java"
# Percorso tipico nelle immagini Traccar Alpine recenti
if [ -f "/opt/traccar/jre/bin/java" ]; then
    JAVA_BIN="/opt/traccar/jre/bin/java"
fi

echo "[Traccar] Trovato Java: $JAVA_BIN"
echo "[Traccar] Attesa DB (5s)..."
sleep 5

echo "[Traccar] Avvio Server..."
cd /opt/traccar
exec $JAVA_BIN -Xms512m -Xmx512m -Djava.net.preferIPv4Stack=true -jar tracker-server.jar conf/traccar.xml
