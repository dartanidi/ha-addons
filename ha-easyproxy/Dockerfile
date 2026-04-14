FROM debian:bookworm-slim

# Installazione dipendenze di sistema (aggiunto 'jq' per leggere le config)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    jq \
    python3 \
    python3-pip \
    python3-setuptools \
    python3-wheel \
    python3-dev \
    gcc \
    libffi-dev \
    libssl-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Imposta la cartella di lavoro
WORKDIR /app

# Trucco anti-cache per forzare l'aggiornamento da GitHub
ADD "https://api.github.com/repos/realbestia1/EasyProxy/commits/main" /tmp/skipcache

# Clona il repository
RUN git clone https://github.com/realbestia1/EasyProxy.git .

# Installa le dipendenze Python del progetto
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# ATTENZIONE: Se l'app necessita di Playwright completo, scommenta questa riga:
# RUN playwright install chromium --with-deps

# Copia lo script di avvio locale
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
