# 🏔️ Steep : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Une descente sans fin en planche. Le planchiste avance tout seul ; le joueur saute par-dessus les obstacles et les trous, et fait des saltos arrière pendant les sauts. La descente s'arrête à la première chute ; le score est la distance plus les points des figures et des pièces.

Demande de Yoann (17 novembre 2026) : un jeu dans le genre des descentes à une touche, avec plusieurs mondes, plusieurs décors et plusieurs variations de parcours, appelé « Steep ». C'est un **jeu original** : le personnage, les mondes, les décors et les noms ont été créés pour Little Games, sans reprendre ceux d'un jeu existant. Tout est dessiné en code (canvas), sans image ni son enregistré.

## Commandes
- **Toucher l'écran** (ou Espace, ↑, W, Z) : sauter. On peut encore sauter 0,12 s après avoir quitté le sol (bord d'une bosse).
- **Rester appuyé en l'air** : le planchiste tourne en salto arrière (7,6 rad/s, un tour en un peu plus de 0,8 s). Au relâchement, la rotation s'amortit et le corps se redresse doucement vers la pente d'arrivée (2,2 rad/s au plus).
- Échap ou P : pause. La descente se met en pause toute seule quand l'application passe en arrière-plan.

## Physique
- Repère : 10 unités = 1 mètre. Pesanteur 620 u/s², impulsion du saut 300 u/s perpendiculaire à la pente.
- Au sol, la vitesse suit la pente : accélération par la pesanteur, freinage proportionnel au carré de la vitesse (selon le frottement du monde), entre 150 u/s (le planchiste pousse toujours) et la vitesse maximale du monde.
- On décolle tout seul sur une bosse ou une lèvre de tremplin quand la courbure demande plus que la pesanteur, et au bord d'une falaise.
- **Réception** : la planche doit suivre la pente à 54° près, sinon chute. À moins de 16° après au moins 0,35 s en l'air : **réception parfaite**, +25 points et un coup d'accélérateur (0,6 s, ou 1,4 s après un salto).
- Un salto compte à partir de 300° de rotation.

## Mondes
| Monde | Planche | Obstacles | Trous | Particularités |
| --- | --- | --- | --- | --- |
| Les Cimes | snowboard | rochers | crevasses | neige qui tombe, sapins |
| Les Dunes | sandboard | cactus | ravins | sable soufflé, palmiers et cactus, plus de frottement (vitesse max 300) |
| La Forêt rousse | snowboard | troncs couchés | torrents | feuilles qui volent, bouleaux |
| Le Volcan | snowboard | blocs de basalte | coulées de lave (bouillonnantes) | cendres qui montent, fumerolles, crêtes rougeoyantes |
| La Banquise | snowboard | blocs de glace | failles | toujours de nuit (lune, étoiles, voiles lumineux), glace : moins de frottement, vitesse max 370 |

Chaque monde a ses couleurs (ciel, deux plans de montagnes en parallaxe, sol, liseré), son décor posé sur la pente (devant ou derrière le planchiste) et ses particules. Hors Banquise, un cycle jour → crépuscule → nuit → aube dure 140 s (étoiles et lune la nuit).

## Parcours
Chaque monde propose 3 parcours, avec un nom propre au monde (« La combe douce », « Les bosses du col », « Les crevasses » pour les Cimes…) :

| Type | Pente | Morceaux de terrain | Crevasses / falaises | Obstacles |
| --- | --- | --- | --- | --- |
| **Balade** (facile) | douce | surtout des lignes droites et des bosses | rares | peu |
| **Bosses** (figures) | moyenne | surtout des bosses et des tremplins | quelques-unes | moyen |
| **Abîmes** (difficile) | raide | lignes droites et tremplins | fréquentes | moyen |

- Le terrain est tiré au hasard à chaque descente (graine aléatoire), au fur et à mesure, et oublié derrière le joueur.
- Il est fait de **morceaux** continus, lissés (interpolation de Hermite) : ligne droite (avec un obstacle au milieu, parfois), 1 à 3 bosses, ou tremplin (creux, rampe, lèvre, puis pente de réception plus raide).
- Entre deux morceaux : une **crevasse** (60 à 150 unités de large, toujours franchissable à la vitesse minimale ; l'autre bord est plus bas) ou une **falaise** (marche de 50 à 160 unités vers le bas).
- La difficulté monte avec la distance : 40 % des probabilités d'obstacles au départ, 100 % à 2 km. Deux dangers sont toujours espacés (300 unités au moins). La descente commence par une longue pente tranquille.
- **Pièces** : en arc au-dessus des obstacles (elles montrent qu'il faut sauter), sur la trajectoire des tremplins, au-dessus des crevasses ou en ligne sur le sol.

## Chutes
Obstacle touché, chute dans un trou, saut trop court (on arrive sous le bord d'en face : « Saut trop court ! »), réception de travers. Le message dépend du monde (« Plouf dans la lave ! », « Aïe, le cactus ! »…). La planche glisse encore un instant, puis le bilan s'affiche.

## Score
- 1 point par mètre, 10 par pièce, 25 par réception parfaite.
- Salto : 100 points × (nombre de tours)², donc 400 pour un double ; multiplié par le **combo** (saltos enchaînés depuis le départ, jusqu'à ×5).
- Record par monde et par parcours.

## Écrans
- **Choix** : barre du haut (retour, « Steep », son, règles), les 5 mondes en vignettes (couleurs du monde), un **aperçu animé** du monde choisi (un planchiste automatique descend, saute et fait des saltos), puis les 3 parcours avec leur type et leur record (« Nouveau » sinon). Un parcours touché lance la descente. Téléphone couché : aperçu à gauche, mondes et parcours à droite.
- **Descente** : barre du haut (retour, monde · parcours, pause, son), puis la scène sur tout le reste de l'écran. En haut de la scène : distance, points, pièces. Les figures s'affichent au milieu (« Salto arrière · combo ×2  +200 », « Réception parfaite  +25 »).
  - Avant le départ, une carte rappelle le monde, le parcours, les commandes et le record : « Touche l'écran pour partir ».
  - Pause : Reprendre, Recommencer, Changer de parcours.
  - Fin : la cause de la chute, le score, « Nouveau record ! » ou le record, distance, saltos, pièces, réceptions parfaites, **Rejouer** (prend le focus) et **Changer de parcours**.
- **Règles et records** : règle du jeu, tableau des records (5 mondes × 3 parcours), statistiques (descentes, mètres parcourus), **Effacer mes records** (confirmation en deux clics).
- La vue s'adapte : on voit au moins une seconde de descente devant le planchiste, même sur un téléphone étroit. Tout tient dans l'écran sans défilement, de l'iPhone SE à l'ordinateur.

## Sons
Générés (aucun fichier) : saut, pièce, réception, salto, chute. Bouton son dans la barre du haut (choix mémorisé). Le téléphone vibre à la chute.

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:steep:` (format version 1) :
- `settings` : `{ world, course }` (dernier choix) ;
- `best` : `{ 'monde:parcours': { score, dist, flips, coins, date } }` ;
- `played` : nombre de descentes ; `totalM` : mètres parcourus au total ; `muted`.

## Navigation (URL)
`#/steep` (choix) · `#/steep/<monde>/<parcours>` (descente, par exemple `#/steep/volcan/abimes`) · `#/steep/reglages`

## Pistes pour la suite
Défi « Steep » dans Compète de zinzin (atteindre 300 m), descente du jour identique pour tous (graine = date), rails à glisser, nouvelles figures (salto avant, grab), personnages et planches à débloquer avec les pièces, mondes débloqués par objectifs, mode fantôme (rejouer contre son record).
