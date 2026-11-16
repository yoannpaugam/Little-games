# ♀️ Pionnières : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Faire découvrir des femmes célèbres ou oubliées de l'histoire. On voit le **portrait** d'une femme, son nom, ses dates, sa nationalité et son domaine, et on devine son **accomplissement principal**.

Quatre réponses : **3 visibles** et une **carte mystère**, retournée. La bonne réponse est à une place tirée au hasard : **1 fois sur 4, elle est sous la carte mystère**. Si aucune réponse visible ne convainc, on choisit la carte mystère sans la voir.
- **Une seule tentative** par femme.
- Bonne réponse visible : **1 point**. Carte mystère et c'était la bonne : **2 points** (« Carte mystère gagnante ! »). Sinon 0.
- C'est la même règle que la carte cachée du jeu Chiens.

Demande de Yoann (16 novembre 2026) : « un jeu féministe, pour faire découvrir les femmes célèbres ou oubliées de l'histoire : 200 photos de femmes, on doit deviner leur accomplissement principal, 3 réponses visibles au choix et une cachée ». Il a choisi la règle de la carte mystère, les portraits par le script Wikidata, et « surtout des oubliées ».

## Catalogue
- `data/femmes.json` : **200 femmes**, de l'Antiquité (Hypatie) à aujourd'hui, dont **46 célèbres** (`famous`) et **154 oubliées** ou peu connues du grand public.
- Sources d'inspiration : *Savanturières. Une histoire naturelle au féminin* (Muséum national d'Histoire naturelle, 2025) pour les naturalistes et les savantes ; AWARE (Archives of Women Artists) pour les artistes ; les comptes « Les femmes de l'histoire » et « Parcours de pionnières » pour les premières femmes à…
- Champs : `id` (slug, stable), `name`, `born`, `died` (absent si elle est vivante), `from` (nationalité, au féminin), `domain`, `famous`, `answer` (l'accomplissement, 80 caractères au plus), `lures` (3 mauvaises réponses plausibles), `fact` (une phrase qui raconte son histoire, 200 caractères au plus), et, facultatifs, `qid` (identifiant Wikidata) ou `search` (nom à chercher) si la recherche du portrait se trompe.
- Domaines (`domain`) et nombre de femmes : Arts (35), Droits et politique (25), Sciences (24), Techniques et espace (22 : aviatrices, astronautes, informaticiennes, inventrices), Lettres (17), Sport (14), Médecine (14), Nature et Terre (14), Musique (10), Résistance (9), Cinéma et scène (6), Exploration (4), Entreprise et mode (6).
- Les leurres sont écrits à la main pour chaque femme : souvent l'exploit d'une autre femme, ou une invention proche, jamais vrai pour elle. La bonne réponse n'est pas systématiquement la plus longue (environ 1 fois sur 3).

## Portraits
- `data/photos.json` : `{ id: { qid, file, img, by, lic } }`. C'est l'image principale (P18) de la femme sur Wikidata : photo, tableau ou gravure de Wikimedia Commons, avec son auteur et sa licence. `img` est une vignette de 600 px de large sur `upload.wikimedia.org`. Aucune image n'est dans le dépôt.
- Il est rempli par `scripts/fetch-pionnieres-photos.mjs` (`npm run pionnieres:photos`), que lance le workflow GitHub **« Portraits (Pionnières) »** (onglet Actions → Run workflow). Le résultat arrive sur la branche `donnees/pionnieres-photos`, à fusionner par une pull request. Le script cherche le nom sur Wikidata (en français, puis en anglais) et garde la première personne, de préférence une femme, qui a une image.
- **Portrait mal trouvé** (homonyme) : ajouter `qid` ou `search` à la femme dans `femmes.json`, puis relancer le workflow avec « Tout refaire ».
- Sans photo, le portrait est **dessiné** : fond à la couleur du domaine, initiales et symbole ♀ (icône plate `venus`). Le jeu marche donc avant que les photos soient remplies.
- Le crédit (auteur · licence) s'affiche dans l'explication, et la galerie a une section **Crédits photo**.

## Écran de jeu
- De haut en bas : barre du haut (retour, « Pionnières », points, galerie, réglages), compteur « 12 / 200 » et étiquette du domaine, portrait 2:3 entre les flèches ‹ › (nom, dates et nationalité en bas du portrait), les 4 réponses, une ligne du bas.
- Réponses : A, B, C, puis la carte mystère (dos à rayures, « Carte mystère · Parfois la bonne réponse », pastille « 2 pts »). Au clavier : 1 à 4 ou A à D ; ← → changent de femme.
- Avant la réponse, la ligne du bas rappelle : « Qu'a-t-elle accompli ? La carte mystère cache parfois la bonne réponse : elle vaut 2 points. »
- Après la réponse : la carte mystère se retourne (0,9 s), la bonne réponse passe en vert, un mauvais choix en rouge. Puis, à la place des réponses : le verdict (« Bravo ! +1 », « Carte mystère gagnante ! +2 », « Raté ! », « Carte mystère ratée ! »), l'accomplissement, la phrase qui raconte son histoire, ce que cachait la carte mystère, et le crédit photo. La ligne du bas devient le bouton **Suivante**, qui prend le focus.
- La zone des réponses a une hauteur fixe : le portrait ne change pas de taille. Tout tient dans l'écran sans défilement, de l'iPhone SE à l'ordinateur. Téléphone en paysage : portrait à gauche, réponses à droite.
- Une femme déjà jouée montre directement l'explication.

## Ordre
- **Aléatoire** (par défaut) : mélange mémorisé ; les femmes célèbres sont réparties régulièrement parmi les oubliées (environ une sur quatre), pour qu'un visage connu revienne de temps en temps. La place des 4 réponses dépend de la femme et du mélange : elle ne change pas quand on revient sur une femme.
- **Par époque** : par année de naissance.
- **Mélanger à nouveau** change l'ordre et la place des réponses.

## Galerie
Icône grille : les 200 portraits dans l'ordre du jeu, 5 par ligne (4 sur téléphone), avec leur numéro et leur nom ; ✓ ou ✗ sur celles déjà jouées. La femme en cours est mise en évidence. Un clic ouvre la femme dans l'écran de jeu. En bas, section dépliable **Crédits photo**.

## Réglages
Règle du jeu, **Ordre** (aléatoire, par époque, mélanger à nouveau), progression (femmes découvertes, bonnes réponses, points) et **Effacer ma progression** (confirmation en deux clics), **Sources**.

## Compète de zinzin
Défi « Pionnières » (30 s) : portrait, nom et dates, 3 réponses et la carte mystère, une seule tentative. Voir `games/zinzin/SPEC.md`.

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:pionnieres:` (format version 1) : `settings` (`{ order }`), `seed`, `current`, `answers` (`{ id: { pick, ok, pts, at } }`, `pick` 3 = carte mystère).

## Navigation (URL)
`#/pionnieres` (jeu) · `#/pionnieres/femme/<id>` · `#/pionnieres/galerie` · `#/pionnieres/reglages`

## Pistes pour la suite
Filtres par domaine ou par siècle, parties de 10 avec record, mode inverse (un accomplissement, 4 portraits), plus de femmes, mode multijoueur.
