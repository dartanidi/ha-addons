#!/bin/bash
set -ex  # Aggiungo -x per vedere ogni comando eseguito

CONFIG_DIR="/config"
USER_XML="$CONFIG_DIR/traccar.xml"
TEMPLATE_XML="/opt/traccar/conf/traccar.template.xml"
RUN_XML="/opt/traccar/conf/traccar.xml"
OPTIONS_PATH="/data/options.json"

echo "=== Traccar Startup ==="

# Crea config utente se non esiste
mkdir -p "$CONFIG_DIR"
if [ ! -f "$USER_XML" ]; then
    echo "Creating user config..."
    cp "$TEMPLATE_XML" "$USER_XML"
fi

# Leggi credenziali
if [ -f "$OPTIONS_PATH" ]; then
    export DB_DRIVER=$(jq -r '.database_driver // empty' $OPTIONS_PATH)
    export DB_USER=$(jq -r '.database_user // empty' $OPTIONS_PATH)
    export DB_PASSWORD=$(jq -r '.database_password // empty' $OPTIONS_PATH)
    RAW_DB_URL=$(jq -r '.database_url // empty' $OPTIONS_PATH)
    export DB_URL=$(echo "$RAW_DB_URL" | sed 's/&/\&amp;/g')
fi

# Genera config finale
envsubst < "$USER_XML" > "$RUN_XML"

# Trova Java
JAVA_BIN="/opt/traccar/jre/bin/java"
if [ ! -f "$JAVA_BIN" ]; then
    JAVA_BIN="java"
fi

echo "=== DEBUG INFO ==="
echo "Working directory: $(pwd)"
echo "Java binary: $JAVA_BIN"
ls -la /opt/traccar/ || echo "Cannot list /opt/traccar"
ls -la /opt/traccar/conf/ || echo "Cannot list /opt/traccar/conf"
echo "==================="

echo "Starting Traccar..."
sleep 3

cd /opt/traccar

# Mostra il comando che verrà eseguito
echo "Executing: $JAVA_BIN -Xms512m -Xmx512m -Djava.net.preferIPv4Stack=true -jar tracker-server.jar conf/traccar.xml"

# Avvia senza redirigere stderr
"$JAVA_BIN" -Xms512m -Xmx512m -Djava.net.preferIPv4Stack=true -jar tracker-server.jar conf/traccar.xml

echo "Traccar exited!"
