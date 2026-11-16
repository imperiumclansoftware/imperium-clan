# ADR 0004 — Membres publics synchronisés depuis Conclave

- Statut : proposé
- Date : 2026-11-10

## Contexte
Le portail présente les membres du clan. La source de vérité des membres, de leurs branches
(Joueurs, Développeurs, Communicants, Cinéphiles), avatars et bios est Conclave. Conclave est un espace
privé : rien n'y est public, et ses identifiants utilisateurs sont des entiers séquentiels.

## Décision
1. **Consentement (RGPD)** : Conclave ajoute un choix « Apparaître sur le portail public » (désactivé
   par défaut) et le choix des champs exposés. Seuls les membres actifs ayant consenti sont exportés.
2. **API serveur à serveur** : Conclave expose `GET /api/portal/members`, protégé par un jeton client
   credentials OAuth2 (même serveur qu'ADR 0003, scope `portal:members`), qui renvoie uniquement :
   identifiant OIDC opaque (`sub`), pseudo, rôle affiché, branches, URL d'avatar, bio, factions.
   Jamais d'e-mail, de Discord ID ni de date de dernière connexion.
3. **Copie locale** : le portail stocke une copie (`Member`, clé UUID v7, `conclaveSub` unique)
   rafraîchie par une commande `app:members:sync` planifiée (toutes les 15 min) et déclenchable depuis
   l'admin. Un membre absent de l'export est supprimé du portail, avatar compris.
4. **Avatars** : téléchargés par le portail, MIME réel vérifié, renommés en UUID, servis par le portail
   (pas de lien direct vers Conclave depuis la page publique).
5. **Correspondance des branches** : la charte (imperium_design) nomme les branches ICG / ICF / ICC / ICS,
   Conclave utilise des blasons. Le portail convertit à la synchronisation : `players` → ICG,
   `cinephiles` → ICF, `communicants` → ICC, `developers` → ICS (`App\Enum\Branch::fromConclaveCrest()`).
   Un membre garde **toutes** ses branches (jamais de branche unique).
6. **Branches et outils** : les branches viennent de Conclave ; les outils (Conclave, Avenger…) sont
   gérés dans l'admin du portail et rattachés à une ou plusieurs branches.

## Conséquences
- La partie publique reste disponible si Conclave tombe (données éventuellement en retard de 15 min).
- Un retrait de consentement est effectif au plus tard à la synchronisation suivante.
