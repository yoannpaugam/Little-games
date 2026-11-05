# Graph Report - little-games  (2026-11-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 568 nodes · 1081 edges · 27 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e1e2a13c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Affiches : écran de jeu et grille
- Workflows GitHub (affiches TMDB, Morceaux historiques)
- Livres : réponses acceptées et tolérance aux fautes
- Géoquizz : carte, distances, tirage et tests des catalogues
- Scripts : affiches TMDB et version
- Workflow GitHub « Affiches (TMDB) »
- Sécurité et données (SECURITY.md)
- package.json (scripts npm, dépendances)
- Spécification Visages
- Coquille : routeur et liste des jeux
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
- Livres : écran de jeu, bibliothèque et réponses
- Spécification Livres
- Spécification Géoquizz

## God Nodes (most connected - your core abstractions)
1. `h()` - 49 edges
2. `mount()` - 31 edges
3. `mount()` - 25 edges
4. `main()` - 24 edges
5. `renderPlay()` - 21 edges
6. `icon()` - 20 edges
7. `mount()` - 19 edges
8. `mount()` - 18 edges
9. `renderPlay()` - 15 edges
10. `isMatch()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `🚀 Mise en ligne sur GitHub Pages` --references--> `main()`  [INFERRED]
  README.md → scripts/celeb-quiz-builder.py
- `Réglages du dépôt GitHub (à faire par le propriétaire)` --references--> `main()`  [INFERRED]
  SECURITY.md → scripts/celeb-quiz-builder.py
- `Sécurité et données (détails dans `SECURITY.md`)` --references--> `h()`  [INFERRED]
  CLAUDE.md → js/core/dom.js
- `Protections en place` --references--> `h()`  [INFERRED]
  SECURITY.md → js/core/dom.js
- `Agents` --references--> `main()`  [INFERRED]
  CLAUDE.md → scripts/celeb-quiz-builder.py

## Import Cycles
- None detected.

## Communities (27 total, 0 thin omitted)

### Community 0 - "Affiches : écran de jeu et grille"
Cohesion: 0.07
Nodes (61): BLUR, BLUR_STEPS, buildAnswers(), compact(), DEFAULT_SETTINGS, ensureStyles(), judge(), mount() (+53 more)

### Community 1 - "Workflows GitHub (affiches TMDB, Morceaux historiques)"
Cohesion: 0.08
Nodes (23): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, build (+15 more)

### Community 2 - "Livres : réponses acceptées et tolérance aux fautes"
Cohesion: 0.12
Nodes (23): buildAuthors(), checkAuthor(), compact(), initialsOf(), isParticle(), key(), lastTolerance(), nameParts() (+15 more)

### Community 3 - "Géoquizz : carte, distances, tirage et tests des catalogues"
Cohesion: 0.08
Nodes (48): angle(), cache, closestOnArc(), cross(), decodeRing(), distanceToCountry(), dot(), EASY (+40 more)

### Community 4 - "Scripts : affiches TMDB et version"
Cohesion: 0.06
Nodes (27): args, DOWNLOAD, downloadCropped(), fetchRetry(), FILMS, findMovie(), FORCE, GAME (+19 more)

### Community 5 - "Workflow GitHub « Affiches (TMDB) »"
Cohesion: 0.09
Nodes (22): TMDB_API_KEY, default, description, type, force, jobs, posters, name (+14 more)

### Community 6 - "Sécurité et données (SECURITY.md)"
Cohesion: 0.29
Nodes (6): Le jour où l'application aura un service en ligne (multijoueur, Supabase…), Où sont les données, Protections en place, Réglages du dépôt GitHub (à faire par le propriétaire), Signaler un problème, 🔒 Sécurité et données

### Community 7 - "package.json (scripts npm, dépendances)"
Cohesion: 0.09
Nodes (22): description, engines, node, name, optionalDependencies, sharp@^0.33.5, private, scripts (+14 more)

### Community 8 - "Spécification Visages"
Cohesion: 0.33
Nodes (5): Modes retirés (1.19.0), Navigation (URL), Pistes pour la suite, Principe, 👤 Visages : spécification

### Community 9 - "Coquille : routeur et liste des jeux"
Cohesion: 0.21
Nodes (11): ./books/index.js?v=1.23.0, ./faces/index.js?v=1.23.0, ./geo/index.js?v=1.23.0, ./movie-posters/index.js?v=1.23.0, GAMES, APP_VERSION, navigate(), parseHash() (+3 more)

### Community 10 - "Spécification Affiches de cinéma"
Cohesion: 0.18
Nodes (10): 🎬 Affiches de cinéma : spécification, Catalogue, Grille de toutes les affiches, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 11 - "README"
Cohesion: 0.15
Nodes (12): Ajouter un jeu, 🧱 Architecture (pensée pour migrer facilement), 🌍 Géoquizz, 🖼️ Les affiches, 🎲 Little Games, 📚 Livres, 🚀 Mise en ligne sur GitHub Pages, Modifier la liste des célébrités (+4 more)

### Community 12 - "Consignes pour Claude (CLAUDE.md)"
Cohesion: 0.05
Nodes (42): Agents, Architecture, Carte du code (Graphify), Contrat d'un jeu, Little Games : consignes pour Claude, Livraison (règle de Yoann), Règles de coordination, Sécurité et données (détails dans `SECURITY.md`) (+34 more)

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
Cohesion: 0.08
Nodes (62): ensureStyles(), mount(), closeSub(), openSub(), renderHome(), subCard(), subCountText(), update() (+54 more)

### Community 24 - "Livres : écran de jeu, bibliothèque et réponses"
Cohesion: 0.15
Nodes (25): byYear(), centuryLabel(), centuryOf(), COVERS, DEFAULT_SETTINGS, ensureStyles(), mount(), computeOrder() (+17 more)

### Community 25 - "Spécification Livres"
Cohesion: 0.18
Nodes (10): Bibliothèque, Catalogue, 📚 Livres : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 26 - "Spécification Géoquizz"
Cohesion: 0.17
Nodes (11): Calcul, Carte, 🌍 Géoquizz : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+3 more)

## Knowledge Gaps
- **5 isolated node(s):** `./morceaux/index.js?v=1.23.0`, `./books/index.js?v=1.23.0`, `./faces/index.js?v=1.23.0`, `./geo/index.js?v=1.23.0`, `./movie-posters/index.js?v=1.23.0`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 252 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `Visages : écran Morceaux et jeunesse` to `Affiches : écran de jeu et grille`, `Géoquizz : carte, distances, tirage et tests des catalogues`, `Sécurité et données (SECURITY.md)`, `Coquille : routeur et liste des jeux`, `Consignes pour Claude (CLAUDE.md)`, `Livres : écran de jeu, bibliothèque et réponses`?**
  _High betweenness centrality (0.270) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `Sécurité et données (détails dans `SECURITY.md`)` and `Protections en place`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./morceaux/index.js?v=1.23.0`, `./books/index.js?v=1.23.0`, `./faces/index.js?v=1.23.0` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Affiches : écran de jeu et grille` be split into smaller, more focused modules?**
  _Cohesion score 0.068997668997669 - nodes in this community are weakly interconnected._
- **Why does `Sécurité et données (détails dans `SECURITY.md`)` connect `Consignes pour Claude (CLAUDE.md)` to `Visages : écran Morceaux et jeunesse`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `main()` (e.g. with `Agents` and `Little Games : consignes pour Claude`) actually correct?**
  _`main()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `Workflows GitHub (affiches TMDB, Morceaux historiques)` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._