# 🎲 Compète de zinzin : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Un jeu de plateau entre équipes. À son tour, une équipe lance le dé, son pion avance, et la case où il s'arrête donne un **défi** tiré de l'un des autres jeux de l'application. **Tant que le défi n'est pas réussi, l'équipe reste sur la case** : à son tour suivant, elle retente un nouveau défi du même jeu au lieu de lancer le dé. **Pour gagner, il faut finir ses tours de plateau puis réussir, à l'arrivée, 2 défis à la suite, dans 2 jeux choisis par l'équipe** ; un seul raté et l'équipe revient à la case d'où elle venait.

On joue sur **un seul téléphone** (on se le passe) ou avec **un téléphone par équipe**. En multi, tout le monde voit en direct ce qui se passe sur le téléphone de l'équipe qui joue : le dé qui roule, le pion qui avance, le défi en cours (propositions tapées, cases touchées, point posé sur la carte).

## Place dans l'accueil
Toujours en **avant-dernière position**, juste avant la carte « Bientôt » (`last: true` dans `games/registry.js`, qui replace le jeu en dernier quel que soit l'ordre d'ajout des autres jeux).

## Plateau
- Un anneau de **28 cases** sur le bord d'une grille 6 × 10 en portrait (10 × 6 sur un écran plus large que haut). La case 0 est le **départ** (damier) ; on tourne dans le sens des aiguilles d'une montre.
- Les 27 autres cases prennent la **couleur et l'icône d'un jeu de l'application** (sauf celui-ci), dans la **proportion choisie pour chaque épreuve** (voir « Créer une partie »), et jamais deux fois le même jeu d'affilée quand c'est possible. Le plateau est tiré au hasard à chaque partie.
- Proportions : le nombre de cases de chaque jeu est proportionnel à son poids (méthode du plus fort reste sur 27 cases ; par exemple tout à « Normal » donne 5, 5, 5, 4, 4, 4). L'ordre est tiré au hasard, pondéré par les cases restantes ; un jeu qui occupe plus de la moitié des cases restantes passe en priorité pour ne pas finir collé.
- Un jeu ajouté plus tard à l'application apparaît sur le plateau dès qu'il a un défi dans `challenges.js` (`CHALLENGE_GAMES`).
- Les cases sont un peu plus hautes que larges (1,3 au plus) pour occuper tout l'écran.
- Les pions sont des ronds de la couleur de l'équipe, avec l'initiale de son nom. Plusieurs pions sur une case se décalent et rapetissent. Le pion de l'équipe dont c'est le tour est cerclé de blanc.
- Au centre : une seule ligne d'information (« À toi ! » sur son téléphone en multi, sinon « Au tour de <équipe> »), et en dessous le **dé** (il pulse quand on peut le lancer). Une équipe bloquée voit à la place l'icône du jeu de sa case et le bouton **Retenter**.

## Tour de jeu
1. L'équipe touche le dé. Le dé roule 0,9 s, puis le pion avance case par case (0,26 s par case), puis le défi s'ouvre 0,45 s plus tard. Ces durées sont calculées à partir de l'heure du lancer : tous les téléphones voient la même animation au même moment.
2. Case départ (après un tour complet) : pas de défi, on passe à l'équipe suivante.
3. Le défi occupe l'écran à la place du plateau, avec une barre de temps qui se vide. À la fin, un bandeau **Réussi !** (vert) ou **Raté !** (rouge, avec la réponse : « C'était Titanic » ; pour Géoquizz, l'écart total) reste affiché 4,5 s sur tous les écrans.
4. **Arrivée** (depuis la 1.42.0, à la demande de Yoann) : quand le pion atteint ou dépasse l'arrivée du dernier tour (la case départ), l'équipe **choisit un jeu** parmi ceux du plateau : au centre, une tuile par jeu (icône et nom), « Arrivée 1/2 : choisis ton jeu ». Le défi de ce jeu s'ouvre ; s'il est réussi, elle choisit un **second jeu, différent du premier** (sauf s'il n'y a qu'un jeu sur le plateau), « Arrivée 2/2 » dans l'en-tête du défi. Les autres téléphones voient « <équipe> choisit son jeu (1/2) ». Entre deux défis, la réponse reste affichée 4,5 s, puis le choix apparaît.
   - Les deux réussis : l'équipe gagne.
   - Un seul raté : l'équipe revient à la case où elle était avant ce lancer (déjà résolue, donc elle relancera le dé à son prochain tour), et c'est à l'équipe suivante. Elle devra refaire ses 2 défis à sa prochaine arrivée.
   - Une équipe qui quitte la partie pendant son choix revient aussi à sa case d'avant.
5. Équipe suivante, dans l'ordre ; une équipe absente est sautée.

## Les défis
| Case | Défi | Réussi si… | Temps |
| --- | --- | --- | --- |
| Affiche | Affiche floutée (16 px, puis 10 px après le 1er raté ; plus d'éclaircissement ensuite, depuis la 1.42.0 : à 5 px le titre se lisait trop souvent) : taper le titre | bon titre en 3 essais | 45 s |
| Visages | Photo très floutée et assombrie, **une seule bande nette** (yeux, nez ou bouche) ; à chaque raté, elle **change de place** sans s'ajouter à la précédente (depuis la 1.42.0), donc les trois parties sont vues une à une. Le visage est découpé en **trois tranches qui se touchent sans se chevaucher** : la limite yeux / nez est à mi-chemin entre le centre des yeux et celui du nez, la limite nez / bouche à mi-chemin entre le nez et la bouche ; les yeux montent au-dessus de leur centre de 1,3 fois cette demi-distance (sourcils), la bouche descend d'autant (menton). Une tranche ne montre donc jamais la partie voisine. | bon nom en 3 essais | 45 s |
| Livres | Couverture dessinée (titre, année) : taper l'auteur. Le titre est à la taille de la couverture : son mot le plus long tient sur une ligne, sans être coupé. Après 1 raté : la littérature ; après 2 : les initiales | bon auteur en 3 essais | 40 s |
| Géoquizz | **3 pays** à placer l'un après l'autre (« Place · pays 2/3 »), sur la même carte que le jeu Géoquizz (Mercator, terres et frontières lissées, répétée à gauche et à droite ; glisser, pincer, + / −). Le pays sous la souris (ou sous le doigt quand on touche) s'allume en rose. Après chaque point, le pays, l'écart et le total s'affichent 1,6 s (« +820 km · total 1 340 / 3 000 km »), puis le pays suivant arrive. Dès que le total dépasse 3 000 km, le défi est raté | **écart total ≤ 3 000 km** sur les 3 pays | 50 s |
| Le chemin | Grille 5 × 7 : un chemin s'allume 4 s, puis on le retrace case par case | chemin complet avec moins de 3 erreurs | 40 s |
| Nonogramme | Grille 5 × 5 à noircir d'après les indices (toucher ou glisser) | grille résolue | 90 s |

- Les réponses écrites suivent les règles de chaque jeu d'origine (fautes tolérées, nom de famille seul s'il est unique, nom d'un autre élément du catalogue refusé). Une réponse « presque juste » (« Tu chauffes ! », « Il manque le nom de famille. ») ne coûte pas d'essai.
- Les défis réutilisent les catalogues des autres jeux (films avec affiche TMDB, personnes de Morceaux à la tête droite, 300 livres, 89 pays faciles ; les 3 pays d'un défi sont différents). Un élément déjà sorti n'est pas reproposé dans la même partie. Si un catalogue n'a pas pu être chargé, la case donne un défi « Le chemin ».
- Le crédit de la photo (auteur · licence) s'affiche sous le visage à la fin du défi Visages.
- **Passer** : en haut à droite du défi, sur le téléphone de l'équipe qui joue. Quand on ne sait pas, on passe : le défi compte comme raté (l'équipe reste sur la case, ou revient en arrière à l'arrivée) et la réponse s'affiche.
- Temps écoulé : le défi est raté. C'est le téléphone de l'équipe qui le déclare ; à défaut, l'arbitre le déclare 4 s après le délai.

## Créer une partie
- Accueil du jeu : **Créer une partie**, **Rejoindre une partie**, et **Reprendre la partie** (avec « Abandonner la partie en cours », confirmation en deux touches) s'il y en a une. La version s'affiche en bas : en multi, tous les téléphones doivent avoir la même.
- Écran « Nouvelle partie » : le mode (**Un seul téléphone** / **Un téléphone par équipe**), le nombre d'**équipes** (2 à 6, en multi c'est le maximum accepté dans la salle d'attente), les noms des équipes (un seul téléphone seulement), le nombre de **tours de plateau** (1 à 3), les **épreuves du plateau** : une ligne par jeu avec – / + pour régler sa proportion, **Aucune** (0, le jeu n'est ni sur le plateau ni à l'arrivée), **Peu** (1), **Normal** (2, par défaut) ou **Beaucoup** (3), avec trois barres à la couleur du jeu et le nombre de cases qu'il aura (« Normal · 5 cases ») ; il reste toujours au moins une épreuve, et un jeu ajouté plus tard à l'application est à « Normal » d'office, puis **Lancer le jeu** ou **Créer la partie**. Les réglages sont mémorisés.

## Multi : un téléphone par équipe
- Le téléphone qui crée la partie est l'**arbitre** (équipe 1) : lui seul applique les actions et tire le dé et les défis ; il diffuse l'état complet après chaque changement. Les autres sont **invités** : ils envoient leurs actions et affichent l'état reçu.
- **Salle d'attente** : code à 5 chiffres en très grand (tiré avec `crypto.getRandomValues`), bouton **Partager** (partage natif avec le lien `#/zinzin/rejoindre/<code>`, ou copie du lien), champ « Nom de ton équipe », liste des équipes connectées en temps réel (« 2 / 4 »), et chez l'arbitre le bouton **Lancer** (actif à partir de 2 équipes). Chaque téléphone renomme sa propre équipe.
- **Rejoindre** : un seul champ, le code (clavier numérique, grande police), et **Rejoindre**. Messages : « Connexion à la partie… », « Partie introuvable, vérifie le code » (aucun état reçu en 8 s), « Partie complète », « La partie a déjà commencé ». Tant que l'arbitre n'a pas ajouté l'équipe, la demande est renvoyée toutes les 3 s (il était peut-être en veille).
- Pendant la partie, seul le téléphone de l'équipe dont c'est le tour peut lancer le dé et jouer le défi ; les autres le voient **en direct** (étiquette « En direct »), sans pouvoir toucher.
- En haut de l'écran : une pastille par équipe (pion, nom, barre de progression vers l'arrivée, tour « 2/3 » s'il y a plusieurs tours). L'équipe du tour est entourée de sa couleur, la sienne est soulignée, une équipe bloquée a une barre hachurée rouge, une équipe absente est estompée.
- Une pastille « reconnexion… » apparaît uniquement en cas de coupure. Reconnexion immédiate au retour au premier plan.
- Après une fermeture du navigateur, le téléphone retrouve sa partie et son équipe (code et identifiant de l'appareil sauvegardés). Quitter avant le lancement retire l'équipe ; après, elle est marquée absente et sautée, jusqu'à son retour.
- Fin : écran de victoire sur tous les téléphones (vainqueur, classement par avancement), **Rejouer** (arbitre, ou sur un seul téléphone : mêmes équipes, nouveau plateau) et **Retour à l'accueil**. Quand l'arbitre quitte, la partie se termine pour tous (« La partie est terminée. »).

## Réseau (sans serveur à nous)
- Relais MQTT publics et gratuits, en WebSocket, **deux à la fois** pour la fiabilité : `wss://broker.hivemq.com:8884/mqtt` et `wss://broker.emqx.io:8084/mqtt`. Chaque message est publié sur les deux ; les doublons sont éliminés (par `id` pour les actions, par `ts` pour l'état).
- Topics sous `zinzin/v1/<code>/` :
  - `state` : arbitre → tous, `{ G, ts, acks }`, QoS 1, **retenu** (un arrivant le reçoit tout de suite). Un message vide signifie que la partie est terminée.
  - `act` : invité → arbitre, `{ t, cid, id, … }`, QoS 1. Les actions sont renvoyées toutes les 3 s tant que l'arbitre ne les a pas confirmées (`acks`). L'arbitre garde sa session (les actions envoyées pendant sa veille lui sont remises).
- Les mises à jour en direct d'un défi sont regroupées (150 ms côté joueur, 120 ms côté arbitre).
- Horloge : les invités corrigent leur heure avec le plus petit écart observé entre leur horloge et l'heure (`ts`) des états reçus.
- Aucune donnée sensible : noms d'équipe, positions, propositions. Bibliothèque mqtt.js (MIT) livrée dans `vendor/`, chargée seulement en multi.
- Tests : un relais local remplace les relais publics avec la clé `little-games:zinzin:broker` (`"ws://localhost:8888"`).

## Architecture
- `logic.js` : état `G` sérialisable et `applyAction(G, action, env)`, sans DOM, testé (`tests/zinzin.test.js`). La même fonction sert sur un seul téléphone et chez l'arbitre. Actions : `join`, `name`, `leave`, `settings`, `start`, `roll`, `choose` (jeu choisi à l'arrivée), `retry`, `live`, `result`, `timeout`, `restart`.
- `index.js` : écrans ; toute interaction passe par `dispatch(action)` (appliquée en local sur un seul téléphone ou chez l'arbitre, envoyée à l'arbitre chez un invité) ; `render()` reconstruit l'écran à partir de `G` en gardant le focus.
- `challenges.js` : les six défis. Exception au contrat des jeux : il importe les **modules sans DOM** des autres jeux (règles de réponse, cadrage des visages, géométrie des pays, tirage des nonogrammes) et lit leurs catalogues.
- `net.js` : la liaison MQTT.

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:zinzin:` (format version 1) : `cid` (identifiant de l'appareil), `settings` (`mode`, `teams`, `laps`, `names`, `weights` : proportion de chaque épreuve, 0 à 3 ; l'ancien réglage `off` (jeux retirés) vaut 0), `myName`, `session` (`{ role: 'solo' | 'host' | 'guest', code }`), `solo` (partie sur un seul téléphone), `hostG` (partie de l'arbitre et dernières actions confirmées), `broker` (tests).

## Navigation (URL)
`#/zinzin` (accueil du jeu) · `#/zinzin/nouvelle` · `#/zinzin/rejoindre` · `#/zinzin/rejoindre/<code>` (lien partagé) · `#/zinzin/partie`

## Pistes pour la suite
Feuille « Équipes » détaillée, messagerie, sons, cases spéciales (reculer, rejouer, défi pour une équipe adverse), défis plus durs au fil des tours.
