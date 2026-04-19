FROM python:3.12-slim-bookworm

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
ENV PYTHONUNBUFFERED=1

# Dipendenze di sistema SENZA chromium (lo installerà playwright)
RUN apt-get update && apt-get install -y --no-install-recommends \
    jq \
    git \
    ffmpeg \
    xvfb \
    xauth \
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

# Invalidazione cache
ADD "https://api.github.com/repos/realbestia1/EasyProxy/commits/main" /tmp/skipcache

RUN git clone https://github.com/realbestia1/EasyProxy.git .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m playwright install chromium

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
