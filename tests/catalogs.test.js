// Contrôle des catalogues : l'équivalent des contraintes d'une base de données.
// Un catalogue invalide (identifiant en double, champ manquant, valeur impossible) fait échouer `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const THIS_YEAR = new Date().getFullYear();

/** Vérifie chaque entrée avec `rules` : { champ: [obligatoire, (valeur) => vrai si valide] }. */
function checkEntries(list, rules, label) {
  const errors = [];
  const ids = new Set();
  list.forEach((e, i) => {
    const where = `${label}[${i}] ${e?.id ?? '?'}`;
    for (const [field, [required, valid]] of Object.entries(rules)) {
      if (e[field] == null) { if (required) errors.push(`${where} : « ${field} » manquant`); continue; }
      if (!valid(e[field])) errors.push(`${where} : « ${field} » invalide (${JSON.stringify(e[field])})`);
    }
    const unknown = Object.keys(e).filter((k) => !(k in rules));
    if (unknown.length) errors.push(`${where} : champ(s) inconnu(s) ${unknown.join(', ')}`);
    if (ids.has(e.id)) errors.push(`${where} : identifiant en double`);
    ids.add(e.id);
  });
  return errors;
}
const text = (v) => typeof v === 'string' && v.trim() === v && v.length > 0;
const textList = (v) => Array.isArray(v) && v.length > 0 && v.every(text) && new Set(v).size === v.length;

test('catalogue des films (affiches)', async () => {
  const films = await load('games/movie-posters/data/films.json');
  assert.ok(Array.isArray(films) && films.length > 0);
  const errors = checkEntries(films, {
    id: [true, (v) => SLUG.test(v)],
    title: [true, text],
    original: [false, text],
    alt: [false, textList],
    year: [true, (v) => Number.isInteger(v) && v >= 1888 && v <= THIS_YEAR + 1],
    director: [true, text],
  }, 'films');
  // Un titre original identique au titre français est inutile
  films.forEach((f) => { if (f.original && f.original === f.title) errors.push(`films ${f.id} : original identique au titre`); });
  assert.deepEqual(errors, []);
});

test('chemins des affiches : uniquement des films du catalogue', async () => {
  const films = new Set((await load('games/movie-posters/data/films.json')).map((f) => f.id));
  const posters = await load('games/movie-posters/data/posters.json');
  assert.equal(typeof posters, 'object');
  assert.deepEqual(Object.keys(posters).filter((id) => !films.has(id)), []);
});

test('catalogue des célébrités (visages)', async () => {
  const celebs = await load('games/faces/data/celebs.json');
  assert.ok(Array.isArray(celebs) && celebs.length > 0);
  const errors = checkEntries(celebs, {
    id: [true, (v) => SLUG.test(v)],
    name: [true, text],
    job: [true, text],
    g: [true, (v) => v === 'f' || v === 'm'],
    born: [true, (v) => Number.isInteger(v) && v >= 1850 && v <= THIS_YEAR - 10],
    alt: [false, textList],
  }, 'celebs');
  const names = new Set();
  celebs.forEach((c) => { if (names.has(c.name)) errors.push(`celebs ${c.id} : nom en double`); names.add(c.name); });
  assert.deepEqual(errors, []);
  // Équilibre voulu par la spécification : autant de femmes que d'hommes
  assert.equal(celebs.filter((c) => c.g === 'f').length, celebs.filter((c) => c.g === 'm').length);
});
