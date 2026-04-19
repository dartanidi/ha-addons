#!/bin/bash
echo "[DEBUG] ========================================"
echo "[DEBUG] INIZIO DIAGNOSTICA EASYPROXY"
echo "[DEBUG] ========================================"

cd /app

echo "[DEBUG] 1. Controllo versione Python:"
python3 --version

echo "[DEBUG] 2. Controllo dipendenze (pip list):"
pip list | grep -E "gunicorn|aiohttp|playwright"

echo "[DEBUG] 3. Controllo presenza eseguibili:"
echo "Gunicorn si trova in: $(which gunicorn || echo 'NON TROVATO')"
echo "Xvfb-run si trova in: $(which xvfb-run || echo 'NON TROVATO')"

echo "[DEBUG] ========================================"
echo "[DEBUG] 4. TENTATIVO DI AVVIO DIRETTO (Senza Xvfb e Gunicorn)"
echo "[DEBUG] ========================================"

# Impostiamo le variabili base per non farlo arrabbiare
export PORT=7860
export LOG_LEVEL="DEBUG"
export DVR_ENABLED="false"

# Avviamo brutalmente il file python
python3 app.py
