# 🔒 Sécurité et données

Little Games est un site statique : il n'y a pas de serveur, de compte ni de base de données en ligne. Ce document décrit les données de l'application, les protections en place et les règles à respecter quand on ajoute un jeu ou un service.

## Où sont les données

| Données | Où | Qui y a accès |
| --- | --- | --- |
| Catalogues (`games/*/data/*.json`) | Dépôt GitHub, servi par GitHub Pages | Public. Chaque modification passe par une pull request et `tests/catalogs.test.js` |
| Progression et réglages | `localStorage` de l'appareil (préfixe `little-games:<jeu>:`) | Le joueur, sur cet appareil seulement |
| Photos de Visages | IndexedDB de l'appareil (`little-games-visages`) | Le joueur, sur cet appareil |
| Clé TMDB (facultative) | `localStorage` de l'appareil | Le joueur qui l'a saisie |

Requêtes vers des tiers : polices (Google Fonts), affiches (TMDB, Wikipédia, Wikimedia). Aucune donnée personnelle n'y est envoyée.

## Protections en place
- **Politique de sécurité du contenu (CSP)**, dans `index.html`. Le navigateur refuse tout script, style, image ou connexion qui ne vient pas d'une source autorisée.
  - **Ajouter une source externe à un jeu** (nouvelle API, CDN, service temps réel…) : il faut l'ajouter à la CSP dans la même pull request, sinon elle sera bloquée.
  - Pas de script externe (`script-src 'self'`) : les bibliothèques sont copiées dans le dossier du jeu, comme `games/faces/vendor/`, avec leur licence.
- **Pas d'`innerHTML` avec des données externes** : le DOM est construit avec `h()` (`js/core/dom.js`), qui insère du texte. `innerHTML` n'est autorisé que pour des constantes écrites dans le code (icônes SVG).
- **Aucun secret dans le dépôt.** Le site est public : tout ce qui est dans le dépôt ou envoyé au navigateur est lisible par tous.
- **Stockage versionné** : `createStore(jeu, { version, migrate })` transforme les anciennes données lors d'une mise à jour, au lieu de les effacer.
- **Photos persistantes** : Visages demande au navigateur de ne pas effacer les photos quand l'appareil manque de place (`navigator.storage.persist()`).

## Réglages du dépôt GitHub (à faire par le propriétaire)
- **Settings → Rules → Rulesets** : règle sur `main` avec *Require a pull request before merging* et *Block force pushes*.
- **Settings → Advanced Security** : *Secret scanning* et *Push protection* activés.
- **Settings → Pages** : *Enforce HTTPS* coché.

## Le jour où l'application aura un service en ligne (multijoueur, Supabase…)
- **Clé publique et règles d'accès** : seule la clé publique (*anon*) peut aller dans le code. Chaque table a la *Row Level Security* activée, avec des règles qui n'autorisent que le strict nécessaire, par exemple un joueur n'écrit que ses propres réponses dans sa partie.
- **Clé secrète** : la clé `service_role` n'apparaît jamais dans le dépôt, dans le navigateur ni dans une conversation. Elle ne sert que dans une fonction côté serveur, si besoin.
- **Données minimales** : un pseudo choisi, un code de partie, les réponses et les scores. Pas d'adresse e-mail obligatoire (on utilise la connexion anonyme), et les parties sont effacées automatiquement après 24 h.
- **Hébergement en Europe** (RGPD) et ajout du domaine du service à la CSP (`connect-src`).
- **Mode de secours** : l'application reste jouable seule si le service est indisponible ou en pause.

## Signaler un problème
Ouvre une *issue* GitHub sans y mettre de détail exploitable, ou contacte directement le propriétaire du dépôt.
