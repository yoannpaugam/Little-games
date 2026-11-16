# ♀️ Pionnières : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Faire découvrir des femmes célèbres ou oubliées de l'histoire. On voit le **portrait** d'une femme, son nom, ses dates, sa nationalité et son domaine, et on devine son **accomplissement principal**.

Un **QCM à 4 réponses visibles**, la bonne à une place tirée au hasard, **une seule tentative** par femme. Il n'y a **pas de points** (depuis la 1.47.0) : le but est de découvrir. Après la réponse, une **carte biographie** présente la femme.
- Les femmes **révélées** (déjà jouées) sont gardées en mémoire : en revenant sur elles, on voit directement leur carte. **Recommencer à zéro** (réglages) les cache toutes à nouveau.

Demande de Yoann (16 novembre 2026) : « un jeu féministe, pour faire découvrir les femmes célèbres ou oubliées de l'histoire : 200 photos de femmes, on doit deviner leur accomplissement principal, 3 réponses visibles au choix et une cachée ». Il a choisi les portraits par le script Wikidata et « surtout des oubliées ». La 1.44.0 avait une 4e réponse cachée (« carte mystère », la bonne 1 fois sur 4, 2 points) ; à la demande de Yoann, la 1.46.0 la retire : les 4 réponses sont visibles. En 1.47.0, toujours à sa demande : plus de points ni de ligne d'aide en bas, une carte biographie plus complète après la réponse, et les flèches précédente / suivante partout, comme dans Affiche.

## Catalogue
- `data/femmes.json` : **200 femmes**, de l'Antiquité (Hypatie) à aujourd'hui, dont **46 célèbres** (`famous`) et **154 oubliées** ou peu connues du grand public.
- Sources d'inspiration : *Savanturières. Une histoire naturelle au féminin* (Muséum national d'Histoire naturelle, 2025) pour les naturalistes et les savantes ; AWARE (Archives of Women Artists) pour les artistes ; les comptes « Les femmes de l'histoire » et « Parcours de pionnières » pour les premières femmes à…
- Champs : `id` (slug, stable), `name`, `born`, `died` (absent si elle est vivante), `from` (nationalité, au féminin), `domain`, `famous`, `answer` (l'accomplissement, 80 caractères au plus), `lures` (3 mauvaises réponses plausibles), `fact` (une anecdote, « Le saviez-vous ? », 200 caractères au plus), `bio` (biographie de 2 ou 3 phrases, 120 à 600 caractères), et, facultatifs, `qid` (identifiant Wikidata) ou `search` (nom à chercher) si la recherche du portrait se trompe.
- Domaines (`domain`) et nombre de femmes : Arts (35), Droits et politique (25), Sciences (24), Techniques et espace (22 : aviatrices, astronautes, informaticiennes, inventrices), Lettres (17), Sport (14), Médecine (14), Nature et Terre (14), Musique (10), Résistance (9), Cinéma et scène (6), Exploration (4), Entreprise et mode (6).
- Les leurres sont écrits à la main pour chaque femme : souvent l'exploit d'une autre femme, ou une invention proche, jamais vrai pour elle. La bonne réponse n'est pas systématiquement la plus longue (environ 1 fois sur 3).

## Portraits
- **Photos fournies par Yoann** (zips du 16 novembre 2026 : 192 portraits en 1.49.0, puis 16 nouveaux ou remplacés en 1.50.0) : les **200** portraits dans `photos/<id>.jpg`, tous au même format, **600 × 900 px** (2:3), JPEG. Ils ont été recadrés sur le visage (détection automatique, réglée à la main pour quelques photos) et redimensionnés. Dans `data/photos.json`, leur entrée est `{ "img": "photos/<id>.jpg" }`, sans crédit pour l'instant : Yoann ajoutera auteur et licence plus tard (`by`, `lic`) ; sans crédit, aucune ligne de crédit n'est affichée. Le script Wikidata ne remplace jamais ces photos.
- Depuis la 1.50.0, toutes les femmes ont une photo. Le portrait dessiné ne sert plus qu'en secours, si une image ne se charge pas.
- `data/photos.json` peut aussi contenir des portraits Wikimedia : `{ id: { qid, file, img, by, lic } }`. C'est l'image principale (P18) de la femme sur Wikidata : photo, tableau ou gravure de Wikimedia Commons, avec son auteur et sa licence. `img` est une vignette de 600 px de large sur `upload.wikimedia.org`. Aucune image n'est dans le dépôt.
- Il est rempli par `scripts/fetch-pionnieres-photos.mjs` (`npm run pionnieres:photos`), que lance le workflow GitHub **« Portraits (Pionnières) »** (onglet Actions → Run workflow). Le résultat arrive sur la branche `donnees/pionnieres-photos`, à fusionner par une pull request. Le script cherche le nom sur Wikidata (en français, puis en anglais) et garde la première personne, de préférence une femme, qui a une image.
- **Portrait mal trouvé** (homonyme) : ajouter `qid` ou `search` à la femme dans `femmes.json`, puis relancer le workflow avec « Tout refaire ».
- Sans photo, le portrait est **dessiné** : fond à la couleur du domaine, initiales et symbole ♀ (icône plate `venus`). Le jeu marche donc avant que les photos soient remplies.
- Le crédit (auteur · licence), quand il existe, s'affiche sur la carte biographie, et la galerie a une section **Crédits photo**.

## Écran de jeu
- **Question** : barre du haut (retour, « Pionnières », galerie, réglages), compteur « 12 / 200 » et étiquette du domaine, portrait 2:3 entre les flèches ‹ › (nom, dates et nationalité en bas du portrait), puis les 4 réponses A, B, C, D l'une sous l'autre. Pas de texte d'aide en bas.
- Après le choix : la bonne réponse passe en vert, un mauvais choix en rouge, pendant 2,5 s (le temps de voir la bonne réponse), puis la **carte biographie** remplace le portrait et les réponses.
- **Carte biographie** : en haut, petit portrait, nom, dates et nationalité ; puis le verdict (« Bonne réponse » ou « Ce n'était pas ça », et la réponse donnée si elle était fausse), l'accomplissement, la biographie (`bio`), un encadré « Le saviez-vous ? » (`fact`) et le crédit du portrait. Le texte défile dans la carte si besoin (l'écran, lui, ne défile pas). En bas de la carte : ‹, **Suivante** (qui prend le focus) et ›. Téléphone en paysage : identité à gauche, texte à droite.
- **Navigation** : flèches ‹ › autour du portrait et sur la carte, touches ← →, ou glissement du doigt vers la gauche ou la droite. Au clavier, 1 à 4 ou A à D choisissent une réponse.
- Tout tient dans l'écran sans défilement, de l'iPhone SE à l'ordinateur. Téléphone en paysage : portrait à gauche, réponses à droite.

## Ordre
- **Aléatoire** (par défaut) : mélange mémorisé ; les femmes célèbres sont réparties régulièrement parmi les oubliées (environ une sur quatre), pour qu'un visage connu revienne de temps en temps. La place des 4 réponses dépend de la femme et du mélange : elle ne change pas quand on revient sur une femme.
- **Par époque** : par année de naissance.
- **Mélanger à nouveau** change l'ordre et la place des réponses.

## Galerie
Icône grille : les 200 portraits dans l'ordre du jeu, 5 par ligne (4 sur téléphone), avec leur numéro et leur nom ; les femmes révélées sont cerclées de blanc. La femme en cours est mise en évidence. Un clic ouvre la femme dans l'écran de jeu. En bas, section dépliable **Crédits photo**.

## Réglages
Règle du jeu, **Ordre** (aléatoire, par époque, mélanger à nouveau), **Personnes révélées** (nombre sur 200) et **Recommencer à zéro**, qui les cache toutes à nouveau (confirmation en deux clics), **Sources**.

## Compète de zinzin
Défi « Pionnières » (30 s) : portrait, nom et dates, 4 réponses visibles, une seule tentative. Voir `games/zinzin/SPEC.md`.

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:pionnieres:` (format version 1) : `settings` (`{ order }`), `seed`, `current`, `answers` : femmes révélées (`{ id: { pick, ok, at } }` ; les réponses de la 1.44.0 ont aussi `pts`, ignoré).

## Navigation (URL)
`#/pionnieres` (jeu) · `#/pionnieres/femme/<id>` · `#/pionnieres/galerie` · `#/pionnieres/reglages`

## Pistes pour la suite
Filtres par domaine ou par siècle, parties de 10 avec record, mode inverse (un accomplissement, 4 portraits), plus de femmes, mode multijoueur.
