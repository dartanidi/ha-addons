#!/usr/bin/with-contenv bashio

# Leggi configurazione
readonly DB_HOST=$(bashio::config 'wordpress_db_host')
readonly DB_NAME=$(bashio::config 'wordpress_db_name')
readonly DB_USER=$(bashio::config 'wordpress_db_user')
readonly DB_PASSWORD=$(bashio::config 'wordpress_db_password')
readonly TABLE_PREFIX=$(bashio::config 'wordpress_table_prefix')
readonly WP_DEBUG=$(bashio::config 'wordpress_debug')
readonly PHP_MEMORY=$(bashio::config 'php_memory_limit')
readonly PHP_MAX_TIME=$(bashio::config 'php_max_execution_time')
readonly WP_LOCALE=$(bashio::config 'wordpress_locale')

bashio::log.info "Configurazione WordPress..."

# Genera chiavi di sicurezza WordPress
SALT_KEYS=$(curl -s https://api.wordpress.org/secret-key/1.1/salt/)

# Crea wp-config.php
cat > /var/www/html/wp-config.php << EOF
<?php
define('DB_NAME', '${DB_NAME}');
define('DB_USER', '${DB_USER}');
define('DB_PASSWORD', '${DB_PASSWORD}');
define('DB_HOST', '${DB_HOST}');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');

${SALT_KEYS}

\$table_prefix = '${TABLE_PREFIX}';

define('WP_DEBUG', ${WP_DEBUG});
define('WP_DEBUG_LOG', ${WP_DEBUG});
define('WP_DEBUG_DISPLAY', false);

define('WPLANG', '${WP_LOCALE}');
define('WP_LANG_DIR', ABSPATH . 'wp-content/languages');

define('FS_METHOD', 'direct');

define('AUTOMATIC_UPDATER_DISABLED', false);
define('WP_AUTO_UPDATE_CORE', 'minor');

if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
EOF

# Configura PHP
sed -i "s/memory_limit = .*/memory_limit = ${PHP_MEMORY}/" /etc/php81/php.ini
sed -i "s/max_execution_time = .*/max_execution_time = ${PHP_MAX_TIME}/" /etc/php81/php.ini
sed -i "s/upload_max_filesize = .*/upload_max_filesize = 64M/" /etc/php81/php.ini
sed -i "s/post_max_size = .*/post_max_size = 64M/" /etc/php81/php.ini

# Configura PHP-FPM
cat > /etc/php81/php-fpm.d/www.conf << EOF
[www]
user = nginx
group = nginx
listen = /run/php/php8.1-fpm.sock
listen.owner = nginx
listen.group = nginx
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
EOF

# Configura Nginx
cat > /etc/nginx/nginx.conf << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 64M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name _;
        root /var/www/html;
        index index.php index.html;

        location / {
            try_files \$uri \$uri/ /index.php?\$args;
        }

        location ~ \.php\$ {
            fastcgi_pass unix:/run/php/php8.1-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
            include fastcgi_params;
        }

        location ~ /\.ht {
            deny all;
        }

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Configura Supervisor
cat > /etc/supervisor/conf.d/supervisord.conf << EOF
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:php-fpm]
command=/usr/sbin/php-fpm81 -F
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true

[program:nginx]
command=/usr/sbin/nginx -g 'daemon off;'
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
EOF

bashio::log.info "Aspetto che MariaDB sia disponibile..."

# Attendi che il database sia disponibile
while ! nc -z "${DB_HOST}" 3306; do
    sleep 1
done

bashio::log.info "Configurazione completata! WordPress è pronto."

# Imposta permessi finali
chown -R nginx:nginx /var/www/html
chmod -R 755 /var/www/html

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
