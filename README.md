# Imperium Clan — portail du clan

Portail public du clan Imperium et son administration.

- **Partie publique** : accueil, présentation du clan, membres (filtres multi-branches), outils par branche
  (Conclave, Avenger…), actualités, galerie par événements (albums), formulaire « Rejoindre ».
- **Zones des branches** (`/branches/icg`, `icf`, `icc`, `ics`) : présentation éditable, membres, outils et
  actualités de la branche. L'interface prend la couleur de la branche avec une transition animée :
  `BranchTheme` pose `data-branche` sur `<html>`, `styles.scss` en déduit `--accent` / `--accent-trait`
  (enregistrées avec `@property` pour être animables ; désactivé si l'utilisateur réduit les animations).
- **Fonds** : `frontend/public/brand/fonds/fond-{icg,icf,icc,ics,clan}.webp` (+ variantes `-640`), images
  générées avec Gemini (1584 × 672, 21:9, centre volontairement sombre pour le sceau et le texte). Le fond
  clan est celui de tout le site public (`PublicLayout`, page de connexion) ; dans une zone de branche il
  s'efface en fondu au profit du fond de la branche. Le générateur de bannières propose aussi ces fonds
  (choix du fond, voile sombre pour la lisibilité). Pour en remplacer un : même nom, même ratio.
- **Actualités** : texte saisi dans un éditeur WYSIWYG (Tiptap 3, `shared/rich-editor.ts`) et stocké en
  **JSON** (jamais en HTML). Le serveur reconstruit le document par liste blanche (`App\News\RichText` :
  intertitres, gras, italique, souligné, barré, listes, citations, liens http(s)/mailto) ; le site le rend avec
  des templates Angular (`shared/rich-text.ts`), sans innerHTML. Compatible CSP Trusted Types (`injectCSS`
  désactivé, politique `ProseMirrorClipboard` autorisée pour le collage). Image d'illustration au format 16:9 ;
  sans image, illustration de remplacement : fond de la branche (ou fond clan) + sceau (`shared/news-illustration.ts`).
- **Espace membre** (`/ressources`, connexion requise) : ressources téléchargeables (logos, visuels) et
  générateurs de bannières (Facebook, X) avec le pseudo et le sceau des branches du membre, dessinés dans le
  navigateur (`features/member/banner.ts` : ajouter un format = une ligne dans `BANNER_FORMATS`).
- **Administration** (`/admin`) : actualités et galerie (rôle éditeur), présentation, outils, membres,
  candidatures, ressources (rôle administrateur).
- **Installation** (`/installation`) : sur une instance neuve (aucun compte), création du premier administrateur
  depuis le navigateur, sur présentation du **jeton d'installation** affiché dans les logs au démarrage
  (`app:setup:token`, ou variable `SETUP_TOKEN`). Seule l'empreinte SHA-256 du jeton est stockée ; création sous
  verrou, limitée à 5 essais / 15 min / IP, fermée dès qu'un compte existe. La page de connexion y renvoie
  automatiquement tant que le site n'est pas installé.
- **Design** : charte [imperium_design](https://github.com/imperiumclansoftware/imperium_design) — jetons dans
  `frontend/src/styles/_tokens.scss` (copie de `tokens/tokens.css`), sceau porté en composant Angular
  (`shared/sceau.ts`), polices auto-hébergées dans `frontend/src/fonts` (SIL OFL), intégrées au build.
- **Socle** : [secure-skeleton](https://github.com/imperiumclansoftware/secure-skeleton) (Symfony 8.1 / PHP 8.4,
  Angular 22) et les guidelines sécurité de l'équipe.

## Démarrer en local

```bash
docker compose up -d --wait                       # PostgreSQL (port 5435)
cd backend
composer install
php bin/console doctrine:migrations:migrate -n
php bin/console app:content:init --demo-members   # outils Conclave/Avenger, sections, membres de démo (dev)
php bin/console app:user:create <email> "<Nom affiché>"                  # administrateur
php bin/console app:user:create <email> "<Nom affiché>" --role=editor    # éditeur (actualités, galerie)
php bin/console app:user:create <email> "<Nom affiché>" --role=member --member=<sub Conclave>
                                                  # membre, relié à sa fiche (pseudo, branches)
php bin/console app:resources:import-design ../../imperium_design   # logos de la charte → ressources
symfony serve -d --port=8000

cd ../frontend
npm ci
npm start                                         # http://localhost:4200, /api relayé vers :8000
npm run start:code-server                         # 0.0.0.0:4210, servi sous /absproxy/4210/ derrière code-server
                                                  # (API_URL=http://127.0.0.1:8010 pour viser une autre API)
```

Le front appelle l'API en URL **relatives** (`api/...`, sans `/` initial) pour fonctionner sous n'importe
quel base href (`/` en production, `/absproxy/4210/` derrière code-server).

Si Docker tourne sur un autre hôte, surcharge `DATABASE_URL` dans `backend/.env.local` (non versionné).

## API

| Route | Accès |
| --- | --- |
| `GET /api/public/{members,tools,pages,news,news/{slug},gallery}` | public, contenu publié uniquement |
| `POST /api/public/join-requests` | public, 3 / heure / IP, pot de miel, consentement obligatoire |
| `GET /api/media/{avatars,gallery,news}/{fichier}` | public si rattaché à un contenu public |
| `GET /api/public/gallery` (images hors événement), `…/gallery/events`, `…/gallery/events/{slug}` | public ; événements publiés uniquement |
| `/api/admin/gallery/events`, `POST /api/admin/gallery/move` | `ROLE_EDITOR` ; un événement en brouillon et ses images restent privés |
| `GET /api/public/branches`, `GET /api/public/news?branch=ICG` | public |
| `PUT /api/admin/branches/{ICG,ICF,ICC,ICS}` | `ROLE_ADMIN` |
| `GET /api/session` | public : utilisateur connecté ou `null`, pose le cookie XSRF |
| `GET /api/setup`, `POST /api/setup` | public ; création du premier administrateur, uniquement sans compte existant et avec le jeton d'installation |
| `GET /api/member/resources`, `…/{id}/file` | `ROLE_MEMBER` ; SVG, PDF, ZIP toujours en pièce jointe + CSP `sandbox` |
| `/api/admin/news`, `/api/admin/gallery` | `ROLE_EDITOR` |
| `/api/admin/{tools,pages,members,join-requests,resources}` | `ROLE_ADMIN` |

Rôles : `ROLE_ADMIN` ⊃ `ROLE_EDITOR` ⊃ `ROLE_MEMBER`.

Les sorties sont définies dans `backend/src/Api/Presenter.php`, miroir côté Angular dans
`frontend/src/app/core/api/models.ts`.

## Déploiement : image Docker unique

`Dockerfile` (racine) : build Angular + dépendances PHP sans dev, servis par **FrankenPHP** (Caddy + PHP 8.4) dans
une seule image, utilisateur non privilégié, données dans le volume `/data`.

- `docker/Caddyfile` : `/api/*` → Symfony, le reste → Angular (`try_files … /index.html`), **CSP et en-têtes du
  front** (à tenir à jour si l'application charge une nouvelle source), cache long des fichiers hachés.
- `docker/entrypoint.sh` : `APP_SECRET` généré dans `/data` s'il n'est pas fourni ; SQLite dans `/data` par défaut
  (schéma mis à jour au démarrage), PostgreSQL si `DATABASE_URL` est fourni (migrations) ; `app:content:init` ;
  jeton d'installation ; tâches planifiées (`docker/cron.sh`, désactivables par `DISABLE_CRON=1`).
- `DOCKERHUB.md` : overview Docker Hub (démarrage, variables, sauvegarde) — **à tenir à jour** avec les variables.
- `.github/workflows/docker.yml` : sur un tag `vX.Y.Z`, image amd64 + arm64 poussée sur Docker Hub et overview
  mise à jour. Prérequis GitHub : variable `DOCKERHUB_USERNAME`, secret `DOCKERHUB_TOKEN`.

```bash
docker build -t iemperor/imperium-clan:dev .
docker run --rm -p 8080:8080 -v imperium-data:/data iemperor/imperium-clan:dev
docker logs <conteneur>          # jeton d'installation → http(s)://…/installation
```

HTTPS requis en production (cookie `__Host-SID`) : reverse proxy + `TRUSTED_PROXIES=private_ranges`, ou
`SERVER_NAME=<domaine>` pour le HTTPS automatique de Caddy.

## Tâches planifiées (production)

Dans l'image Docker, `docker/cron.sh` s'en charge (synchronisation toutes les 15 min si `CONCLAVE_URL` est défini,
purge quotidienne). Hors Docker :

```cron
*/15 * * * *  php bin/console app:members:sync         # membres depuis Conclave (ADR 0004)
30 3 * * *    php bin/console app:join-requests:purge  # RGPD : candidatures > 6 mois
```

## Conclave (à venir)

- **SSO** des administrateurs : Conclave fournisseur OpenID Connect (ADR 0003, *proposé*). En attendant, comptes
  locaux créés par la page `/installation` (premier administrateur) puis `app:user:create` (ils resteront le secours).
- **Membres** : `ConclaveMemberSource` attend `POST /oauth/token` (client credentials, scope `portal:members`)
  et `GET /api/portal/members` côté Conclave (ADR 0004, *proposé*). Variables : `CONCLAVE_URL`,
  `CONCLAVE_CLIENT_ID`, `CONCLAVE_CLIENT_SECRET` (secret dans le coffre Symfony).

## Sécurité — écarts assumés

- Pas de Voter par ressource : aucun contenu n'a de propriétaire, l'accès est uniquement fonction du rôle
  (`access_control` + `#[IsGranted]`). Un Voter sera ajouté si un contenu devient « propriétaire »
  (ex. : un éditeur limité à ses propres actualités).
- Textes saisis en texte brut, découpés en paragraphes côté Angular : aucun HTML n'est interprété.

## Vérifications

- Backend : `composer audit`, `vendor/bin/phpstan analyse`, `vendor/bin/php-cs-fixer fix --dry-run`, `php bin/phpunit`
- Frontend : `npx ng lint`, `npx ng test --watch=false`, `npx ng build`
