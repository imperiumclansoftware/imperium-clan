# syntax=docker/dockerfile:1
# Imperium Clan — image unique : front Angular + API Symfony servis par FrankenPHP (Caddy + PHP 8.4).

ARG FRANKENPHP_IMAGE=dunglas/frankenphp:1-php8.4-alpine

# 1. Front Angular
FROM node:24-alpine AS front
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx ng build --configuration production

# 2. Socle PHP commun
FROM ${FRANKENPHP_IMAGE} AS php-base
RUN install-php-extensions intl pdo_pgsql pdo_sqlite opcache apcu \
    && apk add --no-cache tzdata
WORKDIR /app

# 3. Dépendances PHP (sans les outils de dev)
FROM php-base AS vendor
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN apk add --no-cache unzip
COPY backend/composer.json backend/composer.lock backend/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-progress --no-interaction
COPY backend/bin bin/
COPY backend/config config/
COPY backend/migrations migrations/
COPY backend/public public/
COPY backend/src src/
COPY backend/.env ./
RUN composer dump-autoload --no-dev --classmap-authoritative --no-interaction \
    && APP_ENV=prod APP_DEBUG=0 APP_SECRET=build DATABASE_URL="sqlite:///:memory:" \
       php bin/console cache:warmup --no-interaction

# 4. Image finale
FROM php-base

LABEL org.opencontainers.image.title="Imperium Clan" \
      org.opencontainers.image.description="Portail public du clan Imperium et son administration" \
      org.opencontainers.image.source="https://github.com/imperiumclansoftware/imperium-clan" \
      org.opencontainers.image.licenses="proprietary"

ENV APP_ENV=prod \
    APP_DEBUG=0 \
    SERVER_NAME=:8080 \
    XDG_DATA_HOME=/data \
    XDG_CONFIG_HOME=/config \
    TZ=Europe/Paris

COPY docker/php.ini $PHP_INI_DIR/conf.d/zz-imperium.ini
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/imperium-entrypoint
COPY docker/cron.sh /usr/local/bin/imperium-cron
COPY --from=vendor /app /app
COPY --from=front /src/dist/frontend/browser /app/spa

# Utilisateur non privilégié (l'image de base autorise déjà frankenphp à écouter sur 80/443).
# Données persistantes (base SQLite, fichiers envoyés, jeton d'installation, certificats) : volume /data.
RUN frankenphp validate --config /etc/caddy/Caddyfile --adapter caddyfile \
    && adduser -D -H -u 1000 -s /sbin/nologin imperium \
    && mkdir -p /data /config /app/var/log \
    && rm -rf /app/var/uploads /app/var/share /data/caddy \
    && ln -s /data/uploads /app/var/uploads \
    && ln -s /data/share /app/var/share \
    && chown -R imperium:imperium /data /config /app/var

USER imperium
VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8081/api/health || exit 1

ENTRYPOINT ["imperium-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
