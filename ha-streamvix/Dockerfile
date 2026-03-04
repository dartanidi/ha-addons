FROM node:20-slim

# Installiamo Python, git, jq e le librerie necessarie (node:20-slim è Debian, quindi apt-get funziona perfettamente)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    python3-dev \
    build-essential \
    ca-certificates \
    git \
    jq \
    tesseract-ocr \
    tesseract-ocr-ita \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    && rm -rf /var/lib/apt/lists/*

# Creiamo un virtual environment per Python per evitare errori con pip
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
