# 📣 Dans la rue : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Un jeu de frise chronologique sur les mouvements sociaux : grèves, révoltes, luttes étudiantes, antiracistes, féministes, écologistes, pacifistes… en France et dans le monde, depuis 1789. Une carte est déjà posée sur la frise. Pour chaque nouvel événement, on lit son résumé et on touche la période où il s'est passé : **avant**, **entre** ou **après** les cartes déjà posées. La frise se remplit et devient de plus en plus serrée, donc de plus en plus difficile.

Demande de Yoann (17 novembre 2026) : un jeu sur les mouvements sociaux en France ou dans le monde depuis une date choisie ; parmi les idées proposées, il a choisi la frise. L'événement est résumé, la frise est horizontale et défile, au-dessus de l'événement, avec un espace entre les deux ; les zones avant / entre / après sont en pointillés bien visibles.

## Catalogue
- `data/evenements.json` : **124 événements**, de 1789 à 2024, 58 en France et 66 dans le monde.
- Champs : `id` (slug, stable), `title` (60 caractères au plus), `year`, `scope` (`france` ou `monde`), `place` (lieu, 45 caractères au plus), `theme`, `summary` (100 à 330 caractères).
- **Le titre et le résumé ne contiennent aucune année** (vérifié par les tests) : ils ne doivent pas donner la réponse.
- Thèmes (`theme`) : Travail et grèves (24), Démocratie et libertés (21), Révoltes populaires (17), Étudiants et jeunesse (14), Égalité et antiracisme (13), Droits des femmes (10), Écologie (10), Paix et anti-guerre (8), Droits LGBT (4), Débats de société (3).
- Le catalogue décrit ce qui s'est passé (date, lieu, ampleur, résultat), sans juger qui avait raison, et couvre des mouvements de bords différents (Mai 68 et la manifestation gaulliste du 30 mai, la Manif pour tous et les marches pour le mariage pour tous, l'école libre, les Gilets jaunes…).
- Un événement qui dure plusieurs années est daté de son moment marquant (Larzac : l'annonce de l'extension du camp ; Notre-Dame-des-Landes : l'abandon de l'aéroport).

## Réglages de la partie
- **Terrain** : France et monde (par défaut), France, Monde.
- **Depuis** : 1789 (tout, par défaut), 1900, 1945, 1968, 1990, 2000.
- **Thèmes** : une case par thème (tous cochés par défaut), « Tout cocher », « Tout décocher » (aucun thème coché = tous).
- Le nombre d'événements qui correspondent s'affiche. Il en faut au moins **5** ; sinon le bouton est désactivé et le nombre est en rouge. Chaque combinaison terrain × période en a plus de 10.
- Les réglages s'appliquent à la partie suivante (**Nouvelle partie avec ces réglages**).

## Tirage
Une carte de départ (posée d'office) et **10 cartes** à placer (moins s'il y a moins de 11 événements), toutes différentes. Les événements jamais sortis passent d'abord : on fait le tour du catalogue avant de les revoir.

## Écran de jeu
- De haut en bas : barre du haut (retour, « Dans la rue », réglages), ligne « Carte 3 / 10 » et « ✓ 2 bien placées », **la frise**, un espace, **l'événement**, et un large bouton.
- **La frise** : horizontale, elle va d'un bord à l'autre de l'écran et défile au doigt. Un trait (l'axe du temps) passe derrière les cartes. Chaque carte posée montre l'année en grand et le titre ; un liseré en haut prend la couleur du thème.
- **Zones** : entre chaque carte, et avant la première et après la dernière, une zone en **pointillés épais et clairs** : « Avant 1936 », « Entre 1936 et 1968 », « Après 1968 » (« En 1968 aussi » entre deux cartes de la même année). La zone choisie passe en trait plein violet, fond violet et halo, et se centre dans la frise.
- **L'événement** : étiquette du thème, « France · Paris » ou « Monde · Chicago (États-Unis) », le titre en grand, puis le résumé. L'année n'est pas affichée. Si le texte est long, il défile dans la carte (l'écran, lui, ne défile pas).
- **Bouton** : « Touche une période » (désactivé) tant qu'aucune zone n'est choisie, puis **Placer ici**.
- Après le placement, la carte rejoint la frise **à sa vraie place**, avec une petite animation, cerclée de vert si elle était bien placée, de rouge sinon (vibration). L'événement affiche « ✓ Bien placé ! 1936 » ou « Raté ! C'était en 1936 ». Le bouton devient **Carte suivante** (au dernier : **Voir le score**).
- **Deux événements de la même année** se placent dans n'importe quel ordre : toute zone qui touche cette année est juste.
- Clavier : ← → choisissent la zone, Entrée place la carte ou passe à la suivante.
- La frise s'ouvre centrée sur la dernière carte ajoutée.
- Tout tient dans l'écran sans défilement vertical, de l'iPhone SE à l'ordinateur. Téléphone en paysage : la frise en haut, l'événement et le bouton côte à côte.

## Score
1 point par carte bien placée : score sur 10. Fin de partie : « Partie terminée », le score, le terrain et la période, « Nouveau record ! » ou le record, les boutons **Accueil**, **Réglages** et **Rejouer**, puis **Ta frise** : tous les événements de la partie dans l'ordre chronologique, avec ✓, ✗ ou • (carte de départ), l'année, le titre et le lieu.

## Réglages (page)
Règle du jeu, Terrain, Depuis, Thèmes, nombre d'événements, **Nouvelle partie avec ces réglages**, **Reprendre la partie en cours** (s'il y en a une), record et nombre de parties, **Effacer mes scores** (confirmation en deux clics).

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:rue:` (format version 1) :
- `settings` : `{ scope, since, themes }` (`themes` : `null` = tous) ;
- `game` : partie en cours `{ settings, start, cards: [ids], placed: [ids dans l'ordre de la frise], answers: [{ id, zone, ok }], counted, record }` ; on la reprend où on l'avait laissée ;
- `best` : `{ score, max, date }` ; `played` : nombre de parties terminées ;
- `seen` : événements déjà sortis.

## Navigation (URL)
`#/rue` (partie) · `#/rue/reglages`

## Pistes pour la suite
Défi « Dans la rue » dans Compète de zinzin (placer 3 cartes en 40 s), mode « banderole » (deviner le mouvement à partir d'un slogan), mode carte (placer l'événement sur la carte du monde, avec Géoquizz), mode « Qu'ont-ils obtenu ? », jeu en équipes sur un téléphone, plus d'événements.
