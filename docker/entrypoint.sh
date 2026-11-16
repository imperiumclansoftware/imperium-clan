#!/bin/sh
# Démarrage du conteneur : configuration par défaut, base de données, jeton d'installation, tâches planifiées.
set -eu
cd /app
DATA=/data
mkdir -p "$DATA/uploads" "$DATA/share"

# APP_SECRET : variable d'environnement, sinon secret aléatoire généré une fois et conservé dans le volume.
if [ -z "${APP_SECRET:-}" ]; then
	if [ ! -s "$DATA/.app_secret" ]; then
		(umask 077 && php -r 'echo bin2hex(random_bytes(32));' > "$DATA/.app_secret")
	fi
	APP_SECRET="$(cat "$DATA/.app_secret")"
	export APP_SECRET
fi

# Base : SQLite dans le volume par défaut, PostgreSQL si DATABASE_URL est fourni.
if [ -z "${DATABASE_URL:-}" ]; then
	DATABASE_URL="sqlite:///$DATA/imperium.db"
	export DATABASE_URL
fi

if [ "$#" -gt 0 ] && [ "$1" != "frankenphp" ]; then
	exec "$@" # ex. : docker exec … php bin/console app:user:create …
fi

case "$DATABASE_URL" in
	sqlite:*)
		echo "Base SQLite : mise à jour du schéma"
		php bin/console doctrine:schema:update --force --no-interaction
		;;
	*)
		echo "Base PostgreSQL : attente de la connexion"
		tries=0
		until php bin/console dbal:run-sql -q "SELECT 1" >/dev/null 2>&1; do
			tries=$((tries + 1))
			if [ "$tries" -ge 30 ]; then
				echo "Base de données injoignable (DATABASE_URL)." >&2
				exit 1
			fi
			sleep 2
		done
		php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
		;;
esac

php bin/console app:content:init --no-interaction
php bin/console app:setup:token --no-interaction --url "${APP_URL:-}"

if [ "${DISABLE_CRON:-0}" != "1" ]; then
	/usr/local/bin/imperium-cron &
fi

exec "$@"
