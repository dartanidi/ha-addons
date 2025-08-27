ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install required packages for Home Assistant add-ons and Node.js
RUN \
    apk add --no-cache \
        bashio \
        curl \
        nodejs \
        npm \
        git \
        python3 \
        py3-pip \
        py3-requests \
        py3-schedule \
        tzdata \
        ca-certificates

# Install pnpm globally
RUN npm install -g pnpm

# Set timezone to match StreamViX requirements
ENV TZ=Europe/Rome

# Set work directory
WORKDIR /app

# Clone StreamViX repository
RUN git clone --depth 1 https://github.com/qwertyuiop8899/StreamViX.git /tmp/streamvix && \
    cp -r /tmp/streamvix/* /app/ && \
    rm -rf /tmp/streamvix

# Install dependencies
RUN pnpm install --prod

# Build the application if build script exists
RUN if [ -f package.json ] && grep -q "build" package.json; then pnpm run build; fi

# Create config directory
RUN mkdir -p /app/config

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

# Set proper permissions
RUN chown -R root:root /app

# Expose port
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7860 || exit 1

CMD ["/run.sh"]
