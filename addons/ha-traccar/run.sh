#!/bin/bash
set -e

echo "[Traccar] Add-on starting ..."

CONFIG_PATH=/data/options.json
TEMPLATE_PATH=/opt/traccar/conf/traccar.template.xml
FINAL_CONFIG=/opt/traccar/conf/traccar.xml

if [ ! -f "$CONFIG_PATH" ]; then
    echo "[Traccar] ERRORE: options.json mancante!"
    exit 1
fi

# Lettura variabili
export DB_DRIVER=$(jq --raw-output '.database_driver // empty' $CONFIG_PATH)
export DB_URL=$(jq --raw-output '.database_url // empty' $CONFIG_PATH)
export DB_USER=$(jq --raw-output '.database_user // empty' $CONFIG_PATH)
export DB_PASSWORD=$(jq --raw-output '.database_password // empty' $CONFIG_PATH)

if [[ -z "$DB_PASSWORD" || "$DB_PASSWORD" == "cambiami_con_password_db" ]]; then
    echo "[Traccar] ATTENZIONE: Password database non impostata o di default!"
fi

echo "[Traccar] Configurazione XML..."
envsubst < "$TEMPLATE_PATH" > "$FINAL_CONFIG"

echo "[Traccar] Attesa DB..."
sleep 5

echo "[Traccar] Start..."
cd /opt/traccar
exec java -Xms512m -Xmx512m -Djava.net.preferIPv4Stack=true -jar tracker-server.jar conf/traccar.xml
