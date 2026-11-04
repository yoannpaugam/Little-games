# 🎲 Little Games

Des jeux d'ambiance à partager entre amis, sur un ou plusieurs appareils.
Application web **100 % statique** (HTML + CSS + JavaScript, sans framework ni build) : elle se dépose telle quelle sur GitHub Pages.

| Jeu | Dossier | Statut |
| --- | --- | --- |
| 🎬 Affiches de cinéma | `games/movie-posters/` | ✅ jouable |
| 👤 Visages (portraits et photos d'enfance) | `games/faces/` | ✅ jouable |
| Devinettes, quiz… | — | à venir |

---

## 🚀 Mise en ligne sur GitHub Pages

1. Crée un dépôt sur GitHub et dépose-y tout le contenu de ce dossier.
2. Va dans **Settings → Pages**, choisis **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Au bout d'une minute, le jeu est disponible sur `https://<ton-pseudo>.github.io/<nom-du-depot>/`.

> Les modules JavaScript ne fonctionnent pas en ouvrant `index.html` en double-cliquant (`file://`).
> En local, lance un petit serveur : `npm start` (ou `python3 -m http.server`), puis ouvre http://localhost:8080.

## 🖼️ Les affiches

Aucune affiche n'est livrée avec le code : elles appartiennent à leurs ayants droit.

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
⚠️ Les images sont alors stockées dans ton dépôt : si le dépôt est public, tu redistribues des œuvres protégées. Garde plutôt l'option B pour un dépôt public.

Autres options : `--lang en-US` (affiches originales), `--force` (tout refaire), `--only id1,id2`, `--size 400x600`.

Dans tous les cas, le jeu affiche toutes les affiches au même format (2:3, recadrage léger via CSS).

## 👤 Les photos de Visages

Aucune photo n'est livrée avec le code. Chaque joueur importe ses photos dans le jeu, depuis l'icône 🖼️ **Photos**. Elles restent enregistrées dans le navigateur de son appareil (IndexedDB).

- Le plus rapide : **Photos → Remplir à la suite**. Le jeu affiche une personne à la fois : on cherche une image, on la copie (appui long → « Copier l'image »), on revient et on la colle. Le jeu passe tout seul à la personne suivante.
- Pour importer des fichiers déjà prêts : nomme chaque fichier avec le nom de la personne : `omar-sy.jpg`, `Céline Dion.png`. Ajoute « enfant » pour une photo d'enfance : `omar-sy-enfant.jpg`. Ensuite, importe-les tous d'un coup : ils sont rangés automatiquement. Le jeu te demande à qui correspondent les fichiers qu'il ne reconnaît pas.
- Le visage est repéré automatiquement à l'import, avec [face-api](https://github.com/vladmandic/face-api) (licence MIT, fichiers dans `games/faces/vendor/` et `games/faces/models/`, environ 7 Mo, chargés seulement au premier import). Si un visage n'est pas trouvé, on le place à la main en deux touches.
- Toutes les photos sont affichées au même format que les affiches : 2:3, recadrées autour du visage.

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
  ├─ index.js            Logique et vues (choix du mode, jeu, photos, réglages)
  ├─ answers.js          Réponses acceptées, reconnaissance des noms de fichiers (testé)
  ├─ photos.js           Stockage des photos, détection du visage, masque
  ├─ styles.css          Styles du jeu (préfixe .vz-)
  ├─ data/celebs.json    Les 300 célébrités (nom, profession, sexe, année de naissance, alternatives)
  ├─ vendor/, models/    face-api et ses modèles
  └─ SPEC.md             Spécification fonctionnelle du jeu
scripts/fetch-posters.mjs   Récupération des affiches (Node 18+)
tests/                   Tests : tolérance aux fautes, catalogues, stockage (npm test)
CLAUDE.md                Consignes pour Claude (architecture, coordination, livraison)
SECURITY.md              Données, protections en place et règles de sécurité
.claude/agents/          Agents spécialisés : game design, UX mobile, architecture, QA, contenus,
                         performance/PWA, multijoueur, conformité, coordination des versions
```

**Contrat d'un jeu** : `games/<id>/index.js` exporte `mount(container, ctx)` et renvoie `{ update(path), destroy() }`.
`ctx` fournit `path` (le sous-chemin de l'URL), `navigate(...path)` et `home()`.
Un jeu n'utilise que `js/core/`. Pour le transposer dans une autre application, copie son dossier et `js/core/` :
- `data/films.json`, `data/celebs.json` et les `SPEC.md` peuvent être repris tels quels dans n'importe quelle technologie (React Native, Flutter, Swift…) ;
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
Garde des `id` stables : ils servent à retrouver les photos déjà importées et la progression.

---

*Ce produit utilise l'API TMDB, sans être approuvé ni certifié par TMDB.*
