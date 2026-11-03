// Résolution des affiches.
// Ordre de priorité pour chaque film :
//   1. data/posters.json → "file"  : image locale (générée par scripts/fetch-posters.mjs --download)
//   2. data/posters.json → "tmdb"  : chemin d'affiche TMDB (servie par image.tmdb.org)
//   3. cache navigateur            : affiche déjà trouvée en direct sur cet appareil
//   4. recherche en direct         : API TMDB si une clé est renseignée, sinon (ou à défaut) Wikipédia
// Les affiches restent la propriété de leurs ayants droit ; aucune n'est livrée avec le code.

import { createStore } from '../../js/core/storage.js?v=1.7.0';
import { isMatch } from '../../js/core/fuzzy.js?v=1.7.0';

const BASE = new URL('./', import.meta.url);
const IMG = 'https://image.tmdb.org/t/p/';
const cache = createStore('affiches-posters');

let manifest = {};
// id → "/chemin-tmdb.jpg" | "https://…" (Wikipédia) | { miss: date } (introuvable, réessayé après MISS_TTL)
// « live3 » remplace « live2 », qui gardait les échecs pour toujours : on repart d'un cache propre.
let liveCache = cache.get('live3', {});
cache.remove('live2');
const MISS_TTL = 3 * 24 * 3600 * 1000;
const isUrl = (v) => typeof v === 'string' && v.length > 0;
const isFreshMiss = (v) => v && typeof v === 'object' && Date.now() - (v.miss || 0) < MISS_TTL;
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
  if (!isUrl(value)) return null;
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
// priority : true pour l'affiche de l'écran de jeu, qui passe avant celles de la grille.
export function resolvePoster(film, settings, size = 'w500', { priority = false } = {}) {
  const known = posterUrl(film, size);
  if (known) return Promise.resolve(known);
  if (isFreshMiss(liveCache[film.id])) return Promise.resolve(null); // cherché récemment, introuvable
  if (!pending.has(film.id)) {
    pending.set(film.id, new Promise((resolve) => {
      const job = { film, settings, resolve };
      if (priority) queue.unshift(job); else queue.push(job);
      pump();
    }));
  } else if (priority) {
    const i = queue.findIndex((j) => j.film.id === film.id);
    if (i > 0) queue.unshift(...queue.splice(i, 1));
  }
  return pending.get(film.id).then((value) => toUrl(value, size));
}

/** Abandonne les recherches pas encore lancées (ex. : on quitte la grille). */
export function dropQueued() {
  for (const job of queue.splice(0)) {
    pending.delete(job.film.id);
    job.resolve(null);
  }
}

/** Oublie une affiche dont l'image ne se charge plus, pour la rechercher à nouveau plus tard. */
export function forgetPoster(film) {
  if (isUrl(liveCache[film.id])) {
    delete liveCache[film.id];
    cache.set('live3', liveCache);
  }
}

/** Oublie les films marqués « introuvables » (ex. : après l'ajout d'une clé TMDB). */
export function clearMisses() {
  for (const [id, v] of Object.entries(liveCache)) if (!isUrl(v)) delete liveCache[id];
  cache.set('live3', liveCache);
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
        liveCache[job.film.id] = value || { miss: Date.now() };
        cache.set('live3', liveCache);
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
  const main = film.original || film.title;
  const attempts = [
    `${main} ${film.year} film`,
    ...(film.original ? [`${film.title} ${film.year} film`] : []),
    `${main} film`,
  ];
  for (const query of attempts) {
    const pages = await wikipediaQuery({
      generator: 'search', gsrsearch: query, gsrlimit: '5', gsrnamespace: '0',
    });
    const hit = pickWikipediaPage(pages, names, film.year);
    if (hit) return hit.thumbnail.source;
  }
  return null;
}

async function wikipediaQuery(params) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  Object.entries({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    prop: 'pageimages|description', piprop: 'thumbnail', pithumbsize: '500', pilicense: 'any',
    ...params,
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipédia ${res.status}`);
  const data = await res.json();
  // MediaWiki signale ses erreurs (limite de requêtes, surcharge…) avec un statut 200 : on réessaiera plus tard.
  if (data.error) throw new Error(`Wikipédia ${data.error.code || 'erreur'}`);
  return (data.query?.pages || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

/**
 * Choisit l'article du film parmi les résultats de recherche (null si aucun ne convient : mieux vaut pas d'affiche qu'une mauvaise).
 * Accepté : un article dont le titre correspond au film (« Titanic (1997 film) », « Léon: The Professional »),
 * ou le premier résultat s'il est décrit comme un film de la bonne année (« 1988 film by Luc Besson »),
 * pour les films dont l'article anglais porte un autre titre (Le Grand Bleu → The Big Blue).
 */
export function pickWikipediaPage(pages, names, year) {
  const withImage = pages.filter((p) => p.thumbnail?.source);
  const clean = (title) => title.replace(/\s*\([^)]*\)\s*$/, '');
  const byTitle = withImage.find((p) => {
    const t = clean(p.title);
    return isMatch(t, names) || isMatch(t.split(/\s*:\s*/)[0], names);
  });
  if (byTitle) return byTitle;
  const first = pages[0];
  const isFilmOfYear = (p) => /\bfilm\b/i.test(p?.description || '') && (p.description.includes(String(year)) || p.title.includes(`(${year} film)`));
  return first?.thumbnail?.source && isFilmOfYear(first) ? first : null;
}

// ------------------------------------------------------------------ TMDB (clé optionnelle)

export function clearLiveCache() {
  liveCache = {};
  cache.set('live3', liveCache);
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
