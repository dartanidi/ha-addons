ARG BUILD_FROM=ghcr.io/hassio-addons/debian-base/amd64:7.2.0
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base system
ARG BUILD_ARCH=amd64

# Install Node.js and required packages
# hadolint ignore=DL3008,DL3009
RUN \
    apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        git \
        ca-certificates \
        gnupg \
        python3 \
        python3-pip \
        python3-requests \
        python3-schedule \
        tzdata \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm \
    && apt-get purge -y --auto-remove \
        gnupg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set timezone
ENV TZ=Europe/Rome

# Set working directory
WORKDIR /app

# Clone StreamViX repository
RUN \
    git clone --depth 1 https://github.com/qwertyuiop8899/StreamViX.git /tmp/streamvix \
    && cp -r /tmp/streamvix/* /app/ \
    && rm -rf /tmp/streamvix

# Install dependencies
RUN \
    pnpm install --frozen-lockfile --production \
    && pnpm store prune \
    && npm cache clean --force

# Build application if needed
RUN \
    if [ -f package.json ] && pnpm run --if-present build; then \
        echo "Build completed successfully"; \
    fi

# Create necessary directories
RUN \
    mkdir -p /app/config \
    && mkdir -p /data \
    && chown -R root:root /app

# Copy rootfs
COPY rootfs /

# Set permissions
RUN chmod a+x /etc/services.d/streamvix/run

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7860 || exit 1

# Labels
LABEL \
    io.hass.name="StreamViX" \
    io.hass.description="A Stremio addon for Italian streaming sources" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version="1.4.1" \
    maintainer="StreamViX Add-on Maintainer" \
    org.opencontainers.image.title="StreamViX" \
    org.opencontainers.image.description="A Stremio addon for Italian streaming sources" \
    org.opencontainers.image.source="https://github.com/qwertyuiop8899/StreamViX" \
    org.opencontainers.image.licenses="MIT"
