# 🕵️ Portrait-robot : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Un témoin décrit un suspect, et on compose son portrait-robot pièce par pièce. La description peut être physique (« une grande barbe, des anneaux aux oreilles ») ou seulement une impression (« un vrai bourgeois, une tête à jouer à la pétanque le dimanche »). On cherche à s'en rapprocher le plus possible… ou on fait un visage complètement farfelu : c'est aussi le jeu.

Demande de Yoann (17 novembre 2026) : choisir les yeux parmi une dizaine de propositions, et ainsi de suite pour les cheveux, les sourcils, les oreilles, les caractéristiques du visage, la forme de la tête, le nez, la bouche, la couleur des yeux et des cheveux et sourcils, et les accessoires (boucles d'oreilles, maquillage, chapeau, lunettes…).

## Les pièces du visage
16 parties, chacune avec 8 à 14 propositions, toutes dessinées (aucune photo, aucune image externe) :

| Partie | Propositions |
| --- | --- |
| Tête | ovale, ronde, carrée, allongée, en poire, en cœur, en losange, fine, large, en œuf |
| Teint | porcelaine, clair, rosé, mat, bronzé, olive, brun, foncé, ébène, coup de soleil, vert nauséeux |
| Cheveux | chauve, rasés, dégarni, courts, raie sur le côté, en brosse, au bol, afro, mi-longs, longs, chignon, crête, mulet, banane |
| Couleur des cheveux (et des sourcils, de la barbe) | noirs, bruns, châtains, roux, blonds, platine, poivre et sel, blancs, roses, bleus |
| Sourcils | fins, épais, droits, arqués, froncés, étonnés, monosourcil, broussailleux, tristes, rasés |
| Yeux | en amande, ronds, petits, endormis, rieurs, tombants, de chat, écarquillés, qui louchent, plissés |
| Couleur des yeux | marron, noisette, verts, bleus, gris, noirs, ambre, bleu glacier, violets, vairons |
| Nez | petit, droit, long, aquilin, retroussé, large, pointu, en patate, de boxeur, nez rouge |
| Bouche | neutre, souriante, grand sourire, moue, pulpeuse, fine, sourire en coin, bouche bée, dents du bonheur, grimace, triste |
| Oreilles | normales, petites, grandes, décollées, très décollées, pointues, grands lobes, en chou-fleur, rondes, une seule décollée |
| Barbe et moustache | rasé de près, trois jours, moustache, moustache en guidon, bouc, barbe courte, grande barbe, rouflaquettes, mousquetaire, collier |
| Signes particuliers (plusieurs choix) | taches de rousseur, rides du front, pattes d'oie, joues roses, grain de beauté, cicatrice, fossette au menton, cernes, double menton, pommettes saillantes, bouton |
| Lunettes | aucune, rondes, rectangulaires, monture épaisse, de soleil, d'aviateur, demi-lune, monocle, cache-œil, en cœur |
| Chapeau | aucun, casquette, béret, bonnet, chapeau melon, haut-de-forme, chapeau de cow-boy, bob, couronne, bandeau |
| Bijoux et maquillage (plusieurs choix) | anneaux, petits clous, perles pendantes (un seul type de boucles d'oreilles), rouge à lèvres, fard à paupières, mascara, piercing au nez, collier de perles ou chaîne en or (l'un ou l'autre) |
| Tenue | t-shirt, chemise et cravate, costume, col roulé, marinière, polo, pull sur les épaules, sweat à capuche, chemise à fleurs, blouson en cuir |

Le portrait part d'un visage neutre (tête ovale, teint clair, cheveux courts châtains, t-shirt).

## Les témoins
- `data/temoins.json` : **58 dépositions**, écrites à la main. Champs : `id` (slug, stable), `text` (40 à 260 caractères), `want` : la liste des critères du témoin, `[partie, [propositions acceptées]]` (au moins 3).
- Un critère est rempli si la proposition choisie fait partie des propositions acceptées (pour les signes et les bijoux : si l'une des propositions choisies en fait partie). Exemple : « une tête à jouer à la pétanque » accepte le béret ; « teint hâlé du golf » accepte bronzé, mat ou olive.
- Les dépositions décrivent des personnages types (le vieux rockeur, la prof de philo, le marin breton, la mamie gâteau, le martien…), sans nommer de personnes réelles ni de partis politiques.
- Les témoins pas encore entendus passent d'abord ; quand tous l'ont été, on recommence.

## Déroulé
1. **Déposition** : « Déposition n° 12 » et le texte du témoin, sur une fiche de papier. Boutons **Dessiner le portrait**, **Autre témoin** et **Ma description** : un champ pour écrire sa propre description (400 caractères au plus), par exemple pour décrire quelqu'un de la bande. Conseil affiché : à plusieurs, l'un lit la déposition à voix haute, l'autre dessine sans la voir.
2. **Composition** : en haut, la déposition (touchée, elle se cache ou se montre : « Déposition cachée · touche pour la lire ») ; au milieu, le portrait en grand (cadre 2:3, fond de papier avec les lignes d'une toise) ; en bas, les onglets des 16 parties entre deux flèches ‹ ›, « 3 / 16 · Cheveux », et les propositions en vignettes. Chaque vignette montre le visage en cours avec cette proposition, cadrée sur la partie concernée (les yeux pour les yeux, le haut de la tête pour les chapeaux…). Un dé dans la barre du haut tire un visage entièrement au hasard. Puis **Montrer au témoin**.
3. **Le témoin regarde le portrait** : sa réaction selon la ressemblance — « C'est lui ! C'est exactement ça ! » (100 %), « Oui… oui, ça ressemble beaucoup. » (75 % et plus), « Il y a quelque chose… mais pas tout. » (50 %), « Euh… vous m'avez bien écouté ? » (25 %), « Mais c'est qui, ça ?! » —, le pourcentage, la liste des critères ✓ / ✗ (« Chapeau : béret »), et la déposition. Quelques remarques pour les choix farfelus non demandés (« Et il n'était pas vert. », « Pourquoi un nez rouge ? »). Pour une description écrite par les joueurs : « À vous de juger : ça ressemble ? », sans pourcentage. Boutons **Retoucher**, **Image** (PNG 600 × 900 : partage natif du téléphone, sinon téléchargement) et **Nouveau témoin**.
- Tout tient dans l'écran sans défilement, de l'iPhone SE à l'ordinateur. Écran large ou téléphone couché : portrait à gauche, commandes à droite (les vignettes passent sur plusieurs lignes).

## Album
Chaque portrait montré au témoin est rangé dans l'album (les 60 derniers, sur l'appareil). Retoucher puis remontrer met à jour le même portrait. Icône grille de la barre du haut : les portraits, 5 par ligne (3 sur téléphone), avec le numéro de la déposition et la ressemblance. Un portrait s'ouvre en grand avec le verdict, **Image** et **Supprimer** (confirmation en deux touches).

## Réglages
Règle du jeu, nombre de témoins déjà entendus et **Réentendre tous les témoins**, nombre de portraits et **Vider l'album** (confirmation en deux touches).

## Persistance (sur l'appareil)
`localStorage`, préfixe `little-games:robot:` (format version 1) :
- `cur` : portrait en cours `{ wid (témoin) ou null, text (description écrite), face, stage: 'intro' | 'draw' | 'reveal', cat (partie affichée), hidden, albumId }` ;
- `face` : `{ tete, teint, cheveux, couleur, sourcils, yeux, iris, nez, bouche, oreilles, barbe, signes: [], lunettes, chapeau, bijoux: [], tenue }` (une valeur inconnue revient à la valeur par défaut) ;
- `seen` : témoins déjà entendus ; `album` : `[{ id, wid, text, face, pct, date }]` ; `made` : nombre de portraits faits.

## Navigation (URL)
`#/robot` (déposition, composition ou verdict) · `#/robot/album` · `#/robot/album/<id>` · `#/robot/reglages`

## Pistes pour la suite
Mode à deux (un témoin écrit sur son téléphone, le dessinateur compose sur le sien), vote du groupe sur le portrait le plus ressemblant, défi « Portrait-robot » dans Compète de zinzin (3 critères en 45 s), plus de pièces (coiffures, tenues), coloriage libre des vêtements.
