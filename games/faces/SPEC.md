# 👤 Visages : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Deviner une célébrité à partir d'une photo. On choisit d'abord l'un des deux modes :
- **Portraits** : le visage est masqué, seule une partie est visible au départ (les yeux par défaut). On dévoile les autres parties une par une.
- **Photos d'enfance** : la photo d'enfance (la plus jeune possible) est visible dès le début.

## Catalogue
- `data/celebs.json` contient 300 célébrités : 150 femmes et 150 hommes, nés entre 1881 et 2004. Ce sont des acteurs et actrices, des musiciens, des réalisateurs et des artistes, français et internationaux.
- Champs : `id` (slug du nom, stable), `name`, `job` (profession principale, accordée), `g` (`f`/`m`), `born`, `alt` (autres réponses acceptées : nom de scène, surnom…).
- **Photos** : aucune n'est livrée. Chaque joueur les importe depuis son appareil et elles restent sur l'appareil (IndexedDB). Une célébrité a au plus un portrait et une photo d'enfance.

## Import des photos
- Import multiple ou glisser-déposer. Le nom du fichier identifie la personne (« omar-sy.jpg »), avec une tolérance aux fautes. Si le nom contient « enfant », « child », « bébé », etc., la photo est rangée en photo d'enfance.
- Les fichiers non reconnus sont listés : on indique à la main de qui il s'agit (champ avec suggestions).
- La liste des 300 célébrités a une recherche et un filtre (toutes, à ajouter, ajoutées, à vérifier).
- On touche une case vide pour ajouter la photo d'une seule personne. Chaque ligne a des liens Wikipédia et Images pour trouver une photo.
- Les images sont réduites à 1100 px au plus. Une miniature est générée.

## Détection du visage
- Elle se fait une seule fois, à l'import, avec face-api (SSD MobileNet et 68 points de repère), embarqué dans `vendor/` et `models/`. Ces fichiers ne sont chargés qu'au premier import.
- Les zones sont des ellipses à bords flous :
  - Yeux (avec les sourcils)
  - Nez
  - Bouche
  - Oreilles (de part et d'autre de la mâchoire)
  - Front + cheveux (toute la bande au-dessus des sourcils)
- Sans visage détecté, des zones sont placées par défaut au centre et la photo est marquée « à vérifier ». **Placer à la main** demande deux touches : le milieu des yeux, puis le centre de la bouche. Les zones et le cadrage sont recalculés à partir de ces deux points.

## Cadre photo
- Format 2:3 et même taille que les affiches de cinéma, dans les deux modes. La photo est recadrée automatiquement autour du visage :
  - Portraits : le visage occupe environ 55 % de la largeur, les yeux sont à 42 % de la hauteur.
  - Enfance : 40 % de la largeur, les yeux à 40 % de la hauteur.

## Écran de jeu
- Tout tient dans l'écran, sans défilement. Sur un téléphone en paysage, la photo est à gauche et les commandes à droite.
- De haut en bas :
  - la photo
  - les pastilles des parties (Portraits seulement)
  - le champ « Qui est-ce ? » avec **Valider** (la touche Entrée valide aussi) et le message
  - la ligne ‹ · **Voir la bouche** (partie suivante) · **Passer** · ›
- Quand tout est dévoilé, le bouton devient **Solution**. En mode enfance, c'est toujours **Solution**.
- Mauvaise réponse : message rouge et le formulaire tremble. Réponse proche : « Tu chauffes ! » en orange, avec un indice (orthographe, prénom manquant, nom de famille manquant).
- Bonne réponse : le masque s'efface (animation) et on voit **Bravo !**, le nombre d'indices utilisés, le nom, la profession et l'année de naissance. **Suivant** passe à la prochaine célébrité non trouvée.
- Les célébrités trouvées le restent. Avec **Solution**, la réponse est montrée (« C'était… ») mais ne compte pas comme trouvée.
- Les flèches ← → du clavier naviguent entre les photos.

## Tolérance aux fautes
- On utilise `js/core/fuzzy.js`, comme pour les affiches.
- Réponses acceptées :
  - le nom complet
  - les alternatives
  - le nom de famille seul, s'il est unique dans le catalogue et fait au moins 4 lettres, **sans faute** (« Brel » n'est pas « Bruel »). Le nom de famille est le dernier mot, avec ses particules (« de Funès ») ; un prénom composé ne compte pas dedans (« Belmondo » suffit).
- Le nom exact d'une autre célébrité du catalogue est toujours refusé (« Dalida » n'est pas « Dua Lipa »).
- Le prénom seul donne l'indice « Il manque le nom de famille ».

## Réglages
- **Ordre de dévoilement** des 5 parties (↑ ↓). Chaque partie peut être désactivée, mais au moins une doit rester active. Par défaut : yeux, bouche, nez, oreilles, front + cheveux.
- Célébrités : tout le monde, femmes ou hommes.
- Mélanger à nouveau.
- Effacer la progression et supprimer toutes les photos, avec une confirmation en deux clics.

## Persistance (sur l'appareil)
- `localStorage` (préfixe `little-games:visages:`) :
  - `settings`
  - `seed`
  - `current` (célébrité en cours, par mode)
  - `found` (date et nombre d'indices)
  - `given` (solution affichée)
  - `rev` (parties dévoilées)
- IndexedDB `little-games-visages` : photo, miniature, zones, cadrage, et si la détection a été automatique ou faite à la main.

## Navigation (URL)
`#/visages` (choix du mode) · `#/visages/portraits/<id>` · `#/visages/enfance/<id>` · `#/visages/photos` · `#/visages/reglages`

## Pistes pour la suite
- Partager un pack de photos entre appareils
- Mode multijoueur avec des scores (moins d'indices = plus de points)
- Chronomètre
