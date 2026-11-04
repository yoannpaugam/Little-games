# Little Games : consignes pour Claude

Little Games rassemble des jeux d'ambiance à jouer entre amis, sur un ou plusieurs appareils. C'est une application web **100 % statique** (HTML, CSS, JavaScript en modules ES, sans framework ni build), publiée sur GitHub Pages depuis `main`. Toute l'interface est en français.

## Architecture
```
index.html, css/base.css   Coquille et thème commun (--bg, --accent, --font-display = Bebas Neue…)
js/app.js                  Routeur par hash #/<jeu>/<sous-page>, APP_VERSION
js/core/                   Briques partagées, sans dépendance : fuzzy.js, storage.js, dom.js
games/registry.js          Jeux affichés dans l'accueil (chargés à l'ouverture)
games/<dossier>/           Un dossier autonome par jeu : index.js, styles.css, data/, SPEC.md
tests/                     node --test (npm test)
scripts/                   set-version.mjs, fetch-posters.mjs
.claude/agents/            Agents spécialisés (voir plus bas)
```

| Jeu | id (URL) | Dossier | Préfixe CSS | Store localStorage | IndexedDB |
| --- | --- | --- | --- | --- | --- |
| 🎬 Affiches de cinéma | `affiches` | `games/movie-posters/` | `.mp-` | `affiches`, `affiches-posters` | — |
| 👤 Visages | `visages` | `games/faces/` | `.vz-` | `visages` | `little-games-visages` |

## Carte du code (Graphify)
- **Avant d'explorer le code, lire `graphify-out/GRAPH_REPORT.md`** : modules, fonctions centrales, liens entre fichiers. `graphify-out/graph.html` montre le graphe interactif.
- Pour une question précise : `pip install --break-system-packages graphifyy`, puis `graphify query "<question>"`, `graphify explain "<fonction>"` ou `graphify path "A" "B"`.
- `.graphifyignore` exclut la bibliothèque tierce `games/faces/vendor/` et les modèles.
- Le graphe indique le commit dont il vient (section *Graph Freshness*). **Chaque pull request qui modifie du code le régénère** avec `graphify update .` (local, sans appel à une IA).

## Contrat d'un jeu
- `games/<dossier>/index.js` exporte `mount(container, ctx)`. Il renvoie `{ update(path), destroy() }`.
- `ctx` contient `path`, `navigate(...path)`, `home()` et `version`.
- Le jeu n'importe que `js/core/`, jamais un autre jeu. Il charge ses styles (`ensureStyles()`) et ses données par une URL relative à `import.meta.url`.
- **Tous les imports et les fichiers chargés portent `?v=<version>`.** C'est `node scripts/set-version.mjs x.y.z` qui les met à jour, jamais à la main.
- Écran de jeu : il tient dans `100dvh` sans défilement, de l'iPhone SE (320 × 568) à l'ordinateur, téléphone en paysage compris. Les images de jeu sont en 2:3, à la même taille que les affiches.
- Chaque jeu a un `SPEC.md` qui le décrit indépendamment de la technologie.

## Règles de coordination
Une conversation s'occupe d'un seul jeu, et plusieurs pull requests peuvent être ouvertes en même temps.
- `games/registry.js` et `README.md` : on ne modifie que l'entrée ou la section de son propre jeu.
- `js/core/*` : on n'y fait que des ajouts compatibles. Les tests existants doivent continuer à passer. Si on change un comportement existant, on le signale dans la pull request.
- `css/base.css`, `index.html`, `js/app.js` : on n'y touche que si c'est nécessaire, et on le signale.

## Sécurité et données (détails dans `SECURITY.md`)
- **Catalogues** : en JSON dans le dépôt, vérifiés par `tests/catalogs.test.js`. Un nouveau catalogue ajoute ses règles dans ce test.
- **Données du joueur** : sur son appareil, avec `createStore(jeu, { version, migrate })`. On ne change jamais le format enregistré sans augmenter `version` et écrire la migration.
- **CSP** dans `index.html` : toute nouvelle source externe (API, CDN, service temps réel) y est ajoutée dans la même pull request. Pas de script externe : les bibliothèques vont dans le dossier du jeu, avec leur licence.
- **Pas d'`innerHTML`** avec des données externes : on construit le DOM avec `h()`.
- **Aucun secret dans le dépôt.** Pour un futur service en ligne (Supabase…), seule la clé publique est autorisée, la *Row Level Security* est obligatoire et le mode de secours hors ligne doit fonctionner.

## Livraison (règle de Yoann)
1. Partir de `main` à jour et créer une branche `jeu/<id>-v<x.y.z>`. Pour l'outillage ou le nettoyage : `outils/…` ou `maintenance/…`.
2. Vérifier :
   - `npm test` passe ;
   - avec Playwright, l'accueil et chaque jeu s'ouvrent sans erreur JavaScript ;
   - l'écran de jeu est testé sur iPhone SE, sur un grand téléphone, en paysage et sur ordinateur.
3. Une nouvelle version visible par les joueurs augmente la version mineure avec `set-version.mjs`. Si du code a changé, régénérer le graphe : `graphify update .`.
4. Pousser la branche et ouvrir une pull request par l'API REST : `gh api repos/yoannpaugam/little-games/pulls …`. GraphQL n'est pas disponible.
5. **Ne jamais merger sans l'accord explicite de Yoann.**

## Agents
Les agents de `.claude/agents/` analysent et améliorent l'application, chacun dans son domaine :

| Agent | Domaine |
| --- | --- |
| `game-designer` | Règles, rythme, plaisir de jeu, jeu à plusieurs |
| `ux-ui-mobile` | Ergonomie mobile, sans défilement, accessibilité, textes de l'interface |
| `architecte-front` | Code, contrat des jeux, `js/core/`, dette technique |
| `qa-testeur` | Tests automatiques, essais sur appareils, régressions |
| `curateur-contenu` | Catalogues (films, célébrités) : exactitude, équilibre, réponses acceptées |
| `performance-pwa` | Vitesse, poids, cache, hors-ligne, installation, GitHub Pages |
| `multijoueur` | Jeu sur plusieurs appareils, synchronisation, scores |
| `juridique-conformite` | Droits sur les images et les données, conditions d'API, vie privée |
| `coordinateur-release` | Versions, pull requests ouvertes, conflits entre jeux, README |

**Audit complet** : lancer les agents d'analyse en parallèle sur `main` à jour. Chacun rend un rapport au même format (constats classés par priorité, avec fichier et ligne). La session principale fusionne ces rapports dans un plan d'amélioration, le propose à Yoann, puis ouvre une pull request par lot validé.
