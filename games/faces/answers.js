// Réponses acceptées et reconnaissance des noms de fichiers, pour le jeu « Visages ».
// JavaScript pur (sans DOM) : testé dans tests/faces.test.js.

import { normalize, levenshtein, tolerance, isMatch, closeness } from '../../js/core/fuzzy.js?v=1.4.0';

const compact = (s) => normalize(s).replace(/ /g, '');

/**
 * Pour chaque célébrité : nom complet, alternatives et nom de famille seul
 * (s'il est unique dans le catalogue et fait au moins 4 lettres).
 * → Map id → { answers, first, last }
 */
export function buildAnswers(celebs) {
  const words = new Map(celebs.map((c) => [c.id, normalize(c.name).split(' ')]));
  const lastCount = new Map();
  for (const w of words.values()) {
    if (w.length < 2) continue;
    const last = w.slice(1).join('');
    lastCount.set(last, (lastCount.get(last) || 0) + 1);
  }
  const result = new Map();
  for (const c of celebs) {
    const w = words.get(c.id);
    const first = w[0];
    const last = w.length > 1 ? w.slice(1).join('') : null;
    const answers = [c.name, ...(c.alt || [])];
    if (last && last.length >= 4 && lastCount.get(last) === 1) answers.push(w.slice(1).join(' '));
    result.set(c.id, { answers: [...new Set(answers)], first, last });
  }
  return result;
}

/**
 * Compare une proposition à la bonne réponse.
 * → null (vide) | { ok: true } | { ok: false, near: bool, hint?: string }
 */
export function checkAnswer(guess, entry) {
  const g = compact(guess);
  if (!g) return null;
  if (isMatch(guess, entry.answers)) return { ok: true };
  if (entry.last && g === entry.last) return { ok: false, near: true, hint: 'Précise le prénom.' };
  if (entry.last && entry.first.length > 2 && g === entry.first) return { ok: false, near: true, hint: 'Il manque le nom de famille.' };
  if (g.length >= 3 && closeness(guess, entry.answers) < 0.25) return { ok: false, near: true, hint: 'Vérifie l’orthographe.' };
  return { ok: false, near: false };
}

const KID = /\b(enfant|enfance|child|childhood|kid|kids|young|jeune|bebe|baby|petit|petite)\b/;
const NOISE = /\b(enfant|enfance|child|childhood|kid|kids|young|jeune|bebe|baby|petit|petite|portrait|photo|img|image|pic|copy|copie|final|hd|\d+)\b/g;

/**
 * Retrouve la célébrité d'après un nom de fichier (« omar-sy-enfant.jpg »).
 * → { id: string|null, kid: bool }  (kid : le nom indique une photo d'enfance)
 */
export function matchFileName(fileName, celebs, answersMap) {
  const base = normalize(fileName.replace(/\.[a-z0-9]+$/i, ''));
  const kid = KID.test(base);
  const k = base.replace(NOISE, ' ').replace(/ +/g, '');
  if (!k) return { id: null, kid };
  let best = null, bestD = Infinity, second = Infinity;
  for (const c of celebs) {
    let d = Infinity;
    for (const a of [c.id.replace(/-/g, ''), ...answersMap.get(c.id).answers.map(compact)]) d = Math.min(d, levenshtein(k, a));
    if (d < bestD) { second = bestD; bestD = d; best = c; } else if (d < second) second = d;
  }
  const ok = best && bestD <= tolerance(k.length) && second > bestD;
  return { id: ok ? best.id : null, kid };
}

/** Trouve une célébrité à partir d'un nom saisi à la main (attribution d'une photo). */
export function findByName(text, celebs, answersMap) {
  const k = compact(text);
  if (!k) return null;
  return celebs.find((c) => compact(c.name) === k)
    || celebs.find((c) => checkAnswer(text, answersMap.get(c.id))?.ok)
    || null;
}
