# 📚 Livres : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
On montre au joueur la **couverture** d'un grand livre de la littérature (titre français et année de première publication), et il doit retrouver son **auteur**. Il a **3 essais**.

## Catalogue
- `data/livres.json` contient 300 livres et leurs 246 auteurs : classiques et succès, du Moyen Âge (1320) à aujourd'hui, de toutes les littératures (française, anglaise, américaine, russe, allemande, italienne, espagnole, latino-américaine, africaine, asiatique…). Les titres sont ceux des éditions françaises.
- `authors` : `id` (slug, stable), `name` (nom usuel en français : « Léon Tolstoï », « Molière »), `alt` (autres réponses acceptées : vrai nom, pseudonyme, autre transcription), `from` (littérature, accordée au féminin : « française », « russe », « franco-libanaise »).
- `books` : `id` (slug du titre, stable), `title`, `author` (identifiant de l'auteur), `year`.
- Il n'y a **aucune image** : la couverture est dessinée (couleur choisie d'après l'identifiant du livre, cadre, titre, année). Elle est au format 2:3 et à la même taille que les affiches de cinéma. La taille du titre s'adapte à sa longueur et à son mot le plus long.

## Écran de jeu
- De haut en bas : compteur et « Qui a écrit ce livre ? », couverture entre les flèches ‹ ›, 3 ronds d'essais, champ « Nom de l'auteur » avec **Valider** (Entrée valide aussi), boutons **Précédent** / **Passer** (masqués sur téléphone, où les flèches sont posées sur la couverture). Les flèches ← → du clavier marchent aussi.
- Sur la couverture, à la place de l'auteur : « Auteur ? ».
- **Essais** : chaque proposition fausse remplit un rond en rouge et le formulaire tremble.
  - après le 1er raté, la couverture affiche la littérature (« Littérature russe ») ;
  - après le 2e, elle affiche aussi les initiales (« L. T. ») : « Dernier essai ! Voici ses initiales. » ;
  - au 3e, la réponse est donnée (« C'était… »), sans compter comme trouvée.
- **Presque juste** (« Tu chauffes ! », en orange) : ne coûte pas d'essai. Indices : « Il manque le nom de famille. » (prénom seul), « Précise le prénom. » (Brontë), « Vérifie l'orthographe. ».
- Bonne réponse : **Bravo !**, le nom de l'auteur (qui s'écrit aussi sur la couverture), puis sur une ligne le titre, l'année et la littérature. Ce panneau a la même hauteur que le formulaire : la couverture ne change pas de taille. **Suivant** prend le focus.
- Les livres trouvés le restent ; les essais sont mémorisés par livre.
- Tout tient dans l'écran sans défilement. Téléphone en paysage : couverture à gauche, commandes à droite.

## Réponses acceptées
- On utilise `js/core/fuzzy.js` : nom complet ou alternative, avec la tolérance aux fautes habituelle.
- **Le nom de famille seul suffit**, s'il ne désigne qu'un auteur du catalogue et fait au moins 4 lettres. Les particules sont facultatives (« Beauvoir » ou « de Beauvoir », « Saint-Exupéry », « Le Guin », « La Fontaine »).
- Fautes tolérées sur le nom de famille seul : aucune jusqu'à 5 lettres, une jusqu'à 9 (« Hemmingway »), deux au-delà (« Dostoievsky »), sauf si un autre auteur est aussi proche.
- Le nom exact d'un autre auteur est toujours refusé (« Charlotte Brontë » pour *Les Hauts de Hurlevent*, « Kafka » pour *Kafka sur le rivage*).

## Bibliothèque
- Icône grille de la barre du haut : les 300 couvertures, 5 par ligne, du plus ancien au plus récent.
- Un livre trouvé ou donné montre son auteur sur la couverture et en dessous. Le livre en cours est mis en évidence.
- Un clic ouvre le livre dans l'écran de jeu.

## Réglages
- Rappel de la règle.
- **Ordre** : aléatoire (par défaut, mélange mémorisé, « Mélanger à nouveau ») ou chronologique.
- **Effacer la progression**, avec une confirmation en deux clics.

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:livres:` (format version 1) : `settings` (`order`), `seed`, `current`, `found` (date), `tries` (essais ratés par livre), `given` (réponse donnée après 3 essais).

## Navigation (URL)
`#/livres` (jeu) · `#/livres/livre/<id>` · `#/livres/bibliotheque` · `#/livres/reglages`

## Pistes pour la suite
Mode inverse (retrouver un titre à partir de l'auteur), première phrase du livre comme indice, filtres par littérature ou par siècle, mode multijoueur.
