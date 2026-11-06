# 🧩 Nonogramme : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Un jeu de logique (aussi appelé *picross* ou *hanjie*). On noircit des cases d'une grille carrée pour faire apparaître un dessin. À gauche de chaque ligne et au-dessus de chaque colonne, des chiffres donnent, **dans l'ordre**, la longueur des blocs de cases noires de cette ligne ou colonne. Deux blocs sont séparés par au moins une case blanche.

## Niveaux
| Niveau | Grille |
| --- | --- |
| Facile | 5 × 5 |
| Moyen | 10 × 10 |
| Difficile | 15 × 15 |

Le niveau se choisit en haut de l'écran de jeu. Chaque niveau garde sa propre grille en cours : on peut passer de l'un à l'autre sans perdre sa progression.

## Tirage des grilles
- Les grilles sont tirées au hasard, il n'y a pas de catalogue : on peut jouer sans fin.
- Facile : chaque case est noire avec une probabilité de 60 %. Moyen et Difficile : bruit à 55 %, puis un lissage (chaque case prend la couleur majoritaire de ses 8 voisines) pour obtenir des formes plutôt que du bruit, et des indices plus courts.
- Une grille n'est gardée que si :
  - 40 à 72 % de ses cases sont noires ;
  - aucune ligne ni colonne n'est entièrement blanche ;
  - elle se **résout entièrement par logique**, ligne par ligne, sans jamais deviner. Cela garantit une solution unique.
- Le solveur, pour chaque ligne, énumère (par programmation dynamique) toutes les dispositions des blocs compatibles avec les cases déjà connues ; une case noire (ou blanche) dans toutes les dispositions est certaine. On répète sur les lignes et les colonnes jusqu'à ce que plus rien ne change.
- En pratique, 1 à 5 tirages suffisent (moins d'une milliseconde).

## Écran de jeu
- Barre du haut : retour, « Nonogramme » (masqué sur les écrans de moins de 380 px), bouton **Nouvelle grille** et réglages.
- **Nouvelle grille** tire une autre grille du niveau choisi. Si la grille en cours est commencée et pas résolue, un premier appui affiche « Confirmer ? » (en rouge) pendant 3 s ; un second appui confirme.
- Sous la barre : les 3 niveaux (Facile 5×5, Moyen 10×10, Difficile 15×15), le chronomètre et le record du niveau.
- La grille : indices des lignes à gauche, des colonnes au-dessus, une bande sur deux légèrement teintée. Un trait épais tous les 5 cases. Un indice s'estompe quand sa ligne ou sa colonne est juste.
- Outils sous la grille (à droite en paysage) : **Remplir** / **Croix** et **Annuler** (Ctrl+Z ou ⌘Z aussi).
  - Toucher une case la noircit (ou l'efface si elle l'était déjà). Avec l'outil Croix, on marque les cases qu'on sait blanches.
  - En faisant glisser le doigt ou la souris, on noircit (ou on efface) toute une rangée : le trait reste sur la ligne ou la colonne de départ. Un trait de remplissage ne recouvre pas les croix, et inversement.
  - Clic droit : l'autre outil (croix en mode Remplir).
  - Clavier : flèches pour se déplacer, Espace ou Entrée pour noircir, X pour une croix.
  - Annuler défait le dernier trait (200 traits au plus).
- Avant le premier coup, une ligne rappelle la règle.
- **Grille résolue** dès que toutes les lignes et colonnes respectent leurs indices : les croix disparaissent, le quadrillage s'efface et le dessin apparaît en couleur. Panneau **Bravo !**, « Grille résolue en 2:31 », « 🏆 Nouveau record ! » le cas échéant, et un bouton **Nouvelle grille** (qui prend le focus).
- La taille des cases est la plus grande qui fait tenir la grille et ses indices dans la place restante (de 12 à 44 px, 64 px en Facile), sans défilement, de l'iPhone SE à l'ordinateur. Un chiffre d'indice prend 0,62 case ; un nombre à deux chiffres compte pour 1,5 chiffre.
- Le chronomètre ne tourne que lorsque l'écran de jeu est visible.

## Réglages
Règle du jeu, records (meilleur temps et nombre de grilles résolues par niveau), **Effacer mes records** (confirmation en deux clics).

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:nonogramme:` (format version 1) :
- `settings` : `{ level }` ;
- `game:<niveau>` : grille en cours `{ level, n, sol: "0110…", cells: "0120…" (0 vide, 1 noire, 2 croix), time (ms), done }` ;
- `best` : `{ niveau: meilleur temps en ms }` ;
- `solved` : `{ niveau: nombre de grilles résolues }`.
L'historique d'annulation n'est pas enregistré.

## Navigation (URL)
`#/nonogramme` (partie) · `#/nonogramme/reglages`

## Pistes pour la suite
Grilles du jour identiques pour tous, dessins choisis (catalogue d'images), aide (révéler une case), niveau Expert 20 × 20, mode multijoueur (course sur la même grille).
