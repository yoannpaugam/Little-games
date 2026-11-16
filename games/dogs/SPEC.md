# 🐕 Chiens : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
On montre la photo d'un chien, et il faut trouver sa **race**. Quatre réponses sont proposées : **3 visibles** et une **4e cachée** (carte face retournée). La bonne réponse est à une place tirée au hasard : **1 fois sur 4, c'est la carte cachée**.

- On a **une seule réponse** par chien.
- Bonne réponse visible : **1 point**.
- Si l'on pense que la race n'est pas parmi les 3, on tente la carte cachée, sans la voir : si c'est la bonne, **2 points** (« Poker gagnant ! »), sinon 0.
- Une partie compte **10 chiens**. Le score maximal dépend des cartes cachées : 10 + 1 par chien dont la réponse était cachée.

Demande de Yoann (16 novembre 2026) : « une photo d'un chien, il faut trouver la race, 3 réponses au choix plus une 4e cachée, une centaine de races ». La règle de la carte cachée (parfois la bonne, et 2 points) est une interprétation de Claude, à confirmer.

## Catalogue
- `data/chiens.json` : **110 races**, de toutes les familles. Champs : `id` (slug, stable), `name` (nom français usuel), `wiki` (titre de l'article Wikipédia en anglais), `group` (famille), `origin` (pays ou région d'origine), et `file` (facultatif : fichier Wikimedia Commons à utiliser à la place de l'image de l'article).
- Familles (`group`) : chiens de berger (18), de montagne (7), molosses (13), terriers (13), chiens de chasse (15), rapporteurs et chiens d'eau (8), spitz et chiens nordiques (10), lévriers (7), chiens de compagnie (19).

## Photos
- `data/photos.json` : `{ id: { img, thumb, file, by, lic } }`. C'est l'image principale de l'article Wikipédia (anglais) de la race, une image libre de Wikimedia Commons, avec son auteur et sa licence. `img` fait 960 px de large, `thumb` 330 px (tailles standard de Wikimedia).
- Il est rempli par `scripts/fetch-dog-photos.mjs`, lancé par le workflow GitHub « Chiens : photos » : tout seul quand le catalogue change sur une branche `jeu/chiens-*` ou `outils/chiens-*`, ou à la main depuis l'onglet Actions (option « tout rechercher »). Le résultat est enregistré sur la même branche.
- Une race absente de `photos.json` est cherchée en direct sur Wikipédia depuis l'appareil (même code, `wiki.js`), puis gardée sur l'appareil. Une race introuvable est retentée au bout de 3 jours. Une race sans photo n'est pas proposée (elle peut encore servir de mauvaise réponse).
- **Remplacer une photo** : ajouter `"file": "Nom du fichier.jpg"` (fichier Commons) à la race dans `chiens.json`, puis pousser sur une branche `outils/chiens-…` : le workflow met `photos.json` à jour.
- La photo est affichée **en entier** dans le cadre 2:3 (même taille que les affiches), sur un fond fait de la même photo floutée et assombrie. Le crédit (auteur · licence · Wikimedia Commons) s'affiche sous la photo après la réponse.

## Mauvaises réponses (niveaux)
Les 3 autres réponses sont des races tirées au hasard, selon le niveau :
- **Facile** : aucune de la même famille que la bonne réponse ;
- **Normal** (par défaut) : une de la même famille, deux d'autres familles ;
- **Difficile** : les trois de la même famille.

## Tirage des parties
10 races différentes, parmi celles qui ont une photo. On évite les races déjà sorties dans les parties précédentes : on fait le tour des 110 races avant d'en revoir une.

## Écran de jeu
- De haut en bas : barre du haut (retour, « Chiens », score de la partie, grille des races, réglages), « Chien 3 / 10 · Quelle est cette race ? », photo, ligne du crédit, les 4 cartes en 2 × 2, et une ligne du bas.
- La carte cachée a un dos à rayures, un « ? » et la mention « 2 pts ». Les touches 1 à 4 choisissent une carte au clavier.
- Avant la réponse, la ligne du bas rappelle : « La 4e carte est cachée : parfois, c'est la bonne. Elle vaut 2 points. »
- Après la réponse : la carte cachée se retourne (animation), la bonne réponse passe en vert, un mauvais choix en rouge (il tremble, le téléphone vibre), les autres s'estompent. La ligne du bas donne le verdict (« Bravo ! +1 », « Poker gagnant ! +2 », « Raté ! », « Carte cachée ratée ! »), la famille et l'origine, puis le nom de la race, et le bouton **Suivant** (au dernier : **Voir le score**), qui prend le focus. La ligne du bas a une hauteur fixe : la photo ne change pas de taille.
- La photo du chien suivant est chargée à l'avance.
- Tout tient dans l'écran sans défilement, de l'iPhone SE à l'ordinateur. Téléphone en paysage : photo à gauche, cartes à droite.
- La partie en cours est enregistrée : on la reprend où on l'avait laissée.

## Fin de partie
« Partie terminée », le score sur le maximum, le nombre de races trouvées et le niveau, « Nouveau record ! » ou le record, les boutons **Accueil** et **Rejouer**, puis les 10 chiens : ✓ et les points gagnés, ou ✗ et la réponse donnée (barrée).

## Toutes les races
Icône grille de la barre du haut : les 110 races par famille, 5 par ligne (3 sur téléphone), avec photo, nom et origine. En bas, une section dépliable **Crédits photo** (race, auteur, licence et fichier Commons).

## Réglages
Règle du jeu, **Niveau** (Facile, Normal, Difficile : il s'applique à la partie suivante), record et nombre de parties, **Effacer mes scores** (confirmation en deux clics), **Recommencer une partie** si une partie est en cours.

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:chiens:` (format version 1) :
- `settings` : `{ level }` ;
- `game` : partie en cours `{ level, qs: [{ id, options: [4 ids] }], answers: [{ choice, pts }], counted, record }` (la 4e option est la carte cachée) ;
- `best` : `{ score, max, date }` ; `played` : nombre de parties terminées ;
- `seen` : races déjà sorties ;
- `photos` : photos cherchées en direct (`{ id: photo }` ou `{ id: { miss: date } }`).

## Navigation (URL)
`#/chiens` (partie) · `#/chiens/races` · `#/chiens/reglages`

## Pistes pour la suite
Défi « Chiens » dans Compète de zinzin, plus de races, mode inverse (une race, 4 photos), chronomètre, mode multijoueur.
