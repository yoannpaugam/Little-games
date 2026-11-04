# Graph Report - little-games  (2026-11-04)

## Corpus Check
- 36 files · ~39,176 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 3, (none) 2)

## Summary
- 383 nodes · 682 edges · 23 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c390d653`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Affiches : écran de jeu et grille
- Visages : écrans (photos, remplir, aperçu)
- Réponses acceptées et tolérance aux fautes
- Visages : photos, détection et cadrage
- Scripts : affiches TMDB et version
- Workflow GitHub « Affiches (TMDB) »
- Visages : réglages, import et stockage
- package.json (scripts npm, dépendances)
- Spécification Visages
- Coquille : routeur et liste des jeux
- Spécification Affiches de cinéma
- README
- Consignes pour Claude (CLAUDE.md)
- Sécurité et données (SECURITY.md)
- Agent ux-ui-mobile
- Agent architecte-front
- Agent curateur-contenu
- Agent game-designer
- Agent juridique-conformite
- Agent performance-pwa
- Agent qa-testeur
- Agent coordinateur-release
- Agent multijoueur

## God Nodes (most connected - your core abstractions)
1. `h()` - 36 edges
2. `mount()` - 25 edges
3. `mount()` - 25 edges
4. `renderPhotos()` - 14 edges
5. `renderPlay()` - 14 edges
6. `renderSettings()` - 13 edges
7. `renderFill()` - 13 edges
8. `isMatch()` - 12 edges
9. `importFile()` - 12 edges
10. `👤 Visages : spécification` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Sécurité et données (détails dans `SECURITY.md`)` --references--> `h()`  [INFERRED]
  CLAUDE.md → js/core/dom.js
- `Protections en place` --references--> `h()`  [INFERRED]
  SECURITY.md → js/core/dom.js
- `skip()` --indirect_call--> `route()`  [INFERRED]
  games/faces/index.js → js/app.js
- `ensureStyles()` --calls--> `h()`  [EXTRACTED]
  games/faces/index.js → js/core/dom.js
- `mount()` --calls--> `h()`  [EXTRACTED]
  games/faces/index.js → js/core/dom.js

## Import Cycles
- None detected.

## Communities (23 total, 0 thin omitted)

### Community 0 - "Affiches : écran de jeu et grille"
Cohesion: 0.09
Nodes (47): ensureStyles(), mount(), computeOrder(), onKey(), posterImg(), renderGrid(), renderPlay(), reveal() (+39 more)

### Community 1 - "Visages : écrans (photos, remplir, aperçu)"
Cohesion: 0.11
Nodes (40): creditText(), mount(), deck(), dialog(), on(), openPreview(), openPreviewNow(), openUnknown() (+32 more)

### Community 2 - "Réponses acceptées et tolérance aux fautes"
Cohesion: 0.08
Nodes (39): buildAnswers(), buildOwners(), checkAnswer(), compact(), findByName(), matchFileName(), PARTICLES, BLUR (+31 more)

### Community 3 - "Visages : photos, détection et cadrage"
Cohesion: 0.10
Nodes (34): bitmap(), BITMAPS, clamp(), clearAll(), coverCrop(), cropOf(), decode(), defaultPoints() (+26 more)

### Community 4 - "Scripts : affiches TMDB et version"
Cohesion: 0.09
Nodes (23): args, DOWNLOAD, downloadCropped(), fetchRetry(), FILMS, findMovie(), FORCE, GAME (+15 more)

### Community 5 - "Workflow GitHub « Affiches (TMDB) »"
Cohesion: 0.09
Nodes (22): TMDB_API_KEY, default, description, type, force, jobs, posters, name (+14 more)

### Community 6 - "Visages : réglages, import et stockage"
Cohesion: 0.09
Nodes (19): DEFAULT_SETTINGS, ensureStyles(), isPartCrop(), KIND_LABEL, MODES, importBatch(), parseCsv(), PART_BTN (+11 more)

### Community 7 - "package.json (scripts npm, dépendances)"
Cohesion: 0.12
Nodes (16): description, engines, node, name, optionalDependencies, sharp@^0.33.5, private, scripts (+8 more)

### Community 8 - "Spécification Visages"
Cohesion: 0.15
Nodes (12): Cadre photo, Catalogue, Détection du visage, Import des photos, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe (+4 more)

### Community 9 - "Coquille : routeur et liste des jeux"
Cohesion: 0.25
Nodes (9): ./faces/index.js?v=1.11.0, ./movie-posters/index.js?v=1.11.0, GAMES, APP_VERSION, navigate(), parseHash(), renderHome(), root (+1 more)

### Community 10 - "Spécification Affiches de cinéma"
Cohesion: 0.18
Nodes (10): 🎬 Affiches de cinéma : spécification, Catalogue, Grille de toutes les affiches, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 11 - "README"
Cohesion: 0.18
Nodes (10): Ajouter un jeu, 🧱 Architecture (pensée pour migrer facilement), 🖼️ Les affiches, 👤 Les photos de Visages, 🎲 Little Games, 🚀 Mise en ligne sur GitHub Pages, Modifier la liste des célébrités, Modifier la liste des films (+2 more)

### Community 12 - "Consignes pour Claude (CLAUDE.md)"
Cohesion: 0.22
Nodes (8): Agents, Architecture, Carte du code (Graphify), Contrat d'un jeu, Little Games : consignes pour Claude, Livraison (règle de Yoann), Règles de coordination, Sécurité et données (détails dans `SECURITY.md`)

### Community 13 - "Sécurité et données (SECURITY.md)"
Cohesion: 0.29
Nodes (6): Le jour où l'application aura un service en ligne (multijoueur, Supabase…), Où sont les données, Protections en place, Réglages du dépôt GitHub (à faire par le propriétaire), Signaler un problème, 🔒 Sécurité et données

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

## Knowledge Gaps
- **2 isolated node(s):** `./faces/index.js?v=1.11.0`, `./movie-posters/index.js?v=1.11.0`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 172 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `Affiches : écran de jeu et grille` to `Visages : écrans (photos, remplir, aperçu)`, `Réponses acceptées et tolérance aux fautes`, `Visages : réglages, import et stockage`, `Coquille : routeur et liste des jeux`, `Consignes pour Claude (CLAUDE.md)`, `Sécurité et données (SECURITY.md)`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `Sécurité et données (détails dans `SECURITY.md`)` and `Protections en place`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./faces/index.js?v=1.11.0`, `./movie-posters/index.js?v=1.11.0` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Affiches : écran de jeu et grille` be split into smaller, more focused modules?**
  _Cohesion score 0.09142857142857143 - nodes in this community are weakly interconnected._
- **Why does `mount()` connect `Visages : écrans (photos, remplir, aperçu)` to `Affiches : écran de jeu et grille`, `Réponses acceptées et tolérance aux fautes`, `Visages : réglages, import et stockage`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderPlay()` (e.g. with `reveal()` and `skip()`) actually correct?**
  _`renderPlay()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Visages : écrans (photos, remplir, aperçu)` be split into smaller, more focused modules?**
  _Cohesion score 0.10975609756097561 - nodes in this community are weakly interconnected._