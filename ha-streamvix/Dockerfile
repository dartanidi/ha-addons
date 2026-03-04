FROM node:20-slim

# Installa python3, pip, dipendenze per compilazione, git e jq
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev \
    build-essential ca-certificates \
    tesseract-ocr tesseract-ocr-ita tesseract-ocr-eng \
    libtesseract-dev libleptonica-dev \
    git jq \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /usr/src/app

# Clona direttamente l'ultimo commit del repository ufficiale
# (Se in futuro vuoi aggiornare l'add-on, ti basterà fare "Ricostruisci" da HA)
RUN git clone https://github.com/qwertyuiop8899/StreamViX.git .

# Installa le dipendenze Python
RUN pip3 install --no-cache-dir --break-system-packages \
    requests beautifulsoup4 pycryptodome pyDes \
    pillow pytesseract curl_cffi fake-headers lxml

# Installa pnpm e compila il progetto TS
RUN npm install -g pnpm@8.15.5
RUN rm -rf node_modules .pnpm-store dist 2>/dev/null || true
RUN pnpm install --prod=false
RUN pnpm add undici@6.19.8
RUN pnpm run build

# Imposta le variabili d'ambiente globali per Python
ENV PYTHONPATH=/usr/local/lib/python3.11/dist-packages:/usr/lib/python3.11/dist-packages
ENV PATH="/usr/local/bin:/usr/bin:$PATH"

# Copia lo script di avvio di HA all'interno dell'immagine e dai i permessi
COPY run.sh /run.sh
RUN chmod a+x /run.sh

ENTRYPOINT ["/run.sh"]
