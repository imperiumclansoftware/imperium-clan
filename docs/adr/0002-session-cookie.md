# ADR 0002 — Session cookie plutôt que JWT pour la SPA

- Statut : accepté
- Date : 2026-11-04

## Contexte
L'application Angular et l'API Symfony sont servies sur le même site. Un JWT stocké côté navigateur est exposé au XSS (localStorage) et difficile à révoquer.

## Décision
Authentification par cookie de session Symfony `HttpOnly`, `Secure`, `SameSite=Lax` (`__Host-SID` en production), avec `json_login` et `login_throttling`. CSRF par « double submit » : cookie `XSRF-TOKEN` + en-tête `X-XSRF-TOKEN` (support natif d'Angular HttpClient), vérifié par `CsrfDoubleSubmitSubscriber`.

## Conséquences
- Aucun jeton manipulé par le code Angular.
- Un client mobile ou tiers nécessitera un ADR dédié (JWT courte durée + refresh token rotatif).
