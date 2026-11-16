# ADR 0003 — Connexion à l'administration par SSO Conclave (OpenID Connect)

- Statut : proposé
- Date : 2026-11-10

## Contexte
Le portail Imperium Clan a une partie publique et une administration. Les administrateurs sont des
membres du clan qui ont déjà un compte Conclave (www.imperiumclan.fr). Conclave authentifie ses
utilisateurs avec des JWT LexikJWT de 7 jours et n'expose aujourd'hui ni endpoint OpenID Connect ni
OAuth2 (`/.well-known/openid-configuration` renvoie la SPA).

Maintenir des comptes locaux en double serait une source de désynchronisation (un leader retiré de
Conclave resterait admin du portail).

## Décision
1. **Conclave devient fournisseur OpenID Connect** via `league/oauth2-server-bundle` + une extension
   OIDC (id_token, `/.well-known/openid-configuration`, JWKS). Seul le flux *authorization code + PKCE*
   est activé ; pas de flux implicite ni de *password grant*.
2. **Le portail est un client confidentiel** côté backend Symfony (`knpuniversity/oauth2-client-bundle`
   + authenticator dédié). Le navigateur ne voit jamais l'access token : après l'échange du code, le
   portail ouvre **sa propre session cookie** (`__Host-SID`, ADR 0002). La redirection et le callback
   vérifient `state`, `nonce` et le `code_verifier`.
3. **Rôles** : Conclave publie un claim `roles` ; le portail accorde `ROLE_ADMIN` aux `ROLE_LEADER` de
   Conclave et un rôle `ROLE_EDITOR` (actualités, galerie) aux membres de la branche Communicants. Les
   rôles sont recalculés à chaque connexion ; la session admin dure au plus 8 h.
4. **Secrets** : `client_secret` et clé de signature OIDC dans le coffre Symfony / variables
   d'environnement, jamais dans Git.
5. **Secours** : une commande `app:admin:emergency` crée un compte local temporaire (Argon2id, expiré
   après 24 h) si Conclave est indisponible.

## Conséquences
- Travail à faire dans Conclave (bundle, écran de consentement, enregistrement du client, tests).
- Avenger pourra réutiliser le même fournisseur plus tard.
- La disponibilité de l'admin du portail dépend de Conclave ; la partie publique n'en dépend pas.
