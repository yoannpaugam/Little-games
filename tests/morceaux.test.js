import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAnswers, buildOwners, checkAnswer } from '../games/face-parts/answers.js';

const people = JSON.parse(await readFile(new URL('../games/face-parts/data/people.json', import.meta.url), 'utf8'));
const answers = buildAnswers(people);
const owners = buildOwners(answers);
const check = (guess, id) => checkAnswer(guess, answers.get(id), owners);

test('catalogue Morceaux non vide, identifiants uniques', () => {
  assert.ok(people.length >= 10);
  assert.equal(new Set(people.map((p) => p.id)).size, people.length);
});

test('accepte le nom complet et les fautes', () => {
  const sample = people.find((p) => p.id === 'tom-hanks') || people[0];
  assert.ok(check(sample.name, sample.id).ok);
  const lower = sample.name.toLowerCase();
  assert.ok(check(lower, sample.id).ok);
});

test('accepte les alternatives quand présentes', () => {
  const withAlt = people.find((p) => p.alt?.length);
  if (!withAlt) return;
  assert.ok(check(withAlt.alt[0], withAlt.id).ok);
});

test('refuse le nom d’une autre personne du catalogue', () => {
  if (people.length < 2) return;
  const [a, b] = people;
  assert.ok(!check(b.name, a.id).ok);
});

test('chaque entrée a les six boîtes de découpe', () => {
  for (const p of people) {
    for (const k of ['yeux', 'nez', 'bouche', 'haut', 'bas', 'complet']) {
      assert.ok(Array.isArray(p.box[k]) && p.box[k].length === 4, `${p.id}.${k}`);
    }
  }
});
