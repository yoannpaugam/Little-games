# 🔎 Murdoku : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Une enquête par déduction, à **grilles infinies**. Une victime a été retrouvée dans un bâtiment ; on voit le plan (pièces, portes, fenêtres, meubles) et, pour chaque suspect, un ou plusieurs indices sur l'endroit où il se tenait. Il faut **placer tout le monde sur le plan**, victime comprise, puis **démasquer la taupe** : la seule personne présente dans la pièce de la victime.

Historique (demandes de Yoann, 17 novembre 2026) :
- 1.55.0 : adaptation du jeu « La taupe » (fichiers `mole-hunt` : JS, CSS et démo HTML), sans défilement, en 3 enquêtes fixes ;
- 1.56.0 : le jeu s'appelle **Murdoku** ; les grilles sont générées à l'infini (scénarios, personnages, lieux, meubles), on choisit son niveau et on enchaîne les grilles comme on veut, sans parcours imposé.

## Règles
- **Une seule personne par ligne et par colonne** (le plan fait n × n cases et il y a n personnes : n − 1 suspects et la victime).
- Meubles **occupables** : fauteuil, canapé, chaise, tapis, lit. **Interdits** : bureau, table, piano, coffre-fort, écran, plante, étagère.
- La victime occupe **la dernière case libre** : la ligne et la colonne qui restent.
- Indices possibles :
  - « à côté d’un(e) X » : une case voisine (haut, bas, gauche ou droite), **dans la même pièce**, porte le meuble X ;
  - « sur un(e) X » : la case porte le meuble X ;
  - « devant une fenêtre » : la case a une fenêtre ;
  - « dans la pièce P » ;
  - « plus au nord / au sud / à l’est / à l’ouest que Y » : sur une ligne plus haute / plus basse, une colonne plus à droite / plus à gauche que le suspect Y (nord = haut du plan).
- **La taupe** est le seul suspect dans la pièce de la victime.
- Chaque grille n'a **qu'une solution** (vérifiée par le solveur).

## Niveaux
| Niveau | Plan | Suspects | Pièces |
| --- | --- | --- | --- |
| Facile | 4 × 4 | 3 | 3 |
| Moyen (par défaut) | 5 × 5 | 4 | 3 ou 4 |
| Difficile | 6 × 6 | 5 | 4 à 6 |
| Expert | 7 × 7 | 6 | 5 à 7 |

Chaque niveau garde sa grille en cours : on peut changer de niveau sans perdre sa progression.

## Génération d'une grille
1. **Lieu** tiré parmi 6 : l'agence, l'ambassade, le train de nuit, le casino, le manoir, la base polaire. Chacun a ses pièces (9 à 11 noms, avec « dans le… »), ses meubles occupables et interdits, ses victimes possibles (« La Diplomate », « Le Contrôleur »…), ce que la victime transportait (« un traité secret »…) et ses titres (« Bal masqué », « Terminus »…).
2. **Plan** : le carré est découpé en pièces d'un seul tenant (au moins 2 cases chacune), par croissance à partir de cases tirées au hasard. Portes : un arbre qui relie toutes les pièces, plus quelques portes en plus (porte battante ou passage). Fenêtres : 3 à n cases du pourtour.
3. **Solution** : une personne par ligne et par colonne (permutation au hasard). La victime est choisie dans une pièce où se trouve **exactement un** autre personnage : la taupe.
4. **Personnages** : noms de code (24 féminins, 24 masculins : Vesper, Lynx, Belladone, Condor…) et portrait dessiné au hasard (peau, cheveux, coiffure, lunettes, casque, moustache, barbe, costume, cravate…). La victime a un fond gris.
5. **Meubles** : jamais de meuble interdit sous une personne ; ailleurs, environ 42 % de meubles interdits et 18 % d'occupables ; 40 % des personnes sont sur un meuble occupable.
6. **Indices** : pour chaque suspect, on liste tous les indices vrais. On en ajoute un à la fois, en prenant parmi 14 tirés au hasard celui qui laisse le moins de plans possibles, jusqu'à n'avoir qu'une seule solution (3 indices au plus par suspect). Puis on retire ceux qui ne servent à rien (au moins un indice par suspect). Les indices « plus au nord que… » sont un peu moins prioritaires et affichés en dernier.
7. **Scénario** : titre du lieu ; résumé « La Chanteuse a été retrouvée sans vie à bord du train de nuit. Elle transportait des documents compromettants. Six suspects, une seule taupe. »
8. Si un tirage échoue, on recommence (40 essais par graine). Durée : quelques millisecondes en 4 × 4, environ 0,1 s en 7 × 7.

Une grille est reproductible à partir de sa graine (générateur pseudo-aléatoire mulberry32), mais elle est enregistrée en entier dans la partie en cours.

**Enquêtes d'origine** : les 3 enquêtes du fichier de Yoann (`data/enquetes.json` : *Le courrier disparu* 4 × 4, *Les archives muettes* 5 × 5, *Le dernier code* 6 × 6) sont la première grille des niveaux Facile, Moyen et Difficile, tant qu'on n'a résolu aucune grille de ce niveau.

## Dessins
Tout est dessiné en SVG, sans image : portraits « photo d'identité » (la victime est barrée de rouge), 12 meubles en vue de dessus, murs épais, portes (battant et arc) ou passages, fenêtres en languette bleue. Sol d'une teinte unie par pièce. Étiquette blanche du nom de chaque pièce, posée sur la plus longue suite de cases libres de la pièce (sur 2 lignes au plus).

## Écrans
- **Présentation** de chaque grille : les 4 niveaux en haut (Facile 4 × 4, Moyen 5 × 5, Difficile 6 × 6, Expert 7 × 7), puis « Grille n° 12 · 4 suspects », titre, résumé, portraits, rappel des règles avec la légende des meubles de cette grille, et **Commencer l’enquête**.
- **Barre du haut** : retour, « Murdoku », **dé** (nouvelle grille du même niveau ; si la grille est commencée, il faut toucher deux fois en 3 s), réglages.
- **Plan** : carré, le plus grand possible dans la place restante. En haut : « Moyen · n° 12 · Bal masqué » et les points encore possibles.
- **Personnes** :
  - téléphone en hauteur : une pastille par personne (portrait et nom, ✓ si placée), et sous les pastilles les indices de la personne choisie ; sur un grand téléphone (740 px de haut ou plus), les cartes complètes avec leurs indices, sur 2 colonnes ;
  - tablette en hauteur : les cartes complètes sur 2 colonnes ;
  - ordinateur et téléphone couché : les cartes à gauche (la liste défile si besoin), le plan à droite.
- **Placer** : toucher une personne, puis une case. Toucher une personne déjà placée la reprend en main. Les cases libres sur la ligne ou la colonne d'une personne placée sont grisées. Une case interdite donne « Impossible : on ne peut pas se tenir sur un piano. ».
- **Barrer** : en mode barrage, toucher une case y met une croix rouge (ou l'enlève).
- **Indice** (−15 pts, 3 par grille) : place une personne à sa vraie place (un suspect d'abord, la victime en dernier), verrouillée (cadre vert).
- **Vérifier** (actif quand tout le monde est placé) : si le plan est faux, les personnes mal placées passent en rouge (−10 pts). S'il est juste : « Plan reconstitué ! Qui était seul avec la diplomate dans sa pièce ? » et un bouton par suspect.
- **Accusation** : mauvaise réponse −30 pts ; bonne réponse : « Taupe démasquée : Spectre », l'explication, la note de la grille et **Grille suivante** (nouvelle grille du même niveau).
- Une ligne de message (2 lignes au plus, hauteur fixe) guide le joueur.
- Tout tient dans l'écran **sans défilement**, de l'iPhone SE à l'ordinateur, téléphone couché compris, à tous les niveaux.

## Score
Une grille vaut 100 points : −10 par plan vérifié faux, −15 par indice, −30 par mauvaise accusation, au minimum 0. Statistiques par niveau : grilles résolues et moyenne.

## Réglages
Règle du jeu et légende de tous les meubles, barème, statistiques par niveau, **Effacer mes statistiques** (confirmation en deux clics), **Reprendre la partie**.

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:taupe:` (format version 2 ; le format 1 de la 1.55.0, un dossier de 3 enquêtes, est effacé) :
- `settings` : `{ level }` (taille du plan, 4 à 7) ;
- `game:<n>` : grille en cours du niveau `{ level, number, case (la grille entière), cur: { stage: 'intro' | 'play' | 'accuse' | 'solved', placed: { id: [ligne, colonne] }, crosses: ['l,c'], locked: [ids], fails, wrong, hints, score } }` ;
- `stats` : `{ n: { solved, points } }` ; `numbers` : numéro de la dernière grille par niveau ; `seenOriginals` : enquêtes d'origine déjà proposées.

## Navigation (URL)
`#/murdoku` (partie) · `#/murdoku/reglages`

## Pistes pour la suite
Grille du jour identique pour tous (graine = date), partage d'une grille par sa graine, chronomètre et records de temps, nouveaux lieux et nouveaux types d'indices (« à côté de Y », « pas dans la même pièce que Y »), défi « Murdoku » dans Compète de zinzin (un plan 4 × 4 en 90 s), génération dans un Web Worker si les grilles grandissent encore.
