#!/usr/bin/env node
// Récupère les affiches de tous les films via l'API TMDB et remplit
// games/movie-posters/data/posters.json.
//
// Usage :
//   TMDB_API_KEY=xxxx node scripts/fetch-posters.mjs            → chemins TMDB uniquement (léger)
//   TMDB_API_KEY=xxxx node scripts/fetch-posters.mjs --download → + images locales 600×900 recadrées
//
// Options :
//   --lang en-US      langue des affiches (défaut fr-FR)
//   --download        télécharge et recadre chaque affiche au format 2:3 (nécessite `npm install`)
//   --size 600x900    taille de sortie avec --download
//   --force           refait aussi les films déjà présents dans posters.json
//   --only id1,id2    ne traite que certains films
//
// Node 18+ requis (fetch natif).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(ROOT, 'games', 'movie-posters');
const FILMS = path.join(GAME, 'data', 'films.json');
const MANIFEST = path.join(GAME, 'data', 'posters.json');
const OUT_DIR = path.join(GAME, 'posters');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const KEY = process.env.TMDB_API_KEY || opt('key');
const LANG = opt('lang', 'fr-FR');
const DOWNLOAD = flag('download');
const FORCE = flag('force');
const ONLY = opt('only') ? new Set(opt('only').split(',')) : null;
const [W, H] = opt('size', '600x900').split('x').map(Number);

if (!KEY) {
  console.error('❌ Clé TMDB manquante. Crée-en une gratuite sur https://www.themoviedb.org/settings/api');
  console.error('   puis lance : TMDB_API_KEY=ta_cle node scripts/fetch-posters.mjs');
  process.exit(1);
}

let sharp = null;
if (DOWNLOAD) {
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('❌ --download nécessite "sharp" : lance `npm install` à la racine du projet.');
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
}

const films = JSON.parse(await readFile(FILMS, 'utf8'));
const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};

function tmdb(endpoint, params) {
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
  const headers = { accept: 'application/json' };
  if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`;
  else url.searchParams.set('api_key', KEY);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  return fetchRetry(url, { headers }).then(async (r) => {
    if (r.status === 401) throw new Error('Clé TMDB invalide (401)');
    if (!r.ok) throw new Error(`TMDB ${r.status} sur ${endpoint}`);
    return r.json();
  });
}

async function fetchRetry(url, init, tries = 4) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, init);
    if (r.status !== 429 || i >= tries) return r;
    await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
  }
}

function pickBest(results, year) {
  const withPoster = results.filter((r) => r.poster_path);
  if (!withPoster.length) return null;
  const yearOf = (r) => Number((r.release_date || '').slice(0, 4)) || 0;
  return withPoster
    .map((r, i) => ({ r, score: Math.abs(yearOf(r) - year) * 10 + i - Math.log10((r.vote_count || 0) + 1) }))
    .sort((a, b) => a.score - b.score)[0].r;
}

async function findMovie(film) {
  const queries = [film.original, film.title, ...(film.alt || [])].filter(Boolean);
  const attempts = [
    ...queries.map((q) => ({ query: q, primary_release_year: film.year })),
    ...queries.slice(0, 2).map((q) => ({ query: q, year: film.year })),
    { query: queries[0] },
  ];
  for (const p of attempts) {
    const data = await tmdb('search/movie', { ...p, language: LANG, include_adult: 'false' });
    const best = pickBest(data.results || [], film.year);
    if (best) return best;
  }
  return null;
}

async function downloadCropped(posterPath, id) {
  const res = await fetchRetry(`https://image.tmdb.org/t/p/original${posterPath}`);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const file = `posters/${id}.jpg`;
  await sharp(buf)
    .resize(W, H, { fit: 'cover', position: 'top' }) // recadrage léger au 2:3, on garde le haut
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(GAME, file));
  return file;
}

const todo = films.filter((f) => (!ONLY || ONLY.has(f.id)) && (FORCE || !manifest[f.id] || (DOWNLOAD && !manifest[f.id].file)));
console.log(`🎬 ${todo.length} film(s) à traiter sur ${films.length} (langue ${LANG}${DOWNLOAD ? `, images ${W}×${H}` : ''})`);

const missing = [];
let done = 0;
const CONCURRENCY = 6;
let cursor = 0;

async function worker() {
  while (cursor < todo.length) {
    const film = todo[cursor++];
    try {
      let entry = !FORCE && manifest[film.id];
      if (!entry?.tmdb) {
        const movie = await findMovie(film);
        if (!movie) throw new Error('introuvable');
        const releaseYear = Number((movie.release_date || '').slice(0, 4));
        if (releaseYear && Math.abs(releaseYear - film.year) > 1) {
          console.warn(`  ⚠︎ ${film.title} (${film.year}) → « ${movie.title} » (${releaseYear}) : année différente, à vérifier`);
        }
        entry = { tmdbId: movie.id, tmdb: movie.poster_path };
      }
      if (DOWNLOAD) entry.file = await downloadCropped(entry.tmdb, film.id);
      manifest[film.id] = entry;
    } catch (e) {
      missing.push(`${film.id} (${e.message})`);
    }
    done++;
    if (done % 25 === 0 || done === todo.length) {
      process.stdout.write(`  … ${done}/${todo.length}\n`);
      await save();
    }
  }
}

async function save() {
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  await writeFile(MANIFEST, JSON.stringify(sorted, null, 1) + '\n');
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await save();

console.log(`✅ posters.json mis à jour : ${Object.keys(manifest).length} affiche(s).`);
if (missing.length) {
  console.log(`⚠︎ ${missing.length} sans affiche :`);
  missing.forEach((m) => console.log('   - ' + m));
  console.log('  Astuce : ajoute un titre alternatif ("alt") dans films.json puis relance avec --only <id>.');
}
