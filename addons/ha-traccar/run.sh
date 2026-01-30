#!/bin/bash
set -e

echo "[Traccar] Avvio procedura di inizializzazione..."

# --- DEFINIZIONE PERCORSI ---
# Questa è la cartella montata da 'map: - addon_config:rw'
USER_CONFIG_DIR="/addon_configs"
USER_CONFIG_FILE="$USER_CONFIG_DIR/traccar.xml"

# Questi sono i percorsi interni del container
INTERNAL_TEMPLATE="/opt/traccar/conf/traccar.template.xml"
FINAL_RUN_CONFIG="/opt/traccar/conf/traccar.xml"
CONFIG_PATH="/data/options.json"

# --- 1. GESTIONE FILE CONFIGURAZIONE UTENTE ---
if [ ! -d "$USER_CONFIG_DIR" ]; then
    echo "[Traccar] ATTENZIONE: La cartella $USER_CONFIG_DIR non esiste."
    echo "[Traccar] Assicurati di avere 'map: - addon_config:rw' nel config.yaml"
    # Fallback per evitare crash se la cartella non è montata
    mkdir -p "$USER_CONFIG_DIR"
fi

if [ ! -f "$USER_CONFIG_FILE" ]; then
    echo "[Traccar] Primo avvio: Creazione file di configurazione utente..."
    cp "$INTERNAL_TEMPLATE" "$USER_CONFIG_FILE"
    echo "[Traccar] File creato in: $USER_CONFIG_FILE"
    echo "[Traccar] Puoi modificarlo tramite Samba o File Editor nella cartella 'addon_configs'."
else
    echo "[Traccar] Configurazione utente trovata."
fi

# --- 2. LETTURA CREDENZIALI (SUPERVISOR) ---
if [ -f "$CONFIG_PATH" ]; then
    export DB_DRIVER=$(jq --raw-output '.database_driver // empty' $CONFIG_PATH)
    export DB_URL=$(jq --raw-output '.database_url // empty' $CONFIG_PATH)
    export DB_USER=$(jq --raw-output '.database_user // empty' $CONFIG_PATH)
    export DB_PASSWORD=$(jq --raw-output '.database_password // empty' $CONFIG_PATH)
else
    echo "[Traccar] ERRORE CRITICO: options.json non trovato!"
    exit 1
fi

# --- 3. INIEZIONE VARIABILI ---
# Leggiamo il file editabile dall'utente, iniettiamo le password
# e salviamo il risultato nel percorso che Java si aspetta.
echo "[Traccar] Applicazione configurazione..."
envsubst < "$USER_CONFIG_FILE" > "$FINAL_RUN_CONFIG"

# --- 4. AVVIO ---
echo "[Traccar] Attesa DB (5s)..."
sleep 5

echo "[Traccar] Avvio Server..."
cd /opt/traccar
exec java -Xms512m -Xmx512m -Djava.net.preferIPv4Stack=true -jar tracker-server.jar conf/traccar.xml
