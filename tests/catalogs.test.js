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
    wiki: [false, text], // titre exact de l'article Wikipédia anglais, si la recherche se trompe
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
    // false : pas dans Morceaux (photo Commons qui ne correspond pas à la personne)
    morceaux: [false, (v) => v === false],
  }, 'celebs');
  const names = new Set();
  celebs.forEach((c) => { if (names.has(c.name)) errors.push(`celebs ${c.id} : nom en double`); names.add(c.name); });
  assert.deepEqual(errors, []);
  // Équilibre voulu par la spécification : autant de femmes que d'hommes
  assert.equal(celebs.filter((c) => c.g === 'f').length, celebs.filter((c) => c.g === 'm').length);
});

const BOX_KEYS = ['yeux', 'nez', 'bouche', 'haut', 'bas', 'complet'];
const isBox = (v) => Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number' && n >= 0 && n <= 1)
  && v[0] + v[2] <= 1.001 && v[1] + v[3] <= 1.001 && v[2] > 0 && v[3] > 0;

for (const [label, file, required] of [
  ['Morceaux (people.json)', 'games/faces/morceaux/data/people.json', true],
  ['Portraits de jeunesse (jeunesse.json)', 'games/faces/morceaux/data/jeunesse.json', false],
]) test(`catalogue ${label}`, async () => {
  const people = await load(file);
  assert.ok(Array.isArray(people) && (people.length > 0 || !required));
  const errors = checkEntries(people, {
    id: [true, (v) => SLUG.test(v)],
    name: [true, text],
    img: [true, (v) => typeof v === 'string' && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(v)],
    by: [true, text],
    lic: [true, text],
    box: [true, (v) => v && typeof v === 'object' && BOX_KEYS.every((k) => isBox(v[k])) && Object.keys(v).every((k) => BOX_KEYS.includes(k))],
    alt: [false, textList],
    year: [false, (v) => Number.isInteger(v) && v >= 1880 && v <= 2030],
  }, 'people');
  const names = new Set();
  people.forEach((p) => { if (names.has(p.name)) errors.push(`people ${p.id} : nom en double`); names.add(p.name); });
  assert.deepEqual(errors, []);
});


test('liste des personnages historiques de Morceaux (scripts/historiques-seed.json)', async () => {
  const seed = await load('scripts/historiques-seed.json');
  assert.ok(Array.isArray(seed) && seed.length > 0);
  const errors = checkEntries(seed, {
    id: [true, (v) => SLUG.test(v)],
    name: [true, text],
    job: [true, text],
    g: [true, (v) => v === 'f' || v === 'm'],
    alt: [false, textList],
    search: [false, text],
    qid: [false, (v) => /^Q\d+$/.test(v)],
  }, 'historiques');
  const names = new Set();
  seed.forEach((p) => { if (names.has(p.name)) errors.push(`historiques ${p.id} : nom en double`); names.add(p.name); });
  assert.deepEqual(errors, []);
  // Autant de femmes que d'hommes (à une personne près).
  const women = seed.filter((p) => p.g === 'f').length;
  assert.ok(Math.abs(2 * women - seed.length) <= 1, `${women} femmes sur ${seed.length}`);
});

test('catalogue des livres (300 livres, auteurs reliés)', async () => {
  const { authors, books } = await load('games/books/data/livres.json');
  assert.ok(Array.isArray(authors) && Array.isArray(books));
  assert.equal(books.length, 300);
  const errors = [
    ...checkEntries(authors, {
      id: [true, (v) => SLUG.test(v)],
      name: [true, text],
      alt: [false, textList],
      from: [true, (v) => text(v) && v === v.toLowerCase()], // accordé avec « littérature » : française, russe…
    }, 'authors'),
    ...checkEntries(books, {
      id: [true, (v) => SLUG.test(v)],
      title: [true, text],
      author: [true, text],
      year: [true, (v) => Number.isInteger(v) && v >= 1200 && v <= THIS_YEAR],
    }, 'books'),
  ];
  const ids = new Set(authors.map((a) => a.id));
  const used = new Set(books.map((b) => b.author));
  books.forEach((b) => { if (!ids.has(b.author)) errors.push(`books ${b.id} : auteur inconnu ${b.author}`); });
  authors.forEach((a) => { if (!used.has(a.id)) errors.push(`authors ${a.id} : aucun livre`); });
  const names = new Set();
  authors.forEach((a) => { if (names.has(a.name)) errors.push(`authors ${a.id} : nom en double`); names.add(a.name); });
  const titles = new Set();
  books.forEach((b) => { if (titles.has(b.title)) errors.push(`books ${b.id} : titre en double`); titles.add(b.title); });
  assert.deepEqual(errors, []);
});

test('carte du Géoquizz (contours des pays)', async () => {
  const { EASY, REGION_OF } = await import('../games/geo/geo.js');
  const world = await load('games/geo/data/world.json');
  for (const k of ['units', 'lonMin', 'latMax', 'latMin', 'width', 'height']) assert.equal(typeof world[k], 'number', k);
  assert.ok(typeof world.land === 'string' && world.land.startsWith('M'));
  const ring = (v) => typeof v === 'string' && /^-?\d+ -?\d+( -?\d+ -?\d+)+$/.test(v);
  const errors = checkEntries(world.countries.map((x) => ({ id: x.c, ...x })), {
    id: [true, () => true],
    c: [true, (v) => /^[A-Z]{2}$/.test(v)],
    n: [true, text],
    p: [true, (v) => Array.isArray(v) && v.length > 0 && v.every((poly) => Array.isArray(poly) && poly.length > 0 && poly.every(ring))],
  }, 'countries');
  const codes = new Set(world.countries.map((x) => x.c));
  for (const c of EASY) {
    if (!codes.has(c)) errors.push(`pays proposé absent de la carte : ${c}`);
    if (!REGION_OF[c]) errors.push(`pays proposé sans région : ${c}`);
  }
  assert.deepEqual(errors, []);
});

test('catalogue des races de chiens', async () => {
  const { GROUPS } = await import('../games/dogs/quiz.js');
  const breeds = await load('games/dogs/data/chiens.json');
  const photos = await load('games/dogs/data/photos.json');
  assert.ok(Array.isArray(breeds) && breeds.length >= 100);
  const errors = checkEntries(breeds, {
    id: [true, (v) => SLUG.test(v)],
    name: [true, text],
    wiki: [true, text],
    group: [true, (v) => v in GROUPS],
    origin: [true, text],
    file: [false, text],
  }, 'chiens');
  const names = new Set();
  breeds.forEach((b) => { if (names.has(b.name)) errors.push(`chiens ${b.id} : nom en double`); names.add(b.name); });
  const ids = new Set(breeds.map((b) => b.id));
  const url = (v) => typeof v === 'string' && /^https:\/\/(upload|thumb)\.wikimedia\.org\/[^?]+$/.test(v);
  for (const [id, p] of Object.entries(photos)) {
    if (!ids.has(id)) errors.push(`photos ${id} : race inconnue`);
    if (!url(p.img) || !url(p.thumb)) errors.push(`photos ${id} : URL invalide (${p.img} | ${p.thumb})`);
    if (!text(p.by) || !text(p.lic) || !text(p.file)) errors.push(`photos ${id} : auteur, licence ou fichier manquant`);
  }
  assert.deepEqual(errors, []);
});

test('catalogue des Pionnières', async () => {
  const women = await load('games/women/data/femmes.json');
  const { DOMAINS } = await import('../games/women/quiz.js');
  assert.equal(women.length, 200);
  const sentence = (v) => text(v) && v.length <= 80;
  const errors = checkEntries(women, {
    id: [true, (v) => SLUG.test(v)],
    name: [true, text],
    born: [true, (v) => Number.isInteger(v) && v > 0 && v <= THIS_YEAR],
    died: [false, (v) => Number.isInteger(v) && v > 0 && v <= THIS_YEAR],
    from: [true, text],
    domain: [true, (v) => v in DOMAINS],
    famous: [true, (v) => typeof v === 'boolean'],
    answer: [true, sentence],
    lures: [true, (v) => textList(v) && v.length === 3 && v.every(sentence)],
    fact: [true, (v) => text(v) && v.length <= 200],
    qid: [false, (v) => /^Q\d+$/.test(v)], // identifiant Wikidata, si la recherche du portrait se trompe
    search: [false, text], // nom à chercher sur Wikidata, si différent
  }, 'femmes');
  women.forEach((w) => {
    if (w.lures?.includes(w.answer)) errors.push(`femmes ${w.id} : un leurre est la bonne réponse`);
    if (w.died && w.died < w.born) errors.push(`femmes ${w.id} : morte avant sa naissance`);
  });
  const names = women.map((w) => w.name);
  names.forEach((n, i) => { if (names.indexOf(n) !== i) errors.push(`femmes : « ${n} » en double`); });
  assert.deepEqual(errors, []);
  // Surtout des femmes oubliées (demande de Yoann)
  assert.ok(women.filter((w) => w.famous).length <= 60);
});

test('portraits des Pionnières : uniquement des femmes du catalogue, avec crédit', async () => {
  const ids = new Set((await load('games/women/data/femmes.json')).map((w) => w.id));
  const photos = await load('games/women/data/photos.json');
  assert.equal(typeof photos, 'object');
  assert.deepEqual(Object.keys(photos).filter((id) => !ids.has(id)), []);
  for (const [id, p] of Object.entries(photos)) {
    assert.match(p.img, /^https:\/\/upload\.wikimedia\.org\//, id);
    assert.ok(text(p.by) && text(p.lic), `${id} : auteur et licence obligatoires`);
  }
});
