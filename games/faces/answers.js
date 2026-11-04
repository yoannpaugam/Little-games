// Réponses acceptées et reconnaissance des noms de fichiers, pour le jeu « Visages ».
// JavaScript pur (sans DOM) : testé dans tests/faces.test.js.

import { normalize, levenshtein, tolerance, isMatch, closeness } from '../../js/core/fuzzy.js?v=1.18.0';

const compact = (s) => normalize(s).replace(/ /g, '');

// Particules qui font partie du nom de famille (« Louis de Funès » → « de Funès », « Robert De Niro » → « De Niro »)
const PARTICLES = new Set(['de', 'di', 'da', 'du', 'del', 'della', 'van', 'von', 'der', 'den', 'dos', 'le']);

/**
 * Pour chaque célébrité : nom complet et alternatives (avec tolérance aux fautes),
 * nom de famille seul accepté s'il est unique dans le catalogue et fait au moins 4 lettres (sans faute de frappe,
 * pour qu'un nom proche ne passe pas : « Carey » n'est pas « Carrey »).
 * → Map id → { id, answers, first, last, lastKey, lastUnique }
 */
export function buildAnswers(celebs) {
  const split = (c) => {
    const w = normalize(c.name).split(' ');
    if (w.length < 2) return { first: w[0], last: null };
    let i = w.length - 1;
    while (i > 1 && PARTICLES.has(w[i - 1])) i--;
    return { first: w.slice(0, i).join(''), last: w.slice(i).join('') };
  };
  const parts = new Map(celebs.map((c) => [c.id, split(c)]));
  const lastCount = new Map();
  for (const { last } of parts.values()) if (last) lastCount.set(last, (lastCount.get(last) || 0) + 1);
  // Le nom de famille ne vaut pas réponse s'il est aussi le nom complet d'une autre célébrité (Line Renaud / Renaud)
  const fullOwner = new Map();
  for (const c of celebs) for (const a of [c.name, ...(c.alt || [])]) fullOwner.set(compact(a), c.id);
  const result = new Map();
  for (const c of celebs) {
    const { first, last } = parts.get(c.id);
    const owner = last && fullOwner.get(last);
    const lastUnique = Boolean(last && last.length >= 4 && lastCount.get(last) === 1 && (!owner || owner === c.id));
    result.set(c.id, {
      id: c.id,
      answers: [...new Set([c.name, ...(c.alt || [])])],
      first, last,
      lastKey: lastUnique ? last : null,
      lastUnique,
    });
  }
  return result;
}

/** Réponse exacte (normalisée, sans espaces) → célébrités qui l'acceptent. Sert à refuser le nom d'une autre personne. */
export function buildOwners(answersMap) {
  const owners = new Map();
  const add = (k, id) => { if (!k) return; if (!owners.has(k)) owners.set(k, new Set()); owners.get(k).add(id); };
  for (const [id, e] of answersMap) {
    e.answers.forEach((a) => add(compact(a), id));
    add(e.lastKey, id);
  }
  return owners;
}

/**
 * Compare une proposition à la bonne réponse.
 * → null (vide) | { ok: true } | { ok: false, near: bool, hint?: string }
 */
export function checkAnswer(guess, entry, owners = null) {
  const g = compact(guess);
  if (!g) return null;
  if (entry.lastKey && g === entry.lastKey) return { ok: true };
  // Le nom exact d'une autre célébrité du catalogue n'est jamais accepté (« Dalida » n'est pas « Dua Lipa »)
  const other = owners?.get(g);
  if (other && !other.has(entry.id)) return { ok: false, near: false };
  if (entry.last && g === entry.first) return { ok: false, near: true, hint: 'Il manque le nom de famille.' };
  if (entry.last && !entry.lastUnique && g === entry.last) return { ok: false, near: true, hint: 'Précise le prénom.' };
  if (isMatch(guess, entry.answers)) return { ok: true };
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
    const e = answersMap.get(c.id);
    for (const a of [c.id.replace(/-/g, ''), ...e.answers.map(compact), e.lastKey].filter(Boolean)) d = Math.min(d, levenshtein(k, a));
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
