# 🔎 La taupe : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Une enquête par déduction. Un agent a été éliminé dans un bâtiment ; on voit le plan (pièces, portes, fenêtres, meubles) et, pour chaque suspect, un ou plusieurs indices sur l'endroit où il se tenait. Il faut **placer tout le monde sur le plan**, victime comprise, puis **désigner la taupe** : la seule personne présente dans la pièce de la victime.

Demande de Yoann (17 novembre 2026) : adapter le jeu « La taupe » (fichiers `mole-hunt` : JS, CSS et démo HTML) pour l'application, sans défilement. Le moteur, les dessins et les 3 enquêtes viennent de ce fichier ; l'écran a été refait pour tenir dans l'écran du téléphone.

## Règles
- **Une seule personne par ligne et par colonne** (le plan fait n × n cases et il y a n personnes : n − 1 suspects et la victime).
- Meubles **occupables** : fauteuil, tapis, lit. **Interdits** : bureau, écran (de surveillance), plante, étagère.
- La victime occupe **la dernière case libre** : la ligne et la colonne qui restent.
- Indices possibles :
  - « à côté d’un(e) X » : une case voisine (haut, bas, gauche ou droite), **dans la même pièce**, porte le meuble X ;
  - « sur un X » : la case porte le meuble X ;
  - « devant une fenêtre » : la case a une fenêtre ;
  - « dans la pièce P » ;
  - « plus au nord / au sud que Y » : sur une ligne plus haute / plus basse que le suspect Y (nord = haut du plan).
- **La taupe** est le seul suspect dans la pièce de la victime.
- Chaque enquête n'a **qu'une solution** (vérifié par un solveur dans les tests).

## Enquêtes
`data/enquetes.json`, 3 enquêtes : *Le courrier disparu* (4 × 4, 3 suspects), *Les archives muettes* (5 × 5, 4 suspects), *Le dernier code* (6 × 6, 5 suspects).
Champs : `id`, `title`, `teaser`, `n`, `rooms` (n lignes de lettres, une lettre par pièce), `roomNames` (`{ lettre: { name, in } }`, « in » = « dans les archives »), `objects` (`[ligne, colonne, type]`), `windows` (`[ligne, colonne, côté]`, sur le pourtour), `doors` (`[ligne, colonne, 'right' | 'down', 'door' | 'arch']`, entre deux pièces), `victim` (`{ name, g, av, cell }`), `suspects` (`[{ id, name, g, av, cell, clues }]`), `murderer`.
Les indices sont structurés (`{ t: 'next', o: 'etagere' }`, `{ t: 'room', r: 'A' }`, `{ t: 'north', of: 'lynx' }`…) ; le texte est écrit par le jeu, accordé selon `g` (« Il » / « Elle »). `av` est le numéro du portrait dessiné.

## Dessins
Tout est dessiné en SVG, sans image : portraits « photo d'identité » des personnages (la victime est barrée de rouge), meubles en vue de dessus, murs épais, portes (battant et arc) ou passages, fenêtres en languette bleue. Sol d'une teinte unie par pièce, trait fin entre les cases. Étiquette blanche du nom de chaque pièce, posée sur la plus longue suite de cases libres de la pièce (sur 2 lignes au plus).

## Écran de jeu
- **Présentation** de chaque enquête : « Enquête 1 / 3 », titre, résumé, portraits des personnes, rappel des règles avec la légende des meubles, bouton **Commencer l’enquête**.
- **Plan** : carré, le plus grand possible dans la place restante. En haut : « Enquête 3 / 3 · Le dernier code » et les points encore possibles (« 28 / 33 pts »).
- **Personnes** :
  - téléphone en hauteur : une pastille par personne (portrait et nom, ✓ si placée), et sous les pastilles les indices de la personne choisie ; sur un grand téléphone (740 px de haut ou plus), les cartes complètes avec leurs indices, sur 2 colonnes ;
  - tablette en hauteur : les cartes complètes sur 2 colonnes ;
  - ordinateur et téléphone couché : les cartes à gauche (la liste défile si besoin), le plan à droite.
- **Placer** : toucher une personne, puis une case. Toucher une personne déjà placée (sur sa carte ou sur le plan) la reprend en main. Les cases libres sur la ligne ou la colonne d'une personne placée sont grisées. Une case interdite donne « Impossible : on ne peut pas se tenir sur une plante. ».
- **Barrer** : en mode barrage, toucher une case y met une croix rouge (ou l'enlève).
- **Indice** (−5 pts, 3 par enquête) : place une personne à sa vraie place (un suspect d'abord, la victime en dernier) ; elle est verrouillée (cadre vert).
- **Vérifier** (actif quand tout le monde est placé) : si le plan est faux, les personnes mal placées passent en rouge (−3 pts). S'il est juste : « Plan reconstitué ! Qui était seul avec le cryptologue dans sa pièce ? » et un bouton par suspect.
- **Accusation** : mauvaise réponse −10 pts ; bonne réponse : « Taupe démasquée : Spectre », la phrase d'explication, la note de l'enquête et **Enquête suivante** (au dernier : **Voir le bilan**).
- Une ligne de message (2 lignes au plus, hauteur fixe) guide le joueur.
- Tout tient dans l'écran **sans défilement**, de l'iPhone SE à l'ordinateur, téléphone couché compris.

## Score
100 points : 34 + 33 + 33. Par enquête : −3 par plan vérifié faux, −5 par indice, −10 par mauvaise accusation, au minimum 0.
**Bilan** (« Dossier clos ») : le total sur 100, « Nouveau record ! » ou le record, le tableau des 3 enquêtes, boutons **Accueil** et **Rejouer**.

## Réglages
Règle du jeu et légende des meubles, barème, **Reprendre l’enquête**, **Recommencer le dossier** et **Effacer mes scores** (confirmation en deux clics).

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:taupe:` (format version 1) :
- `game` : `{ ci (enquête en cours), scores: [points par enquête], cur: { stage: 'intro' | 'play' | 'accuse' | 'solved', placed: { id: [ligne, colonne] }, crosses: ['l,c'], locked: [ids], fails, wrong, hints }, counted, record }` ; on reprend où on s'était arrêté ;
- `best` : `{ score, date }` ; `played` : nombre de dossiers terminés.

## Navigation (URL)
`#/taupe` (partie) · `#/taupe/reglages`

## Pistes pour la suite
Plus d'enquêtes (générées et vérifiées par le solveur), enquête tirée au hasard, défi « La taupe » dans Compète de zinzin (un plan 4 × 4 en 90 s), chronomètre, mode à plusieurs (même enquête sur plusieurs téléphones).
