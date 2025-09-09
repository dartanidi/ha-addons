ARG BUILD_FROM=ghcr.io/hassio-addons/base:15.0.1
FROM ${BUILD_FROM}

# Installa dipendenze
RUN apk add --no-cache \
    nginx \
    php81 \
    php81-fpm \
    php81-mysqli \
    php81-json \
    php81-openssl \
    php81-curl \
    php81-zlib \
    php81-xml \
    php81-phar \
    php81-intl \
    php81-dom \
    php81-xmlreader \
    php81-ctype \
    php81-session \
    php81-mbstring \
    php81-gd \
    php81-zip \
    php81-opcache \
    php81-fileinfo \
    php81-exif \
    php81-pecl-imagick \
    supervisor \
    curl \
    wget \
    mysql-client \
    netcat-openbsd

# Crea utente e directory
RUN adduser -D -S -h /var/cache/nginx nginx && \
    mkdir -p /var/www/html && \
    mkdir -p /run/nginx && \
    mkdir -p /run/php && \
    mkdir -p /var/log/supervisor

# Scarica e installa WordPress
WORKDIR /tmp
RUN wget https://wordpress.org/latest.tar.gz && \
    tar xzf latest.tar.gz && \
    mv wordpress/* /var/www/html/ && \
    rm -rf wordpress latest.tar.gz

# Imposta permessi
RUN chown -R nginx:nginx /var/www/html && \
    chmod -R 755 /var/www/html

# Copia file di configurazione
COPY rootfs /

# Esponi porta
EXPOSE 80

# Comando di avvio
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
