# Graph Report - little-games  (2026-11-04)

## Corpus Check
- 36 files · ~38,950 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 3, (none) 2)

## Summary
- 382 nodes · 681 edges · 24 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `672dc5ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- posters.js
- h
- answers.js
- photos.js
- fetch-posters.mjs
- steps
- faces/index.js
- package.json
- 👤 Visages : spécification
- app.js
- 🎬 Affiches de cinéma : spécification
- 🎲 Little Games
- Little Games : consignes pour Claude
- 🔒 Sécurité et données
- ux-ui-mobile.md
- architecte-front.md
- curateur-contenu.md
- game-designer.md
- juridique-conformite.md
- performance-pwa.md
- qa-testeur.md
- coordinateur-release.md
- multijoueur.md
- movie-answers.test.js

## God Nodes (most connected - your core abstractions)
1. `h()` - 36 edges
2. `mount()` - 25 edges
3. `mount()` - 25 edges
4. `renderPlay()` - 14 edges
5. `renderPhotos()` - 14 edges
6. `renderFill()` - 13 edges
7. `renderSettings()` - 13 edges
8. `importFile()` - 12 edges
9. `isMatch()` - 12 edges
10. `👤 Visages : spécification` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Sécurité et données (détails dans `SECURITY.md`)` --references--> `h()`  [INFERRED]
  CLAUDE.md → js/core/dom.js
- `Protections en place` --references--> `h()`  [INFERRED]
  SECURITY.md → js/core/dom.js
- `skip()` --indirect_call--> `route()`  [INFERRED]
  games/faces/index.js → js/app.js
- `check()` --calls--> `checkAnswer()`  [EXTRACTED]
  tests/faces.test.js → games/faces/answers.js
- `strict()` --calls--> `checkAnswer()`  [EXTRACTED]
  tests/faces.test.js → games/faces/answers.js

## Import Cycles
- None detected.

## Communities (24 total, 0 thin omitted)

### Community 0 - "posters.js"
Cohesion: 0.10
Nodes (43): ensureStyles(), mount(), computeOrder(), onKey(), posterImg(), renderGrid(), renderPlay(), reveal() (+35 more)

### Community 1 - "h"
Cohesion: 0.11
Nodes (40): creditText(), mount(), deck(), dialog(), on(), openPreview(), openPreviewNow(), openUnknown() (+32 more)

### Community 2 - "answers.js"
Cohesion: 0.13
Nodes (30): buildAnswers(), buildOwners(), checkAnswer(), compact(), findByName(), matchFileName(), PARTICLES, BLUR (+22 more)

### Community 3 - "photos.js"
Cohesion: 0.10
Nodes (34): bitmap(), BITMAPS, clamp(), clearAll(), coverCrop(), cropOf(), decode(), defaultPoints() (+26 more)

### Community 4 - "fetch-posters.mjs"
Cohesion: 0.09
Nodes (23): args, DOWNLOAD, downloadCropped(), fetchRetry(), FILMS, findMovie(), FORCE, GAME (+15 more)

### Community 5 - "steps"
Cohesion: 0.09
Nodes (22): TMDB_API_KEY, default, description, type, force, jobs, posters, name (+14 more)

### Community 6 - "faces/index.js"
Cohesion: 0.12
Nodes (19): DEFAULT_SETTINGS, ensureStyles(), isPartCrop(), KIND_LABEL, MODES, importBatch(), parseCsv(), PART_BTN (+11 more)

### Community 7 - "package.json"
Cohesion: 0.13
Nodes (15): description, engines, node, name, optionalDependencies, sharp@^0.33.5, private, scripts (+7 more)

### Community 8 - "👤 Visages : spécification"
Cohesion: 0.15
Nodes (12): Cadre photo, Catalogue, Détection du visage, Import des photos, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe (+4 more)

### Community 9 - "app.js"
Cohesion: 0.25
Nodes (9): ./faces/index.js?v=1.11.0, ./movie-posters/index.js?v=1.11.0, GAMES, APP_VERSION, navigate(), parseHash(), renderHome(), root (+1 more)

### Community 10 - "🎬 Affiches de cinéma : spécification"
Cohesion: 0.18
Nodes (10): 🎬 Affiches de cinéma : spécification, Catalogue, Grille de toutes les affiches, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 11 - "🎲 Little Games"
Cohesion: 0.18
Nodes (10): Ajouter un jeu, 🧱 Architecture (pensée pour migrer facilement), 🖼️ Les affiches, 👤 Les photos de Visages, 🎲 Little Games, 🚀 Mise en ligne sur GitHub Pages, Modifier la liste des célébrités, Modifier la liste des films (+2 more)

### Community 12 - "Little Games : consignes pour Claude"
Cohesion: 0.22
Nodes (8): Agents, Architecture, Carte du code (Graphify), Contrat d'un jeu, Little Games : consignes pour Claude, Livraison (règle de Yoann), Règles de coordination, Sécurité et données (détails dans `SECURITY.md`)

### Community 13 - "🔒 Sécurité et données"
Cohesion: 0.29
Nodes (6): Le jour où l'application aura un service en ligne (multijoueur, Supabase…), Où sont les données, Protections en place, Réglages du dépôt GitHub (à faire par le propriétaire), Signaler un problème, 🔒 Sécurité et données

### Community 14 - "ux-ui-mobile.md"
Cohesion: 0.33
Nodes (5): Ce que tu analyses, Ce que tu peux améliorer, Comment vérifier, Exigences de l'application, Format du rapport

### Community 15 - "architecte-front.md"
Cohesion: 0.40
Nodes (4): Ce que tu analyses, Ce que tu peux améliorer, Format du rapport, Principes à préserver

### Community 16 - "curateur-contenu.md"
Cohesion: 0.40
Nodes (4): Catalogues, Ce que tu analyses, Ce que tu peux améliorer, Format du rapport

### Community 17 - "game-designer.md"
Cohesion: 0.40
Nodes (4): Ce que tu analyses, Ce que tu peux améliorer, Format du rapport, Règles

### Community 18 - "juridique-conformite.md"
Cohesion: 0.40
Nodes (4): Ce que tu analyses, Ce que tu produis, Format du rapport, Règles déjà adoptées

### Community 19 - "performance-pwa.md"
Cohesion: 0.40
Nodes (4): Ce que tu analyses, Ce que tu peux améliorer, Contexte, Format du rapport

### Community 20 - "qa-testeur.md"
Cohesion: 0.40
Nodes (4): Ce que tu peux améliorer, Ce que tu vérifies à chaque passage, Format du rapport, Particularités par jeu

### Community 21 - "coordinateur-release.md"
Cohesion: 0.50
Nodes (3): Ce que tu peux faire, Ce que tu vérifies, Format du rapport

### Community 22 - "multijoueur.md"
Cohesion: 0.50
Nodes (3): Ce que tu produis, Contraintes, Format du rapport

### Community 23 - "movie-answers.test.js"
Cohesion: 0.10
Nodes (13): articleCandidates(), pickExactPage(), pickWikipediaPage(), searchWikipedia(), wikipediaQuery(), text(), textList(), THIS_YEAR (+5 more)

## Knowledge Gaps
- **2 isolated node(s):** `./movie-posters/index.js?v=1.11.0`, `./faces/index.js?v=1.11.0`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 171 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `posters.js` to `h`, `answers.js`, `faces/index.js`, `app.js`, `Little Games : consignes pour Claude`, `🔒 Sécurité et données`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `Sécurité et données (détails dans `SECURITY.md`)` and `Protections en place`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./movie-posters/index.js?v=1.11.0`, `./faces/index.js?v=1.11.0` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `posters.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10048309178743961 - nodes in this community are weakly interconnected._
- **Why does `mount()` connect `h` to `posters.js`, `answers.js`, `faces/index.js`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderPlay()` (e.g. with `reveal()` and `skip()`) actually correct?**
  _`renderPlay()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `h` be split into smaller, more focused modules?**
  _Cohesion score 0.10975609756097561 - nodes in this community are weakly interconnected._