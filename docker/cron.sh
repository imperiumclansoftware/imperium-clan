#!/bin/sh
# Tâches planifiées, dans le conteneur (une seule image) : DISABLE_CRON=1 pour les confier à un ordonnanceur externe.
cd /app
last_purge=0
while :; do
	if [ -n "${CONCLAVE_URL:-}" ]; then
		php bin/console app:members:sync --no-interaction || echo "Synchronisation Conclave en échec" >&2
	fi
	now=$(date +%s)
	if [ $((now - last_purge)) -ge 86400 ]; then
		php bin/console app:join-requests:purge --no-interaction || echo "Purge des candidatures en échec" >&2
		last_purge=$now
	fi
	sleep 900
done
