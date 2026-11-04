# Graph Report - little-games  (2026-11-04)

## Corpus Check
- 51 files · ~76,760 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .css 5, (none) 2)

## Summary
- 572 nodes · 1125 edges · 26 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c72be0c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Affiches : écran de jeu et grille
- Visages : écrans (photos, remplir, aperçu)
- Réponses acceptées et tolérance aux fautes
- Visages : photos, détection et cadrage
- Scripts : affiches TMDB et version
- Workflow GitHub « Affiches (TMDB) »
- Sécurité et données (SECURITY.md)
- package.json (scripts npm, dépendances)
- Spécification Visages
- Coquille : routeur et liste des jeux
- Spécification Affiches de cinéma
- README
- Visages : script des catalogues Morceaux et jeunesse
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

## God Nodes (most connected - your core abstractions)
1. `h()` - 56 edges
2. `mount()` - 30 edges
3. `mount()` - 25 edges
4. `mount()` - 25 edges
5. `main()` - 23 edges
6. `mount()` - 18 edges
7. `normalize()` - 18 edges
8. `icon()` - 18 edges
9. `isMatch()` - 16 edges
10. `renderPlay()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Sécurité et données (détails dans `SECURITY.md`)` --references--> `h()`  [INFERRED]
  CLAUDE.md → js/core/dom.js
- `Protections en place` --references--> `h()`  [INFERRED]
  SECURITY.md → js/core/dom.js
- `🚀 Mise en ligne sur GitHub Pages` --references--> `main()`  [INFERRED]
  README.md → scripts/celeb-quiz-builder.py
- `Réglages du dépôt GitHub (à faire par le propriétaire)` --references--> `main()`  [INFERRED]
  SECURITY.md → scripts/celeb-quiz-builder.py
- `Agents` --references--> `main()`  [INFERRED]
  CLAUDE.md → scripts/celeb-quiz-builder.py

## Import Cycles
- None detected.

## Communities (26 total, 0 thin omitted)

### Community 0 - "Affiches : écran de jeu et grille"
Cohesion: 0.07
Nodes (58): BLUR, BLUR_STEPS, buildAnswers(), DEFAULT_SETTINGS, ensureStyles(), mount(), computeOrder(), onKey() (+50 more)

### Community 1 - "Visages : écrans (photos, remplir, aperçu)"
Cohesion: 0.07
Nodes (64): creditText(), DEFAULT_SETTINGS, ensureStyles(), isPartCrop(), KIND_LABEL, MODES, mount(), closeSub() (+56 more)

### Community 2 - "Réponses acceptées et tolérance aux fautes"
Cohesion: 0.08
Nodes (42): buildAuthors(), checkAuthor(), compact(), initialsOf(), isParticle(), key(), lastTolerance(), nameParts() (+34 more)

### Community 3 - "Visages : photos, détection et cadrage"
Cohesion: 0.10
Nodes (34): bitmap(), BITMAPS, clamp(), clearAll(), coverCrop(), cropOf(), decode(), defaultPoints() (+26 more)

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
Cohesion: 0.10
Nodes (21): description, engines, node, name, optionalDependencies, sharp@^0.33.5, private, scripts (+13 more)

### Community 8 - "Spécification Visages"
Cohesion: 0.15
Nodes (12): Cadre photo, Catalogue, Détection du visage, Import des photos, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe (+4 more)

### Community 9 - "Coquille : routeur et liste des jeux"
Cohesion: 0.21
Nodes (10): ./books/index.js?v=1.18.0, ./faces/index.js?v=1.18.0, ./movie-posters/index.js?v=1.18.0, GAMES, APP_VERSION, navigate(), parseHash(), renderHome() (+2 more)

### Community 10 - "Spécification Affiches de cinéma"
Cohesion: 0.18
Nodes (10): 🎬 Affiches de cinéma : spécification, Catalogue, Grille de toutes les affiches, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 11 - "README"
Cohesion: 0.15
Nodes (12): Ajouter un jeu, 🧱 Architecture (pensée pour migrer facilement), 🖼️ Les affiches, 👤 Les photos de Visages, 🎲 Little Games, 📚 Livres, 🚀 Mise en ligne sur GitHub Pages, Modifier la liste des célébrités (+4 more)

### Community 12 - "Visages : script des catalogues Morceaux et jeunesse"
Cohesion: 0.06
Nodes (40): Agents, Architecture, Carte du code (Graphify), Contrat d'un jeu, Little Games : consignes pour Claude, Livraison (règle de Yoann), Règles de coordination, Sécurité et données (détails dans `SECURITY.md`) (+32 more)

### Community 13 - "Visages : spécification Morceaux et jeunesse"
Cohesion: 0.15
Nodes (12): Catalogue, Crédits photo, Morceaux et Portraits de jeunesse : spécification, Navigation (URL), Persistance (sur l’appareil), Pistes pour la suite, Portraits de jeunesse, Principe (+4 more)

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
Nodes (38): buildOwners(), clamp(), isUpright(), MAX_TILT, portraitRect(), tiltOf(), creditLine(), ensureStyles() (+30 more)

### Community 24 - "Livres : écran de jeu, bibliothèque et réponses"
Cohesion: 0.17
Nodes (22): byYear(), COVERS, DEFAULT_SETTINGS, ensureStyles(), mount(), computeOrder(), cover(), onKey() (+14 more)

### Community 25 - "Spécification Livres"
Cohesion: 0.18
Nodes (10): Bibliothèque, Catalogue, 📚 Livres : spécification, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

## Knowledge Gaps
- **4 isolated node(s):** `./morceaux/index.js?v=1.18.0`, `./movie-posters/index.js?v=1.18.0`, `./faces/index.js?v=1.18.0`, `./books/index.js?v=1.18.0`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 238 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `Visages : écrans (photos, remplir, aperçu)` to `Affiches : écran de jeu et grille`, `Sécurité et données (SECURITY.md)`, `Coquille : routeur et liste des jeux`, `Visages : script des catalogues Morceaux et jeunesse`, `Visages : écran Morceaux et jeunesse`, `Livres : écran de jeu, bibliothèque et réponses`?**
  _High betweenness centrality (0.299) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `Sécurité et données (détails dans `SECURITY.md`)` and `Protections en place`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./morceaux/index.js?v=1.18.0`, `./movie-posters/index.js?v=1.18.0`, `./faces/index.js?v=1.18.0` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Affiches : écran de jeu et grille` be split into smaller, more focused modules?**
  _Cohesion score 0.07191961924907457 - nodes in this community are weakly interconnected._
- **Why does `Sécurité et données (détails dans `SECURITY.md`)` connect `Visages : script des catalogues Morceaux et jeunesse` to `Visages : écrans (photos, remplir, aperçu)`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `main()` (e.g. with `Agents` and `Little Games : consignes pour Claude`) actually correct?**
  _`main()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `Visages : écrans (photos, remplir, aperçu)` be split into smaller, more focused modules?**
  _Cohesion score 0.07272727272727272 - nodes in this community are weakly interconnected._