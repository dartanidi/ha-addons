ARG BUILD_FROM
FROM $BUILD_FROM

# Installa le dipendenze necessarie
RUN apk add --no-cache \
    bash \
    curl \
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
    php81-exif \
    mariadb-client

# Copia gli script
COPY rootfs /

# Crea le directory necessarie
RUN mkdir -p /var/www/html && \
    chown -R nginx:nginx /var/www && \
    chmod -R 755 /var/www

WORKDIR /var/www/html

EXPOSE 80

CMD [ "/init" ]
