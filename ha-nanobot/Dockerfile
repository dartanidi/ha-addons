ARG BUILD_FROM=ghcr.io/hassio-addons/base/alpine:latest
FROM $BUILD_FROM

# Installazione Python, pip e dipendenze di sistema (necessarie per compilare alcune lib)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    jq \
    curl \
    gcc \
    musl-dev \
    linux-headers \
    python3-dev

# Installazione Nanobot via pip
# Usiamo --break-system-packages perché siamo in un container isolato
RUN pip3 install --no-cache-dir --break-system-packages nanobot-cli

# Copia script di avvio
COPY run.sh /
RUN chmod a+x /run.sh

# Esponiamo la porta del Gateway
EXPOSE 18790

WORKDIR /data
CMD [ "/run.sh" ]
