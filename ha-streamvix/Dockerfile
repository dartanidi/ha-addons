ARG BUILD_FROM=ghcr.io/hassio-addons/debian-base:9.2.0
FROM $BUILD_FROM

# Aggiunge il repository per Node.js 20 e installa tutte le dipendenze di sistema
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    python3-dev \
    build-essential \
    git \
    jq \
    nodejs \
    tesseract-ocr \
    tesseract-ocr-ita \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    && rm -rf /var/lib/apt/lists/*

# Crea un virtual environment per Python e lo aggiunge al PATH in modo che Node usi questo
ENV PATH="/opt/venv/bin:$PATH"
RUN python3 -m venv /opt/venv \
    && pip install --no-cache-dir requests beautifulsoup4 pycryptodome pyDes pillow pytesseract curl_cffi fake-headers lxml

# Imposta la directory di lavoro
WORKDIR /opt/streamvix

# Clona il repository e compila l'applicazione TypeScript
RUN git clone https://github.com/qwertyuiop8899/StreamViX.git . \
    && npm install -g pnpm@8.15.5 \
    && pnpm install --prod=false \
    && pnpm add undici@6.19.8 \
    && pnpm run build

# Copia lo script di avvio
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 7860

CMD [ "/run.sh" ]
