// Résolution des affiches.
// Ordre de priorité pour chaque film :
//   1. data/posters.json → "file"  : image locale (générée par scripts/fetch-posters.mjs --download)
//   2. data/posters.json → "tmdb"  : chemin d'affiche TMDB (servie par image.tmdb.org)
//   3. cache navigateur            : résolu en direct via l'API TMDB (clé dans les réglages)
// Les affiches restent la propriété de leurs ayants droit ; aucune n'est livrée avec le code.

import { createStore } from '../../js/core/storage.js';

const BASE = new URL('./', import.meta.url);
const IMG = 'https://image.tmdb.org/t/p/';
const cache = createStore('affiches-posters');

let manifest = {};
let liveCache = cache.get('live', {});
const pending = new Map();
const queue = [];
let active = 0;
const MAX_CONCURRENT = 4;

export async function loadManifest() {
  try {
    const res = await fetch(new URL('data/posters.json', BASE));
    if (res.ok) manifest = await res.json();
  } catch {
    manifest = {};
  }
  return manifest;
}

/** URL d'affiche connue immédiatement (ou null). size : 'w342' | 'w500' | 'w780' */
export function posterUrl(film, size = 'w500') {
  const m = manifest[film.id];
  if (m?.file) return new URL(m.file, BASE).href;
  const path = m?.tmdb || liveCache[film.id];
  if (path) return IMG + size + path;
  return null;
}

export function hasPoster(film) {
  return Boolean(posterUrl(film));
}

/** Tente de trouver l'affiche via l'API TMDB. Renvoie l'URL ou null. */
export function resolvePoster(film, settings, size = 'w500') {
  const known = posterUrl(film, size);
  if (known) return Promise.resolve(known);
  if (!settings.tmdbKey) return Promise.resolve(null);
  if (liveCache[film.id] === null) return Promise.resolve(null); // déjà cherché, introuvable
  if (!pending.has(film.id)) {
    pending.set(film.id, new Promise((resolve) => {
      queue.push({ film, settings, resolve });
      pump();
    }));
  }
  return pending.get(film.id).then((path) => (path ? IMG + size + path : null));
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    active++;
    searchTmdb(job.film, job.settings)
      .then((path) => {
        liveCache[job.film.id] = path;
        cache.set('live', liveCache);
        job.resolve(path);
      })
      .catch(() => job.resolve(null)) // erreur réseau : on retentera plus tard
      .finally(() => {
        pending.delete(job.film.id);
        active--;
        pump();
      });
  }
}

export function clearLiveCache() {
  liveCache = {};
  cache.set('live', liveCache);
}

export async function testTmdbKey(key) {
  const res = await tmdbFetch('configuration', {}, key);
  return res.ok;
}

function tmdbFetch(endpoint, params, key) {
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
  const headers = { accept: 'application/json' };
  // Jeton v4 (long, commence par "eyJ") ou clé v3 (32 caractères)
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set('api_key', key);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  return fetch(url, { headers });
}

async function searchTmdb(film, settings) {
  const language = settings.posterLang || 'fr-FR';
  const queries = [film.original, film.title, ...(film.alt || [])].filter(Boolean);
  const attempts = [];
  for (const q of queries) attempts.push({ query: q, primary_release_year: film.year });
  for (const q of queries.slice(0, 2)) attempts.push({ query: q, year: film.year });
  attempts.push({ query: queries[0] });

  for (const params of attempts) {
    const res = await tmdbFetch('search/movie', { ...params, language, include_adult: 'false' }, settings.tmdbKey);
    if (res.status === 401) throw new Error('Clé TMDB invalide');
    if (!res.ok) throw new Error(`TMDB ${res.status}`);
    const data = await res.json();
    const best = pickBest(data.results || [], film.year);
    if (best?.poster_path) return best.poster_path;
  }
  return null;
}

export function pickBest(results, year) {
  const withPoster = results.filter((r) => r.poster_path);
  if (!withPoster.length) return null;
  const yearOf = (r) => Number((r.release_date || '').slice(0, 4)) || 0;
  return withPoster
    .map((r, i) => ({ r, score: Math.abs(yearOf(r) - year) * 10 + i - Math.log10((r.vote_count || 0) + 1) }))
    .sort((a, b) => a.score - b.score)[0].r;
}
