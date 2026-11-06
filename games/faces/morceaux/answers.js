// Réponses acceptées pour le jeu « Morceaux ».
// JavaScript pur (sans DOM) : testé dans tests/morceaux.test.js.

import { normalize, isMatch, closeness } from '../../../js/core/fuzzy.js?v=1.33.0';

const compact = (s) => normalize(s).replace(/ /g, '');

const PARTICLES = new Set(['de', 'di', 'da', 'du', 'del', 'della', 'van', 'von', 'der', 'den', 'dos', 'le']);

/**
 * Pour chaque personne : nom complet et alternatives (avec tolérance),
 * nom de famille seul s’il est unique (≥ 4 lettres, exact).
 * → Map id → { id, answers, first, last, lastKey, lastUnique }
 */
export function buildAnswers(people) {
  const split = (p) => {
    const w = normalize(p.name).split(' ');
    if (w.length < 2) return { first: w[0], last: null };
    let i = w.length - 1;
    while (i > 1 && PARTICLES.has(w[i - 1])) i--;
    return { first: w.slice(0, i).join(''), last: w.slice(i).join('') };
  };
  const parts = new Map(people.map((p) => [p.id, split(p)]));
  const lastCount = new Map();
  for (const { last } of parts.values()) if (last) lastCount.set(last, (lastCount.get(last) || 0) + 1);
  const fullOwner = new Map();
  for (const p of people) for (const a of [p.name, ...(p.alt || [])]) fullOwner.set(compact(a), p.id);
  const result = new Map();
  for (const p of people) {
    const { first, last } = parts.get(p.id);
    const owner = last && fullOwner.get(last);
    const lastUnique = Boolean(last && last.length >= 4 && lastCount.get(last) === 1 && (!owner || owner === p.id));
    result.set(p.id, {
      id: p.id,
      answers: [...new Set([p.name, ...(p.alt || [])])],
      first, last,
      lastKey: lastUnique ? last : null,
      lastUnique,
    });
  }
  return result;
}

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
 * → null (vide) | { ok: true } | { ok: false, near: bool, hint?: string }
 */
export function checkAnswer(guess, entry, owners = null) {
  const g = compact(guess);
  if (!g) return null;
  if (entry.lastKey && g === entry.lastKey) return { ok: true };
  const other = owners?.get(g);
  if (other && !other.has(entry.id)) return { ok: false, near: false };
  if (entry.last && g === entry.first) return { ok: false, near: true, hint: 'Il manque le nom de famille.' };
  if (entry.last && !entry.lastUnique && g === entry.last) return { ok: false, near: true, hint: 'Précise le prénom.' };
  if (isMatch(guess, entry.answers)) return { ok: true };
  if (g.length >= 3 && closeness(guess, entry.answers) < 0.25) return { ok: false, near: true, hint: 'Vérifie l’orthographe.' };
  return { ok: false, near: false };
}
