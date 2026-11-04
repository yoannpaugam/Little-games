# 👤 Visages : spécification

Ce document décrit le jeu indépendamment de la technologie, pour pouvoir le refaire dans une autre application.

## Principe
Deviner une célébrité à partir d'une photo. On choisit d'abord l'un des deux modes, qui utilisent les photos du catalogue (voir `morceaux/SPEC.md`) :
- **Morceaux** : une bande du visage (yeux, nez ou bouche), qui s'élargit au fil des essais.
- **Portraits de jeunesse** : une photo de la célébrité jeune, visible dès le début.

Chaque carte du choix du mode indique le nombre de photos de son catalogue (les têtes trop penchées ne comptent pas).

## Modes retirés (1.19.0)
Les modes **Portraits** et **Photos d'enfance**, qui utilisaient des photos importées par le joueur, ont été retirés à la demande de Yoann, avec tout ce qui ne servait qu'à eux : import des photos, « Remplir à la suite », détection du visage (face-api et ses modèles), page Crédits photo des photos importées, réglages de Visages.
- Les anciens liens (`#/visages/portraits`, `/enfance`, `/photos`, `/remplir`, `/credits`, `/reglages`) ramènent au choix du mode.
- Les données déjà enregistrées sur les appareils (localStorage `little-games:visages:…`, IndexedDB `little-games-visages`) ne sont pas effacées automatiquement : elles ne sont simplement plus lues.
- Le catalogue `data/celebs.json` (300 célébrités) reste : il sert de source aux catalogues Morceaux et jeunesse (identifiants et réponses acceptées).

## Navigation (URL)
`#/visages` (choix du mode) · `#/visages/morceaux/…` · `#/visages/jeunesse/…`

## Pistes pour la suite
- Mode multijoueur avec des scores (moins d'indices = plus de points)
- Chronomètre
