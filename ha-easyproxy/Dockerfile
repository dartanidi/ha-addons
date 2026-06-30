FROM python:3.12-slim-bookworm

# 1. Variabili d'ambiente
ENV PYTHONUNBUFFERED=1

# 2. Installazione pacchetti (Aggiunto nodejs, rimosso il browser Chromium!)
RUN apt-get update && apt-get install -y --no-install-recommends \
    jq \
    git \
    ffmpeg \
    nodejs \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Download del codice (Usiamo l'ultima versione ufficiale)
ADD "https://api.github.com/repos/realbestia1/EasyProxy/commits/main" /tmp/skipcache
RUN git clone https://github.com/realbestia1/EasyProxy.git .

# 4. Dipendenze Python
RUN pip install --no-cache-dir -r requirements.txt

# 5. Script di avvio specifico per HA
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
