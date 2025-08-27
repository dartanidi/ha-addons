ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install Node.js, npm, and pnpm
RUN \
    apk add --no-cache \
        nodejs \
        npm \
        git \
        python3 \
        py3-pip \
        py3-requests \
        py3-schedule \
        tzdata \
    && npm install -g pnpm

# Set timezone
ENV TZ=Europe/Rome

# Set work directory
WORKDIR /app

# Clone StreamViX repository
RUN git clone https://github.com/qwertyuiop8899/StreamViX.git /app

# Install dependencies
RUN pnpm install

# Build the application
RUN pnpm run build

# Create config directory
RUN mkdir -p /app/config

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

# Expose port
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["/run.sh"]
