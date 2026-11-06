# 🎲 Little Games

Des jeux d'ambiance à partager entre amis, sur un ou plusieurs appareils.
Application web **100 % statique** (HTML + CSS + JavaScript, sans framework ni build) : elle se dépose telle quelle sur GitHub Pages.

| Jeu | Dossier | Statut |
| --- | --- | --- |
| 🎬 Affiches de cinéma | `games/movie-posters/` | ✅ jouable |
| 👤 Visages (Morceaux, portraits de jeunesse) | `games/faces/` | ✅ jouable |
| 📚 Livres | `games/books/` | ✅ jouable |
| 🌍 Géoquizz | `games/geo/` | ✅ jouable |
| 👣 Le chemin | `games/path/` | ✅ jouable |

---

## 🚀 Mise en ligne sur GitHub Pages

1. Crée un dépôt sur GitHub et dépose-y tout le contenu de ce dossier.
2. Va dans **Settings → Pages**, choisis **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Au bout d'une minute, le jeu est disponible sur `https://<ton-pseudo>.github.io/<nom-du-depot>/`.

> Les modules JavaScript ne fonctionnent pas en ouvrant `index.html` en double-cliquant (`file://`).
> En local, lance un petit serveur : `npm start` (ou `python3 -m http.server`), puis ouvre http://localhost:8080.

## 🖼️ Les affiches

Les affiches viennent de TMDB : `data/posters.json` contient le chemin de chacune, et l'image est chargée depuis TMDB au moment du jeu.

**Par défaut (sans rien configurer)**, le jeu cherche chaque affiche sur Wikipédia, directement depuis le navigateur, puis la garde en mémoire sur l'appareil. Il n'affiche une image que si le titre de l'article Wikipédia correspond au film. Les options ci-dessous (TMDB) donnent des affiches en meilleure qualité et évitent toute recherche.
 Elles proviennent de **[TMDB](https://www.themoviedb.org/)** (The Movie Database), qui les sert gratuitement. Il te faut une **clé API TMDB** gratuite : crée un compte, puis va dans *Paramètres → API*.

Il y a deux façons de s'en servir :

### Option A : dans le jeu (rien à installer)
Ouvre le jeu → ⚙️ **Réglages** → **Affiches (TMDB)**, puis colle ta clé.
Les affiches sont cherchées automatiquement au fil du jeu et gardées en mémoire sur l'appareil.
Il faut le faire une fois sur chaque appareil.

### Option B : une fois pour toutes, pour tout le monde (recommandé)
**Sans rien installer, depuis GitHub :**
1. Settings → Secrets and variables → Actions → **New repository secret** : nom `TMDB_API_KEY`, valeur = ta clé TMDB.
2. Onglet **Actions** → **Affiches (TMDB)** → **Run workflow**.
3. Le résultat arrive sur la branche `donnees/affiches-tmdb`. Le résumé du workflow liste les films introuvables. Il reste à fusionner cette branche par une pull request.

**Ou sur ton ordinateur :**
```bash
TMDB_API_KEY=ta_cle node scripts/fetch-posters.mjs
git add games/movie-posters/data/posters.json && git commit -m "Affiches" && git push
```
Le script trouve l'affiche de chacun des films et écrit son chemin TMDB dans `data/posters.json`. Ce fichier est léger et ne contient pas d'images.
Ensuite, plus aucune clé n'est nécessaire : n'importe quel appareil voit directement les affiches.
Le script signale les films introuvables ou dont l'année ne correspond pas, pour que tu puisses les vérifier.

**Option avancée : héberger toi-même des images recadrées au même format**
```bash
npm install                                         # installe sharp (traitement d'images)
TMDB_API_KEY=ta_cle node scripts/fetch-posters.mjs --download
```
Chaque affiche est téléchargée, puis recadrée au format 2:3 en 600×900 px (on garde le haut de l'affiche) dans `games/movie-posters/posters/`.
Les images sont alors stockées dans le dépôt.

Autres options : `--lang en-US` (affiches originales), `--force` (tout refaire), `--only id1,id2`, `--size 400x600`.

Dans tous les cas, le jeu affiche toutes les affiches au même format (2:3, recadrage léger via CSS).

## 📚 Livres

Une couverture s'affiche (titre français et année), il faut retrouver l'auteur en 3 essais. Après le premier raté, la couverture donne la littérature de l'auteur, après le deuxième ses initiales. Le nom de famille seul suffit. Les couvertures sont dessinées en CSS : aucune image n'est chargée. Le catalogue (`games/books/data/livres.json`) est vérifié par `tests/catalogs.test.js`.

## 🌍 Géoquizz

Une partie compte 10 pays, répartis sur tous les continents. Pour chacun, on touche la carte du monde là où on pense qu'il se trouve (zoom et déplacement possibles). L'écart est la distance entre le point et la frontière la plus proche du pays, calculée sur la sphère ; les écarts s'additionnent et donnent un score sur 100. Les contours viennent de Natural Earth (domaine public, via world-atlas) : `games/geo/data/world.json`, vérifié par `tests/catalogs.test.js`. Ses contours sont simplifiés par `python3 scripts/simplify-geo.py` (frontières communes conservées entre voisins). Aucune image ni service externe.

## 👣 Le chemin

Un jeu de mémoire : un chemin s'allume pendant 6 secondes sur une grille de 9 × 14 cases (14 × 9 en paysage), puis on le retrace case par case, du départ à l'arrivée. 3 erreurs par manche, 3 affichages en tout ; score sur 100 (−6 par erreur, −8 par affichage supplémentaire). Le chemin est tiré au hasard, sans raccourci possible (`games/path/path.js`, testé par `tests/path.test.js`). Aucune image ni service externe : les sons sont produits par Web Audio.

## 🧩 Morceaux et 🧒 Portraits de jeunesse (modes de Visages)

Deux modes de Visages utilisent des photos du catalogue (et non celles du joueur) :
- **Morceaux** : deviner une célébrité à partir d’une bande du visage (yeux, nez ou bouche), qui s’élargit au fil des essais ;
- **Portraits de jeunesse** : deviner une célébrité sur une photo de jeunesse.

Les photos viennent de **Wikimedia Commons** : `games/faces/morceaux/data/people.json` (Morceaux) et `jeunesse.json` (jeunesse) contiennent l’URL et les régions de découpe `[x,y,w,h]` (aucune image dans le dépôt). Pour régénérer le catalogue :

```bash
pip install requests mediapipe opencv-python-headless numpy
npm run morceaux:build          # liste seed scripts/celeb-seed.json
npm run morceaux:wikidata       # alternative : SPARQL Wikidata (peut timeout)
```

Pour les portraits de jeunesse, la liste des photos est fournie à la main dans `scripts/jeunesse-seed.json` (`name`, `file` Commons, `year` facultatif), puis :

```bash
python scripts/celeb-quiz-builder.py --jeunesse --top 300
```

Pour ajouter les **personnages historiques** (108 personnes décédées, 54 femmes et 54 hommes, listées dans `scripts/historiques-seed.json`) à la suite des célébrités de Morceaux :

```bash
npm run morceaux:historiques    # ajoute à people.json, sans toucher aux personnes déjà présentes
```

Le script écrit seulement le JSON ; le cache images reste dans `scripts/.celeb-cache/` (gitignoré).

## 🧱 Architecture (pensée pour migrer facilement)

```
index.html               Coquille : accueil + chargement des jeux
css/base.css             Thème commun (couleurs, typo, accueil)
js/app.js                Routeur par hash : #/<jeu>/<sous-page>
js/core/                 Briques réutilisables, sans dépendance
  ├─ fuzzy.js            Comparaison de réponses tolérante aux fautes
  ├─ storage.js          localStorage avec espace de noms
  └─ dom.js              Mini-helper h() pour créer le DOM + icônes
games/registry.js        Liste des jeux affichés dans l'accueil
games/movie-posters/     Le jeu « Affiches de cinéma », autonome
  ├─ index.js            Logique et vues (jeu, grille, réglages)
  ├─ posters.js          Résolution des affiches (manifest / TMDB)
  ├─ styles.css          Styles du jeu (préfixe .mp-)
  ├─ data/films.json     Les films (titre, titre original, alternatives, année, réalisateur)
  ├─ data/posters.json   Chemins des affiches (généré par le script)
  └─ SPEC.md             Spécification fonctionnelle du jeu
games/faces/             Le jeu « Visages », autonome
  ├─ index.js            Choix du mode (Morceaux ou Portraits de jeunesse)
  ├─ styles.css          Styles du choix du mode (préfixe .vz-)
  ├─ data/celebs.json    Les 300 célébrités (source des catalogues Morceaux et jeunesse)
  ├─ SPEC.md             Spécification fonctionnelle du jeu
  └─ morceaux/           Modes « Morceaux » et « Portraits de jeunesse » (chargés à la demande)
       ├─ index.js       Logique et vues (jeu, grille et crédits, réglages, debug)
       ├─ answers.js     Réponses acceptées (testé)
       ├─ framing.js     Cadrage 2:3 et inclinaison des têtes (testé)
       ├─ styles.css     Styles (préfixe .mx-)
       ├─ data/          people.json (Morceaux), jeunesse.json (jeunesse)
       └─ SPEC.md        Spécification des deux modes
games/books/             Le jeu « Livres » (retrouver l'auteur), autonome
  ├─ index.js            Logique et vues (jeu, bibliothèque, réglages)
  ├─ answers.js          Réponses acceptées : nom de famille seul, particules, fautes (testé)
  ├─ styles.css          Styles du jeu (préfixe .lv-), couvertures dessinées en CSS
  ├─ data/livres.json    Les 300 livres (titre français, année) et leurs 246 auteurs
  └─ SPEC.md             Spécification fonctionnelle du jeu
games/geo/               Le jeu « Géoquizz » (placer des pays sur la carte), autonome
  ├─ index.js            Logique et vues (partie, score final, réglages), carte SVG en Mercator
  ├─ geo.js              Distances sur la sphère, contours, tirage des pays (testé)
  ├─ styles.css          Styles du jeu (préfixe .gq-)
  ├─ data/world.json     Contours de 167 pays (Natural Earth, domaine public)
  └─ SPEC.md             Spécification fonctionnelle du jeu
games/path/              Le jeu « Le chemin » (mémoriser et retracer un chemin), autonome
  ├─ index.js            Logique et vues (partie, bilan, réglages), sons Web Audio
  ├─ path.js             Tirage du chemin et calcul du score (testé)
  ├─ styles.css          Styles du jeu (préfixe .ch-)
  └─ SPEC.md             Spécification fonctionnelle du jeu
scripts/fetch-posters.mjs       Récupération des affiches (Node 18+)
scripts/celeb-quiz-builder.py   Catalogues Morceaux et jeunesse (MediaPipe)
scripts/celeb-seed.json         Liste seed Commons pour le builder
scripts/simplify-geo.py         Simplifie les contours de la carte du Géoquizz
tests/                   Tests : tolérance aux fautes, catalogues, stockage (npm test)
CLAUDE.md                Consignes pour Claude (architecture, coordination, livraison)
SECURITY.md              Données, protections en place et règles de sécurité
.claude/agents/          Agents spécialisés : game design, UX mobile, architecture, QA, contenus,
                         performance/PWA, multijoueur, conformité, coordination des versions
```

**Contrat d'un jeu** : `games/<id>/index.js` exporte `mount(container, ctx)` et renvoie `{ update(path), destroy() }`.
`ctx` fournit `path` (le sous-chemin de l'URL), `navigate(...path)` et `home()`.
Un jeu n'utilise que `js/core/`. Pour le transposer dans une autre application, copie son dossier et `js/core/` :
- `data/films.json`, `data/celebs.json`, `data/people.json` et les `SPEC.md` peuvent être repris tels quels dans n'importe quelle technologie (React Native, Flutter, Swift…) ;
- `fuzzy.js` est du JavaScript pur, testé, que l'on peut porter facilement.

### Ajouter un jeu
1. Crée `games/mon-jeu/index.js` en respectant le contrat ci-dessus.
2. Déclare-le dans `games/registry.js`.

### Modifier la liste des films
Édite `games/movie-posters/data/films.json`. Exemple d'entrée :
```json
{ "id": "the-matrix-1999", "title": "Matrix", "year": 1999, "director": "Lana et Lilly Wachowski",
  "original": "The Matrix", "alt": ["autre titre accepté"] }
```
Toutes ces réponses sont acceptées : `title`, `original` et chaque élément de `alt`.
Pour un titre en deux parties (avec « : »), la partie avant les deux-points est aussi acceptée si elle ne désigne qu'un seul film (ex. « Kill Bill »).
La partie après les deux-points est acceptée aussi (ex. « Les Deux Tours »).
Relance ensuite `node scripts/fetch-posters.mjs` pour les nouveaux films.

### Modifier la liste des célébrités
Édite `games/faces/data/celebs.json`. Exemple d'entrée :
```json
{ "id": "omar-sy", "name": "Omar Sy", "job": "Acteur", "g": "m", "born": 1978, "alt": ["autre réponse acceptée"] }
```
Garde des `id` stables : ils servent aux catalogues Morceaux et jeunesse, et à la progression.

---

*Ce produit utilise l'API TMDB, sans être approuvé ni certifié par TMDB.*
