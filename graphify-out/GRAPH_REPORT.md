# Graph Report - little-games  (2026-11-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1037 nodes · 2146 edges · 48 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2dcb69d1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Affiches : écran de jeu et grille
- Workflow GitHub « Morceaux historiques »
- Livres : écran de jeu et réponses acceptées
- Géoquizz : carte, distances et tirage
- Scripts : affiches TMDB, version et tests des catalogues
- Workflow GitHub « Affiches (TMDB) »
- Nonogramme : grille, tirage et solveur logique
- package.json (scripts npm, dépendances)
- Spécification Visages
- Spécification Nonogramme
- Spécification Affiches de cinéma
- README
- Chiens : tirage des parties et score
- Visages : spécification Morceaux et jeunesse
- Agent ux-ui-mobile
- Agent architecte-front
- Agent curateur-contenu
- Agent game-designer
- Agent juridique-conformite
- Agent performance-pwa
- Agent qa-testeur
- Agent coordinateur-release
- Agent multijoueur
- Visages : écran Morceaux et jeunesse
- Le chemin : grille, tirage du chemin et score
- Spécification Livres
- Spécification Géoquizz
- Scripts Python : catalogue Morceaux et carte du Géoquizz
- Spécification Le chemin
- Chiens : écran de jeu et races
- Compète de zinzin : règles du plateau (applyAction) et tests
- Compète de zinzin : écrans et session multi
- Compète de zinzin : défis à réponse écrite et catalogues
- Compète de zinzin : liaison MQTT et dispatch
- Workflow GitHub « Chiens : photos »
- Spécification Compète de zinzin
- Compète de zinzin : plateau, dé et pions
- Pionnières : écran de jeu, carte mystère et galerie
- Sécurité et données (SECURITY.md)
- Workflow GitHub « Portraits (Pionnières) »
- Spécification Chiens
- Routeur et liste des jeux (app.js, registry.js)
- Consignes pour Claude (CLAUDE.md)
- Script : portraits des Pionnières (Wikidata, Commons)
- Chiens : photos Wikipédia et tests
- Spécification Pionnières
- Script : photos des Chiens
- Compète de zinzin : défis Géoquizz, chemin et nonogramme

## God Nodes (most connected - your core abstractions)
1. `h()` - 102 edges
2. `icon()` - 55 edges
3. `mount()` - 38 edges
4. `mount()` - 31 edges
5. `renderPlay()` - 27 edges
6. `mount()` - 25 edges
7. `mount()` - 25 edges
8. `renderPlay()` - 24 edges
9. `mount()` - 21 edges
10. `mount()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Sécurité et données (détails dans `SECURITY.md`)` --references--> `h()`  [INFERRED]
  CLAUDE.md → js/core/dom.js
- `Protections en place` --references--> `h()`  [INFERRED]
  SECURITY.md → js/core/dom.js
- `drawDie()` --calls--> `h()`  [EXTRACTED]
  games/zinzin/index.js → js/core/dom.js
- `buildAnswers()` --calls--> `normalize()`  [EXTRACTED]
  games/movie-posters/index.js → js/core/fuzzy.js
- `compact()` --calls--> `normalize()`  [EXTRACTED]
  games/movie-posters/index.js → js/core/fuzzy.js

## Import Cycles
- None detected.

## Communities (48 total, 0 thin omitted)

### Community 0 - "Affiches : écran de jeu et grille"
Cohesion: 0.07
Nodes (61): BLUR, BLUR_STEPS, buildAnswers(), compact(), DEFAULT_SETTINGS, ensureStyles(), judge(), mount() (+53 more)

### Community 1 - "Workflow GitHub « Morceaux historiques »"
Cohesion: 0.08
Nodes (23): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, build (+15 more)

### Community 2 - "Livres : écran de jeu et réponses acceptées"
Cohesion: 0.05
Nodes (61): buildAuthors(), checkAuthor(), compact(), initialsOf(), isParticle(), key(), lastTolerance(), nameParts() (+53 more)

### Community 3 - "Géoquizz : carte, distances et tirage"
Cohesion: 0.07
Nodes (61): angle(), cache, closestOnArc(), cross(), decodeRing(), distanceToCountry(), dot(), EASY (+53 more)

### Community 4 - "Scripts : affiches TMDB, version et tests des catalogues"
Cohesion: 0.09
Nodes (23): args, DOWNLOAD, downloadCropped(), fetchRetry(), FILMS, findMovie(), FORCE, GAME (+15 more)

### Community 5 - "Workflow GitHub « Affiches (TMDB) »"
Cohesion: 0.09
Nodes (22): TMDB_API_KEY, default, description, type, force, jobs, posters, name (+14 more)

### Community 6 - "Nonogramme : grille, tirage et solveur logique"
Cohesion: 0.11
Nodes (46): ensureStyles(), mount(), hydrate(), listen(), loadGame(), newGame(), persist(), renderPlay() (+38 more)

### Community 7 - "package.json (scripts npm, dépendances)"
Cohesion: 0.09
Nodes (23): description, engines, node, name, optionalDependencies, sharp@^0.33.5, private, scripts (+15 more)

### Community 8 - "Spécification Visages"
Cohesion: 0.33
Nodes (5): Modes retirés (1.19.0), Navigation (URL), Pistes pour la suite, Principe, 👤 Visages : spécification

### Community 9 - "Spécification Nonogramme"
Cohesion: 0.20
Nodes (9): Navigation (URL), Niveaux, 🧩 Nonogramme : spécification, Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages, Tirage des grilles (+1 more)

### Community 10 - "Spécification Affiches de cinéma"
Cohesion: 0.18
Nodes (10): 🎬 Affiche (affiches de cinéma) : spécification, Catalogue, Grille de toutes les affiches, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 11 - "README"
Cohesion: 0.11
Nodes (17): Ajouter un jeu, 🧱 Architecture (pensée pour migrer facilement), 🐕 Chiens, 🎲 Compète de zinzin, 🌍 Géoquizz, 👣 Le chemin, 🖼️ Les affiches, 🎲 Little Games (+9 more)

### Community 12 - "Chiens : tirage des parties et score"
Cohesion: 0.25
Nodes (13): DEFAULT_SETTINGS, store, FAMILIES, GROUPS, HIDDEN, LEVELS, makeOptions(), maxScore() (+5 more)

### Community 13 - "Visages : spécification Morceaux et jeunesse"
Cohesion: 0.15
Nodes (12): Catalogue, Grille de toutes les photos, Morceaux et Portraits de jeunesse : spécification, Navigation (URL), Persistance (sur l’appareil), Pistes pour la suite, Portraits de jeunesse, Principe (+4 more)

### Community 14 - "Agent ux-ui-mobile"
Cohesion: 0.33
Nodes (5): Ce que tu analyses, Ce que tu peux améliorer, Comment vérifier, Exigences de l'application, Format du rapport

### Community 15 - "Agent architecte-front"
Cohesion: 0.40
Nodes (4): Ce que tu analyses, Ce que tu peux améliorer, Format du rapport, Principes à préserver

### Community 16 - "Agent curateur-contenu"
Cohesion: 0.40
Nodes (4): Catalogues, Ce que tu analyses, Ce que tu peux améliorer, Format du rapport

### Community 17 - "Agent game-designer"
Cohesion: 0.40
Nodes (4): Ce que tu analyses, Ce que tu peux améliorer, Format du rapport, Règles

### Community 18 - "Agent juridique-conformite"
Cohesion: 0.40
Nodes (4): Ce que tu analyses, Ce que tu produis, Format du rapport, Règles déjà adoptées

### Community 19 - "Agent performance-pwa"
Cohesion: 0.40
Nodes (4): Ce que tu analyses, Ce que tu peux améliorer, Contexte, Format du rapport

### Community 20 - "Agent qa-testeur"
Cohesion: 0.40
Nodes (4): Ce que tu peux améliorer, Ce que tu vérifies à chaque passage, Format du rapport, Particularités par jeu

### Community 21 - "Agent coordinateur-release"
Cohesion: 0.50
Nodes (3): Ce que tu peux faire, Ce que tu vérifies, Format du rapport

### Community 22 - "Agent multijoueur"
Cohesion: 0.50
Nodes (3): Ce que tu produis, Contraintes, Format du rapport

### Community 23 - "Visages : écran Morceaux et jeunesse"
Cohesion: 0.09
Nodes (52): ensureStyles(), mount(), closeSub(), openSub(), renderHome(), subCard(), subCountText(), update() (+44 more)

### Community 24 - "Le chemin : grille, tirage du chemin et score"
Cohesion: 0.11
Nodes (38): createSound(), ensureStyles(), mount(), finish(), listen(), newGame(), newPath(), renderEnd() (+30 more)

### Community 25 - "Spécification Livres"
Cohesion: 0.18
Nodes (10): Bibliothèque, Catalogue, 📚 Livres : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 26 - "Spécification Géoquizz"
Cohesion: 0.17
Nodes (11): Calcul, Carte, 🌍 Géoquizz : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+3 more)

### Community 27 - "Scripts Python : catalogue Morceaux et carte du Géoquizz"
Cohesion: 0.05
Nodes (42): box_of(), check_quality(), commons_search_files(), download(), download_all(), ensure_model(), fetch_licences_and_urls(), file_title() (+34 more)

### Community 28 - "Spécification Le chemin"
Cohesion: 0.18
Nodes (10): Différences avec le fichier d'origine, Grille et chemin, 👣 Le chemin : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 29 - "Chiens : écran de jeu et races"
Cohesion: 0.33
Nodes (16): ensureStyles(), mount(), onKey(), photo(), renderBreeds(), renderEnd(), renderPlay(), choose() (+8 more)

### Community 30 - "Compète de zinzin : règles du plateau (applyAction) et tests"
Cohesion: 0.11
Nodes (29): weightRows(), applyAction(), BOARD_COLS, BOARD_ROWS, BOARD_SIZE, boardCounts(), bump(), cellOf() (+21 more)

### Community 31 - "Compète de zinzin : écrans et session multi"
Cohesion: 0.21
Nodes (22): loadCatalogs(), mountChallenge(), mount(), closeChallenge(), connectHost(), endSession(), flushPending(), updateOverlay() (+14 more)

### Community 32 - "Compète de zinzin : défis à réponse écrite et catalogues"
Cohesion: 0.15
Nodes (12): CHALLENGE_GAMES, D, faceZones(), KINDS, LOADERS, pick(), shuffle(), PATH_ERRORS (+4 more)

### Community 33 - "Compète de zinzin : liaison MQTT et dispatch"
Cohesion: 0.13
Nodes (16): CID, DEFAULTS, ensureStyles(), newCode(), store, DICE_MS, MAX_LAPS, MAX_TEAMS (+8 more)

### Community 34 - "Workflow GitHub « Chiens : photos »"
Cohesion: 0.07
Nodes (27): default, description, type, concurrency, cancel-in-progress, group, all, jobs (+19 more)

### Community 35 - "Spécification Compète de zinzin"
Cohesion: 0.14
Nodes (13): Architecture, 🎲 Compète de zinzin : spécification, Créer une partie, Les défis, Multi : un téléphone par équipe, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite (+5 more)

### Community 36 - "Compète de zinzin : plateau, dé et pions"
Cohesion: 0.23
Nodes (13): dispatch(), gameScreen(), buildBoard(), drawDie(), placePawns(), shownSteps(), updateCenter(), updateEnd() (+5 more)

### Community 37 - "Pionnières : écran de jeu, carte mystère et galerie"
Cohesion: 0.13
Nodes (32): DEFAULT_SETTINGS, ensureStyles(), LETTERS, mount(), computeOrder(), later(), onKey(), portrait() (+24 more)

### Community 38 - "Sécurité et données (SECURITY.md)"
Cohesion: 0.25
Nodes (7): Le jour où l'application aura un service en ligne (multijoueur, Supabase…), Multijoueur de Compète de zinzin (relais MQTT publics), Où sont les données, Protections en place, Réglages du dépôt GitHub (à faire par le propriétaire), Signaler un problème, 🔒 Sécurité et données

### Community 39 - "Workflow GitHub « Portraits (Pionnières) »"
Cohesion: 0.10
Nodes (20): default, description, type, force, jobs, photos, name, on (+12 more)

### Community 40 - "Spécification Chiens"
Cohesion: 0.14
Nodes (13): Catalogue, 🐕 Chiens : spécification, Fin de partie, Mauvaises réponses (niveaux), Navigation (URL), Persistance (sur l'appareil), Photos, Pistes pour la suite (+5 more)

### Community 41 - "Routeur et liste des jeux (app.js, registry.js)"
Cohesion: 0.14
Nodes (16): ./books/index.js?v=1.44.0, ./dogs/index.js?v=1.44.0, ./faces/index.js?v=1.44.0, ./geo/index.js?v=1.44.0, ./movie-posters/index.js?v=1.44.0, ./nonogram/index.js?v=1.44.0, ./path/index.js?v=1.44.0, GAMES (+8 more)

### Community 42 - "Consignes pour Claude (CLAUDE.md)"
Cohesion: 0.22
Nodes (8): Agents, Architecture, Carte du code (Graphify), Contrat d'un jeu, Little Games : consignes pour Claude, Livraison (règle de Yoann), Règles de coordination, Sécurité et données (détails dans `SECURITY.md`)

### Community 43 - "Script : portraits des Pionnières (Wikidata, Commons)"
Cohesion: 0.14
Nodes (19): api(), CATALOG, commons(), credit(), FEMALE, force, ids(), image() (+11 more)

### Community 44 - "Chiens : photos Wikipédia et tests"
Cohesion: 0.21
Nodes (13): rng(), ROUND, API, chunks(), fetchPhotos(), plainText(), query(), resolver() (+5 more)

### Community 45 - "Spécification Pionnières"
Cohesion: 0.15
Nodes (12): Catalogue, Compète de zinzin, Galerie, Navigation (URL), Ordre, Persistance (sur l'appareil), ♀️ Pionnières : spécification, Pistes pour la suite (+4 more)

### Community 46 - "Script : photos des Chiens"
Cohesion: 0.22
Nodes (7): all, breeds, ids, missing, next, photos, root

### Community 47 - "Compète de zinzin : défis Géoquizz, chemin et nonogramme"
Cohesion: 0.36
Nodes (8): dots(), pathChallenge(), draw(), flash(), tap(), textChallenge(), refresh(), say()

## Knowledge Gaps
- **10 isolated node(s):** `./morceaux/index.js?v=1.44.0`, `./books/index.js?v=1.44.0`, `./dogs/index.js?v=1.44.0`, `./faces/index.js?v=1.44.0`, `./geo/index.js?v=1.44.0` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 413 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `Chiens : écran de jeu et races` to `Affiches : écran de jeu et grille`, `Compète de zinzin : défis à réponse écrite et catalogues`, `Livres : écran de jeu et réponses acceptées`, `Géoquizz : carte, distances et tirage`, `Compète de zinzin : liaison MQTT et dispatch`, `Pionnières : écran de jeu, carte mystère et galerie`, `Nonogramme : grille, tirage et solveur logique`, `Compète de zinzin : plateau, dé et pions`, `Sécurité et données (SECURITY.md)`, `Routeur et liste des jeux (app.js, registry.js)`, `Consignes pour Claude (CLAUDE.md)`, `Chiens : tirage des parties et score`, `Compète de zinzin : défis Géoquizz, chemin et nonogramme`, `Visages : écran Morceaux et jeunesse`, `Le chemin : grille, tirage du chemin et score`, `Compète de zinzin : règles du plateau (applyAction) et tests`, `Compète de zinzin : écrans et session multi`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `Sécurité et données (détails dans `SECURITY.md`)` and `Protections en place`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./morceaux/index.js?v=1.44.0`, `./books/index.js?v=1.44.0`, `./dogs/index.js?v=1.44.0` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Affiches : écran de jeu et grille` be split into smaller, more focused modules?**
  _Cohesion score 0.068997668997669 - nodes in this community are weakly interconnected._
- **Why does `icon()` connect `Géoquizz : carte, distances et tirage` to `Affiches : écran de jeu et grille`, `Compète de zinzin : défis à réponse écrite et catalogues`, `Livres : écran de jeu et réponses acceptées`, `Compète de zinzin : liaison MQTT et dispatch`, `Compète de zinzin : plateau, dé et pions`, `Pionnières : écran de jeu, carte mystère et galerie`, `Nonogramme : grille, tirage et solveur logique`, `Routeur et liste des jeux (app.js, registry.js)`, `Chiens : tirage des parties et score`, `Visages : écran Morceaux et jeunesse`, `Le chemin : grille, tirage du chemin et score`, `Chiens : écran de jeu et races`, `Compète de zinzin : règles du plateau (applyAction) et tests`, `Compète de zinzin : écrans et session multi`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `Workflow GitHub « Morceaux historiques »` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `renderPlay()` connect `Le chemin : grille, tirage du chemin et score` to `Chiens : écran de jeu et races`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._