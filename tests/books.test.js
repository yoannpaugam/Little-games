import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAuthors, checkAuthor, initialsOf, nameParts } from '../games/books/answers.js';

const { authors, books } = JSON.parse(await readFile(new URL('../games/books/data/livres.json', import.meta.url), 'utf8'));
const index = buildAuthors(authors);
const check = (guess, id) => checkAuthor(guess, id, index);
const ok = (guess, id) => check(guess, id)?.ok === true;

test('le nom complet, le nom de famille seul et les alternatives sont acceptés', () => {
  assert.ok(ok('Victor Hugo', 'victor-hugo'));
  assert.ok(ok('hugo', 'victor-hugo'));
  assert.ok(ok('Tolstoi', 'leon-tolstoi'));
  assert.ok(ok('Tolstoy', 'leon-tolstoi'));
  assert.ok(ok('Molière', 'moliere'));
  assert.ok(ok('Ajar', 'romain-gary'));
  assert.ok(ok('Tolkien', 'j-r-r-tolkien'));
  assert.ok(ok('Eco', 'umberto-eco'));
});

test('les particules sont facultatives', () => {
  assert.ok(ok('Beauvoir', 'simone-de-beauvoir'));
  assert.ok(ok('de Beauvoir', 'simone-de-beauvoir'));
  assert.ok(ok('Saint-Exupéry', 'antoine-de-saint-exupery'));
  assert.ok(ok('saint exupery', 'antoine-de-saint-exupery'));
  assert.ok(ok('Le Guin', 'ursula-k-le-guin'));
  assert.ok(ok('La Fontaine', 'jean-de-la-fontaine'));
  assert.ok(ok('Ben Jelloun', 'tahar-ben-jelloun'));
  assert.ok(ok('Lampedusa', 'giuseppe-tomasi-di-lampedusa'));
  assert.deepEqual(nameParts('Simone de Beauvoir').lasts, ['debeauvoir', 'beauvoir']);
});

test('les petites fautes sur le nom de famille passent', () => {
  assert.ok(ok('Hemmingway', 'ernest-hemingway'));
  assert.ok(ok('Dostoievsky', 'fiodor-dostoievski'));
  assert.ok(ok('Shakespear', 'william-shakespeare'));
  assert.ok(ok('Tolkein', 'j-r-r-tolkien'));
  assert.ok(!ok('Zoal', 'emile-zola')); // nom court : sans faute
});

test('le nom d’un autre auteur est refusé', () => {
  assert.ok(!ok('Charlotte Brontë', 'emily-bronte'));
  assert.ok(!ok('Kafka', 'haruki-murakami'));
  assert.ok(!ok('Hesse', 'thomas-mann'));
  assert.ok(!ok('Hugo', 'emile-zola'));
});

test('presque juste : un indice, sans essai perdu', () => {
  assert.deepEqual(check('Victor', 'victor-hugo'), { ok: false, near: true, hint: 'Il manque le nom de famille.' });
  assert.deepEqual(check('Brontë', 'emily-bronte'), { ok: false, near: true, hint: 'Précise le prénom.' });
  assert.equal(check('  ', 'victor-hugo'), null);
});

test('initiales pour l’indice', () => {
  assert.equal(initialsOf('Léon Tolstoï'), 'L. T.');
  assert.equal(initialsOf('Antoine de Saint-Exupéry'), 'A. S.-E.');
  assert.equal(initialsOf('J. R. R. Tolkien'), 'J. R. R. T.');
});

test('chaque auteur peut être trouvé avec son nom complet, sans se faire refuser', () => {
  for (const b of books) {
    const a = authors.find((x) => x.id === b.author);
    assert.ok(ok(a.name, a.id), a.name);
    for (const alt of a.alt || []) assert.ok(ok(alt, a.id), `${a.name} / ${alt}`);
  }
});
