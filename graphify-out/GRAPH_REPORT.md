# Graph Report - little-games  (2026-11-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1162 nodes · 2467 edges · 43 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5808322c`
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
- Dans la rue : frise, tirage et écrans (avec Visages et dom.js)
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
- La taupe : plan, indices et solveur
- Compète de zinzin : plateau, défis et réseau
- Spécification La taupe
- Workflow GitHub « Chiens : photos »
- Spécification Compète de zinzin
- Spécification Dans la rue
- Pionnières : écran de jeu, réponses et galerie
- Sécurité et données (SECURITY.md)
- Workflow GitHub « Portraits (Pionnières) »
- Spécification Chiens
- Consignes pour Claude (CLAUDE.md)
- Script : portraits des Pionnières (Wikidata, Commons)
- Chiens : écran de jeu, tirage et photos
- Spécification Pionnières

## God Nodes (most connected - your core abstractions)
1. `h()` - 121 edges
2. `icon()` - 66 edges
3. `mount()` - 38 edges
4. `mount()` - 31 edges
5. `renderPlay()` - 27 edges
6. `renderPlay()` - 27 edges
7. `mount()` - 26 edges
8. `mount()` - 25 edges
9. `mount()` - 25 edges
10. `renderPlay()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Sécurité et données (détails dans `SECURITY.md`)` --references--> `h()`  [INFERRED]
  CLAUDE.md → js/core/dom.js
- `Protections en place` --references--> `h()`  [INFERRED]
  SECURITY.md → js/core/dom.js
- `drawDie()` --calls--> `h()`  [EXTRACTED]
  games/zinzin/index.js → js/core/dom.js
- `ensureStyles()` --calls--> `h()`  [EXTRACTED]
  games/movie-posters/index.js → js/core/dom.js
- `mount()` --calls--> `h()`  [EXTRACTED]
  games/movie-posters/index.js → js/core/dom.js

## Import Cycles
- None detected.

## Communities (43 total, 0 thin omitted)

### Community 0 - "Affiches : écran de jeu et grille"
Cohesion: 0.07
Nodes (56): BLUR, BLUR_STEPS, DEFAULT_SETTINGS, ensureStyles(), mount(), computeOrder(), onKey(), posterImg() (+48 more)

### Community 1 - "Workflow GitHub « Morceaux historiques »"
Cohesion: 0.08
Nodes (23): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, build (+15 more)

### Community 2 - "Livres : écran de jeu et réponses acceptées"
Cohesion: 0.05
Nodes (71): buildAuthors(), checkAuthor(), compact(), initialsOf(), isParticle(), key(), lastTolerance(), nameParts() (+63 more)

### Community 3 - "Géoquizz : carte, distances et tirage"
Cohesion: 0.07
Nodes (60): angle(), cache, closestOnArc(), cross(), decodeRing(), distanceToCountry(), dot(), EASY (+52 more)

### Community 4 - "Scripts : affiches TMDB, version et tests des catalogues"
Cohesion: 0.08
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
Nodes (10): 🎬 Affiches (affiches de cinéma) : spécification, Catalogue, Grille de toutes les affiches, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 11 - "README"
Cohesion: 0.10
Nodes (19): Ajouter un jeu, 🧱 Architecture (pensée pour migrer facilement), 🐕 Chiens, 🎲 Compète de zinzin, 📣 Dans la rue, 🌍 Géoquizz, 🔎 La taupe, 👣 Le chemin (+11 more)

### Community 12 - "Dans la rue : frise, tirage et écrans (avec Visages et dom.js)"
Cohesion: 0.06
Nodes (64): ./books/index.js?v=1.55.0, ./dogs/index.js?v=1.55.0, ensureStyles(), ./faces/index.js?v=1.55.0, mount(), closeSub(), openSub(), renderHome() (+56 more)

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
Cohesion: 0.11
Nodes (44): clamp(), faceResolution(), isUpright(), LOW_RES, MAX_TILT, MID_RES, portraitRect(), qualityOf() (+36 more)

### Community 24 - "Le chemin : grille, tirage du chemin et score"
Cohesion: 0.10
Nodes (39): createSound(), ensureStyles(), mount(), finish(), listen(), newGame(), newPath(), renderEnd() (+31 more)

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

### Community 29 - "La taupe : plan, indices et solveur"
Cohesion: 0.09
Nodes (53): ART, AV, avatar(), furniture(), walls(), ensureStyles(), lower(), mount() (+45 more)

### Community 30 - "Compète de zinzin : plateau, défis et réseau"
Cohesion: 0.05
Nodes (85): CHALLENGE_GAMES, loadCatalogs(), mountChallenge(), pick(), shuffle(), CID, DEFAULTS, ensureStyles() (+77 more)

### Community 31 - "Spécification La taupe"
Cohesion: 0.17
Nodes (11): Dessins, Enquêtes, 🔎 La taupe : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Règles (+3 more)

### Community 34 - "Workflow GitHub « Chiens : photos »"
Cohesion: 0.07
Nodes (27): default, description, type, concurrency, cancel-in-progress, group, all, jobs (+19 more)

### Community 35 - "Spécification Compète de zinzin"
Cohesion: 0.14
Nodes (13): Architecture, 🎲 Compète de zinzin : spécification, Créer une partie, Les défis, Multi : un téléphone par équipe, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite (+5 more)

### Community 36 - "Spécification Dans la rue"
Cohesion: 0.17
Nodes (11): Catalogue, 📣 Dans la rue : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages de la partie, Réglages (page) (+3 more)

### Community 37 - "Pionnières : écran de jeu, réponses et galerie"
Cohesion: 0.08
Nodes (39): DEFAULT_SETTINGS, ensureStyles(), LETTERS, mount(), computeOrder(), later(), onKey(), portrait() (+31 more)

### Community 38 - "Sécurité et données (SECURITY.md)"
Cohesion: 0.25
Nodes (7): Le jour où l'application aura un service en ligne (multijoueur, Supabase…), Multijoueur de Compète de zinzin (relais MQTT publics), Où sont les données, Protections en place, Réglages du dépôt GitHub (à faire par le propriétaire), Signaler un problème, 🔒 Sécurité et données

### Community 39 - "Workflow GitHub « Portraits (Pionnières) »"
Cohesion: 0.10
Nodes (20): default, description, type, force, jobs, photos, name, on (+12 more)

### Community 40 - "Spécification Chiens"
Cohesion: 0.14
Nodes (13): Catalogue, 🐕 Chiens : spécification, Fin de partie, Mauvaises réponses (niveaux), Navigation (URL), Persistance (sur l'appareil), Photos, Pistes pour la suite (+5 more)

### Community 42 - "Consignes pour Claude (CLAUDE.md)"
Cohesion: 0.22
Nodes (8): Agents, Architecture, Carte du code (Graphify), Contrat d'un jeu, Little Games : consignes pour Claude, Livraison (règle de Yoann), Règles de coordination, Sécurité et données (détails dans `SECURITY.md`)

### Community 43 - "Script : portraits des Pionnières (Wikidata, Commons)"
Cohesion: 0.14
Nodes (19): api(), CATALOG, commons(), credit(), FEMALE, force, ids(), image() (+11 more)

### Community 44 - "Chiens : écran de jeu, tirage et photos"
Cohesion: 0.08
Nodes (48): DEFAULT_SETTINGS, ensureStyles(), mount(), onKey(), photo(), renderBreeds(), renderEnd(), renderPlay() (+40 more)

### Community 45 - "Spécification Pionnières"
Cohesion: 0.15
Nodes (12): Catalogue, Compète de zinzin, Galerie, Navigation (URL), Ordre, Persistance (sur l'appareil), ♀️ Pionnières : spécification, Pistes pour la suite (+4 more)

## Knowledge Gaps
- **12 isolated node(s):** `./books/index.js?v=1.55.0`, `./dogs/index.js?v=1.55.0`, `./faces/index.js?v=1.55.0`, `./morceaux/index.js?v=1.55.0`, `./geo/index.js?v=1.55.0` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 448 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `Dans la rue : frise, tirage et écrans (avec Visages et dom.js)` to `Affiches : écran de jeu et grille`, `Livres : écran de jeu et réponses acceptées`, `Géoquizz : carte, distances et tirage`, `Pionnières : écran de jeu, réponses et galerie`, `Nonogramme : grille, tirage et solveur logique`, `Sécurité et données (SECURITY.md)`, `Consignes pour Claude (CLAUDE.md)`, `Chiens : écran de jeu, tirage et photos`, `Visages : écran Morceaux et jeunesse`, `Le chemin : grille, tirage du chemin et score`, `La taupe : plan, indices et solveur`, `Compète de zinzin : plateau, défis et réseau`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `Sécurité et données (détails dans `SECURITY.md`)` and `Protections en place`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./books/index.js?v=1.55.0`, `./dogs/index.js?v=1.55.0`, `./faces/index.js?v=1.55.0` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Affiches : écran de jeu et grille` be split into smaller, more focused modules?**
  _Cohesion score 0.07344632768361582 - nodes in this community are weakly interconnected._
- **Why does `icon()` connect `Chiens : écran de jeu, tirage et photos` to `Affiches : écran de jeu et grille`, `Livres : écran de jeu et réponses acceptées`, `Géoquizz : carte, distances et tirage`, `Pionnières : écran de jeu, réponses et galerie`, `Nonogramme : grille, tirage et solveur logique`, `Dans la rue : frise, tirage et écrans (avec Visages et dom.js)`, `Visages : écran Morceaux et jeunesse`, `Le chemin : grille, tirage du chemin et score`, `La taupe : plan, indices et solveur`, `Compète de zinzin : plateau, défis et réseau`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `Workflow GitHub « Morceaux historiques »` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `renderPlay()` connect `Le chemin : grille, tirage du chemin et score` to `Dans la rue : frise, tirage et écrans (avec Visages et dom.js)`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._