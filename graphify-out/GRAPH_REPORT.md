# Graph Report - little-games  (2026-11-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 701 nodes · 1405 edges · 35 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4a333236`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Affiches : écran de jeu et grille
- Workflow GitHub « Morceaux historiques »
- Réponses acceptées, tolérance aux fautes et tests des catalogues
- Géoquizz : carte, distances et tirage
- Scripts : affiches TMDB et version
- Workflow GitHub « Affiches (TMDB) »
- Nonogramme : grille, tirage et solveur logique
- package.json (scripts npm, dépendances)
- Spécification Visages
- Spécification Nonogramme
- Spécification Affiches de cinéma
- README
- Consignes pour Claude (CLAUDE.md)
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
- Scripts Python : catalogue Morceaux (visages et boîtes)
- Spécification Le chemin
- Coquille : routeur et liste des jeux
- Scripts Python : photos Commons et licences
- Scripts Python : catalogue Morceaux (sources et téléchargement)
- Scripts Python : carte du Géoquizz
- Scripts Python : téléchargements et modèle MediaPipe
- Sécurité et données (SECURITY.md)

## God Nodes (most connected - your core abstractions)
1. `h()` - 63 edges
2. `icon()` - 33 edges
3. `mount()` - 31 edges
4. `renderPlay()` - 28 edges
5. `mount()` - 25 edges
6. `mount()` - 25 edges
7. `renderPlay()` - 24 edges
8. `main()` - 20 edges
9. `mount()` - 19 edges
10. `mount()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Sécurité et données (détails dans `SECURITY.md`)` --references--> `h()`  [INFERRED]
  CLAUDE.md → js/core/dom.js
- `Protections en place` --references--> `h()`  [INFERRED]
  SECURITY.md → js/core/dom.js
- `Réglages du dépôt GitHub (à faire par le propriétaire)` --references--> `main()`  [INFERRED]
  SECURITY.md → scripts/celeb-quiz-builder.py
- `buildAnswers()` --calls--> `normalize()`  [EXTRACTED]
  games/movie-posters/index.js → js/core/fuzzy.js
- `compact()` --calls--> `normalize()`  [EXTRACTED]
  games/movie-posters/index.js → js/core/fuzzy.js

## Import Cycles
- None detected.

## Communities (35 total, 0 thin omitted)

### Community 0 - "Affiches : écran de jeu et grille"
Cohesion: 0.07
Nodes (60): BLUR, BLUR_STEPS, buildAnswers(), compact(), DEFAULT_SETTINGS, ensureStyles(), judge(), mount() (+52 more)

### Community 1 - "Workflow GitHub « Morceaux historiques »"
Cohesion: 0.08
Nodes (23): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, build (+15 more)

### Community 2 - "Réponses acceptées, tolérance aux fautes et tests des catalogues"
Cohesion: 0.07
Nodes (52): buildAuthors(), checkAuthor(), compact(), initialsOf(), isParticle(), key(), lastTolerance(), nameParts() (+44 more)

### Community 3 - "Géoquizz : carte, distances et tirage"
Cohesion: 0.08
Nodes (49): angle(), cache, closestOnArc(), cross(), decodeRing(), distanceToCountry(), dot(), EASY (+41 more)

### Community 4 - "Scripts : affiches TMDB et version"
Cohesion: 0.06
Nodes (27): args, DOWNLOAD, downloadCropped(), fetchRetry(), FILMS, findMovie(), FORCE, GAME (+19 more)

### Community 5 - "Workflow GitHub « Affiches (TMDB) »"
Cohesion: 0.09
Nodes (22): TMDB_API_KEY, default, description, type, force, jobs, posters, name (+14 more)

### Community 6 - "Nonogramme : grille, tirage et solveur logique"
Cohesion: 0.12
Nodes (43): ensureStyles(), mount(), hydrate(), listen(), loadGame(), newGame(), persist(), renderPlay() (+35 more)

### Community 7 - "package.json (scripts npm, dépendances)"
Cohesion: 0.09
Nodes (22): description, engines, node, name, optionalDependencies, sharp@^0.33.5, private, scripts (+14 more)

### Community 8 - "Spécification Visages"
Cohesion: 0.33
Nodes (5): Modes retirés (1.19.0), Navigation (URL), Pistes pour la suite, Principe, 👤 Visages : spécification

### Community 9 - "Spécification Nonogramme"
Cohesion: 0.20
Nodes (9): Navigation (URL), Niveaux, 🧩 Nonogramme : spécification, Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages, Tirage des grilles (+1 more)

### Community 10 - "Spécification Affiches de cinéma"
Cohesion: 0.18
Nodes (10): 🎬 Affiches de cinéma : spécification, Catalogue, Grille de toutes les affiches, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 11 - "README"
Cohesion: 0.13
Nodes (14): Ajouter un jeu, 🧱 Architecture (pensée pour migrer facilement), 🌍 Géoquizz, 👣 Le chemin, 🖼️ Les affiches, 🎲 Little Games, 📚 Livres, 🚀 Mise en ligne sur GitHub Pages (+6 more)

### Community 12 - "Consignes pour Claude (CLAUDE.md)"
Cohesion: 0.22
Nodes (8): Agents, Architecture, Carte du code (Graphify), Contrat d'un jeu, Little Games : consignes pour Claude, Livraison (règle de Yoann), Règles de coordination, Sécurité et données (détails dans `SECURITY.md`)

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
Nodes (57): ensureStyles(), mount(), closeSub(), openSub(), renderHome(), subCard(), subCountText(), update() (+49 more)

### Community 24 - "Le chemin : grille, tirage du chemin et score"
Cohesion: 0.08
Nodes (40): createSound(), ensureStyles(), mount(), finish(), listen(), newGame(), newPath(), renderEnd() (+32 more)

### Community 25 - "Spécification Livres"
Cohesion: 0.18
Nodes (10): Bibliothèque, Catalogue, 📚 Livres : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 26 - "Spécification Géoquizz"
Cohesion: 0.17
Nodes (11): Calcul, Carte, 🌍 Géoquizz : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+3 more)

### Community 27 - "Scripts Python : catalogue Morceaux (visages et boîtes)"
Cohesion: 0.15
Nodes (7): box_of(), check_quality(), landmarks(), make_boxes(), normalize_box(), process_photo(), round4()

### Community 28 - "Spécification Le chemin"
Cohesion: 0.18
Nodes (10): Différences avec le fichier d'origine, Grille et chemin, 👣 Le chemin : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 29 - "Coquille : routeur et liste des jeux"
Cohesion: 0.17
Nodes (13): ./books/index.js?v=1.29.0, ./faces/index.js?v=1.29.0, ./geo/index.js?v=1.29.0, ./movie-posters/index.js?v=1.29.0, ./nonogram/index.js?v=1.29.0, ./path/index.js?v=1.29.0, GAMES, APP_VERSION (+5 more)

### Community 30 - "Scripts Python : photos Commons et licences"
Cohesion: 0.12
Nodes (12): commons_search_files(), fetch_licences_and_urls(), file_title(), fill_licence_for_file(), http_get_json(), resolve_upload_url(), try_alternate_photo(), wikidata_is_human() (+4 more)

### Community 31 - "Scripts Python : catalogue Morceaux (sources et téléchargement)"
Cohesion: 0.24
Nodes (10): download_all(), main(), query_celebs(), read_index(), rows_from_faces(), rows_from_historiques(), rows_from_seed(), slugify() (+2 more)

### Community 32 - "Scripts Python : carte du Géoquizz"
Cohesion: 0.23
Nodes (8): area(), decode_ring(), dp(), encode_ring(), main(), simplify_chain(), simplify_countries(), simplify_land()

### Community 33 - "Scripts Python : téléchargements et modèle MediaPipe"
Cohesion: 0.25
Nodes (5): download(), ensure_model(), http_get(), http_post_form(), make_landmarker()

### Community 34 - "Sécurité et données (SECURITY.md)"
Cohesion: 0.29
Nodes (6): Le jour où l'application aura un service en ligne (multijoueur, Supabase…), Où sont les données, Protections en place, Réglages du dépôt GitHub (à faire par le propriétaire), Signaler un problème, 🔒 Sécurité et données

## Knowledge Gaps
- **7 isolated node(s):** `./morceaux/index.js?v=1.29.0`, `./books/index.js?v=1.29.0`, `./faces/index.js?v=1.29.0`, `./geo/index.js?v=1.29.0`, `./movie-posters/index.js?v=1.29.0` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 291 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `Visages : écran Morceaux et jeunesse` to `Affiches : écran de jeu et grille`, `Réponses acceptées, tolérance aux fautes et tests des catalogues`, `Géoquizz : carte, distances et tirage`, `Sécurité et données (SECURITY.md)`, `Nonogramme : grille, tirage et solveur logique`, `Consignes pour Claude (CLAUDE.md)`, `Le chemin : grille, tirage du chemin et score`, `Coquille : routeur et liste des jeux`?**
  _High betweenness centrality (0.284) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `Sécurité et données (détails dans `SECURITY.md`)` and `Protections en place`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./morceaux/index.js?v=1.29.0`, `./books/index.js?v=1.29.0`, `./faces/index.js?v=1.29.0` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Affiches : écran de jeu et grille` be split into smaller, more focused modules?**
  _Cohesion score 0.07093253968253968 - nodes in this community are weakly interconnected._
- **Why does `Protections en place` connect `Sécurité et données (SECURITY.md)` to `Visages : écran Morceaux et jeunesse`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Should `Workflow GitHub « Morceaux historiques »` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Réponses acceptées, tolérance aux fautes et tests des catalogues` be split into smaller, more focused modules?**
  _Cohesion score 0.07486338797814207 - nodes in this community are weakly interconnected._