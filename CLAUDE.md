# Imperium Clan — portail public + administration

Portail public du clan (présentation, membres, actualités, galerie, recrutement, outils par branche : Conclave, Avenger) + administration. Basé sur secure-skeleton (Symfony 8 / PHP 8.4 + Angular 22), design imperium_design. Interface en français.
Avant toute modification, appliquer la skill `symfony-angular-security` (règles DOIT / DEVRAIT).

- Backend : `backend/` — vérifs : `composer audit`, `vendor/bin/phpstan analyse`, `vendor/bin/php-cs-fixer fix --dry-run`, `php bin/phpunit`
- Frontend : `frontend/` — vérifs : `npx ng lint`, `npx ng test --watch=false`, `npx ng build`
- Décisions d'architecture : `docs/adr/`
