# Morceaux : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
On montre au joueur une **bande** du visage d’une célébrité (yeux, nez ou bouche). À chaque indice, on **ajoute** une autre bande à la zone visible (union), jusqu’aux trois parties. Le visage complet n’apparaît que lorsqu’on a trouvé (ou demandé la solution).

## Catalogue
- `data/people.json` : liste de célébrités avec photo Commons et régions de découpe.
- Champs obligatoires : `id` (slug), `name`, `img` (URL `upload.wikimedia.org` à largeur 1200), `by` (auteur), `lic` (licence courte), `box` (régions `yeux`, `nez`, `bouche`, `complet` en `[x, y, w, h]` normalisés 0–1 ; `haut` / `bas` éventuels sont ignorés par le jeu).
- Champ optionnel : `alt` (autres réponses acceptées).
- Les photos ne sont **pas** dans le dépôt. Le script `scripts/celeb-quiz-builder.py` (MediaPipe) calcule les boîtes une fois et écrit le JSON.

## Écran de jeu
- De haut en bas : compteur et partie visible, cadre, ronds d'essais, ligne **‹ · Voir plus · ›**, champ « Qui est-ce ? » avec **Valider** (Entrée valide aussi).
- **Bande** (yeux, nez ou bouche) : sur **toute la largeur de l'écran** (520 px au plus), sans dépasser la hauteur disponible. Elle montre toute la largeur du visage, et la hauteur de la zone détectée.
- **Complet** : cadre **2:3** toujours de la même taille pour toutes les personnes (comme les affiches), visage recadré en *cover*.
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
  - *Photo entière floutée* : le cadre 2:3 montre toute la photo dès le début, très floutée et assombrie. Seule la zone visible (les bandes) est nette, à sa place sur le visage. Les bandes ajoutées s'élargissent avec une transition, et la photo devient nette à la résolution.
- Mélanger à nouveau.
- Effacer la progression (confirmation en deux clics).
- Lien vers la page **Crédits photo**.

## Crédits photo
Liste des photos du catalogue avec auteur et licence (obligation Commons / CC).

## Persistance (sur l’appareil)
`found`, `tries`, `given`, `stage` (palier atteint et séquence par personne), `current`, `seed`, `settings` (`view` : `bandes` ou `entiere`).

## Navigation (URL)
`#/morceaux` · `#/morceaux/personne/<id>` · `#/morceaux/credits` · `#/morceaux/reglages` · `#/morceaux/debug` (boîtes de détection)

## Pistes pour la suite
Filtres (genre, métier), plus de personnes, mode multijoueur (moins d’indices = plus de points).
