// Réponses acceptées pour le jeu « Livres » : on devine l'auteur d'un livre.
// JavaScript pur (sans DOM) : testé dans tests/books.test.js.

import { normalize, levenshtein, isMatch, closeness } from '../../js/core/fuzzy.js?v=1.39.0';

/** Forme comparable d'une réponse complète (comme fuzzy.js : sans accents, ni espaces, ni article initial). */
const compact = (s) => normalize(s).replace(/ /g, '');
/** Forme comparable d'un nom de famille : chaque mot normalisé à part, pour garder « Le » de « Le Guin ». */
const key = (s) => String(s || '').split(/\s+/).map((w) => normalize(w).replace(/ /g, '')).join('');

// Particules qui font partie du nom de famille (« Simone de Beauvoir », « Ursula K. Le Guin », « Tahar Ben Jelloun »)
const PARTICLES = new Set(['de', 'd', 'di', 'da', 'du', 'del', 'della', 'van', 'von', 'der', 'den', 'dos', 'le', 'la', 'ben']);
const isParticle = (w) => PARTICLES.has(normalize(w));

/**
 * Découpe un nom en prénom et nom de famille.
 * Le nom de famille est le dernier mot, avec ses particules ; il est accepté avec ou sans elles
 * (« de Beauvoir » ou « Beauvoir », « Le Guin », « Saint-Exupéry »).
 * → { first, lasts } (lasts : formes du nom de famille, de la plus longue à la plus courte)
 */
export function nameParts(name) {
  const words = String(name).split(/\s+/).filter(Boolean);
  if (words.length < 2) return { first: null, lasts: [] };
  let i = words.length - 1;
  while (i > 1 && isParticle(words[i - 1])) i--;
  const lasts = [];
  for (let j = i; j < words.length; j++) {
    lasts.push(key(words.slice(j).join(' ')));
    if (!isParticle(words[j])) break;
  }
  return { first: key(words.slice(0, i).join(' ')), lasts };
}

/** Initiales pour l'indice : « Léon Tolstoï » → « L. T. », « Antoine de Saint-Exupéry » → « A. S.-E. ». */
export function initialsOf(name) {
  return String(name).split(/\s+/).filter((w) => w && !isParticle(w))
    .map((w) => w.split('-').map((p) => (p.replace(/[^\p{L}]/gu, '')[0] || '').toUpperCase() + '.').join('-'))
    .join(' ');
}

/** Fautes tolérées sur un nom de famille seul : aucune jusqu'à 5 lettres, une jusqu'à 9, deux au-delà. */
const lastTolerance = (len) => (len >= 10 ? 2 : len >= 6 ? 1 : 0);

/**
 * Index des auteurs : réponses complètes, noms de famille acceptés seuls (uniques dans le catalogue, au moins 4 lettres)
 * et propriétaires de chaque réponse exacte (pour refuser le nom d'un autre auteur).
 */
export function buildAuthors(authors) {
  const parts = new Map(authors.map((a) => [a.id, nameParts(a.name)]));
  const count = new Map();
  for (const { lasts } of parts.values()) for (const l of new Set(lasts)) count.set(l, (count.get(l) || 0) + 1);
  // Un nom de famille ne vaut pas réponse s'il est le nom complet d'un autre auteur
  const fullOwner = new Map();
  for (const a of authors) for (const s of [a.name, ...(a.alt || [])]) fullOwner.set(compact(s), a.id);
  const entries = new Map();
  for (const a of authors) {
    const { first, lasts } = parts.get(a.id);
    const ok = lasts.filter((l) => l.length >= 4 && count.get(l) === 1 && (fullOwner.get(l) ?? a.id) === a.id);
    entries.set(a.id, { id: a.id, name: a.name, answers: [...new Set([a.name, ...(a.alt || [])])], first, lasts, lastKeys: ok });
  }
  const owners = new Map();
  const add = (k, id) => { if (!k) return; if (!owners.has(k)) owners.set(k, new Set()); owners.get(k).add(id); };
  for (const e of entries.values()) {
    e.answers.forEach((s) => add(compact(s), e.id));
    e.lastKeys.forEach((k) => add(k, e.id));
  }
  return { entries, owners };
}

/**
 * Compare une proposition à l'auteur attendu.
 * → null (vide) | { ok: true } | { ok: false, near: bool, hint?: string }
 * `near` : réponse presque juste (prénom seul, orthographe) ; le jeu ne la compte pas comme un essai.
 */
export function checkAuthor(guess, id, index) {
  const { entries, owners } = index;
  const entry = entries.get(id);
  const g = compact(guess);
  const gk = key(guess);
  if (!g) return null;
  if (entry.lastKeys.includes(gk) || entry.lastKeys.includes(g)) return { ok: true };
  // Le nom exact d'un autre auteur du catalogue est toujours refusé (« Emily Brontë » n'est pas « Charlotte Brontë »)
  for (const k of [g, gk]) {
    const other = owners.get(k);
    if (other && !other.has(id)) return { ok: false, near: false };
  }
  if (isMatch(guess, entry.answers)) return { ok: true };
  if (entry.first && (g === entry.first || gk === entry.first)) return { ok: false, near: true, hint: 'Il manque le nom de famille.' };
  if (entry.lasts.some((l) => l === gk || l === g) && !entry.lastKeys.length) return { ok: false, near: true, hint: 'Précise le prénom.' };
  // Nom de famille seul avec une petite faute (« Hemmingway », « Dostoievsky »), si aucun autre auteur n'est aussi proche
  for (const l of entry.lastKeys) {
    const d = levenshtein(gk, l);
    if (d > 0 && d <= lastTolerance(l.length) && !nearestIsOther(gk, d, id, entries)) return { ok: true };
  }
  const near = g.length >= 3 && (closeness(guess, entry.answers) < 0.25
    || entry.lasts.some((l) => (levenshtein(gk, l) - lastTolerance(l.length)) / l.length <= 0.25));
  return near ? { ok: false, near: true, hint: 'Vérifie l’orthographe.' } : { ok: false, near: false };
}

function nearestIsOther(gk, d, id, entries) {
  for (const e of entries.values()) {
    if (e.id === id) continue;
    if (e.lasts.some((l) => levenshtein(gk, l) <= d)) return true;
  }
  return false;
}
