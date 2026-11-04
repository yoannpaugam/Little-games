# Morceaux et Portraits de jeunesse : spécification

Ces deux modes font partie du jeu **Visages** (depuis la 1.16.0, Morceaux n'est plus un jeu à part). Ils utilisent des photos du catalogue, alors que les modes Portraits et Enfance de Visages utilisent les photos importées par le joueur. Le même moteur sert aux deux modes ; ce qui change est décrit dans la section « Portraits de jeunesse ».

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
On montre au joueur une **bande** du visage d’une célébrité (yeux, nez ou bouche). À chaque indice, on **ajoute** une autre bande à la zone visible (union), jusqu’aux trois parties. Le visage complet n’apparaît que lorsqu’on a trouvé (ou demandé la solution).

## Catalogue
- `data/people.json` : liste de célébrités avec photo Commons et régions de découpe.
- Champs obligatoires : `id` (slug), `name`, `img` (URL `upload.wikimedia.org` à largeur 1200), `by` (auteur), `lic` (licence courte), `box` (régions `yeux`, `nez`, `bouche`, `complet` en `[x, y, w, h]` normalisés 0–1 ; `haut` / `bas` éventuels sont ignorés par le jeu).
- Champ optionnel : `alt` (autres réponses acceptées).
- Les photos ne sont **pas** dans le dépôt. Le script `scripts/celeb-quiz-builder.py` (MediaPipe) calcule les boîtes une fois et écrit le JSON. Il écarte les visages trop petits, trop tournés et, depuis la 1.15.0, les **têtes trop penchées** (plus de 15° entre les coins des yeux, option `--max-roll`).
- **Têtes penchées** : le jeu estime aussi l'inclinaison de chaque photo du catalogue à partir des boîtes (décalage horizontal entre le centre des yeux et celui de la bouche). Au-delà de 15°, la personne n'est pas proposée (15 sur 300 aujourd'hui). La page debug affiche l'angle estimé et les personnes écartées.

## Écran de jeu
- De haut en bas : compteur et partie visible, cadre, ronds d'essais, ligne **‹ · Voir plus · ›**, champ « Qui est-ce ? » avec **Valider** (Entrée valide aussi).
- **Bande** (yeux, nez ou bouche) : sur **toute la largeur de l'écran** (520 px au plus), sans dépasser la hauteur disponible. Elle montre toute la largeur du visage, et la hauteur de la zone détectée.
- **Complet** : cadre **2:3** toujours de la même taille pour toutes les personnes (comme les affiches). C'est un **plan rapproché** : la boîte `complet` (le visage et ses marges) remplit le cadre dans un sens, en général la hauteur, et le reste est rogné. Le cadre ne sort jamais de la photo.
- Les flèches sont sous la photo : ‹ revient à la personne précédente, › passe à la suivante (il n'y a plus de bouton « Passer » ni « Précédent » séparé).
- **Essais** : 9 ronds sous le cadre. Tous les 3 essais ratés, on ajoute une bande. Au 9e, la réponse est donnée (« C’était… »), sans compter comme trouvée.
- Bouton **Voir plus**, entre les flèches : ajoute volontairement une bande. Au dernier palier (trois bandes), devient **Solution**. Il disparaît une fois la personne trouvée.
- Mauvaise réponse : message d’erreur (ou « Tu chauffes ! ») et tremblement du formulaire.
- Bonne réponse : cadrage sur le visage complet (avec transition), **Bravo !**, le nom, les crédits photo (`by` · `lic`). **Suivant** prend le focus.
- Ouverture d’une personne : la bande apparaît **déjà coupée**, sans transition (sinon l’image glisse et spoile).
- Les personnes trouvées le restent.
- Téléphone en paysage : cadre à gauche, commandes à droite.

## Séquences de révélation
Tirage aléatoire au début de chaque personne (mémorisé). Les paliers sont **cumulatifs** :
- 1 bande (`yeux` | `nez` | `bouche`)
- → cette bande **+** une des deux autres
- → les **trois** bandes (union verticale, pleine largeur du visage)
- → `complet` uniquement à la résolution (trouvé / solution / 9 essais)

## Tolérance aux fautes
Comme Visages : `fuzzy.js`, nom complet, alternatives, nom de famille seul s’il est unique (≥ 4 lettres, exact). Le nom exact d’une autre entrée du catalogue est refusé.

## Réglages
- **Affichage** :
  - *Bandes seules* (par défaut) : seule la bande est visible, comme décrit plus haut.
  - *Photo entière floutée* : le cadre 2:3 montre dès le début le même plan rapproché que le visage dévoilé, très floutée et assombrie. Seule la zone visible (les bandes) est nette, à sa place sur le visage. Les bandes ajoutées s'élargissent avec une transition, et la photo devient nette à la résolution.
- Mélanger à nouveau.
- Effacer la progression (confirmation en deux clics).
- Lien vers la page **Crédits photo**.

## Crédits photo
Liste des photos du catalogue avec auteur et licence (obligation Commons / CC).

## Persistance (sur l’appareil)
`found`, `tries`, `given`, `stage` (palier atteint et séquence par personne), `current`, `seed`, `settings` (`view` : `bandes` ou `entiere`).

## Portraits de jeunesse
- Catalogue `data/jeunesse.json`, même format que `people.json`, avec un champ facultatif `year` (année de la photo). Il est vide tant que la liste n'a pas été fournie.
- Il est construit par `scripts/celeb-quiz-builder.py --jeunesse` (`npm run jeunesse:build`), à partir d'une liste écrite à la main dans `scripts/jeunesse-seed.json` : `[{ "name": "…", "file": "fichier Commons", "year": 1975 }]`. Le nom doit être celui de `games/faces/data/celebs.json` : l'identifiant et les réponses acceptées sont alors repris de Visages. Le script ne cherche pas de photo de remplacement.
- Écran : la photo est visible en entier dès le début, dans le même cadre 2:3 en plan rapproché que le visage dévoilé de Morceaux. L'étiquette indique « photo de 1975 » (ou « photo de jeunesse »). Entre les flèches, le bouton est **Solution**. 9 essais, comme Morceaux, mais sans bande à ajouter.
- Bonne réponse : **Bravo !**, le nom, l'année de la photo et les crédits.
- Catalogue vide : un écran explique comment le remplir, avec un bouton de retour à Visages.
- Réglages : pas d'option d'affichage (elle ne sert qu'aux bandes).
- Stockage séparé : `jeunesse` (mêmes clés que `morceaux`).

## Navigation (URL)
`#/visages/morceaux` · `#/visages/morceaux/personne/<id>` · `…/credits` · `…/reglages` · `…/debug` (boîtes de détection), et la même chose sous `#/visages/jeunesse`. Les anciens liens `#/morceaux/…` redirigent vers `#/visages/morceaux/…`.

## Pistes pour la suite
Filtres (genre, métier), plus de personnes, mode multijoueur (moins d’indices = plus de points).
