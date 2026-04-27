FROM python:3.12-slim-bookworm

# 1. Variabili d'ambiente per il browser di sistema
ENV PYTHONUNBUFFERED=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

# 2. Installazione pacchetti (Solo 64-bit supportati)
RUN apt-get update && apt-get install -y --no-install-recommends \
    jq \
    git \
    xvfb \
    xauth \
    ffmpeg \
    chromium \
    chromium-driver \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1 \
    libglu1-mesa \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Download codice sorgente (Scarica sempre l'ultima versione)
ADD "https://api.github.com/repos/realbestia1/EasyProxy/commits/main" /tmp/skipcache
RUN git clone https://github.com/realbestia1/EasyProxy.git .

# 4. Dipendenze Python
RUN pip install --no-cache-dir -r requirements.txt

# 5. Script di avvio
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
