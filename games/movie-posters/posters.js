// Résolution des affiches.
// Ordre de priorité pour chaque film :
//   1. data/posters.json → "file"  : image locale (générée par scripts/fetch-posters.mjs --download)
//   2. data/posters.json → "tmdb"  : chemin d'affiche TMDB (servie par image.tmdb.org)
//   3. cache navigateur            : affiche déjà trouvée en direct sur cet appareil
//   4. recherche en direct         : API TMDB si une clé est renseignée, sinon (ou à défaut) Wikipédia
// Les affiches restent la propriété de leurs ayants droit ; aucune n'est livrée avec le code.

import { createStore } from '../../js/core/storage.js?v=1.5.0';
import { isMatch } from '../../js/core/fuzzy.js?v=1.5.0';

const BASE = new URL('./', import.meta.url);
const IMG = 'https://image.tmdb.org/t/p/';
const cache = createStore('affiches-posters');

let manifest = {};
// id → "/chemin-tmdb.jpg" | "https://…" (Wikipédia) | null (introuvable)
let liveCache = cache.get('live2', {});
const pending = new Map();
const queue = [];
let active = 0;
const MAX_CONCURRENT = 4;

export async function loadManifest() {
  try {
    const res = await fetch(new URL('data/posters.json', BASE), { cache: 'no-cache' });
    if (res.ok) manifest = await res.json();
  } catch {
    manifest = {};
  }
  return manifest;
}

function toUrl(value, size) {
  if (!value) return null;
  return value.startsWith('http') ? value : IMG + size + value;
}

/** URL d'affiche connue immédiatement (ou null). size : 'w342' | 'w500' | 'w780' */
export function posterUrl(film, size = 'w500') {
  const m = manifest[film.id];
  if (m?.file) return new URL(m.file, BASE).href;
  return toUrl(m?.tmdb || liveCache[film.id], size);
}

export function hasPoster(film) {
  return Boolean(posterUrl(film));
}

/** Cherche l'affiche en direct (TMDB si clé, sinon Wikipédia). Renvoie l'URL ou null. */
export function resolvePoster(film, settings, size = 'w500') {
  const known = posterUrl(film, size);
  if (known) return Promise.resolve(known);
  if (liveCache[film.id] === null) return Promise.resolve(null); // déjà cherché, introuvable
  if (!pending.has(film.id)) {
    pending.set(film.id, new Promise((resolve) => {
      queue.push({ film, settings, resolve });
      pump();
    }));
  }
  return pending.get(film.id).then((value) => toUrl(value, size));
}

async function findPoster(film, settings) {
  let networkError = false;
  if (settings.tmdbKey) {
    try {
      const path = await searchTmdb(film, settings);
      if (path) return path;
    } catch {
      networkError = true;
    }
  }
  try {
    const url = await searchWikipedia(film, settings);
    if (url) return url;
  } catch {
    networkError = true;
  }
  if (networkError) throw new Error('réseau');
  return null;
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    active++;
    findPoster(job.film, job.settings)
      .then((value) => {
        liveCache[job.film.id] = value;
        cache.set('live2', liveCache);
        job.resolve(value);
      })
      .catch(() => job.resolve(null)) // erreur réseau : on retentera plus tard
      .finally(() => {
        pending.delete(job.film.id);
        active--;
        pump();
      });
  }
}

// ------------------------------------------------------------------ Wikipédia (sans clé)

async function searchWikipedia(film) {
  const names = [film.title, film.original, ...(film.alt || [])].filter(Boolean);
  // Wikipédia en anglais uniquement : ses articles de films ont l'affiche dans l'infobox.
  // (Wikipédia en français n'héberge pas d'affiches : l'image principale y est souvent une photo sans rapport.)
  const attempts = [
    ['en', `${film.original || film.title} ${film.year} film`],
    ...(film.original ? [['en', `${film.title} ${film.year} film`]] : []),
    ['en', `${film.original || film.title} film`],
  ];
  for (const [lang, query] of attempts) {
    const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    Object.entries({
      action: 'query', format: 'json', formatversion: '2', origin: '*',
      generator: 'search', gsrsearch: query, gsrlimit: '5', gsrnamespace: '0',
      prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '500', pilicense: 'any',
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Wikipédia ${res.status}`);
    const data = await res.json();
    const pages = (data.query?.pages || []).sort((a, b) => a.index - b.index);
    // On n'accepte qu'un article dont le titre correspond au film (sinon mieux vaut pas d'affiche qu'une mauvaise)
    const hit = pages.find((p) => p.thumbnail?.source && isMatch(p.title.replace(/\s*\([^)]*\)\s*$/, ''), names));
    if (hit) return hit.thumbnail.source;
  }
  return null;
}

// ------------------------------------------------------------------ TMDB (clé optionnelle)

export function clearLiveCache() {
  liveCache = {};
  cache.set('live2', liveCache);
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
