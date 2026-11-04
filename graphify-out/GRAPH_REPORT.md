# Graph Report - Little-games  (2026-11-04)

## Corpus Check
- 43 files · ~45,450 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .css 4)

## Summary
- 481 nodes · 893 edges · 24 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c390d653`
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
- h
- 🎬 Affiches de cinéma : spécification
- 🎲 Little Games
- celeb-quiz-builder.py
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
- Morceaux : spécification

## God Nodes (most connected - your core abstractions)
1. `h()` - 45 edges
2. `mount()` - 25 edges
3. `mount()` - 25 edges
4. `main()` - 21 edges
5. `mount()` - 18 edges
6. `icon()` - 15 edges
7. `renderPlay()` - 14 edges
8. `renderPhotos()` - 14 edges
9. `isMatch()` - 14 edges
10. `normalize()` - 14 edges

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

## Communities (24 total, 0 thin omitted)

### Community 0 - "posters.js"
Cohesion: 0.07
Nodes (58): BLUR, BLUR_STEPS, buildAnswers(), DEFAULT_SETTINGS, ensureStyles(), mount(), computeOrder(), onKey() (+50 more)

### Community 1 - "h"
Cohesion: 0.12
Nodes (37): creditText(), mount(), deck(), on(), openPreview(), openPreviewNow(), renderCredits(), renderFill() (+29 more)

### Community 2 - "answers.js"
Cohesion: 0.11
Nodes (34): buildAnswers(), buildOwners(), checkAnswer(), compact(), PARTICLES, buildAnswers(), buildOwners(), checkAnswer() (+26 more)

### Community 3 - "photos.js"
Cohesion: 0.10
Nodes (34): bitmap(), BITMAPS, clamp(), clearAll(), coverCrop(), cropOf(), decode(), defaultPoints() (+26 more)

### Community 4 - "fetch-posters.mjs"
Cohesion: 0.06
Nodes (27): args, DOWNLOAD, downloadCropped(), fetchRetry(), FILMS, findMovie(), FORCE, GAME (+19 more)

### Community 5 - "steps"
Cohesion: 0.09
Nodes (22): TMDB_API_KEY, default, description, type, force, jobs, posters, name (+14 more)

### Community 6 - "faces/index.js"
Cohesion: 0.09
Nodes (20): DEFAULT_SETTINGS, ensureStyles(), isPartCrop(), KIND_LABEL, MODES, importBatch(), parseCsv(), PART_BTN (+12 more)

### Community 7 - "package.json"
Cohesion: 0.12
Nodes (17): description, engines, node, name, optionalDependencies, sharp@^0.33.5, private, scripts (+9 more)

### Community 8 - "👤 Visages : spécification"
Cohesion: 0.15
Nodes (12): Cadre photo, Catalogue, Détection du visage, Import des photos, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe (+4 more)

### Community 9 - "h"
Cohesion: 0.11
Nodes (34): creditLine(), ensureStyles(), hashId(), ./face-parts/index.js?v=1.12.0, mount(), computeOrder(), ensureStage(), faceFrame() (+26 more)

### Community 10 - "🎬 Affiches de cinéma : spécification"
Cohesion: 0.18
Nodes (10): 🎬 Affiches de cinéma : spécification, Catalogue, Grille de toutes les affiches, Navigation (URL), Persistance (sur l'appareil), Pistes pour la suite, Principe, Réglages (+2 more)

### Community 11 - "🎲 Little Games"
Cohesion: 0.17
Nodes (11): Ajouter un jeu, 🧱 Architecture (pensée pour migrer facilement), 🖼️ Les affiches, 👤 Les photos de Visages, 🎲 Little Games, 🚀 Mise en ligne sur GitHub Pages, Modifier la liste des célébrités, Modifier la liste des films (+3 more)

### Community 12 - "celeb-quiz-builder.py"
Cohesion: 0.07
Nodes (31): Agents, Architecture, Carte du code (Graphify), Contrat d'un jeu, Little Games : consignes pour Claude, Livraison (règle de Yoann), Règles de coordination, Sécurité et données (détails dans `SECURITY.md`) (+23 more)

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

### Community 23 - "Morceaux : spécification"
Cohesion: 0.17
Nodes (11): Catalogue, Crédits photo, Morceaux : spécification, Navigation (URL), Persistance (sur l’appareil), Pistes pour la suite, Principe, Réglages (+3 more)

## Knowledge Gaps
- **3 isolated node(s):** `./movie-posters/index.js?v=1.12.0`, `./faces/index.js?v=1.12.0`, `./face-parts/index.js?v=1.12.0`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 203 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `h` to `posters.js`, `h`, `answers.js`, `faces/index.js`, `celeb-quiz-builder.py`, `🔒 Sécurité et données`?**
  _High betweenness centrality (0.281) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `h()` (e.g. with `Sécurité et données (détails dans `SECURITY.md`)` and `Protections en place`) actually correct?**
  _`h()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./movie-posters/index.js?v=1.12.0`, `./faces/index.js?v=1.12.0`, `./face-parts/index.js?v=1.12.0` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `posters.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07191961924907457 - nodes in this community are weakly interconnected._
- **Why does `Sécurité et données (détails dans `SECURITY.md`)` connect `celeb-quiz-builder.py` to `h`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `main()` (e.g. with `Agents` and `Little Games : consignes pour Claude`) actually correct?**
  _`main()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `h` be split into smaller, more focused modules?**
  _Cohesion score 0.12462462462462462 - nodes in this community are weakly interconnected._