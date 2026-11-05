# 🌍 Géoquizz : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
On demande au joueur de placer un pays sur une carte du monde muette (sans noms). Il touche ou clique là où il pense que le pays se trouve. L'**écart** est la distance entre son point et la frontière la plus proche du pays : 0 km si le point est dans le pays. Une partie compte **10 pays** ; les écarts s'additionnent et donnent un score sur 100.

Le jeu reprend le concept et le gameplay de « Traque internationale » (fichier fourni par Yoann le 5 novembre 2026), sans son habillage d'espionnage : interface neutre de quiz, aux couleurs de Little Games.

## Carte
- `data/world.json` : contours de 167 pays (Natural Earth, domaine public, via world-atlas), noms en français.
  - `units` (unités par degré), `lonMin`, `latMax` (84), `latMin` (−58), `width`, `height` ;
  - `land` : tracé SVG de toutes les terres (`M x y l dx dy …`, en équirectangulaire) ;
  - `countries` : `{ c: code ISO à 2 lettres, n: nom, p: polygones }`. Chaque polygone est une liste d'anneaux (le premier est le contour, les suivants des trous), codés « x0 y0 dx dy dx dy… » en centièmes de degré (longitude, latitude).
- **Contours simplifiés** (1.24.0) par `scripts/simplify-geo.py` (Douglas-Peucker, tolérance 0,1°, îles et trous de moins de 0,05 degré carré retirés sauf le plus grand morceau de chaque pays). Les frontières communes restent identiques entre voisins : chaque contour est coupé aux jonctions, et chaque tronçon est simplifié de la même façon dans les deux sens. Environ 25 000 points au lieu de 50 000, 155 Ko au lieu de 279 Ko.
- Affichage en **projection de Mercator**, comme les planisphères habituels. La carte se répète à gauche et à droite. Une grille légère marque les méridiens tous les 30° et quelques parallèles.
- Couleurs : océan bleu nuit, terres beige clair, frontières fines. Les côtes sont tracées par les contours des pays ; les terres n'ont qu'un remplissage.
- Fluidité : un seul dessin par image pendant le zoom et le déplacement, et un rendu sans lissage tant que la carte bouge (lissé 160 ms après l'arrêt). Zoom ×20 au plus.

## Tirage des pays
- On ne propose que 89 pays assez connus ou assez grands (liste `EASY` de `geo.js`), répartis en 6 régions : Europe, Afrique, Asie, Amérique du Nord, Amérique du Sud, Océanie.
- Quotas par partie : 2 Europe, 2 Afrique, 2 Asie, 1 Amérique du Nord, 1 Amérique du Sud, 1 Océanie (une partie sur deux seulement), puis le reste au hasard, avec au plus 3 pays par région.
- Ordre : jamais deux pays de la même région d'affilée.

## Écran de jeu
- La carte occupe tout l'écran sous la barre du haut, sans défilement.
- En haut à gauche : « Pays 3 / 10 », « Où se trouve… » et le nom du pays. En haut à droite : l'**écart total**.
- Zoom : pincer, molette, ou boutons **+**, **−** et **⌂** (vue de départ). On déplace la carte en la faisant glisser ; un glissement ne place pas de point.
- Vue de départ : le monde entier. Sur un écran en hauteur (téléphone), un léger zoom (×1,8 au plus) centré sur l'Europe et l'Afrique.
- Au clavier : flèches pour déplacer, + et − pour zoomer, Entrée pour placer le centre de la carte (une mire l'indique).
- Après chaque réponse : le pays est mis en surbrillance, le point posé est en rouge, le point le plus proche de la frontière en vert, reliés par des tirets. La carte cadre le pays et le point. Un panneau (à droite, ou en bas sur téléphone) donne le pays, l'écart (« Dans le mille ! » si 0 km) et le bouton **Pays suivant** (au dernier : **Voir le score**).
- Téléphone en paysage : panneaux plus compacts, écart total en bas à gauche.

## Calcul
- Distances sur la sphère (rayon 6 371 km) : point le plus proche sur les arcs de grand cercle des frontières (segments découpés par pas de 1°).
- Point dans un pays : test par lancer de rayon en (longitude, latitude), trous compris.
- Score : `100 × (1 − écart total / 25 000 km)`, arrondi, au minimum 0.

## Score final
« Partie terminée », le score sur 100, l'écart total, « Nouveau record ! » ou le record, les boutons **Accueil** et **Rejouer**, puis le tableau des 10 pays avec leur écart.

## Réglages
Règle du jeu, record et nombre de parties jouées, **Effacer mes scores** (confirmation en deux clics), source de la carte.

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:geoquizz:` (format version 1) :
- `game` : partie en cours `{ codes, results: [{ code, km, guess, near }] }`. On reprend là où on s'était arrêté ; effacée à la fin de la partie.
- `best` : record `{ points, km, date }` (à points égaux, le plus petit écart l'emporte) ;
- `played` : nombre de parties terminées.

## Navigation (URL)
`#/geoquizz` (partie) · `#/geoquizz/reglages`

## Pistes pour la suite
Mode multijoueur (même partie sur plusieurs appareils, classement), choix du continent, capitales ou villes à placer, niveau difficile avec tous les pays.
