ARG BUILD_FROM
FROM $BUILD_FROM

# Installazione dipendenze di sistema
RUN apk add --no-cache \
    git \
    python3 \
    py3-pip \
    py3-setuptools \
    py3-wheel \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    openssl-dev \
    ffmpeg

# Imposta la cartella di lavoro
WORKDIR /app

# --- TRUCCO ANTI-CACHE ---
# Questa riga interroga GitHub per vedere qual è l'ultimo commit sul branch principale.
# Se il commit cambia, la cache di Docker si invalida da questo punto in poi, 
# costringendolo a fare un nuovo git clone e una nuova installazione di pip.
ADD "https://api.github.com/repos/realbestia1/EasyProxy/commits/main" skipcache

# Clona il repository
RUN git clone https://github.com/realbestia1/EasyProxy.git .

# Installa le dipendenze Python del progetto
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copia lo script di avvio locale
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
