# 👣 Le chemin : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Un jeu de mémoire. Un chemin s'allume pendant **6 secondes** sur une grille, du départ à l'arrivée. Le joueur doit ensuite le retracer **case par case, dans l'ordre**, de mémoire.

Le jeu reprend le fichier « Parcours de mémoire » fourni par Yoann le 6 novembre 2026, intégré à Little Games : barre du haut, réglages, record, couleurs de l'app. Depuis la 1.26.0 (demande de Yoann), la grille a 2 cases de plus en largeur, 5 erreurs sont permises, et la 5e erreur fait tirer un nouveau chemin.

## Grille et chemin
- **11 colonnes × 14 lignes** en portrait. En paysage (téléphone couché, ordinateur), la grille se couche : **14 colonnes × 11 lignes**, le départ à gauche et l'arrivée à droite.
- La première et la dernière rangée (départ, arrivée) sont teintées. Les étiquettes « Départ » et « Arrivée », avec une flèche, encadrent la grille.
- Le chemin est tiré au hasard à chaque partie :
  - il part d'une case de la rangée de départ et s'arrête dès qu'il atteint la rangée d'arrivée ;
  - chaque case touche (par un côté) la précédente et la suivante, et **aucune autre case du chemin** : pas de raccourci possible ;
  - il est **tortueux** (depuis la 1.27.0) : au moins **40 cases** et **20 virages** (en moyenne 46 cases et 30 virages), jamais plus de **4 cases alignées** ; il serpente beaucoup et recule aussi souvent qu'il avance ;
  - si le tirage échoue 20 000 fois (ce qui n'arrive pas en pratique), un serpentin fixe sert de secours.

## Écran de jeu
- De haut en bas (portrait) : barre du haut, introduction (avant le premier affichage, et seulement s'il y a la place), panneau, grille, message.
- Barre du haut : retour, « Le chemin », record, bouton son (🔊 / 🔇), réglages.
- Panneau : **Essais** (5 ronds rouges, qui s'éteignent à chaque erreur), **Affichages** (3 ronds, un par affichage restant), bouton **Voir le chemin**, lien **Abandonner**.
- **Voir le chemin** : le chemin s'allume en jaune pendant 6 s ; le bouton affiche « Mémorise… 5 s » et une barre qui se vide. La grille est bloquée pendant ce temps. Ensuite : « À toi ! Touche le chemin en partant du haut » (« de la gauche » en paysage).
- Une bonne case devient verte, avec un son qui monte au fil du chemin. Une mauvaise case clignote en rouge, avec un son grave et une vibration : « Mauvaise case ! Encore 4 essais. ». Le joueur reste sur la case où il en était.
- **5e erreur** : « Plus d'essais ! Un nouveau chemin arrive… ». Après 1,5 s, la grille s'efface et un **nouveau chemin** est tiré (parcours 2, 3…), avec 5 essais et 3 affichages remis à neuf. Le bouton devient **Voir le nouveau chemin**. Les erreurs déjà faites comptent toujours dans le score.
- **Revoir (−8 pts)** : le bouton permet de réafficher le chemin, **3 affichages par parcours** (le premier compris). Le joueur garde les cases déjà trouvées. Sans affichage restant : « Plus d'affichage ».
- **Abandonner** : un premier clic transforme le lien en « Confirmer (score 0) » pendant 3,5 s ; un second clic termine la partie.
- La taille des cases est la plus grande qui fait tenir la grille dans l'écran (de 14 à 46 px), sans défilement, de l'iPhone SE à l'ordinateur. Elle se recalcule quand l'écran tourne ou change de taille.
- Au clavier : les flèches déplacent le focus sur la grille, Entrée ou Espace touche la case.
- Quitter l'écran (réglages) pendant un affichage termine l'affichage ; la partie reprend au retour.

## Score
- Sur 100 : **−6 points par erreur** (tous parcours confondus), **−8 points par affichage après le premier de chaque parcours**, au minimum 0. Abandonner donne 0.
- Bilan : ✓ « Bravo, chemin retracé ! » (ou ✕ « Partie abandonnée »), le score, les erreurs, les affichages et le nombre de parcours (s'il y en a eu plusieurs), « Nouveau record ! » ou le record, boutons **Accueil** et **Rejouer**.
- Le record ne compte que les parties réussies (à score égal, le moins d'erreurs l'emporte).

## Réglages
Règle du jeu, **Couper le son**, record et nombre de chemins réussis sur le nombre de parties, **Effacer mes scores** (confirmation en deux clics).

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:chemin:` (format version 1) : `best` (`{ score, errors, views, paths, date }`), `played`, `won`, `muted`. La partie en cours n'est pas enregistrée : recharger la page en commence une nouvelle.

## Navigation (URL)
`#/chemin` (partie) · `#/chemin/reglages`

## Différences avec le fichier d'origine
- Plus de « pont » vers une application native (messages `salle-des-lasers` envoyés à React Native, iOS, Android, Flutter) : Little Games est l'application hôte.
- Textes en « tu », comme les autres jeux ; le son se coupe depuis la barre du haut ou les réglages, et ce choix est mémorisé.

## Pistes pour la suite
Niveaux de difficulté (grille plus grande, affichage plus court), chemin du jour identique pour tous, mode multijoueur (même chemin sur plusieurs appareils, classement).
