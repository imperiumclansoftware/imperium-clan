# Imperium Clan

Portail public du clan **Imperium** et son administration, dans **une seule image** : site Angular, API Symfony et
serveur web (FrankenPHP : Caddy + PHP 8.4). Interface en français.

- **Site public** : présentation du clan, membres, zones des quatre branches (ICG, ICF, ICC, ICS) avec changement
  de couleur animé, outils du clan (Conclave, Avenger…), actualités, galerie par événements, formulaire « Rejoindre ».
- **Espace membre** : ressources graphiques à télécharger, générateur de bannières Facebook / X avec le pseudo et
  le sceau du membre.
- **Administration** : actualités (éditeur WYSIWYG, image d'illustration), galerie (envoi multiple par glisser-déposer),
  présentation, branches, outils, membres, candidatures, ressources.

Code source : https://github.com/imperiumclansoftware/imperium-clan

## Démarrage rapide

```bash
docker run -d --name imperium-clan \
  -p 8080:8080 \
  -v imperium-data:/data \
  -e TRUSTED_PROXIES=private_ranges \
  iemperor/imperium-clan:latest
```

Puis :

1. Récupère le **jeton d'installation** dans les logs :
   ```bash
   docker logs imperium-clan
   ```
2. Ouvre `https://<ton-domaine>/installation`, colle le jeton et crée le **premier compte administrateur**.
   Tu es connecté directement à l'administration.

La page d'installation ne fonctionne que tant qu'aucun compte n'existe. Le jeton change à chaque démarrage
tant que l'installation n'est pas faite. Il est obligatoire : le premier visiteur d'une instance fraîchement
déployée ne peut donc pas s'emparer de l'administration.

> **HTTPS obligatoire.** Le cookie de session est `__Host-` (attribut `Secure`) : place l'image derrière un reverse
> proxy qui termine TLS (Traefik, Caddy, Nginx…), ou laisse l'image obtenir elle-même un certificat (voir plus bas).

## Avec Docker Compose

```yaml
services:
  imperium-clan:
    image: iemperor/imperium-clan:latest
    restart: unless-stopped
    ports: ['8080:8080']
    environment:
      TRUSTED_PROXIES: private_ranges
      APP_URL: https://portail.exemple.fr
    volumes: ['imperium-data:/data']
volumes:
  imperium-data:
```

### Avec PostgreSQL (facultatif)

SQLite suffit pour un clan. Pour PostgreSQL, ajoute le service et `DATABASE_URL` ; les migrations s'appliquent au
démarrage.

```yaml
services:
  imperium-clan:
    image: iemperor/imperium-clan:latest
    restart: unless-stopped
    ports: ['8080:8080']
    environment:
      TRUSTED_PROXIES: private_ranges
      DATABASE_URL: postgresql://imperium:${POSTGRES_PASSWORD}@db:5432/imperium?serverVersion=16&charset=utf8
    volumes: ['imperium-data:/data']
    depends_on: [db]
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: imperium
      POSTGRES_USER: imperium
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes: ['db-data:/var/lib/postgresql/data']
volumes:
  imperium-data:
  db-data:
```

### HTTPS automatique (sans reverse proxy)

```bash
docker run -d --name imperium-clan \
  -p 80:80 -p 443:443 -p 443:443/udp \
  -v imperium-data:/data \
  -e SERVER_NAME=portail.exemple.fr \
  iemperor/imperium-clan:latest
```

Le domaine doit pointer vers la machine. Les certificats (Let's Encrypt) sont conservés dans le volume `/data`.

## Connexion avec Conclave

Les membres se connectent au portail **avec leur compte Conclave** (Conclave ≥ 0.8.0). Leurs droits viennent de
Conclave à chaque connexion : espace membre pour tous, publication des actualités pour la branche Communication.
Les administrateurs du portail se désignent dans **Administration → Comptes**.

1. Dans Conclave, ajoutez la connexion au client du portail (le secret ne change pas) :
   ```bash
   docker exec -it conclave-conclave-1 php bin/console app:oauth:client:update <n°> \
     --scope=portal:members --scope=openid --scope=profile \
     --redirect-uri=https://portail.exemple.fr/api/auth/conclave/callback
   ```
2. Dans la stack du portail : `APP_URL=https://portail.exemple.fr` (même adresse), avec `CONCLAVE_URL`,
   `CONCLAVE_CLIENT_ID` et `CONCLAVE_CLIENT_SECRET` déjà utilisés pour la synchronisation des membres.

Le bouton « Se connecter avec Conclave » apparaît alors sur `/connexion`. Le compte local créé à l'installation
reste disponible en secours (« Compte local du portail »).

## Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `SERVER_NAME` | `:8080` | `:8080` = HTTP derrière un reverse proxy ; un nom de domaine = HTTPS automatique sur 80/443 |
| `TRUSTED_PROXIES` | *(vide)* | Adresses du reverse proxy dont les en-têtes `X-Forwarded-*` sont crus. `private_ranges` pour un proxy sur le réseau Docker |
| `APP_URL` | *(vide)* | Adresse publique du site : lien d'installation dans les logs et **adresse de retour de la connexion Conclave** (`APP_URL/api/auth/conclave/callback`) |
| `DATABASE_URL` | SQLite dans `/data` | Base PostgreSQL : `postgresql://user:pass@hôte:5432/base?serverVersion=16&charset=utf8` |
| `APP_SECRET` | généré dans `/data` | Secret Symfony ; généré aléatoirement au premier démarrage s'il n'est pas fourni |
| `SETUP_TOKEN` | généré à chaque démarrage | Impose un jeton d'installation connu d'avance (déploiement automatisé) |
| `CONCLAVE_URL`, `CONCLAVE_CLIENT_ID`, `CONCLAVE_CLIENT_SECRET` | *(vide)* | Synchronisation des membres depuis Conclave, toutes les 15 minutes |
| `DISABLE_CRON` | `0` | `1` pour confier les tâches planifiées à un ordonnanceur externe |
| `TZ` | `Europe/Paris` | Fuseau horaire |

Secrets (`APP_SECRET`, mot de passe de la base, `CONCLAVE_CLIENT_SECRET`) : passe-les par un fichier `.env` non
versionné ou par les secrets de ta plateforme, jamais en clair dans un dépôt.

## Données et sauvegarde

Tout ce qui doit survivre à une mise à jour est dans le volume **`/data`** :

| Chemin | Contenu |
| --- | --- |
| `/data/imperium.db` | base SQLite (si `DATABASE_URL` n'est pas défini) |
| `/data/uploads/` | images de la galerie, des actualités, avatars, ressources |
| `/data/.app_secret` | secret Symfony généré |
| `/data/caddy/` | certificats TLS (mode HTTPS automatique) |

Sauvegarde : arrête le conteneur (ou fais une copie cohérente de la base), puis archive le volume.

```bash
docker run --rm -v imperium-data:/data -v "$PWD":/backup alpine tar czf /backup/imperium-$(date +%F).tgz -C /data .
```

Si tu montes un dossier de l'hôte à la place d'un volume nommé, il doit appartenir à l'UID **1000** :
`chown -R 1000:1000 ./data`.

## Mise à jour

```bash
docker pull iemperor/imperium-clan:latest
docker rm -f imperium-clan
docker run …   # même commande qu'au départ, même volume
```

Le schéma de la base est mis à jour automatiquement au démarrage.

## Commandes utiles

```bash
# Créer d'autres comptes (le mot de passe est demandé en masqué)
docker exec -it imperium-clan php bin/console app:user:create editeur@exemple.fr "Nom affiché" --role=editor
docker exec -it imperium-clan php bin/console app:user:create membre@exemple.fr "Pseudo" --role=member --member=<sub Conclave>

# Synchroniser les membres depuis Conclave immédiatement
docker exec imperium-clan php bin/console app:members:sync
```

Rôles : `admin` (tout) ⊃ `editor` (actualités, galerie) ⊃ `member` (espace membre).

## Sécurité

- Conteneur exécuté en utilisateur non privilégié (UID 1000), PHP en production (`APP_DEBUG=0`, OPcache).
- Mots de passe hachés en Argon2id ; cookie de session `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax` ; protection
  CSRF double-submit ; limitation des tentatives de connexion, d'installation et de candidature.
- En-têtes stricts : CSP avec Trusted Types, HSTS, `nosniff`, `frame-ancestors 'none'`, COOP.
- Fichiers envoyés stockés hors de la racine web et servis par l'API après contrôle d'accès.

## Tags

| Tag | Contenu |
| --- | --- |
| `latest` | dernière version publiée |
| `X.Y.Z`, `X.Y` | versions figées (recommandé en production) |

Architectures : `linux/amd64`, `linux/arm64`.
