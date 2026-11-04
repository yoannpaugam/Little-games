# 🎬 Affiches de cinéma : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
On montre au joueur l'affiche **floutée** d'un film célèbre, et il doit retrouver son titre.

## Catalogue
- `data/films.json` contient 460 films sortis entre 1986 et 2025 : les grands succès, des films d'auteur, de l'animation et des films indépendants parmi les plus connus.
- Champs : `id` (unique, stable), `title` (titre français), `original` (titre original s'il est différent), `alt` (autres réponses acceptées), `year`, `director`.
- Affiches : format 2:3, toutes affichées à la même taille (recadrage *cover* centré en haut). Source : TMDB (`data/posters.json` : `{ id: { tmdbId, tmdb: "/chemin.jpg", file?: "posters/id.jpg" } }`).

## Écran de jeu
- Affiche floutée, avec en dessous un champ « Titre du film » et un bouton **Valider** (la touche Entrée valide aussi).
- Flèches **précédent / suivant** et bouton **Passer** : on peut naviguer sans répondre. Les flèches du clavier ← → marchent aussi.
- Mauvaise réponse : un message d'erreur s'affiche (en rouge ; en orange « Tu chauffes ! » si la réponse est proche) et le formulaire tremble.
- **Essais** : sous l'affiche, 12 petits ronds se remplissent en rouge à chaque proposition fausse (groupés par 3). Tous les 3 essais, le flou diminue : 70 % du flou de départ après 3 essais, 45 % après 6, 25 % après 9 (« Raté ! L'affiche devient plus nette. »). Au 12e essai, la réponse est donnée (« C'était… »), sans compter comme trouvée. Les essais sont mémorisés par film.
- Bonne réponse : l'affiche se défloute (animation) et on voit **Bravo !**, le titre, puis sur une ligne le titre original, l'**année** et le **réalisateur**. Ce panneau a la même hauteur que le formulaire : l'affiche ne change pas de taille. Un bouton **Suivant** prend le focus.
- Sur un téléphone en paysage, l'affiche est à gauche et les commandes à droite (comme Visages).
- Les films trouvés le restent : en revenant dessus, on voit l'affiche nette et les informations.

## Tolérance aux fautes
- On normalise : minuscules, sans accents ni ponctuation, « & » → « et », article initial ignoré (le, la, les, l', the, a…), chiffres romains et nombres écrits en toutes lettres → chiffres.
- Distance de Damerau-Levenshtein (une inversion de deux lettres compte pour une faute), calculée sans les espaces. Fautes tolérées selon la longueur de la réponse attendue : ≤3 lettres → 0, ≤6 → 1, ≤12 → 2, ≤20 → 3, au-delà → 18 % de la longueur.
- Les numéros doivent être exacts : « Toy Story » ≠ « Toy Story 2 ».
- Réponses acceptées : titre français, titre original, alternatives, partie avant « : » si elle ne désigne qu'un seul film (et n'est pas le début du titre d'un autre film), partie après « : » (au moins 6 lettres, sauf mentions génériques comme « Volume 1 » ou « Deuxième partie »).
- Le titre exact d'un autre film du catalogue est toujours refusé (« Titane » n'est pas « Titanic »).
- Affiches cherchées en direct : un film introuvable est réessayé au bout de 3 jours (ou tout de suite après l'ajout d'une clé TMDB). L'affiche de l'écran de jeu passe avant celles de la grille.

## Réglages
- **Ordre** :
  - *Aléatoire* (par défaut) : le mélange est mémorisé et peut être refait. L'année reste cachée jusqu'à la bonne réponse.
  - *Chronologique* : par année de sortie, puis par titre. L'**année est affichée au-dessus de l'affiche**.
- **Intensité du flou** : léger, moyen ou fort.
- **Clé TMDB** (optionnelle) et langue des affiches (française ou originale).
- **Effacer la progression**, avec une confirmation en deux clics.

## Grille de toutes les affiches
- On l'ouvre en cliquant sur l'**année** au-dessus de l'affiche, ou avec l'icône grille de la barre du haut.
- **5 affiches par ligne**, triées par année de sortie. Chaque affiche est accompagnée de son année et, si le film a été trouvé, de son titre.
- Une affiche est nette si le film a été trouvé, floutée sinon.
- La grille s'ouvre positionnée sur l'année cliquée, dont les affiches sont mises en évidence. Un sélecteur « Aller à… » permet de sauter à une autre année.
- Un clic sur une affiche ouvre ce film dans l'écran de jeu.

## Persistance (sur l'appareil)
`found` (films trouvés, avec la date), `tries` (essais par film), `given` (réponse donnée après 12 essais), `current` (film en cours), `seed` (mélange), `settings`, et le cache des affiches résolues.

## Navigation (URL)
`#/affiches` (jeu) · `#/affiches/film/<id>` · `#/affiches/grille/<année>` · `#/affiches/reglages`

## Pistes pour la suite
Mode multijoueur (plusieurs appareils, scores), indices (réalisateur, année), chronomètre, défloutage progressif.
